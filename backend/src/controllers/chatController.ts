import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { FriendshipStatus, MessageType } from '@prisma/client';
import { z } from 'zod';
import { broadcastMessage } from '../services/socketService';

const sendMessageSchema = z.object({
  content: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  memberIds: z.array(z.string().uuid()).min(1, 'Add at least one member'),
});

const inviteMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

// --- DIRECT MESSAGES ---

export const getDirectMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { recipientId } = req.params;
    const { limit = '50', cursor } = req.query;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Verify blocking: check if either blocked the other
    const blockRelation = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: recipientId, status: FriendshipStatus.BLOCKED },
          { senderId: recipientId, receiverId: userId, status: FriendshipStatus.BLOCKED },
        ],
      },
    });

    if (blockRelation) {
      return res.status(403).json({ error: 'Communication blocked' });
    }

    const take = parseInt(limit as string, 10);

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: recipientId },
          { senderId: recipientId, recipientId: userId },
        ],
      },
      take: take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor as string } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
        reactions: true,
        parent: {
          select: {
            id: true,
            content: true,
            type: true,
            sender: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Return messages in chronological order for chat rendering
    return res.status(200).json({
      messages: messages.reverse(),
      nextCursor: messages.length === take ? messages[messages.length - 1].id : null,
    });
  } catch (error) {
    logger.error(`getDirectMessages error: ${error}`);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const sendDirectMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { recipientId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Validate block relations
    const blockRelation = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: recipientId, status: FriendshipStatus.BLOCKED },
          { senderId: recipientId, receiverId: userId, status: FriendshipStatus.BLOCKED },
        ],
      },
    });

    if (blockRelation) {
      return res.status(403).json({ error: 'Communication blocked' });
    }

    const { content, parentId } = sendMessageSchema.parse(req.body);

    let messageType: MessageType = MessageType.TEXT;
    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let fileSize: number | undefined;

    // Check if Multer file is uploaded
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
        messageType = MessageType.VOICE_NOTE; // Custom audio attachments
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
        senderId: userId,
        recipientId,
        parentId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
        reactions: true,
        parent: {
          select: {
            id: true,
            content: true,
            type: true,
            sender: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Award user some XP for sending a message (gamification)
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: 2 } },
    });

    // Broadcast direct message via Socket.IO
    broadcastMessage(message);

    logger.info(`DM sent from ${userId} to ${recipientId}`);
    return res.status(201).json(message);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error(`sendDirectMessage error: ${error}`);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};

// --- GROUPS MANAGEMENT ---

export const createGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, memberIds } = createGroupSchema.parse(req.body);

    const group = await prisma.group.create({
      data: {
        name,
        ownerId: userId,
        members: {
          create: [
            { userId: userId, isAdmin: true },
            ...memberIds.map((mId) => ({ userId: mId, isAdmin: false })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Group chat created: ${group.name} by owner ${userId}`);
    return res.status(201).json(group);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error(`createGroup error: ${error}`);
    return res.status(500).json({ error: 'Failed to create group' });
  }
};

export const getGroups = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json(groups);
  } catch (error) {
    logger.error(`getGroups error: ${error}`);
    return res.status(500).json({ error: 'Failed to load groups' });
  }
};

export const getGroupMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { groupId } = req.params;
    const { limit = '50', cursor } = req.query;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Validate membership
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied: not a group member' });
    }

    const take = parseInt(limit as string, 10);

    const messages = await prisma.message.findMany({
      where: { groupId },
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor as string } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
        reactions: true,
        parent: {
          select: {
            id: true,
            content: true,
            type: true,
            sender: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      messages: messages.reverse(),
      nextCursor: messages.length === take ? messages[messages.length - 1].id : null,
    });
  } catch (error) {
    logger.error(`getGroupMessages error: ${error}`);
    return res.status(500).json({ error: 'Failed to load group messages' });
  }
};

export const sendGroupMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { groupId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Check membership
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied: not a group member' });
    }

    const { content, parentId } = sendMessageSchema.parse(req.body);

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
        senderId: userId,
        groupId,
        parentId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
        reactions: true,
        parent: {
          select: {
            id: true,
            content: true,
            type: true,
            sender: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Award XP
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: 2 } },
    });

    // Broadcast group message via Socket.IO
    broadcastMessage(message);

    logger.info(`Group message sent to group ${groupId} by user ${userId}`);
    return res.status(201).json(message);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error(`sendGroupMessage error: ${error}`);
    return res.status(500).json({ error: 'Failed to send group message' });
  }
};

export const inviteToGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { groupId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { userId: targetUserId } = inviteMemberSchema.parse(req.body);

    const checkMember = await prisma.groupMember.findFirst({
      where: { groupId, userId },
    });

    if (!checkMember) {
      return res.status(403).json({ error: 'Only members can invite users to the group' });
    }

    const targetExists = await prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId },
    });

    if (targetExists) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    const newMember = await prisma.groupMember.create({
      data: {
        groupId,
        userId: targetUserId,
        isAdmin: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
    });

    logger.info(`User ${targetUserId} invited to group ${groupId} by ${userId}`);
    return res.status(201).json(newMember);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error(`inviteToGroup error: ${error}`);
    return res.status(500).json({ error: 'Failed to add group member' });
  }
};

export const leaveGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { groupId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId },
    });

    if (!member) {
      return res.status(404).json({ error: 'Group member relation not found' });
    }

    await prisma.groupMember.delete({
      where: { id: member.id },
    });

    // Cleanup group if empty
    const remainingCount = await prisma.groupMember.count({
      where: { groupId },
    });

    if (remainingCount === 0) {
      await prisma.group.delete({ where: { id: groupId } });
      logger.info(`Group ${groupId} deleted because it has no members remaining`);
    } else if (member.isAdmin) {
      // Reassign admin if owner/admin left
      const nextMember = await prisma.groupMember.findFirst({
        where: { groupId },
      });
      if (nextMember) {
        await prisma.groupMember.update({
          where: { id: nextMember.id },
          data: { isAdmin: true },
        });
      }
    }

    logger.info(`User ${userId} left group ${groupId}`);
    return res.status(200).json({ message: 'Left group chat' });
  } catch (error) {
    logger.error(`leaveGroup error: ${error}`);
    return res.status(500).json({ error: 'Failed to leave group' });
  }
};

// --- GLOBAL CHAT MODIFICATIONS (EDITS, DELETES, REACTIONS) ---

export const editMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.senderId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content },
    });

    return res.status(200).json(updated);
  } catch (error) {
    logger.error(`editMessage error: ${error}`);
    return res.status(500).json({ error: 'Failed to edit message' });
  }
};

export const deleteMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.senderId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    logger.error(`deleteMessage error: ${error}`);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
};

export const toggleReaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

    // Check if user already reacted with this emoji
    const existing = await prisma.messageReaction.findFirst({
      where: { messageId, userId, emoji },
    });

    if (existing) {
      await prisma.messageReaction.delete({
        where: { id: existing.id },
      });
      return res.status(200).json({ status: 'removed', emoji });
    } else {
      await prisma.messageReaction.create({
        data: { messageId, userId, emoji },
      });
      return res.status(201).json({ status: 'added', emoji });
    }
  } catch (error) {
    logger.error(`toggleReaction error: ${error}`);
    return res.status(500).json({ error: 'Failed to react to message' });
  }
};
