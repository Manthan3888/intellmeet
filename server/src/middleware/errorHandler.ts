import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';

export function errorHandler(err: Error, _req: AuthRequest, res: Response, _next: NextFunction): void {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal server error' });
}
