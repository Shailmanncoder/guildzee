import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { z } from 'zod';

const createServerSchema = z.object({
  name: z.string().min(2).max(100),
});

export const createServer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = createServerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { name } = result.data;

    // Create server, register owner as member, and add default channels
    const server = await prisma.server.create({
      data: {
        name,
        ownerId: userId,
        members: {
          create: {
            userId,
          },
        },
        channels: {
          createMany: {
            data: [
              { name: 'general', type: 'TEXT' },
              { name: 'Lobby', type: 'VOICE' },
            ],
          },
        },
      },
      include: {
        channels: true,
      },
    });

    logger.info(`Server "${name}" (${server.id}) created by user ${userId}`);
    return res.status(201).json(server);
  } catch (error: any) {
    logger.error('Failed to create server', error);
    return res.status(500).json({ error: 'Failed to create server' });
  }
};

export const getServers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const servers = await prisma.server.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        channels: true,
      },
    });

    return res.status(200).json(servers);
  } catch (error: any) {
    logger.error('Failed to get servers', error);
    return res.status(500).json({ error: 'Failed to retrieve servers' });
  }
};

export const getServerDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { serverId } = req.params;

    const server = await prisma.server.findFirst({
      where: {
        id: serverId,
        members: {
          some: { userId },
        },
      },
      include: {
        channels: true,
        categories: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarConfig: true,
                status: true,
                customStatus: true,
              },
            },
          },
        },
      },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found or you are not a member' });
    }

    return res.status(200).json(server);
  } catch (error: any) {
    logger.error('Failed to get server details', error);
    return res.status(500).json({ error: 'Failed to retrieve server details' });
  }
};

export const joinServer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { serverId } = req.body;
    if (!serverId) return res.status(400).json({ error: 'Server ID is required to join' });

    // Verify server exists
    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check membership
    const existingMember = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: { serverId, userId },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'You are already a member of this server' });
    }

    // Join
    const membership = await prisma.serverMember.create({
      data: {
        serverId,
        userId,
      },
      include: {
        server: {
          include: {
            channels: true,
          },
        },
      },
    });

    logger.info(`User ${userId} joined server ${serverId}`);
    return res.status(201).json(membership.server);
  } catch (error: any) {
    logger.error('Failed to join server', error);
    return res.status(500).json({ error: 'Failed to join server' });
  }
};

export const leaveServer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { serverId } = req.params;

    // Check if owner is trying to leave
    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId === userId) {
      return res.status(400).json({ error: 'Server owners cannot leave their own server. Delete it instead.' });
    }

    await prisma.serverMember.delete({
      where: {
        serverId_userId: { serverId, userId },
      },
    });

    logger.info(`User ${userId} left server ${serverId}`);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error('Failed to leave server', error);
    return res.status(500).json({ error: 'Failed to leave server' });
  }
};

export const deleteServer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { serverId } = req.params;

    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the server owner can delete this server' });
    }

    await prisma.server.delete({
      where: { id: serverId },
    });

    logger.info(`Server ${serverId} deleted by owner ${userId}`);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete server', error);
    return res.status(500).json({ error: 'Failed to delete server' });
  }
};
