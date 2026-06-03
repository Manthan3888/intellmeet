import { Router, Response } from 'express';
import { z } from 'zod';
import { Meeting } from '../models/Meeting.js';
import { User } from '../models/User.js';
import { Task, Project } from '../models/Team.js';
import { Notification } from '../models/Team.js';
import { authenticate } from '../utils/jwt.js';
import { validateBody } from '../middleware/validate.js';
import { AuthRequest } from '../types/index.js';
import { generateRoomCode, sanitizeInput } from '../utils/helpers.js';
import { analyzeMeetingTranscript } from '../services/aiService.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';
import multer from 'multer';
import fs from 'fs/promises';
import { uploadRecording } from '../services/uploadService.js';

const router = Router();
const recordingUpload = multer({ dest: 'uploads/tmp', limits: { fileSize: 100 * 1024 * 1024 } });

const createMeetingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime().optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const q = (req.query.q as string) || '';
  const status = req.query.status as string | undefined;

  const filter: Record<string, unknown> = {
    $or: [{ hostId: userId }, { participants: userId }],
  };

  if (q.length >= 2) {
    filter.$and = [
      { $or: [{ hostId: userId }, { participants: userId }] },
      { $or: [{ title: { $regex: q, $options: 'i' } }, { roomCode: { $regex: q, $options: 'i' } }] },
    ];
    delete filter.$or;
  }

  if (status && ['scheduled', 'live', 'ended'].includes(status)) {
    filter.status = status;
  }

  const meetings = await Meeting.find(filter).sort({ createdAt: -1 }).select('-chatMessages');

  res.json({ meetings });
});

router.post('/', authenticate, validateBody(createMeetingSchema), async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const meeting = await Meeting.create({
    title: sanitizeInput(req.body.title),
    description: req.body.description ? sanitizeInput(req.body.description) : undefined,
    hostId: user._id,
    hostName: user.name,
    roomCode: generateRoomCode(),
    scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
    participants: [user._id],
  });

  res.status(201).json({ meeting });
});

