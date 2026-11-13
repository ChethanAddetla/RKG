# WhatsApp Messenger

Manage contacts (name + phone), select several, and send a WhatsApp **template** (or plain text) message to all of them through the Meta WhatsApp Business Cloud API.

- **Frontend:** React + Vite, Axios, react-hot-toast, plain CSS
- **Backend:** Node.js + Express, Axios, zod, helmet, cors, morgan, express-rate-limit
- **Storage:** MongoDB (official `mongodb` driver). All DB access sits in `backend/src/db/database.js` behind `contactsRepo` / `logsRepo`. Collections: `contacts`, `message_logs`, `counters` (numeric ids).

The access token lives **only** in `backend/.env`. It is never sent to the browser, never logged, and `.env` is git-ignored.

## Prerequisites

- Node.js 18+ (20 recommended) and npm
- MongoDB: either a local install (`mongodb://127.0.0.1:27017`) or a free MongoDB Atlas cluster (copy its connection string into `MONGODB_URI`; in Atlas, add your IP under Network Access)
- A Meta developer app with the WhatsApp product, an approved template, and an access token

## Setup

```bash
# 1. install everything
npm run install:all

# 2. configure the backend
cp backend/.env.example backend/.env      # Windows: copy backend\.env.example backend\.env
#    then edit backend/.env and set WHATSAPP_ACCESS_TOKEN

# 3. (optional) frontend env - defaults already work
cp frontend/.env.example frontend/.env

# 4. run both servers
npm run dev
```

- API: http://localhost:5000
- UI: http://localhost:5173

Run individually: `npm run dev --prefix backend` / `npm run dev --prefix frontend`.

Docker: `docker compose up --build` (needs `backend/.env`; starts its own MongoDB container), UI at http://localhost:5173.

### Environment variables (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Login for the web UI (**required**) |
| `AUTH_SECRET` | Random string, 16+ chars, signs login tokens (**required**) |
| `SESSION_HOURS` | Login lifetime, default 12 |
| `MONGODB_URI` | MongoDB connection string (secret if it contains a password) |
| `MONGODB_DB` | Database name, default `whatsapp_messenger` |
| `WHATSAPP_ACCESS_TOKEN` | Bearer token (secret) |
| `WHATSAPP_PHONE_NUMBER_ID` | Sender phone number ID, e.g. `1477889452064420` |
| `GRAPH_API_VERSION` | e.g. `v25.0` |
| `DEFAULT_COUNTRY_CODE` | Prefix for 10-digit numbers, e.g. `91` |
| `PORT`, `CORS_ORIGIN` | Server port and allowed browser origin |
| `WEBHOOK_VERIFY_TOKEN` | (optional) token for webhook verification |
| `WHATSAPP_APP_SECRET` | (optional) enables webhook signature verification |

Frontend: `VITE_API_URL=http://localhost:5000` (and optional `VITE_DEFAULT_COUNTRY_CODE`).

## Where to find the Phone Number ID and token

1. Open https://developers.facebook.com/apps and pick your app.
2. **WhatsApp > API Setup**. The **Phone number ID** is shown under "Send and receive messages" (not the phone number itself or the WhatsApp Business Account ID).
3. The same page has a **temporary access token** (valid ~24 hours). For production, create a permanent token (see Troubleshooting, error 190).

## Adding test recipient numbers

While using Meta's test number, you can only message numbers on an allowed list:

1. **WhatsApp > API Setup**, section "To".
2. Open the recipient dropdown, choose **Manage phone number list**, and add the number.
3. Enter the verification code WhatsApp sends to that number.

(Up to 5 recipients on the test number. Real business numbers have no such list.)

## Features

- Add / edit / delete / search contacts; CSV import (`name,phone`, header optional).
- Checkboxes, "Select all" (applies to the current search results), live "N selected" counter.
- **Template** mode (default) with name, language code, and add/remove variables `{{1}}`, `{{2}}`, ... Defaults: `jaspers_market_order_confirmation_v1`, `en_US`, `{{name}}`, `123456`, `Nov 10, 2026`.
- **Text** mode. Free-form text only delivers if the recipient messaged your number in the last 24 hours; otherwise use a template.
- Personalization: `{{name}}` and `{{phone}}` in any variable (or text body) are resolved per contact on the backend.
- Confirmation dialog, loading state, per-contact result panel, and a History tab.
- Sending is sequential with a 200ms delay, max 50 recipients per request, one failure never stops the rest.
- Phone numbers are stored as E.164 digits (e.g. `916302746267`); 10-digit numbers get `DEFAULT_COUNTRY_CODE`. Invalid and duplicate numbers are rejected (logic in `backend/src/utils/phone.js`, mirrored in `frontend/src/utils/phone.js`).

## Login

