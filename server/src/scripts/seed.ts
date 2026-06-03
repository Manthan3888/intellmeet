import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Meeting } from '../models/Meeting.js';
import { Team, Project, Task } from '../models/Team.js';
import { generateRoomCode } from '../utils/helpers.js';

dotenv.config();

async function seed() {
  await connectDB();

  await Promise.all([User.deleteMany({}), Meeting.deleteMany({}), Team.deleteMany({}), Project.deleteMany({}), Task.deleteMany({})]);

  const password = await bcrypt.hash('demo1234', 12);

  const demoUser = await User.create({
    name: 'Demo User',
    email: 'demo@intellmeet.com',
    password,
    role: 'admin',
  });

  const teammate = await User.create({
    name: 'Alex Johnson',
    email: 'alex@intellmeet.com',
    password,
    role: 'member',
  });

  const endedMeeting = await Meeting.create({
    title: 'Q1 Product Review',
    description: 'Quarterly planning and roadmap discussion',
    hostId: demoUser._id,
    hostName: demoUser.name,
    roomCode: generateRoomCode(),
    status: 'ended',
    startedAt: new Date(Date.now() - 3600000),
    endedAt: new Date(Date.now() - 1800000),
    durationMinutes: 30,
    participants: [demoUser._id, teammate._id],
    transcript: 'Demo User: Let us review the Q1 roadmap.\nAlex Johnson: I will prepare the design mockups by Friday.\nDemo User: Action item - Alex to share mockups. We need to schedule follow-up next week.',
    summary:
      'The team reviewed the Q1 product roadmap and aligned on priorities. Key decisions included focusing on AI meeting intelligence features and improving real-time collaboration. Alex committed to delivering design mockups by Friday.',
    actionItems: [
      { text: 'Share design mockups by Friday', assigneeName: 'Alex Johnson', completed: false },
      { text: 'Schedule follow-up meeting next week', assigneeName: 'Demo User', completed: true },
    ],
    chatMessages: [
      { userId: demoUser._id, userName: demoUser.name, message: 'Let us review the Q1 roadmap.', timestamp: new Date() },
      { userId: teammate._id, userName: teammate.name, message: 'I will prepare the design mockups by Friday.', timestamp: new Date() },
    ],
    sharedNotes: '## Q1 Priorities\n- AI summaries\n- WebRTC video\n- Kanban integration',
  });

  await Meeting.create({
    title: 'Daily Standup',
    hostId: demoUser._id,
    hostName: demoUser.name,
    roomCode: 'DEMO1234',
    status: 'scheduled',
    participants: [demoUser._id],
    sharedNotes: '',
  });

  const team = await Team.create({
    name: 'Engineering',
    description: 'Core product engineering team',
    ownerId: demoUser._id,
    members: [
      { userId: demoUser._id, role: 'admin', joinedAt: new Date() },
      { userId: teammate._id, role: 'member', joinedAt: new Date() },
    ],
  });

  const project = await Project.create({
    name: 'IntellMeet v1',
    description: 'MVP launch board',
    teamId: team._id,
    createdBy: demoUser._id,
  });

  await Task.create([
    { title: 'Integrate OpenAI summaries', status: 'done', projectId: project._id, order: 0, assigneeName: 'Demo User' },
    { title: 'WebRTC video room polish', status: 'in-progress', projectId: project._id, order: 1, assigneeName: 'Alex Johnson' },
    { title: 'Deploy to production', status: 'todo', projectId: project._id, order: 2, meetingId: endedMeeting._id },
  ]);

  console.log('Seed complete!');
  console.log('Demo login: demo@intellmeet.com / demo1234');
  console.log('Join code: DEMO1234');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
