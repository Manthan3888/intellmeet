import { Router, Response } from 'express';
import { User } from '../models/User.js';
import { Meeting } from '../models/Meeting.js';
import { Task } from '../models/Team.js';
import { authenticate } from '../utils/jwt.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

function requireAdmin(req: AuthRequest, res: Response, next: () => void) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
}

router.use(authenticate, requireAdmin);

router.get('/stats', async (_req: AuthRequest, res: Response) => {
  const [users, meetings, liveMeetings, tasks] = await Promise.all([
    User.countDocuments(),
    Meeting.countDocuments(),
    Meeting.countDocuments({ status: 'live' }),
    Task.countDocuments(),
  ]);

  res.json({
    stats: { users, meetings, liveMeetings, tasks },
  });
});

router.get('/users', async (_req: AuthRequest, res: Response) => {
  const users = await User.find().select('name email role createdAt avatar').sort({ createdAt: -1 }).limit(100);
  res.json({ users });
});

router.patch('/users/:id/role', async (req: AuthRequest, res: Response) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    res.status(400).json({ message: 'Invalid role' });
    return;
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password -refreshToken');
  res.json({ user });
});

export default router;
