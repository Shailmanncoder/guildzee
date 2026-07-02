import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { z } from 'zod';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(200).optional(),
  customStatus: z.string().max(100).optional(),
  themePreference: z.enum(['dark', 'light', 'amoled']).optional(),
  accentColor: z.string().optional(),
  avatarConfig: z.any().optional(), // JSON config object
});

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarConfig: true,
        bannerUrl: true,
        bio: true,
        status: true,
        customStatus: true,
        xp: true,
        level: true,
        streak: true,
        themePreference: true,
        accentColor: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    logger.error(`getMe error: ${error}`);
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsedData = updateProfileSchema.parse(req.body);

    const updateData: any = { ...parsedData };

    // Process files if uploaded by Multer
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files['avatar'] && files['avatar'][0]) {
        updateData.avatarUrl = `/uploads/${files['avatar'][0].filename}`;
      }
      if (files['banner'] && files['banner'][0]) {
        updateData.bannerUrl = `/uploads/${files['banner'][0].filename}`;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarConfig: true,
        bannerUrl: true,
        bio: true,
        status: true,
        customStatus: true,
        xp: true,
        level: true,
        streak: true,
        themePreference: true,
        accentColor: true,
      },
    });

    logger.info(`Profile updated for user: ${updatedUser.username}`);
    return res.status(200).json(updatedUser);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error(`updateProfile error: ${error}`);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    logger.info(`User account permanently deleted: ${userId}`);
    return res.status(200).json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    logger.error(`deleteAccount error: ${error}`);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
};
