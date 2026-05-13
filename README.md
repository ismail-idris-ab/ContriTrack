# ROTARA — Savings Circle Platform

ROTARA is a SaaS platform for managing rotating savings circles (ROSCAs). Members upload contribution proofs monthly; admins verify them. The platform handles payouts, penalties, pledges, and subscription-gated features.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS, React Router v6, TanStack Query |
| Backend | Node.js, Express 4, Mongoose 8, MongoDB Atlas |
| Auth | JWT (7-day), Google OAuth (access-token flow) |
| File Uploads | Cloudinary via multer-storage-cloudinary |
| Payments | Paystack (subscriptions) |
| Email | Nodemailer (SMTP) |
| WhatsApp / SMS | Termii |
| Hosting | Vercel (client), Render (server) |

## Features

- **Savings Circles** — Create, join, and manage contribution groups with invite codes
- **Contribution Tracking** — Upload payment proofs (images/PDF); admin verify/reject workflow
- **Pledges** — Promise future contributions; auto-fulfilled on proof upload
- **Payouts** — Rotating payout schedules (fixed, join-order, random, bid)
- **Penalties** — Issue and track member penalties (Pro+ plan)
- **Subscription Plans** — Free / Pro / Coordinator tiers via Paystack
- **Audit Logs** — Immutable log of all admin actions
- **Notifications** — In-app notification feed
- **Email** — OTP verification, password reset, contribution status emails
- **WhatsApp Reminders** — Contribution reminders via Termii
- **Google Sign-In** — OAuth via access-token exchange

## Project Structure

```
Rotara/
├── client/          # React/Vite frontend
│   ├── public/      # robots.txt, sitemap.xml, og-image.png, verification files
│   ├── src/
│   │   ├── api/     # Axios instance
│   │   ├── components/
│   │   ├── context/ # Auth, Group, Toast contexts
│   │   ├── pages/
│   │   └── hooks/
│   ├── .env.example
│   └── vercel.json
└── server/          # Express API
    ├── controllers/ # Route handler functions
    ├── middleware/  # auth, planGuard, validate, errorHandler
    ├── models/      # Mongoose schemas
    ├── routes/      # Thin route files
    ├── seeds/       # Default data scripts
    ├── utils/       # mailer, cloudinary, audit, whatsapp, etc.
    ├── validators/  # Zod schemas
    └── .env.example
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)
- Gmail account with App Password for SMTP
- Paystack account (test keys work for development)

### 1. Clone & install

```bash
git clone <repo-url>
cd Rotara

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Configure environment variables

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your real values

# Client
cp client/.env.example client/.env
# Edit client/.env with your real values
```

### 3. Run in development

```bash
# Terminal 1 — API server (http://localhost:5000)
cd server && npm run dev

# Terminal 2 — React client (http://localhost:5173)
cd client && npm run dev
```

### 4. Seed default templates (optional)

```bash
cd server && node seeds/templates.js
```

---

## Deployment

### Frontend — Vercel

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Set **Root Directory** to `client`.
4. Add environment variables in Vercel dashboard (Settings > Environment Variables):
   - `VITE_API_URL` — your Render backend URL (e.g. `https://rotara-api.onrender.com`)
   - `VITE_GOOGLE_CLIENT_ID` — your Google OAuth client ID
   - `VITE_PAYSTACK_PUBLIC_KEY` — your Paystack public key
5. Deploy. Vercel uses `client/vercel.json` to rewrite all routes to `/index.html` (SPA routing).

**Production URL:** `https://rotara.vercel.app`

### Backend — Render

