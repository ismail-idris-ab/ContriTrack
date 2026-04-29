# Referral Credit System — Design Spec
**Date:** 2026-04-29  
**Status:** Approved

---

## Overview

Every user gets a unique referral code. When a referred user activates a paid plan, the referrer earns one free month (30 days added to their `currentPeriodEnd`). The system is credit-based — no cash changes hands, no payout infrastructure needed.

---

## Data Model

### User schema additions
```js
referralCode:    { type: String, unique: true, sparse: true }  // e.g. "ROT-X7K2M"
referredBy:      { type: ObjectId, ref: 'User', default: null } // set at signup
referralCredits: { type: Number, default: 0 }                  // total months earned (display only)
```

`referralCode` is generated lazily on first call to `GET /api/referral/me` and stored permanently. Using sparse unique index so existing users without codes don't conflict.

---

## Backend

### Routes — `server/routes/referral.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/referral/me` | user | Returns code, link, referral count, credits earned |
| POST | `/api/referral/credit/:userId` | internal (admin-only guard) | Awards 1 month credit to `userId`; called after payment confirmation |

### `GET /api/referral/me`
- If `req.user.referralCode` is null, generate one (`ROT-` + 5 random alphanumeric chars, retry on collision), save, return.
- Count users where `referredBy === req.user._id` → `totalReferred`
- Count users where `referredBy === req.user._id` AND `subscription.plan !== 'free'` → `convertedReferrals`
- Return: `{ code, link, totalReferred, convertedReferrals, creditsEarned: req.user.referralCredits }`

### `POST /api/referral/credit/:userId`
- Protected: `adminOnly` middleware (internal call from subscription webhook handler)
- Finds the user, adds 30 days to `currentPeriodEnd` (or sets it to `now + 30 days` if null)
- Increments `referralCredits` by 1
- Returns updated subscription snapshot

### Subscription webhook integration (`server/routes/subscription.js`)
When a Paystack `subscription.create` or `charge.success` event fires for a user who has `referredBy` set AND `referralCredits === 0` (first conversion only):
- Call the credit logic on `referredBy` user
- Send a notification to the referrer ("You earned 1 free month!")

### Registration (`server/routes/auth.js`)
- Accept optional `referralCode` in POST `/api/auth/register` body
- Look up the user with that code, set `newUser.referredBy = foundUser._id`
- Silently ignore invalid/expired codes (never block registration)

---

## Frontend

### Registration flow
- On mount, `RegisterPage` reads `?ref=CODE` from the URL and stores it in `sessionStorage`
- On form submit, reads from `sessionStorage` and includes `referralCode` in the request body
- Clears `sessionStorage` after submit

### `GET /api/referral/me` call
- Called once on Profile page mount (lazy — also creates the code if missing)
- Cached in React Query with key `['referral', 'me']`

### Profile page — "Refer & Earn" section
New card below existing profile sections:

```
┌─────────────────────────────────────────────────┐
│  Refer & Earn                                   │
│  Share your link. Earn 1 free month for every  │
│  friend who upgrades to a paid plan.            │
│                                                 │
│  [ROT-X7K2M]  [Copy link]  [Share on WhatsApp] │
│                                                 │
│  3 referred · 1 converted · 1 month earned      │
└─────────────────────────────────────────────────┘
```

- **Copy link** button: copies full URL to clipboard, shows "Copied!" for 2 s
- **Share on WhatsApp**: opens `https://wa.me/?text=...` with pre-filled message (WhatsApp deep link, no API needed)
- Stats row shows `totalReferred`, `convertedReferrals`, `creditsEarned`

### Dashboard — invite banner
Small card below the summary stats strip:

```
┌──────────────────────────────────────────────┐
│ 🎁  Invite friends · Earn free months  →     │
└──────────────────────────────────────────────┘
```

Clicking navigates to `/profile#referral`.

---

## Credit Rules

- 1 credit = 30 days added to `currentPeriodEnd`
- Credits are awarded once per referred user (first paid plan activation only)
- If referrer is on free plan, the credit is still stored — applied when they upgrade
- No expiry on credits (they're already applied to `currentPeriodEnd`)
- No cap on credits a user can earn

---

## Error Handling

- Invalid referral code at registration → silently ignored, user registers normally
- Referral code collision on generation → retry up to 5 times, then generate without prefix
- Credit endpoint called twice for same referral → idempotent check: skip if `referredByUser.referralCredits` already reflects this conversion (use `convertedReferrals` count as guard)

---

## Out of Scope

- Cash payouts or withdrawal requests
- Referral leaderboards
- Multi-tier referrals (referrer of referrer)
- Referral link expiry
- Admin referral dashboard
