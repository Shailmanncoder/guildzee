import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  logger.error(`Redis Client Error: ${err}`);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis successfully');
});

// Initialize connection
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error(`Failed to connect to Redis on startup: ${error}`);
  }
})();

export default redisClient;
