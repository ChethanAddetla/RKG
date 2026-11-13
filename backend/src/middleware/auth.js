// Requires "Authorization: Bearer <token>" issued by POST /api/auth/login.
import env from '../config/env.js';
import { verifyToken } from '../utils/token.js';
import { ApiError } from './errorHandler.js';

export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = verifyToken(token, env.auth.secret);
  if (!user) return next(new ApiError(401, 'Not logged in or session expired'));
  req.user = user;
  next();
}
