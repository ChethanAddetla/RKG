import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import env from './config/env.js';
import { connectDb } from './db/database.js';
import routes from './routes/index.js';
import { receiveWebhook, verifyWebhook } from './controllers/webhook.controller.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigins }));
// morgan "tiny" logs method/url/status only - never headers, so tokens cannot leak.
app.use(morgan('tiny'));
// Keep the raw body so the webhook signature can be verified.
app.use(express.json({ limit: '1mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use('/api', routes);

// Webhook (point Meta's callback URL to <public-url>/webhook)
app.get('/webhook', verifyWebhook);
app.post('/webhook', receiveWebhook);

app.use(notFound);
app.use(errorHandler);

// Fail closed: never run an unauthenticated API by accident.
if (!env.auth.username || !env.auth.password || env.auth.secret.length < 16) {
  console.error('[auth] Set ADMIN_USERNAME, ADMIN_PASSWORD and AUTH_SECRET (16+ chars) in backend/.env');
  process.exit(1);
}
try {
  await connectDb();
} catch (err) {
  console.error(`[db] Could not connect to MongoDB (${err.message}). Check MONGODB_URI in backend/.env`);
  process.exit(1);
}


app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
