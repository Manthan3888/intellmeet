import { Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AuthRequest } from '../types/index.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ message: 'Validation failed', errors: result.error.flatten() });
      return;
    }
    req.body = result.data;
    next();
  };
}
