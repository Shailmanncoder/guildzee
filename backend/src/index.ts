import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import apiRouter from './routes/api';
import { initSocketServer } from './services/socketService';
import { errorHandler } from './middlewares/errorMiddleware';
import { logger } from './utils/logger';

const app = express();

// Strip /api/backend prefix when routed via Vercel multi-service rewrites
app.use((req, res, next) => {
  if (req.url.startsWith('/api/backend')) {
    req.url = req.url.replace('/api/backend', '');
    if (!req.url.startsWith('/')) {
      req.url = '/' + req.url;
    }
  }
  next();
});

const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Allow cross-origin images to be read in browsers
  })
);

app.use(
  cors({
    origin: true, // Auto-reflect client origins
    credentials: true, // Allow cookies
  })
);

// Standard Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static served folder for file attachments and custom user avatar uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes mapping
app.use('/api', apiRouter);

// Base health indicator
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Socket server setup
initSocketServer(server);

// Global Error Handler middleware
app.use(errorHandler);

// Launch
server.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
