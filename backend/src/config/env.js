// Loads and exposes environment configuration. The access token lives only here
// (server side) and is never logged or returned in any API response.
import 'dotenv/config';

const env = {
  port: Number(process.env.PORT) || 5000,
  // Comma-separated list of allowed browser origins, e.g. "http://localhost:5173,http://localhost:5174"
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
  defaultCountryCode: (process.env.DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, ''),
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
    dbName: process.env.MONGODB_DB || 'whatsapp_messenger',
  },
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    graphApiVersion: process.env.GRAPH_API_VERSION || 'v25.0',
    webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || '',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
  },
};

// Warn (without printing secret values) if sending is not configured.
if (!env.whatsapp.accessToken || !env.whatsapp.phoneNumberId) {
  console.warn(
    '[config] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing - sending will fail until set in backend/.env'
  );
}

export default env;
