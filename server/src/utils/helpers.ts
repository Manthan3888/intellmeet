import { v4 as uuidv4 } from 'uuid';

export function generateRoomCode(): string {
  return uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}
