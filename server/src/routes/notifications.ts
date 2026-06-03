import { Router, Response } from 'express';
import { Notification } from '../models/Team.js';
import { authenticate } from '../utils/jwt.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const notifications = await Notification.find({ userId: req.user!.userId })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ notifications });
});

router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user!.userId }, { read: true });
  res.json({ message: 'Marked as read' });
});

router.post('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  await Notification.updateMany({ userId: req.user!.userId, read: false }, { read: true });
  res.json({ message: 'All marked as read' });
});

export default router;
