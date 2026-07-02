import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { ChannelType, MessageType } from '@prisma/client';
import { z } from 'zod';
import { broadcastMessage } from '../services/socketService';

const createChannelSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.nativeEnum(ChannelType).default(ChannelType.TEXT),
  categoryId: z.string().optional(),
});

export const createChannel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { serverId } = req.params;

    // Validate server membership & ownership/permission
    const member = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: { serverId, userId },
      },
      include: {
        server: true,
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'You must be a member of this server to add channels' });
    }

    const result = createChannelSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { name, type, categoryId } = result.data;

    const channel = await prisma.channel.create({
      data: {
        name,
        type,
        serverId,
        categoryId: categoryId || null,
      },
    });

    logger.info(`Channel "${name}" (${channel.id}) created under server ${serverId} by user ${userId}`);
    return res.status(201).json(channel);
  } catch (error: any) {
    logger.error('Failed to create channel', error);
    return res.status(500).json({ error: 'Failed to create channel' });
  }
};

export const deleteChannel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { channelId } = req.params;

    // Check if channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Only server owner or admin can delete channels
    if (channel.server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the server owner can delete channels' });
    }

    await prisma.channel.delete({
      where: { id: channelId },
    });

    logger.info(`Channel ${channelId} deleted by server owner ${userId}`);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete channel', error);
    return res.status(500).json({ error: 'Failed to delete channel' });
  }
};

export const getChannelMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { channelId } = req.params;

    // Verify channel and server membership
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const member = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: { serverId: channel.serverId, userId },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarConfig: true,
          },
        },
        parent: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
        reactions: true,
      },
    });

    return res.status(200).json({ messages });
  } catch (error: any) {
    logger.error('Failed to get channel messages', error);
    return res.status(500).json({ error: 'Failed to retrieve messages' });
  }
};

export const sendChannelMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { channelId } = req.params;
    const { content, parentId } = req.body;

    // Verify channel and server membership
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const member = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: { serverId: channel.serverId, userId },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    let messageType: MessageType = MessageType.TEXT;
    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let fileSize: number | undefined;

    if (req.file) {
      const ext = req.file.originalname.split('.').pop()?.toLowerCase();
      fileUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;

      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
        messageType = MessageType.IMAGE;
      } else if (['mp4', 'mov', 'webm'].includes(ext || '')) {
        messageType = MessageType.VIDEO;
      } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) {
        messageType = MessageType.VOICE_NOTE;
      } else {
        messageType = MessageType.FILE;
      }
    }

    if (!content && !fileUrl) {
      return res.status(400).json({ error: 'Message content or file attachment is required' });
    }

    const message = await prisma.message.create({
      data: {
        content: content || '',
        type: messageType,
        fileUrl,
        fileName,
        fileSize,
        channelId,
        senderId: userId,
        parentId: parentId || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarConfig: true,
          },
        },
        parent: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
        reactions: true,
      },
    });

    // Award XP
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: 2 } },
    });

    // Real-time broadcast
    broadcastMessage(message);

    logger.info(`Message ${message.id} sent to channel ${channelId} by user ${userId}`);
    return res.status(201).json(message);
  } catch (error: any) {
    logger.error('Failed to send channel message', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};
