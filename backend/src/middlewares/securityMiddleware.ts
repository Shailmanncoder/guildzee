import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Rate Limiter for Authentication routes: Max 15 logins/registers per 15 minutes per IP
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: {
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter for Messaging routes: Max 60 messages per minute per IP
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: 'You are messaging too quickly! Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to escape HTML tags to prevent Stored XSS injection in chat feeds
export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Input sanitization middleware to auto-escape 'content' strings in request bodies
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body.content === 'string') {
    req.body.content = escapeHtml(req.body.content.trim());
  }
  next();
};
