import { Router } from 'express';
import * as contacts from '../controllers/contacts.controller.js';
import * as messages from '../controllers/messages.controller.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

router.get('/contacts', contacts.listContacts);
router.post('/contacts', validate(contacts.contactSchema), contacts.createContact);
router.post('/contacts/import', validate(contacts.importSchema), contacts.importContacts);
router.put('/contacts/:id', validate(contacts.contactSchema), contacts.updateContact);
router.delete('/contacts/:id', contacts.deleteContact);

router.post('/messages/send', validate(messages.sendSchema), messages.sendMessages);
router.get('/messages/logs', messages.getLogs);

export default router;
