import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  logger.error(`Error encountered: ${err.message || err}\nStack: ${err.stack || 'No stack'}`);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(status).json({
    error: process.env.NODE_ENV === 'development' ? message : 'Something went wrong on the server',
  });
};
export default errorHandler;
