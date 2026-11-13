import crypto from 'node:crypto';
import { z } from 'zod';
import env from '../config/env.js';
import { ApiError } from '../middleware/errorHandler.js';
import { createToken } from '../utils/token.js';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(200),
});

/** Constant-time string comparison (hash first so lengths always match). */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function login(req, res, next) {
  const { username, password } = req.body;
  // Evaluate both so timing does not reveal which field was wrong.
  const userOk = safeEqual(username, env.auth.username);
  const passOk = safeEqual(password, env.auth.password);
  if (!(userOk && passOk)) return next(new ApiError(401, 'Invalid username or password'));
  const expiresIn = env.auth.sessionHours * 3600;
  res.json({ token: createToken(env.auth.username, env.auth.secret, expiresIn), expiresIn });
}

export const me = (req, res) => res.json({ user: req.user.sub });
