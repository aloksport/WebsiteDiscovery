import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import { AuthedRequest, JWT_SECRET, requireAuth } from '../middleware/auth';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only these roles are allowed to sign in to the admin panel. A 'user'
// account can exist (see routes/users.ts) but can't log in.
const LOGIN_ALLOWED_ROLES = ['admin', 'manager'];

// POST /api/auth/login  body: { email, password }
router.post('/login', async (req: Request, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !EMAIL_RE.test(email) || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await db('users').whereRaw('lower(email) = ?', [email]).first();
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });

  if (!LOGIN_ALLOWED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Your account does not have access to the admin panel' });
  }

  const payload = { id: user.id, fullName: user.full_name, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

// GET /api/auth/me - used by the admin SPA to restore a session on load
router.get('/me', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
