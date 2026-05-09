# ROTARA — Savings Circle Platform

ROTARA (formerly ContriTrack) is a SaaS platform for managing rotating savings circles (ROSCAs). Members upload contribution proofs monthly; admins verify them. The platform handles payouts, penalties, pledges, and subscription-gated features.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS, React Router v6, TanStack Query |
| Backend | Node.js, Express 4, Mongoose 8, MongoDB Atlas |
| Auth | JWT (7-day), Google OAuth (access-token flow) |
| File Uploads | Cloudinary via multer-storage-cloudinary |
| Payments | Paystack (subscriptions) |
| Email | Nodemailer (SMTP) |
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
- **Google Sign-In** — OAuth via access-token exchange

## Project Structure

```
Rotara/
├── client/          # React/Vite frontend
│   ├── src/
│   │   ├── api/     # Axios instance
│   │   ├── components/
│   │   ├── context/ # Auth, Group, Toast contexts
│   │   ├── pages/
│   │   └── hooks/
│   └── .env.example
└── server/          # Express API
    ├── controllers/ # Route handler functions
    ├── middleware/  # auth, planGuard, validate, errorHandler
    ├── models/      # Mongoose schemas
    ├── routes/      # Thin route files
    ├── utils/       # mailer, cloudinary, audit, etc.
    ├── validators/  # Zod schemas
    └── .env.example
```

## Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)
- Gmail account with App Password for SMTP

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

See `.env.example` files for all required variables and where to get them.

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

## Environment Variables

### server/.env

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | 64-char random hex — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | Server port (default `5000`) |
| `CLIENT_URL` | Frontend URL — used for CORS and email links |
| `SERVER_URL` | Backend URL — used in email links |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SMTP_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password / App Password |
| `EMAIL_FROM` | Sender display name + address |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `PAYSTACK_PLAN_PRO_MONTHLY` | Paystack plan code |
| `PAYSTACK_PLAN_PRO_ANNUAL` | Paystack plan code |
| `PAYSTACK_PLAN_COORDINATOR_MONTHLY` | Paystack plan code |
| `PAYSTACK_PLAN_COORDINATOR_ANNUAL` | Paystack plan code |

### client/.env

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |

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

## Roadmap

### Phase 1 — Stabilize (current)
- [x] README and env templates
- [x] Standardized API response helpers
- [x] Global error handler middleware
- [x] Zod request validation middleware
- [x] Auth / Groups / Contributions refactored to route + controller

### Phase 2 — Harden
- [ ] Integration tests for auth, groups, contributions
- [ ] Refresh token support
- [ ] Webhook signature verification (Paystack)
- [ ] Rate limiting per user (not just per IP)

### Phase 3 — Scale
- [ ] Background job queue (contribution reminders, penalty auto-issue)
- [ ] WebSocket notifications
- [ ] Multi-currency support

## Contributing

1. Branch off `main`
2. Keep PRs small and focused
3. Run `npm run dev` and verify manually before opening a PR
4. No schema changes without a migration plan
