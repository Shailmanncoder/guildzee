import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';
import { prisma } from '../config/db';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { UserStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'super-playful-secret-jwt-key-2026!';

// Map to track active user ID -> socket IDs (a user can have multiple connections/tabs open)
const userSockets = new Map<string, Set<string>>();

export let io: SocketIOServer;

export const initSocketServer = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow all origins for dev simplicity
      methods: ['GET', 'POST'],
    },
  });

  // Socket authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
      socket.data.user = decoded;
      next();
    } catch (err) {
      logger.warn(`Socket authentication failed: ${err}`);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user as UserPayload;
    const userId = user.id;

    logger.info(`User connected to Socket.IO: ${user.username} (${socket.id})`);

    // Track active connection
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Save socket info in Redis for fast cross-node query support
    try {
      await redisClient.hSet('online_users', userId, UserStatus.ONLINE);
      // Join self-room for target direct messages
      socket.join(userId);
    } catch (err) {
      logger.error(`Redis tracking error: ${err}`);
    }

    // Set status ONLINE in PostgreSQL and broadcast to friends
    await updateUserStatus(userId, UserStatus.ONLINE);

    // Join rooms for all groups user belongs to
    try {
      const groups = await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });
      groups.forEach((g) => {
        socket.join(g.groupId);
        logger.debug(`Socket ${socket.id} joined group room: ${g.groupId}`);
      });
    } catch (err) {
      logger.error(`Error joining group rooms: ${err}`);
    }

    // Join rooms for all channels in all servers user belongs to
    try {
      const channels = await prisma.channel.findMany({
        where: {
          server: {
            members: {
              some: { userId },
            },
          },
        },
        select: { id: true },
      });
      channels.forEach((c) => {
        socket.join(`channel_${c.id}`);
        logger.debug(`Socket ${socket.id} joined channel room: channel_${c.id}`);
      });
    } catch (err) {
      logger.error(`Error joining channel rooms: ${err}`);
    }

    // --- REALTIME EVENT LISTENERS ---

    // Typing Indicators
    socket.on('typing_start', (data: { recipientId?: string; groupId?: string; channelId?: string }) => {
      const { recipientId, groupId, channelId } = data;
      if (recipientId) {
        socket.to(recipientId).emit('typing_start', { senderId: userId, recipientId });
      } else if (groupId) {
        socket.to(groupId).emit('typing_start', { senderId: userId, groupId });
      } else if (channelId) {
        socket.to(`channel_${channelId}`).emit('typing_start', { senderId: userId, channelId });
      }
    });

    socket.on('typing_stop', (data: { recipientId?: string; groupId?: string; channelId?: string }) => {
      const { recipientId, groupId, channelId } = data;
      if (recipientId) {
        socket.to(recipientId).emit('typing_stop', { senderId: userId, recipientId });
      } else if (groupId) {
        socket.to(groupId).emit('typing_stop', { senderId: userId, groupId });
      } else if (channelId) {
        socket.to(`channel_${channelId}`).emit('typing_stop', { senderId: userId, channelId });
      }
    });

    // Voice/Video Room RTC Signaling Events
    socket.on('voice_channel_join', (data: { channelId: string }) => {
      const { channelId } = data;
      socket.join(`voice_${channelId}`);
      socket.to(`voice_${channelId}`).emit('user_joined_voice', {
        userId,
        username: user.username,
        displayName: user.displayName,
        socketId: socket.id
      });
      logger.info(`User ${userId} (${socket.id}) joined voice channel ${channelId}`);
    });

    socket.on('voice_channel_leave', (data: { channelId: string }) => {
      const { channelId } = data;
      socket.leave(`voice_${channelId}`);
      socket.to(`voice_${channelId}`).emit('user_left_voice', {
        userId,
        socketId: socket.id
      });
      logger.info(`User ${userId} (${socket.id}) left voice channel ${channelId}`);
    });

    socket.on('voice_channel_signal', (data: { targetSocketId: string; signal: any }) => {
      io.to(data.targetSocketId).emit('voice_channel_signal', {
        senderSocketId: socket.id,
        senderUserId: userId,
        signal: data.signal
      });
    });

    // WebRTC Calling Signalling (Phase 2 preview / Phase 1 Calls wrapper)
    socket.on('call_invite', (data: { targetUserId: string; offer: any; type: 'voice' | 'video' }) => {
      socket.to(data.targetUserId).emit('call_invite', {
        callerId: userId,
        offer: data.offer,
        type: data.type,
      });
    });

    socket.on('call_accept', (data: { callerId: string; answer: any }) => {
      socket.to(data.callerId).emit('call_accept', {
        calleeId: userId,
        answer: data.answer,
      });
    });

    socket.on('call_ice_candidate', (data: { targetUserId: string; candidate: any }) => {
      socket.to(data.targetUserId).emit('call_ice_candidate', {
        senderId: userId,
        candidate: data.candidate,
      });
    });

    socket.on('call_end', (data: { targetUserId: string }) => {
      socket.to(data.targetUserId).emit('call_end', { senderId: userId });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // Set user offline if they closed all tabs
          try {
            await redisClient.hDel('online_users', userId);
          } catch (err) {
            logger.error(`Redis tracking del error: ${err}`);
          }
          await updateUserStatus(userId, UserStatus.OFFLINE);
        }
      }
    });
  });
};

// Update database status and notify friends of presence changes
async function updateUserStatus(userId: string, status: UserStatus) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, username: true, displayName: true, status: true, customStatus: true },
    });

    // Query friends list to broadcast update
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
        status: 'ACCEPTED',
      },
    });

    friendships.forEach((f) => {
      const targetFriendId = f.senderId === userId ? f.receiverId : f.senderId;
      // Send event to friend's personal socket room
      io.to(targetFriendId).emit('user_status_changed', {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        status: user.status,
        customStatus: user.customStatus,
      });
    });
  } catch (err) {
    logger.error(`Failed to update user status in DB: ${err}`);
  }
}

// Helper to broadcast message events from REST controllers
export const broadcastMessage = (message: any) => {
  if (!io) return;

  if (message.recipientId) {
    // Send to recipient personal room
    io.to(message.recipientId).emit('message_received', message);
    // Send to sender's other open client windows/tabs
    io.to(message.senderId).emit('message_received', message);
  } else if (message.groupId) {
    // Send to group room (this includes the sender)
    io.to(message.groupId).emit('message_received', message);
  } else if (message.channelId) {
    // Send to server channel room (this includes the sender)
    io.to(`channel_${message.channelId}`).emit('message_received', message);
  }
};
