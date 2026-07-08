import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as friendController from '../controllers/friendController';
import * as chatController from '../controllers/chatController';
import * as serverController from '../controllers/serverController';
import * as channelController from '../controllers/channelController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';
import { authRateLimiter, messageRateLimiter, sanitizeInput } from '../middlewares/securityMiddleware';
const router = Router();

import path from 'path';
import { Request, Response } from 'express';

// --- APK Download Route ---
router.get('/download-apk', (req: Request, res: Response) => {
  return res.redirect('/Guildzee.apk');
});

// --- Auth Routes ---
router.post('/auth/register', authRateLimiter, authController.register);
router.post('/auth/login', authRateLimiter, authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authController.logout);

// --- User Profile Routes (Protected) ---
router.get('/users/me', authenticateToken, userController.getMe);
router.put(
  '/users/profile',
  authenticateToken,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  userController.updateProfile
);
router.delete('/users/me', authenticateToken, userController.deleteAccount);

// --- Friends Management Routes (Protected) ---
router.get('/friends/list', authenticateToken, friendController.getFriends);
router.post('/friends/request', authenticateToken, friendController.sendFriendRequest);
router.post('/friends/accept/:friendshipId', authenticateToken, friendController.acceptFriendRequest);
router.post('/friends/decline/:friendshipId', authenticateToken, friendController.declineFriendRequest);
router.delete('/friends/remove/:friendId', authenticateToken, friendController.removeFriend);
router.post('/friends/block/:targetUserId', authenticateToken, friendController.blockUser);
router.post('/friends/unblock/:targetUserId', authenticateToken, friendController.unblockUser);

// --- Direct Messaging Routes (Protected) ---
router.get('/messages/dm/:recipientId', authenticateToken, chatController.getDirectMessages);
router.post(
  '/messages/dm/:recipientId',
  authenticateToken,
  messageRateLimiter,
  sanitizeInput,
  upload.single('file'),
  chatController.sendDirectMessage
);

// --- Group Messaging Routes (Protected) ---
router.get('/messages/groups', authenticateToken, chatController.getGroups);
router.post('/messages/groups', authenticateToken, chatController.createGroup);
router.get('/messages/groups/:groupId', authenticateToken, chatController.getGroupMessages);
router.post(
  '/messages/groups/:groupId',
  authenticateToken,
  messageRateLimiter,
  sanitizeInput,
  upload.single('file'),
  chatController.sendGroupMessage
);
router.post('/messages/groups/:groupId/invite', authenticateToken, chatController.inviteToGroup);
router.delete('/messages/groups/:groupId/leave', authenticateToken, chatController.leaveGroup);

// --- Chat Actions (Protected) ---
router.put('/messages/edit/:messageId', authenticateToken, chatController.editMessage);
router.delete('/messages/delete/:messageId', authenticateToken, chatController.deleteMessage);
router.post('/messages/react/:messageId', authenticateToken, chatController.toggleReaction);

// --- Server Routes (Protected) ---
router.post('/servers', authenticateToken, serverController.createServer);
router.get('/servers', authenticateToken, serverController.getServers);
router.post('/servers/join', authenticateToken, serverController.joinServer);
router.get('/servers/:serverId', authenticateToken, serverController.getServerDetails);
router.delete('/servers/:serverId', authenticateToken, serverController.leaveServer);
router.delete('/servers/delete/:serverId', authenticateToken, serverController.deleteServer);

// --- Channel Routes (Protected) ---
router.post('/servers/:serverId/channels', authenticateToken, channelController.createChannel);
router.delete('/channels/:channelId', authenticateToken, channelController.deleteChannel);
router.get('/channels/:channelId/messages', authenticateToken, channelController.getChannelMessages);
router.post(
  '/channels/:channelId/messages',
  authenticateToken,
  messageRateLimiter,
  sanitizeInput,
  upload.single('file'),
  channelController.sendChannelMessage
);

export default router;
