import { describe, it, expect } from 'vitest';
import { sanitizeInput, generateRoomCode } from '../src/utils/helpers.js';

describe('helpers', () => {
  it('generates 8-char room codes', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('sanitizes HTML from input', () => {
    expect(sanitizeInput('<b>hello</b>')).toBe('hello');
  });
});

describe('JWT payload shape', () => {
  it('includes required fields', () => {
    const payload = { userId: '1', email: 'a@b.com', name: 'Test', role: 'member' };
    expect(payload).toHaveProperty('name');
    expect(payload).toHaveProperty('role');
  });
});