The UI and every `/api` route (except `/api/health` and `/api/auth/login`) require a login. The backend refuses to start unless `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `AUTH_SECRET` are set. Login attempts are limited to 10 per 15 minutes per IP. The `/webhook` endpoint is not behind the login (Meta can't log in); it is protected by `WEBHOOK_VERIFY_TOKEN` and, if set, `WHATSAPP_APP_SECRET`.

## API and curl examples

All `/api` endpoints below (except health) need a token:

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
# then add:  -H "Authorization: Bearer $TOKEN"  to each request, e.g.
curl http://localhost:5000/api/contacts -H "Authorization: Bearer $TOKEN"
```

```bash
# Health
curl http://localhost:5000/api/health

# List contacts
curl http://localhost:5000/api/contacts

# Create contact
curl -X POST http://localhost:5000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","phone":"6302746267"}'

# Update contact
curl -X PUT http://localhost:5000/api/contacts/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"John D.","phone":"916302746267"}'

# Delete contact
curl -X DELETE http://localhost:5000/api/contacts/1

# Bulk import (used by CSV import)
curl -X POST http://localhost:5000/api/contacts/import \
  -H "Content-Type: application/json" \
  -d '{"contacts":[{"name":"A","phone":"9876543210"},{"name":"B","phone":"919812345678"}]}'

# Send template to contacts 1 and 2
curl -X POST http://localhost:5000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{"contactIds":[1,2],"type":"template","template":{"name":"jaspers_market_order_confirmation_v1","languageCode":"en_US","variables":["{{name}}","123456","Nov 10, 2026"]}}'

# Send plain text (24-hour window only)
curl -X POST http://localhost:5000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{"contactIds":[1],"type":"text","message":"Hi {{name}}!"}'

# Send history
curl http://localhost:5000/api/messages/logs

# Webhook verification (Meta calls this)
curl "http://localhost:5000/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=1234"

# Webhook status event (simulated; omit signature if WHATSAPP_APP_SECRET is unset)
curl -X POST http://localhost:5000/webhook -H "Content-Type: application/json" \
  -d '{"entry":[{"changes":[{"value":{"statuses":[{"id":"wamid.XXX","status":"delivered"}]}}]}]}'
```

Send response shape:

```json
{ "results": [
  { "contactId": 1, "name": "John Doe", "phone": "916302746267", "status": "sent", "messageId": "wamid...." },
  { "contactId": 2, "name": "Jane", "phone": "919812345678", "status": "failed", "error": { "code": 131030, "message": "..." } }
] }
```

## Webhook (delivery status)

1. Expose the backend publicly (e.g. `ngrok http 5000`).
2. Set `WEBHOOK_VERIFY_TOKEN` in `backend/.env` (any string you choose).
3. In Meta dashboard: **WhatsApp > Configuration > Webhook**, callback URL `https://<public-host>/webhook`, the same verify token, then subscribe to the **messages** field.
4. History rows then update from `sent` to `delivered` / `read` / `failed`. Setting `WHATSAPP_APP_SECRET` makes the backend verify Meta's `X-Hub-Signature-256` header.

## Troubleshooting

| Error | Cause and fix |
| --- | --- |
| **131030** Recipient not in allowed list | You're on the test number and the recipient isn't registered. Add and verify it under API Setup > "To" > Manage phone number list, or move to a real number. |
| **131047** Re-engagement message | Free-form text outside the 24-hour window. Use the **Template** mode (templates can start conversations). |
| **132000** Template parameter count mismatch | The number of variables doesn't match the template body placeholders. Add/remove variables in the composer so the count matches exactly. |
| **132001** Template does not exist | Template name or language code is wrong, or the template isn't approved for that language. Copy the exact name and code (`en_US` vs `en`) from WhatsApp Manager > Message templates. |
| **190** Access token expired/invalid | Temporary tokens last about 24 hours. Create a permanent one: Business Settings > Users > **System Users** > Add (Admin) > **Add Assets** (your app, with full control, and the WhatsApp account) > **Generate New Token**, choose your app, tick `whatsapp_business_messaging` and `whatsapp_business_management`, set expiry to *Never*. Put it in `WHATSAPP_ACCESS_TOKEN` and restart the backend. |
| Invalid phone format | Use 10 digits (gets `DEFAULT_COUNTRY_CODE`) or the full number with country code, 11-15 digits. Spaces, dashes and "+" are stripped automatically. |
| `WhatsApp is not configured` | `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` missing in `backend/.env`. |
| `Could not connect to MongoDB` on startup | MongoDB isn't running, or `MONGODB_URI` is wrong. For Atlas, check the password (URL-encode special characters) and that your IP is allowed. |
| CORS error in browser | `CORS_ORIGIN` must match the frontend origin exactly. |

## Project structure

```
backend/src/{server.js, config/env.js, db/database.js, routes/, controllers/,
             services/whatsapp.service.js, middleware/, utils/phone.js}
frontend/src/{api/client.js, components/, pages/Home.jsx, utils/, App.jsx, main.jsx}
```