router.get('/join/:roomCode', authenticate, async (req: AuthRequest, res: Response) => {
  const roomCode = String(req.params.roomCode).toUpperCase();
  const cacheKey = `meeting:${roomCode}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    res.json({ meeting: JSON.parse(cached) });
    return;
  }

  const meeting = await Meeting.findOne({ roomCode }).select('-chatMessages');
  if (!meeting) {
    res.status(404).json({ message: 'Meeting not found' });
    return;
  }

  await cacheSet(cacheKey, JSON.stringify(meeting), 60);
  res.json({ meeting });
});

router.post('/join/:roomCode', authenticate, async (req: AuthRequest, res: Response) => {
  const roomCode = String(req.params.roomCode).toUpperCase();
  const userId = req.user!.userId;

  const meeting = await Meeting.findOne({ roomCode });
  if (!meeting) {
    res.status(404).json({ message: 'Meeting not found' });
    return;
  }

  if (!meeting.participants.some((p) => p.toString() === userId)) {
    meeting.participants.push(userId as unknown as typeof meeting.participants[0]);
    await meeting.save();
  }

  if (meeting.status === 'scheduled') {
    meeting.status = 'live';
    meeting.startedAt = new Date();
    await meeting.save();
  }

  await cacheDel(`meeting:${roomCode}`);
  res.json({ meeting });
});

router.get('/:id/export', authenticate, async (req: AuthRequest, res: Response) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) {
    res.status(404).json({ message: 'Meeting not found' });
    return;
  }

  const exportData = {
    title: meeting.title,
    hostName: meeting.hostName,
    roomCode: meeting.roomCode,
    status: meeting.status,
    durationMinutes: meeting.durationMinutes,
    summary: meeting.summary,
    sharedNotes: meeting.sharedNotes,
    actionItems: meeting.actionItems,
    transcript: meeting.transcript,
    chatMessages: meeting.chatMessages,
    exportedAt: new Date().toISOString(),
  };

  res.setHeader('Content-Disposition', `attachment; filename="meeting-${meeting.roomCode}.json"`);
  res.json(exportData);
});

router.post('/:id/recording', authenticate, recordingUpload.single('recording'), async (req: AuthRequest, res: Response) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) {
    res.status(404).json({ message: 'Meeting not found' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ message: 'Recording file required' });
    return;
  }

  try {
    const buffer = await fs.readFile(req.file.path);
    const recordingUrl = await uploadRecording(buffer, meeting._id.toString());
    meeting.recordingUrl = recordingUrl;
    await meeting.save();
    res.json({ recordingUrl });
  } finally {
    await fs.unlink(req.file.path).catch(() => undefined);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const meeting = await Meeting.findById(req.params.id)
    .populate('participants', 'name email avatar')
    .populate('actionItems.assignee', 'name email');

  if (!meeting) {
    res.status(404).json({ message: 'Meeting not found' });
    return;
  }

  res.json({ meeting });
});

router.post('/:id/end', authenticate, async (req: AuthRequest, res: Response) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) {
    res.status(404).json({ message: 'Meeting not found' });
    return;
  }

  if (meeting.hostId.toString() !== req.user!.userId) {
    res.status(403).json({ message: 'Only host can end meeting' });
    return;
  }

  meeting.status = 'ended';
  meeting.endedAt = new Date();
  if (meeting.startedAt) {
    meeting.durationMinutes = Math.round((meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 60000);
  }

  const participants = await User.find({ _id: { $in: meeting.participants } }).select('name');
  const participantNames = participants.map((p) => p.name);

  const chatTranscript = meeting.chatMessages.map((m) => `${m.userName}: ${m.message}`).join('\n');
  const notesSection = meeting.sharedNotes ? `Shared Notes:\n${meeting.sharedNotes}` : '';
  const fullTranscript = [meeting.transcript, notesSection, chatTranscript].filter(Boolean).join('\n');

  const analysis = await analyzeMeetingTranscript(fullTranscript, meeting.title, participantNames);
  meeting.summary = analysis.summary;
  meeting.actionItems = analysis.actionItems.map((item) => ({
    text: item.text,
    assigneeName: item.assigneeHint,
    completed: false,
  }));

  await meeting.save();
  await cacheDel(`meeting:${meeting.roomCode}`);

  for (const item of meeting.actionItems) {
    if (item.assigneeName) {
      const assignee = participants.find((p) => p.name.toLowerCase().includes(item.assigneeName!.toLowerCase()));
      if (assignee) {
        await Notification.create({
          userId: assignee._id,
          type: 'action_item',
          title: 'New action item',
          message: item.text,
          link: `/meetings/${meeting._id}`,
        });
      }
    }
  }

  res.json({ meeting, usedAI: analysis.usedAI });
});

router.patch('/:id/action-items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  const { completed } = req.body;
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) {
    res.status(404).json({ message: 'Meeting not found' });
    return;
  }

  const item = meeting.actionItems.find((a) => a._id?.toString() === req.params.itemId);
  if (!item) {
    res.status(404).json({ message: 'Action item not found' });
    return;
  }

  item.completed = Boolean(completed);
  await meeting.save();
  res.json({ meeting });
});

router.post('/:id/create-tasks', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.body;
  if (!projectId) {
    res.status(400).json({ message: 'projectId required' });
    return;
  }

  const meeting = await Meeting.findById(req.params.id);
  const project = await Project.findById(projectId);
  if (!meeting || !project) {
    res.status(404).json({ message: 'Meeting or project not found' });
    return;
  }

  const tasks = [];
  for (let i = 0; i < meeting.actionItems.length; i++) {
    const item = meeting.actionItems[i];
    tasks.push(
      await Task.create({
        title: item.text,
        status: item.completed ? 'done' : 'todo',
        assigneeName: item.assigneeName,
        projectId: project._id,
        meetingId: meeting._id,
        order: i,
      })
    );
  }

  res.status(201).json({ tasks });
});

router.post('/:id/quick-task', authenticate, async (req: AuthRequest, res: Response) => {
  const { text, assigneeName } = req.body;
  if (!text?.trim()) {
    res.status(400).json({ message: 'Task text required' });
    return;
  }

  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) {
    res.status(404).json({ message: 'Meeting not found' });
    return;
  }

  const item = {
    text: sanitizeInput(text).slice(0, 500),
    assigneeName: assigneeName ? sanitizeInput(assigneeName) : undefined,
    completed: false,
  };

  meeting.actionItems.push(item);
  meeting.transcript += `\n[Task] ${item.text}${item.assigneeName ? ` (@${item.assigneeName})` : ''}`;
  await meeting.save();

  const { emitToRoom } = await import('../socket/ioInstance.js');
  emitToRoom(meeting.roomCode, 'quick-task-created', item);

  res.status(201).json({ meeting, actionItem: meeting.actionItems[meeting.actionItems.length - 1] });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) {
    res.status(404).json({ message: 'Meeting not found' });
    return;
  }

  if (meeting.hostId.toString() !== req.user!.userId) {
    res.status(403).json({ message: 'Only host can delete meeting' });
    return;
  }

  await meeting.deleteOne();
  await cacheDel(`meeting:${meeting.roomCode}`);
  res.json({ message: 'Meeting deleted' });
});

export default router;
