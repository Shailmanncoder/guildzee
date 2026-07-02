import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { FriendshipStatus, UserStatus } from '@prisma/client';
import { z } from 'zod';

const friendRequestSchema = z.object({
  targetUsernameOrEmail: z.string().min(1, 'Target username or email is required'),
});

export const sendFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { targetUsernameOrEmail } = friendRequestSchema.parse(req.body);

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: targetUsernameOrEmail },
          { username: targetUsernameOrEmail.toLowerCase() },
        ],
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === userId) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
    }

    // Check existing friendship
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        return res.status(400).json({ error: 'You are already friends with this user' });
      }
      if (existing.status === FriendshipStatus.BLOCKED) {
        return res.status(400).json({ error: 'This user is blocked' });
      }
      if (existing.senderId === userId) {
        return res.status(400).json({ error: 'Friend request already sent' });
      } else {
        // Auto-accept if they already sent you a request
        await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: FriendshipStatus.ACCEPTED },
        });
        return res.status(200).json({ message: 'Friend request accepted automatically' });
      }
    }

    const friendship = await prisma.friendship.create({
      data: {
        senderId: userId,
        receiverId: targetUser.id,
        status: FriendshipStatus.PENDING,
      },
    });

    logger.info(`Friend request sent from ${userId} to ${targetUser.id}`);
    return res.status(201).json({ message: 'Friend request sent successfully', friendship });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error(`sendFriendRequest error: ${error}`);
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
};

export const acceptFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendshipId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const request = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!request || request.receiverId !== userId || request.status !== FriendshipStatus.PENDING) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED },
    });

    logger.info(`Friend request ${friendshipId} accepted by user ${userId}`);
    return res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    logger.error(`acceptFriendRequest error: ${error}`);
    return res.status(500).json({ error: 'Failed to accept friend request' });
  }
};

export const declineFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendshipId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const request = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!request || (request.receiverId !== userId && request.senderId !== userId)) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    logger.info(`Friend request ${friendshipId} declined/cancelled`);
    return res.status(200).json({ message: 'Request declined/cancelled' });
  } catch (error) {
    logger.error(`declineFriendRequest error: ${error}`);
    return res.status(500).json({ error: 'Failed to handle request decline' });
  }
};

export const removeFriend = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId, status: FriendshipStatus.ACCEPTED },
          { senderId: friendId, receiverId: userId, status: FriendshipStatus.ACCEPTED },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friend relation not found' });
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    logger.info(`Friend relationship ${friendship.id} removed by user ${userId}`);
    return res.status(200).json({ message: 'Friend removed' });
  } catch (error) {
    logger.error(`removeFriend error: ${error}`);
    return res.status(500).json({ error: 'Failed to remove friend' });
  }
};

export const blockUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { targetUserId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (userId === targetUserId) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });

    if (existing) {
      // Force status to BLOCKED and set senderId to the blocking user
      await prisma.friendship.update({
        where: { id: existing.id },
        data: {
          senderId: userId,
          receiverId: targetUserId,
          status: FriendshipStatus.BLOCKED,
        },
      });
    } else {
      await prisma.friendship.create({
        data: {
          senderId: userId,
          receiverId: targetUserId,
          status: FriendshipStatus.BLOCKED,
        },
      });
    }

    logger.info(`User ${targetUserId} blocked by user ${userId}`);
    return res.status(200).json({ message: 'User blocked successfully' });
  } catch (error) {
    logger.error(`blockUser error: ${error}`);
    return res.status(500).json({ error: 'Failed to block user' });
  }
};

export const unblockUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { targetUserId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const friendship = await prisma.friendship.findFirst({
      where: {
        senderId: userId,
        receiverId: targetUserId,
        status: FriendshipStatus.BLOCKED,
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Block relationship not found' });
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    logger.info(`User ${targetUserId} unblocked by user ${userId}`);
    return res.status(200).json({ message: 'User unblocked successfully' });
  } catch (error) {
    logger.error(`unblockUser error: ${error}`);
    return res.status(500).json({ error: 'Failed to unblock user' });
  }
};

export const getFriends = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Find all friendships involving user
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            avatarConfig: true,
            status: true,
            customStatus: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            avatarConfig: true,
            status: true,
            customStatus: true,
          },
        },
      },
    });

    const result = {
      online: [] as any[],
      all: [] as any[],
      pendingIncoming: [] as any[],
      pendingOutgoing: [] as any[],
      blocked: [] as any[],
    };

    friendships.forEach((f) => {
      const isSender = f.senderId === userId;
      const targetUser = isSender ? f.receiver : f.sender;

      if (f.status === FriendshipStatus.ACCEPTED) {
        const item = { friendshipId: f.id, ...targetUser };
        result.all.push(item);
        if (targetUser.status !== UserStatus.OFFLINE) {
          result.online.push(item);
        }
      } else if (f.status === FriendshipStatus.PENDING) {
        const item = { friendshipId: f.id, ...targetUser };
        if (isSender) {
          result.pendingOutgoing.push(item);
        } else {
          result.pendingIncoming.push(item);
        }
      } else if (f.status === FriendshipStatus.BLOCKED) {
        // Only show blocked users blocked *by* the current user
        if (isSender) {
          result.blocked.push({ friendshipId: f.id, ...targetUser });
        }
      }
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`getFriends error: ${error}`);
    return res.status(500).json({ error: 'Failed to query friends list' });
  }
};
