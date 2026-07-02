import { Request } from 'express';
import { UserStatus } from '@prisma/client';

export interface UserPayload {
  id: string;
  email: string;
  username: string;
  displayName: string;
  status: UserStatus;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}
