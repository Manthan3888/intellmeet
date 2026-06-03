import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import { z } from 'zod';
import { User } from '../models/User.js';
import { authenticate } from '../utils/jwt.js';
import { validateBody } from '../middleware/validate.js';
import { AuthRequest } from '../types/index.js';
import { uploadAvatar } from '../services/uploadService.js';

const router = Router();
const upload = multer({ dest: 'uploads/tmp', limits: { fileSize: 5 * 1024 * 1024 } });

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().optional(),
});

router.patch('/profile', authenticate, validateBody(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(req.user!.userId, req.body, { new: true }).select(
    '-password -refreshToken'
  );
  res.json({ user });
});

router.post('/avatar', authenticate, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: 'Avatar file required' });
    return;
  }

  try {
    const avatarUrl = await uploadAvatar(req.file.path);
    const user = await User.findByIdAndUpdate(req.user!.userId, { avatar: avatarUrl }, { new: true }).select(
      '-password -refreshToken'
    );
    res.json({ user, avatarUrl });
  } finally {
    await fs.unlink(req.file.path).catch(() => undefined);
  }
});

router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string) || '';
  if (q.length < 2) {
    res.json({ users: [] });
    return;
  }
  const users = await User.find({
    $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }],
    _id: { $ne: req.user!.userId },
  })
    .select('name email avatar')
    .limit(10);
  res.json({ users });
});

export default router;