1. Go to [render.com](https://render.com) → **New Web Service** → connect the repo.
2. Set **Root Directory** to `server`.
3. **Build command:** `npm install`
4. **Start command:** `node server.js`
5. Set environment variables in Render dashboard (Environment tab) — see the full list in `server/.env.example`.
6. Enable **Auto-Deploy** on push to `main`.

Render pings `/health` every 10 minutes to keep the service alive. Set a **Health Check Path** of `/health` in service settings.

**Health check endpoint:** `GET /health` → `{ "status": "ok" }`

### MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user (Database Access tab).
3. Allow Render's IP or set **Allow access from anywhere** (0.0.0.0/0) in Network Access.
4. Get the connection string from **Connect > Drivers** and set it as `MONGO_URI` in Render.

Example connection string:
```
mongodb+srv://<user>:<password>@cluster.mongodb.net/rotara?appName=Rotara
```

### Cloudinary (File Uploads)

1. Sign up free at [cloudinary.com](https://cloudinary.com).
2. Go to **Dashboard > Settings > API Keys**.
3. Copy `Cloud Name`, `API Key`, and `API Secret` into `CLOUDINARY_*` env vars.

### Email (SMTP via Gmail)

1. Enable 2-Step Verification on the Gmail account.
2. Generate an **App Password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Set env vars:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=you@gmail.com
   SMTP_PASS=your_16_char_app_password
   EMAIL_FROM="ROTARA" <you@gmail.com>
   ```

### Paystack (Subscriptions)

1. Create an account at [paystack.com](https://paystack.com).
2. Get API keys from **Settings > API Keys & Webhooks**.
3. Create 4 subscription plans at **Products > Plans**:
   - Pro Monthly, Pro Annual, Coordinator Monthly, Coordinator Annual
4. Copy each plan code (format: `PLN_xxxxxxxxxxxxxxx`) into the `PAYSTACK_PLAN_*` env vars.
5. Set `PAYSTACK_SECRET_KEY` (server-side) and `PAYSTACK_PUBLIC_KEY` (client-side).

### Termii (WhatsApp / SMS Notifications)

1. Create an account at [termii.com](https://termii.com).
2. Get your API key from the dashboard.
3. Set `TERMII_API_KEY` and `TERMII_SENDER_ID` in server env vars.
4. If not configured, WhatsApp delivery is silently skipped — other features are unaffected.

### Google Search Console & Bing Webmaster Tools

Google and Bing verification is already configured in `client/index.html` via meta tags:

```html
<meta name="google-site-verification" content="3WHxfS5BJFRVzaTrr13emkUpNt2aqH6RF8FHrcz2w7I" />
<meta name="msvalidate.01" content="DE7A648F41CF4B5B0F01076A8190B7BB" />
```

The Bing HTML auth file is also present at `client/public/BingSiteAuth.xml` and the Google verification HTML file is at `client/public/google1afa60e3ee0c4d4b.html`.

After deploying, verify ownership in:
- [Google Search Console](https://search.google.com/search-console) → Add property → URL prefix → Verify
- [Bing Webmaster Tools](https://www.bing.com/webmasters) → Add site → Verify

Submit the sitemap URL: `https://rotara.vercel.app/sitemap.xml`

---

## Environment Variables

### server/.env

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | **Yes** | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | 64-char random hex — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | **Yes** | Frontend URL — used for CORS and email links |
| `PORT` | No | Server port (default `5000`) |
| `NODE_ENV` | No | Set to `production` on Render |
| `SERVER_URL` | No | Backend URL — used in email verification links |
| `CLOUDINARY_CLOUD_NAME` | No* | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No* | Cloudinary API secret |
| `SMTP_HOST` | No* | SMTP host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | No* | SMTP port (e.g. `587`) |
| `SMTP_USER` | No* | SMTP username |
| `SMTP_PASS` | No* | SMTP password / App Password |
| `EMAIL_FROM` | No* | Sender display name + address |
| `PAYSTACK_SECRET_KEY` | No* | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | No* | Paystack public key |
| `PAYSTACK_PLAN_PRO_MONTHLY` | No* | Paystack plan code |
| `PAYSTACK_PLAN_PRO_ANNUAL` | No* | Paystack plan code |
| `PAYSTACK_PLAN_COORDINATOR_MONTHLY` | No* | Paystack plan code |
| `PAYSTACK_PLAN_COORDINATOR_ANNUAL` | No* | Paystack plan code |
| `TERMII_API_KEY` | No* | Termii API key for WhatsApp/SMS |
| `TERMII_SENDER_ID` | No* | Termii sender ID |

*Optional but disables the feature if absent. Server logs a warning on startup for missing optional vars.

**Critical vars (`MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`) cause the server to exit immediately if missing.**

### client/.env

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes** | Backend API base URL (no trailing slash) |
| `VITE_GOOGLE_CLIENT_ID` | No* | Google OAuth 2.0 Client ID |
| `VITE_PAYSTACK_PUBLIC_KEY` | No* | Paystack public key for Paystack Inline |

---

## API Overview

All routes are prefixed with `/api`.

| Resource | Base path | Auth |
|----------|-----------|------|
| Auth | `/api/auth` | Public + protected |
| Groups | `/api/groups` | Protected |
| Contributions | `/api/contributions` | Protected |
| Members | `/api/members` | Protected |
| Pledges | `/api/pledges` | Protected |
| Payouts | `/api/payouts` | Protected |
| Penalties | `/api/penalties` | Protected (Pro+) |
| Notifications | `/api/notifications` | Protected |
| Subscription | `/api/subscription` | Protected |
| Exports | `/api/exports` | Protected (Pro+) |
| Reports | `/api/reports` | Protected (Pro+) |
| Templates | `/api/templates` | Protected |
| Audit Log | `/api/audit` | Protected |
| Referral | `/api/referral` | Protected |
| Health | `/health` | Public |

### Health Check

`GET /health` — returns `{ "status": "ok" }` with HTTP 200. Used by Render to confirm the service is alive. No auth required.

---

## Error Monitoring

Error monitoring is not yet wired up. Recommended options for production:

- **[Sentry](https://sentry.io)** — add `@sentry/node` to the server and `@sentry/react` to the client. Free tier covers small projects.
- **Render logs** — available in the Render dashboard under **Logs**. All unhandled errors are logged via the global error handler in `server/middleware/errorHandler.js`.
- **Vercel logs** — client-side build and function logs visible in the Vercel dashboard.

Until Sentry is integrated, monitor `console.error` output in Render logs for runtime errors.

---

## Launch Checklist

Before going live, verify each item manually:

### Auth
- [ ] Register with email → receive OTP → verify email
- [ ] Login with email/password
- [ ] Login with Google OAuth
- [ ] Forgot password → receive reset email → reset password
- [ ] JWT cookie persists across page refresh
- [ ] Logout clears session

### File Uploads
- [ ] Upload contribution proof (image)
- [ ] Upload contribution proof (PDF)
- [ ] Proof appears in Cloudinary dashboard
- [ ] Admin can view proof in ProofModal

### Groups
- [ ] Create a savings group
- [ ] Invite member via invite code
- [ ] Member joins group
- [ ] Group settings update correctly

### Email
- [ ] OTP email arrives (check spam folder)
- [ ] Password reset email arrives
- [ ] Contribution status email arrives after admin action

### Payments
- [ ] Paystack Inline opens on subscription page
- [ ] Test payment completes (use Paystack test card: 4084 0840 8408 4081)
- [ ] Subscription plan upgrades correctly in DB
- [ ] Webhook from Paystack received and processed

### Mobile View
- [ ] Dashboard renders correctly on 375px (iPhone SE)
- [ ] Navigation works on mobile
- [ ] Modals are scrollable on small screens
- [ ] Forms are usable on mobile keyboard

### SEO & Verification
- [ ] `https://rotara.vercel.app/sitemap.xml` loads correctly
- [ ] `https://rotara.vercel.app/robots.txt` loads correctly
- [ ] Google Search Console shows site as verified
- [ ] Bing Webmaster Tools shows site as verified
- [ ] Open Graph preview works (test at [opengraph.xyz](https://www.opengraph.xyz))
- [ ] Twitter card preview works

### Production Safety
- [ ] Server starts cleanly (no missing env var warnings)
- [ ] `/health` returns `{ "status": "ok" }`
- [ ] CORS blocks requests from unknown origins
- [ ] Rate limiting returns 429 after 200 requests per 15 min

---

## Roadmap

### Phase 1 — Stabilize (complete)
- [x] README and env templates
- [x] Standardized API response helpers
- [x] Global error handler middleware
- [x] Zod request validation middleware
- [x] Auth / Groups / Contributions refactored to route + controller

### Phase 7 — Deploy & Launch (current)
- [x] Deployment documentation (Vercel, Render, Atlas, Cloudinary, Paystack, Termii)
- [x] Production env var validation with fail-fast on startup
- [x] SEO canonical URLs updated to rotara.vercel.app
- [x] sitemap.xml and robots.txt updated
- [x] Launch checklist

### Phase 2 — Harden
- [ ] Integration tests for auth, groups, contributions
- [ ] Refresh token support
- [ ] Webhook signature verification (Paystack)
- [ ] Rate limiting per user (not just per IP)
- [ ] Sentry error monitoring

### Phase 3 — Scale
- [ ] Background job queue (contribution reminders, penalty auto-issue)
- [ ] WebSocket notifications
- [ ] Multi-currency support

---

## Contributing

1. Branch off `main`
2. Keep PRs small and focused
3. Run `npm run dev` and verify manually before opening a PR
4. No schema changes without a migration plan
