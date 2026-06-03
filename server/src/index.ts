import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { getRedis } from './config/redis.js';
import { errorHandler } from './middleware/errorHandler.js';
import { metricsMiddleware, register, activeMeetingsGauge } from './middleware/metrics.js';
import { setupSocket } from './socket/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import meetingRoutes from './routes/meetings.js';
import teamRoutes from './routes/teams.js';
import analyticsRoutes from './routes/analytics.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import { Meeting } from './models/Meeting.js';

function resolveClientDist(): string | null {
  const candidates = [
    path.join(process.cwd(), 'client/dist'),
    path.join(process.cwd(), '../client/dist'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(metricsMiddleware);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', async (_req, res) => {
  const liveMeetings = await Meeting.countDocuments({ status: 'live' }).catch(() => 0);
  activeMeetingsGauge.set(liveMeetings);
  res.json({
    status: 'ok',
    service: 'IntellMeet API',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    liveMeetings,
  });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

if (config.nodeEnv === 'production') {
  const clientDist = resolveClientDist();
  if (clientDist) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
}

app.use(errorHandler);

setupSocket(io);

async function start() {
  await connectDB();
  getRedis();

  server.listen(config.port, () => {
    console.log(`IntellMeet server running on port ${config.port}`);
  });
}

start().catch(console.error);

export { app, io };
