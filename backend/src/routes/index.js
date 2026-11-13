import { Router } from 'express';
import * as contacts from '../controllers/contacts.controller.js';
import * as messages from '../controllers/messages.controller.js';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Public routes
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
// Brute-force protection: 10 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many login attempts, try again later' } },
});
router.post('/auth/login', loginLimiter, validate(auth.loginSchema), auth.login);

// Everything below requires a valid login token
router.use(requireAuth);
router.get('/auth/me', auth.me);

router.get('/contacts', contacts.listContacts);
router.post('/contacts', validate(contacts.contactSchema), contacts.createContact);
router.post('/contacts/import', validate(contacts.importSchema), contacts.importContacts);
router.put('/contacts/:id', validate(contacts.contactSchema), contacts.updateContact);
router.delete('/contacts/:id', contacts.deleteContact);

router.post('/messages/send', validate(messages.sendSchema), messages.sendMessages);
router.get('/messages/logs', messages.getLogs);

export default router;
