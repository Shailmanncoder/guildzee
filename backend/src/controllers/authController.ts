import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { UserStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'super-playful-secret-jwt-key-2026!';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-playful-refresh-secret-jwt-key-2026!';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  displayName: z.string().min(1, 'Display name is required').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        username: validatedData.username.toLowerCase(),
        displayName: validatedData.displayName,
        passwordHash,
        status: UserStatus.ONLINE, // Start as online
        themePreference: 'light',
        accentColor: 'purple',
        avatarConfig: {}, // Empty JSON initial creator config
      },
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      status: UserStatus.ONLINE,
    };

    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' }); // 30 days token validity
    const refreshToken = jwt.sign(userPayload, JWT_REFRESH_SECRET, { expiresIn: '30d' });

    // Store in Session table
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        deviceName: req.headers['user-agent'] || 'Unknown',
        ipAddress: req.ip || 'Unknown',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Send HTTP-Only Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    logger.info(`User registered and auto-logged in: ${user.username}`);
    return res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      token: accessToken, // fallback
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        avatarConfig: user.avatarConfig,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        status: UserStatus.ONLINE,
        customStatus: user.customStatus,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        themePreference: user.themePreference,
        accentColor: user.accentColor,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error(`Registration error: ${error}`);
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { emailOrUsername, password } = validatedData;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername.toLowerCase() },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Update status to online upon logging in
    await prisma.user.update({
      where: { id: user.id },
      data: { status: UserStatus.ONLINE },
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      status: UserStatus.ONLINE,
    };

    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' }); // 30 days token validity
    const refreshToken = jwt.sign(userPayload, JWT_REFRESH_SECRET, { expiresIn: '30d' });

    // Store in Session table
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        deviceName: req.headers['user-agent'] || 'Unknown',
        ipAddress: req.ip || 'Unknown',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Send HTTP-Only Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    logger.info(`User logged in: ${user.username}`);
    return res.status(200).json({
      accessToken,
      token: accessToken, // fallback
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        avatarConfig: user.avatarConfig,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        status: UserStatus.ONLINE,
        customStatus: user.customStatus,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        themePreference: user.themePreference,
        accentColor: user.accentColor,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error(`Login error: ${error}`);
    return res.status(500).json({ error: 'Failed to log in' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required' });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return res.status(403).json({ error: 'Refresh token is invalid or expired' });
    }

    const userPayload = {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      displayName: session.user.displayName,
      status: session.user.status,
    };

    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
    return res.status(200).json({ accessToken });
  } catch (error) {
    logger.error(`Token refresh error: ${error}`);
    return res.status(403).json({ error: 'Refresh token is invalid or expired' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      const session = await prisma.session.findUnique({
        where: { token: refreshToken },
      });
      
      if (session) {
        // Set user status offline on logout
        await prisma.user.update({
          where: { id: session.userId },
          data: { status: UserStatus.OFFLINE },
        });

        await prisma.session.delete({ where: { id: session.id } });
      }
    } catch (error) {
      logger.error(`Logout database cleanup error: ${error}`);
    }
  }

  res.clearCookie('refreshToken');
  logger.info('User logged out successfully');
  return res.status(200).json({ message: 'Logged out successfully' });
};
