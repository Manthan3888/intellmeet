import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: '15m' });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
