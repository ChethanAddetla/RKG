import { z } from 'zod';
import { contactsRepo, logsRepo } from '../db/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendTemplate, sendText } from '../services/whatsapp.service.js';

const MAX_RECIPIENTS = 50;
const DELAY_MS = 200;

export const sendSchema = z
  .object({
    contactIds: z
      .array(z.number().int().positive())
      .min(1, 'Select at least one contact')
      .max(MAX_RECIPIENTS, `Maximum ${MAX_RECIPIENTS} recipients per request`),
    type: z.enum(['template', 'text']),
    message: z.string().trim().max(4096).optional(),
    template: z
      .object({
        name: z.string().trim().min(1, 'Template name is required'),
        languageCode: z.string().trim().min(1, 'Language code is required'),
        variables: z.array(z.string().trim().min(1, 'Variables cannot be empty')).max(20).default([]),
      })
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'text' && !v.message) ctx.addIssue({ code: 'custom', path: ['message'], message: 'Message is required for text type' });
    if (v.type === 'template' && !v.template) ctx.addIssue({ code: 'custom', path: ['template'], message: 'Template is required for template type' });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Replace {{name}} / {{phone}} (case-insensitive, spaces allowed) with the contact's values. */
export function resolvePlaceholders(text, contact) {
  return text
    .replace(/\{\{\s*name\s*\}\}/gi, () => contact.name)
    .replace(/\{\{\s*phone\s*\}\}/gi, () => contact.phone);
}

export const sendMessages = asyncHandler(async (req, res) => {
  const { type, message, template } = req.body;
  const contactIds = [...new Set(req.body.contactIds)];
  const results = [];

  // Sequential sending with a short delay; one failure never stops the rest.
  for (let i = 0; i < contactIds.length; i++) {
    if (i > 0) await sleep(DELAY_MS);
    const contact = await contactsRepo.get(contactIds[i]);

    if (!contact) {
      results.push({
        contactId: contactIds[i], name: null, phone: null, status: 'failed',
        error: { code: 'NOT_FOUND', message: 'Contact not found' },
      });
      continue;
    }

    let payloadSummary;
    let templateName = null;
    let outcome;
    try {
      if (type === 'template') {
        const bodyParams = template.variables.map((v) => resolvePlaceholders(v, contact));
        templateName = template.name;
        payloadSummary = JSON.stringify({ template: template.name, language: template.languageCode, params: bodyParams });
        outcome = await sendTemplate({ to: contact.phone, templateName: template.name, languageCode: template.languageCode, bodyParams });
      } else {
        const body = resolvePlaceholders(message, contact);
        payloadSummary = JSON.stringify({ text: body.slice(0, 200) });
        outcome = await sendText({ to: contact.phone, body });
      }
      results.push({ contactId: contact.id, name: contact.name, phone: contact.phone, status: 'sent', messageId: outcome.messageId });
      await logsRepo.create({
        contactId: contact.id, contactName: contact.name, phone: contact.phone, type, templateName,
        payloadSummary, status: 'sent', messageId: outcome.messageId,
      });
    } catch (err) {
      const error = { code: err.code ?? 'UNKNOWN', message: err.message };
      // Only add a failure result if this contact has no result yet (a log-write error after a successful send must not flip it).
      if (results.at(-1)?.contactId !== contact.id) {
        results.push({ contactId: contact.id, name: contact.name, phone: contact.phone, status: 'failed', error });
      }
      await logsRepo.create({
        contactId: contact.id, contactName: contact.name, phone: contact.phone, type, templateName,
        payloadSummary, status: 'failed', errorCode: error.code, errorMessage: error.message,
      });
    }
  }

  res.json({ results });
});

export const getLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  res.json({ logs: await logsRepo.list(limit) });
});
