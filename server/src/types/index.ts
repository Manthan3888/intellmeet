import { Request } from 'express';
import { TokenPayload } from '../utils/jwt.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}
