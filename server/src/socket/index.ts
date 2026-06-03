import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { Meeting } from '../models/Meeting.js';
import { sanitizeInput } from '../utils/helpers.js';
import { setIO } from './ioInstance.js';
import { socketConnectionsGauge, activeMeetingsGauge } from '../middleware/metrics.js';

interface SocketUser {
  userId: string;
  userName: string;
  roomCode?: string;
}

interface ParticipantInfo {
  socketId: string;
  userId: string;
  userName: string;
  isMuted: boolean;
  isVideoOff: boolean;
}

const roomParticipants = new Map<string, Map<string, ParticipantInfo>>();

export function setupSocket(io: Server): void {
  setIO(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      (socket.data as SocketUser).userId = payload.userId;
      (socket.data as SocketUser).userName = payload.name || payload.email.split('@')[0];
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    socketConnectionsGauge.inc();
    const userData = socket.data as SocketUser;

    socket.on('join-room', async ({ roomCode, userName }: { roomCode: string; userName: string }) => {
      const code = roomCode.toUpperCase();
      userData.roomCode = code;
      userData.userName = userName || userData.userName;

      socket.join(code);

      if (!roomParticipants.has(code)) {
        roomParticipants.set(code, new Map());
      }
      const room = roomParticipants.get(code)!;
      room.set(socket.id, {
        socketId: socket.id,
        userId: userData.userId,
        userName: userData.userName,
        isMuted: false,
        isVideoOff: false,
      });

      const participants = Array.from(room.values());
      socket.to(code).emit('user-joined', { socketId: socket.id, userId: userData.userId, userName: userData.userName });
      socket.emit('room-participants', participants);

      const meeting = await Meeting.findOne({ roomCode: code });
      if (meeting) {
        socket.emit('chat-history', meeting.chatMessages.slice(-50));
        socket.emit('notes-sync', { content: meeting.sharedNotes || '', updatedBy: 'system' });
      }
    });

    socket.on('webrtc-offer', ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
      io.to(to).emit('webrtc-offer', { from: socket.id, offer });
    });

    socket.on('webrtc-answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
      io.to(to).emit('webrtc-answer', { from: socket.id, answer });
    });

    socket.on('webrtc-ice-candidate', ({ to, candidate }: { to: string; candidate: RTCIceCandidateInit }) => {
      io.to(to).emit('webrtc-ice-candidate', { from: socket.id, candidate });
    });

    socket.on('chat-message', async ({ message }: { message: string }) => {
      const code = userData.roomCode;
      if (!code || !message?.trim()) return;

      const sanitized = sanitizeInput(message).slice(0, 2000);
      const chatMsg = {
        userId: userData.userId,
        userName: userData.userName,
        message: sanitized,
        timestamp: new Date(),
      };

      io.to(code).emit('chat-message', chatMsg);

      await Meeting.findOneAndUpdate(
        { roomCode: code },
        { $push: { chatMessages: chatMsg, transcript: `${userData.userName}: ${sanitized}` } }
      );
    });

    socket.on('typing', ({ isTyping }: { isTyping: boolean }) => {
      if (userData.roomCode) {
        socket.to(userData.roomCode).emit('user-typing', { userId: userData.userId, userName: userData.userName, isTyping });
      }
    });

    socket.on('media-state', ({ isMuted, isVideoOff }: { isMuted: boolean; isVideoOff: boolean }) => {
      const code = userData.roomCode;
      if (!code) return;
      const room = roomParticipants.get(code);
      const participant = room?.get(socket.id);
      if (participant) {
        participant.isMuted = isMuted;
        participant.isVideoOff = isVideoOff;
        io.to(code).emit('participant-media-update', { socketId: socket.id, isMuted, isVideoOff });
      }
    });

    socket.on('join-project', ({ projectId }: { projectId: string }) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('transcript-chunk', async ({ text }: { text: string }) => {
      const code = userData.roomCode;
      if (!code || !text?.trim()) return;
      const chunk = sanitizeInput(text).slice(0, 1000);
      const line = `${userData.userName}: ${chunk}`;
      io.to(code).emit('live-transcript', { text: line, userName: userData.userName });
      const meeting = await Meeting.findOne({ roomCode: code });
      if (meeting) {
        meeting.transcript = [meeting.transcript, line].filter(Boolean).join('\n');
        await meeting.save();
      }
    });

    socket.on('notes-update', async ({ content }: { content: string }) => {
      const code = userData.roomCode;
      if (!code) return;

      const sanitized = sanitizeInput(content).slice(0, 10000);
      await Meeting.findOneAndUpdate({ roomCode: code }, { sharedNotes: sanitized });
      socket.to(code).emit('notes-sync', { content: sanitized, updatedBy: userData.userName });
    });

    socket.on('screen-share-started', () => {
      if (userData.roomCode) {
        socket.to(userData.roomCode).emit('screen-share-started', { socketId: socket.id, userName: userData.userName });
      }
    });

    socket.on('screen-share-stopped', () => {
      if (userData.roomCode) {
        socket.to(userData.roomCode).emit('screen-share-stopped', { socketId: socket.id });
      }
    });

    socket.on('leave-room', () => handleLeave(socket, userData));

    socket.on('disconnect', () => {
      socketConnectionsGauge.dec();
      handleLeave(socket, userData);
    });
  });
}

function handleLeave(socket: Socket, userData: SocketUser): void {
  const code = userData.roomCode;
  if (!code) return;

  const room = roomParticipants.get(code);
  room?.delete(socket.id);
  if (room?.size === 0) {
    roomParticipants.delete(code);
  }

  socket.to(code).emit('user-left', { socketId: socket.id, userId: userData.userId });
  socket.leave(code);
  userData.roomCode = undefined;
}
