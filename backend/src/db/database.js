// Data layer (MongoDB). Everything outside this file talks to `contactsRepo` /
// `logsRepo` only, never to the driver directly.
// Contacts keep small numeric ids (via a counters collection) so the REST API
// contract (contactIds: number[]) stays simple for the frontend.
import { MongoClient } from 'mongodb';
import env from '../config/env.js';

let client;
let db;

/** Connect once at startup and make sure indexes exist. */
export async function connectDb() {
  client = new MongoClient(env.mongo.uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  db = client.db(env.mongo.dbName);
  await db.collection('contacts').createIndex({ phone: 1 }, { unique: true });
  await db.collection('message_logs').createIndex({ messageId: 1 });
  console.log(`[db] connected to MongoDB database "${env.mongo.dbName}"`);
}

export async function closeDb() {
  await client?.close();
}

const contacts = () => db.collection('contacts');
const logs = () => db.collection('message_logs');

/** Atomic auto-increment id per collection. */
async function nextId(name) {
  const doc = await db
    .collection('counters')
    .findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return doc.seq;
}

const toContact = (d) => d && { id: d._id, name: d.name, phone: d.phone, created_at: d.createdAt };

export const contactsRepo = {
  async list() {
    const docs = await contacts().find().collation({ locale: 'en', strength: 2 }).sort({ name: 1 }).toArray();
    return docs.map(toContact);
  },
  async get(id) {
    return toContact(await contacts().findOne({ _id: id }));
  },
  async findByPhone(phone) {
    return toContact(await contacts().findOne({ phone }));
  },
  async create({ name, phone }) {
    const _id = await nextId('contacts');
    await contacts().insertOne({ _id, name, phone, createdAt: new Date().toISOString() });
    return this.get(_id);
  },
  async update(id, { name, phone }) {
    await contacts().updateOne({ _id: id }, { $set: { name, phone } });
    return this.get(id);
  },
  async remove(id) {
    return (await contacts().deleteOne({ _id: id })).deletedCount > 0;
  },
};

export const logsRepo = {
  async create(entry) {
    const now = new Date().toISOString();
    const _id = await nextId('message_logs');
    await logs().insertOne({
      _id,
      contactId: entry.contactId ?? null,
      contactName: entry.contactName ?? null,
      phone: entry.phone,
      type: entry.type,
      templateName: entry.templateName ?? null,
      payloadSummary: entry.payloadSummary ?? null,
      status: entry.status,
      messageId: entry.messageId ?? null,
      errorCode: entry.errorCode != null ? String(entry.errorCode) : null,
      errorMessage: entry.errorMessage ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return _id;
  },
  async list(limit = 200) {
    const docs = await logs().find().sort({ _id: -1 }).limit(limit).toArray();
    return docs.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
  },
  /** Used by the webhook to move a log through sent -> delivered -> read / failed. */
  async updateStatusByMessageId(messageId, status, error) {
    const set = { status, updatedAt: new Date().toISOString() };
    if (error?.code != null) set.errorCode = String(error.code);
    if (error?.message) set.errorMessage = error.message;
    return (await logs().updateMany({ messageId }, { $set: set })).modifiedCount;
  },
};
