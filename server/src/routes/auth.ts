import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { authenticate, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { validateBody } from '../middleware/validate.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many auth attempts, try again later' },
});

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/signup', authLimiter, validateBody(signupSchema), async (req: AuthRequest, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed });

  const payload = { userId: user._id.toString(), email: user.email, name: user.name, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  user.refreshToken = refreshToken;
  await user.save();

  res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    accessToken,
    refreshToken,
  });
});

router.post('/login', authLimiter, validateBody(loginSchema), async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  const payload = { userId: user._id.toString(), email: user.email, name: user.name, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    accessToken,
    refreshToken,
  });
});

router.post('/refresh', async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ message: 'Refresh token required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ message: 'Invalid refresh token' });
      return;
    }

    const newPayload = { userId: user._id.toString(), email: user.email, name: user.name, role: user.role };
    const accessToken = signAccessToken(newPayload);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  await User.findByIdAndUpdate(req.user!.userId, { refreshToken: null });
  res.json({ message: 'Logged out' });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.userId).select('-password -refreshToken');
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json({ user });
});

const googleSchema = z.object({ idToken: z.string() });

router.post('/google', authLimiter, validateBody(googleSchema), async (req: AuthRequest, res: Response) => {
  const { verifyGoogleToken } = await import('../services/googleAuth.js');
  const googleUser = await verifyGoogleToken(req.body.idToken);

  if (!googleUser) {
    res.status(401).json({ message: 'Google authentication failed or not configured' });
    return;
  }

  let user = await User.findOne({ email: googleUser.email });
  if (!user) {
    user = await User.create({
      name: googleUser.name,
      email: googleUser.email,
      password: await bcrypt.hash(Math.random().toString(36), 12),
      avatar: googleUser.picture,
      role: 'member',
    });
  } else if (googleUser.picture && !user.avatar) {
    user.avatar = googleUser.picture;
    await user.save();
  }

  const payload = { userId: user._id.toString(), email: user.email, name: user.name, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    accessToken,
    refreshToken,
  });
});

export default router;
