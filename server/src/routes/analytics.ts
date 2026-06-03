import { Router, Response } from 'express';
import { Meeting } from '../models/Meeting.js';
import { Task } from '../models/Team.js';
import { authenticate } from '../utils/jwt.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const meetings = await Meeting.find({
    $or: [{ hostId: userId }, { participants: userId }],
  }).select('title status durationMinutes createdAt startedAt endedAt actionItems');

  const totalMeetings = meetings.length;
  const liveMeetings = meetings.filter((m) => m.status === 'live').length;
  const endedMeetings = meetings.filter((m) => m.status === 'ended').length;
  const totalDuration = meetings.reduce((sum, m) => sum + (m.durationMinutes || 0), 0);
  const totalActionItems = meetings.reduce((sum, m) => sum + m.actionItems.length, 0);
  const completedActionItems = meetings.reduce(
    (sum, m) => sum + m.actionItems.filter((a) => a.completed).length,
    0
  );

  const tasks = await Task.find({ assignee: userId });
  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  const meetingsByMonth: Record<string, number> = {};
  meetings.forEach((m) => {
    const key = new Date(m.createdAt).toISOString().slice(0, 7);
    meetingsByMonth[key] = (meetingsByMonth[key] || 0) + 1;
  });

  res.json({
    stats: {
      totalMeetings,
      liveMeetings,
      endedMeetings,
      totalDurationMinutes: totalDuration,
      totalActionItems,
      completedActionItems,
      actionItemCompletionRate:
        totalActionItems > 0 ? Math.round((completedActionItems / totalActionItems) * 100) : 0,
      tasksByStatus,
    },
    meetingsByMonth,
    recentMeetings: meetings.slice(0, 5),
  });
});

router.get('/export', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const meetings = await Meeting.find({
    $or: [{ hostId: userId }, { participants: userId }],
  }).select('title status durationMinutes createdAt actionItems');

  const rows = [
    ['Title', 'Status', 'Duration (min)', 'Date', 'Action Items', 'Completed Items'].join(','),
    ...meetings.map((m) =>
      [
        `"${m.title.replace(/"/g, '""')}"`,
        m.status,
        m.durationMinutes || 0,
        new Date(m.createdAt).toISOString().slice(0, 10),
        m.actionItems.length,
        m.actionItems.filter((a) => a.completed).length,
      ].join(',')
    ),
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="intellmeet-analytics.csv"');
  res.send(rows.join('\n'));
});

export default router;
