import type { Server } from 'socket.io';

let io: Server | null = null;

export function setIO(server: Server): void {
  io = server;
}

export function getIO(): Server | null {
  return io;
}

export function emitToProject(projectId: string, event: string, data: unknown): void {
  io?.to(`project:${projectId}`).emit(event, data);
}

export function emitToRoom(roomCode: string, event: string, data: unknown): void {
  io?.to(roomCode).emit(event, data);
}
