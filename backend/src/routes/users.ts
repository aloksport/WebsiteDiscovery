import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { AuthedRequest } from '../middleware/auth';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['admin', 'manager', 'user'];

function sanitize(u: any) {
  const { password_hash, ...rest } = u;
  return rest;
}

// GET /api/admin/users
router.get('/', async (_req: AuthedRequest, res: Response) => {
  const users = await db('users')
    .select('id', 'full_name', 'email', 'phone', 'role', 'created_at', 'updated_at')
    .orderBy('full_name');
  res.json(users);
});

// POST /api/admin/users
router.post('/', async (req: AuthedRequest, res: Response) => {
  const { fullName, email, phone, password, role } = req.body;

  if (!fullName || !String(fullName).trim()) return res.status(400).json({ error: 'Full name is required' });
  if (!email || !EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: 'A valid email is required' });
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const finalRole = ROLES.includes(role) ? role : 'user';

  const dup = await db('users').whereRaw('lower(email) = ?', [String(email).trim().toLowerCase()]).first();
  if (dup) return res.status(409).json({ error: 'A user with this email already exists' });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const [row] = await db('users')
    .insert({
      full_name: String(fullName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : null,
      password_hash: passwordHash,
      role: finalRole,
    })
    .returning('*');
  res.status(201).json(sanitize(row));
});

// PUT /api/admin/users/:id
router.put('/:id', async (req: AuthedRequest, res: Response) => {
  const existing = await db('users').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const { fullName, email, phone, password, role } = req.body;
  if (!fullName || !String(fullName).trim()) return res.status(400).json({ error: 'Full name is required' });
  if (!email || !EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: 'A valid email is required' });
  const finalRole = ROLES.includes(role) ? role : existing.role;

  const dup = await db('users')
    .whereRaw('lower(email) = ?', [String(email).trim().toLowerCase()])
    .whereNot({ id: req.params.id })
    .first();
  if (dup) return res.status(409).json({ error: 'A user with this email already exists' });

  const update: Record<string, any> = {
    full_name: String(fullName).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : null,
    role: finalRole,
    updated_at: db.fn.now(),
  };

  if (password) {
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    update.password_hash = await bcrypt.hash(String(password), 10);
  }

  const [row] = await db('users').where({ id: req.params.id }).update(update).returning('*');
  res.json(sanitize(row));
});

// DELETE /api/admin/users/:id
router.delete('/:id', async (req: AuthedRequest, res: Response) => {
  const existing = await db('users').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'User not found' });

  if (req.user && req.user.id === Number(req.params.id)) {
    return res.status(400).json({ error: "You can't delete your own account while logged in" });
  }

  await db('users').where({ id: req.params.id }).delete();
  res.status(204).send();
});

export default router;
