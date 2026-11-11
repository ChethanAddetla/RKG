import { z } from 'zod';
import env from '../config/env.js';
import { contactsRepo } from '../db/database.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { normalizePhone } from '../utils/phone.js';

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  phone: z.string().trim().min(1, 'Phone number is required'),
});

export const importSchema = z.object({
  contacts: z.array(contactSchema).min(1, 'No contacts provided').max(1000, 'Max 1000 contacts per import'),
});

/** Normalize a phone or throw a 400. */
function cleanPhone(raw) {
  const r = normalizePhone(raw, env.defaultCountryCode);
  if (!r.ok) throw new ApiError(400, r.error);
  return r.phone;
}

async function assertNotDuplicate(phone, ignoreId) {
  const existing = await contactsRepo.findByPhone(phone);
  if (existing && existing.id !== ignoreId) {
    throw new ApiError(409, `Duplicate number: ${phone} already belongs to "${existing.name}"`);
  }
}

const parseId = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, 'Invalid contact id');
  return id;
};

export const listContacts = asyncHandler(async (req, res) => res.json({ contacts: await contactsRepo.list() }));

export const createContact = asyncHandler(async (req, res) => {
  const phone = cleanPhone(req.body.phone);
  await assertNotDuplicate(phone);
  res.status(201).json({ contact: await contactsRepo.create({ name: req.body.name, phone }) });
});

export const updateContact = asyncHandler(async (req, res) => {
  const id = parseId(req);
  if (!(await contactsRepo.get(id))) throw new ApiError(404, 'Contact not found');
  const phone = cleanPhone(req.body.phone);
  await assertNotDuplicate(phone, id);
  res.json({ contact: await contactsRepo.update(id, { name: req.body.name, phone }) });
});

export const deleteContact = asyncHandler(async (req, res) => {
  if (!(await contactsRepo.remove(parseId(req)))) throw new ApiError(404, 'Contact not found');
  res.status(204).end();
});

/** Bulk import (used by CSV import). Invalid/duplicate rows are skipped and reported. */
export const importContacts = asyncHandler(async (req, res) => {
  let importedCount = 0;
  const skipped = [];
  for (const [i, row] of req.body.contacts.entries()) {
    const r = normalizePhone(row.phone, env.defaultCountryCode);
    if (!r.ok) { skipped.push({ row: i + 1, name: row.name, phone: row.phone, reason: r.error }); continue; }
    const existing = await contactsRepo.findByPhone(r.phone);
    if (existing) { skipped.push({ row: i + 1, name: row.name, phone: row.phone, reason: `Duplicate of "${existing.name}"` }); continue; }
    await contactsRepo.create({ name: row.name, phone: r.phone });
    importedCount++;
  }
  res.status(201).json({ importedCount, skipped });
});
