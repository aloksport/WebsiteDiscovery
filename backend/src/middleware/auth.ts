import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// In production, set a real JWT_SECRET in .env - see .env.example.
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    'WARNING: JWT_SECRET is not set - using an insecure default. Set JWT_SECRET in your .env before deploying.'
  );
}

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

// Applied as a blanket prefix middleware on /api/admin (see index.ts) so
// every admin-only API route requires a valid, non-expired token.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Login required' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = { id: payload.id, fullName: payload.fullName, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired, please log in again' });
  }
}
