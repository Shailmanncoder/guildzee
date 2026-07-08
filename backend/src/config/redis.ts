import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL;

// Create a no-op stub used when Redis is not configured
const createNoOpClient = () => ({
  hSet: async () => {},
  hDel: async () => {},
  hGetAll: async () => ({}),
  get: async () => null,
  set: async () => {},
  del: async () => {},
  isOpen: false,
  isReady: false,
});

let _redisClient: any = createNoOpClient();
let _redisAvailable = false;

if (redisUrl) {
  const client = createClient({ url: redisUrl });

  client.on('error', (err) => {
    logger.error(`Redis Client Error: ${err}`);
  });

  client.on('connect', () => {
    logger.info('Connected to Redis successfully');
    _redisAvailable = true;
  });

  // Connect without blocking server startup
  client.connect().catch((error) => {
    logger.warn(`Redis unavailable, running without it: ${error}`);
  });

  _redisClient = client;
} else {
  logger.warn('REDIS_URL not set — running without Redis (presence tracking disabled)');
}

export const redisClient = _redisClient;
export const redisAvailable = () => _redisAvailable;
export default redisClient;
