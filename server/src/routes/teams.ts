import { Router, Response } from 'express';
import { z } from 'zod';
import { Team, Project, Task, Notification } from '../models/Team.js';
import { User } from '../models/User.js';
import { authenticate } from '../utils/jwt.js';
import { validateBody } from '../middleware/validate.js';
import { AuthRequest } from '../types/index.js';
import { emitToProject } from '../socket/ioInstance.js';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const teams = await Team.find({
    $or: [{ ownerId: userId }, { 'members.userId': userId }],
  }).populate('ownerId', 'name email avatar');
  res.json({ teams });
});

router.post('/', authenticate, validateBody(createTeamSchema), async (req: AuthRequest, res: Response) => {
  const team = await Team.create({
    name: req.body.name,
    description: req.body.description,
    ownerId: req.user!.userId,
    members: [{ userId: req.user!.userId, role: 'admin' }],
  });
  res.status(201).json({ team });
});

router.post('/:id/members', authenticate, async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  const team = await Team.findById(req.params.id);
  if (!team) {
    res.status(404).json({ message: 'Team not found' });
    return;
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  if (team.members.some((m) => m.userId.toString() === user._id.toString())) {
    res.status(409).json({ message: 'User already in team' });
    return;
  }

  team.members.push({ userId: user._id, role: 'member', joinedAt: new Date() });
  await team.save();

  await Notification.create({
    userId: user._id,
    type: 'mention',
    title: 'Team invitation',
    message: `You were added to team "${team.name}"`,
    link: `/teams/${team._id}`,
  });

  res.json({ team });
});

router.get('/:id/projects', authenticate, async (req: AuthRequest, res: Response) => {
  const projects = await Project.find({ teamId: req.params.id });
  res.json({ projects });
});

router.post('/:id/projects', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;
  const project = await Project.create({
    name,
    description,
    teamId: req.params.id,
    createdBy: req.user!.userId,
  });
  res.status(201).json({ project });
});

router.get('/projects/:projectId/tasks', authenticate, async (req: AuthRequest, res: Response) => {
  const tasks = await Task.find({ projectId: req.params.projectId }).sort({ order: 1, createdAt: -1 });
  res.json({ tasks });
});

router.post('/projects/:projectId/tasks', authenticate, async (req: AuthRequest, res: Response) => {
  const { title, description, status, assigneeName } = req.body;
  const count = await Task.countDocuments({ projectId: req.params.projectId });
  const task = await Task.create({
    title,
    description,
    status: status || 'todo',
    assigneeName,
    projectId: req.params.projectId,
    order: count,
  });
  res.status(201).json({ task });
});

router.patch('/tasks/:taskId', authenticate, async (req: AuthRequest, res: Response) => {
  const { status, title, order } = req.body;
  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (title) update.title = title;
  if (order !== undefined) update.order = order;

  const task = await Task.findByIdAndUpdate(req.params.taskId, update, { new: true });
  if (!task) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }
  emitToProject(task.projectId.toString(), 'task-updated', task);
  res.json({ task });
});

router.delete('/tasks/:taskId', authenticate, async (req: AuthRequest, res: Response) => {
  await Task.findByIdAndDelete(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

export default router;
