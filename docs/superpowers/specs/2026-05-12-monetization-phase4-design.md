# Phase 4: Monetization — Design Spec

**Date:** 2026-05-12  
**Status:** Approved  
**Scope:** Upgrade prompts, subscription page enrichment, pricing copy, plan guard consistency

---

## Context

Rotara has three plans: free, pro, coordinator. Plan limits and feature gates exist and are enforced on the backend. This spec covers UI/UX improvements to make monetization more effective without breaking existing users or payment flows.

**Plans:**
- Free: 1 circle, 10 members, no premium features
- Pro: 4 circles, unlimited members, most features (₦3,500/mo)
- Coordinator: unlimited circles/members, all features including trust scoring (₦10,000/mo)

---

## Current State Summary

### Already gated (backend)
| Feature | Guard | Minimum plan |
|---|---|---|
| Circle creation | `guardGroupCreate` | free=1, pro=4, coordinator=∞ |
| Member add | `guardMemberAdd` | free=10, others=∞ |
| Penalty tracking | `requireFeature('penaltyTracking')` | pro |
| Reports | `requireFeature('reports')` | pro |
| WhatsApp reminders | `requireFeature('reminders')` | pro |
| CSV/PDF exports | `requireFeature('exports')` | pro |
| Trust score export | `requireFeature('trustScoring')` | coordinator |

### Already gated (frontend)
- Reports page: full-page lock screen
- WhatsApp page: full-page lock screen
- Sidebar: "Pro" pill on locked nav items
- Export buttons: lock icon when plan insufficient

### Gaps identified
1. `PenaltyPage` swallows 403 silently → empty list, no upgrade prompt
2. `GroupsPage` shows raw error string on 403 → no upgrade CTA
3. `planUtils.canAccess` ignores `currentPeriodEnd` expiry (server-side handles it correctly)
4. `SubscriptionPage` missing: referral credits, trial end date, billing cycle clarity
5. No shared lock screen component — Reports and WhatsApp pages each have ad-hoc implementations
6. `PricingPage` taglines don't explain who each plan is for

---

## Design

### 1. Shared `UpgradeLock` component

**File:** `client/src/components/UpgradeLock.jsx`

Props:
- `feature` (string): display name of the locked feature
- `requiredPlan` ('pro' | 'coordinator'): minimum plan needed
- `description` (string, optional): one-line explanation of what the feature does

Renders:
- Lock icon + feature name
- "Requires [Pro / Coordinator] plan" badge
- Optional description line
- Primary "Upgrade" button → navigates to `/subscription?upgrade=<requiredPlan>`
- Secondary "View pricing" link → `/pricing`

This replaces the ad-hoc lock screens in `ReportPage` and `WhatsAppPage`. Both pages swap their inline lock JSX for `<UpgradeLock feature="..." requiredPlan="pro" />`.

---

### 2. Fix `planUtils.js` expiry logic

**File:** `client/src/utils/planUtils.js`

Add `currentPeriodEnd` check to `getPlanLevel`:
```js
if (sub.currentPeriodEnd && new Date() > new Date(sub.currentPeriodEnd)) return 0;
```

This mirrors `getEffectivePlan` on the server. Prevents edge case where expired paid users see unlocked UI client-side.

---

### 3. PenaltyPage full-page lock

**File:** `client/src/pages/PenaltyPage.jsx`

Add at render time (before any API calls):
```js
const planLocked = !canAccess(user, 'pro');
if (planLocked) return <UpgradeLock feature="Penalty Tracking" requiredPlan="pro" description="Track late payments and fee collection across your circle." />;
```

Remove the silent `catch` that swallows 403.

---

### 4. GroupsPage upgrade CTA on limit hit

**File:** `client/src/pages/GroupsPage.jsx`

When `api.post('/groups', ...)` or `api.post('/groups/join', ...)` returns 403:
- Check `err.response?.data?.code` for `GROUP_LIMIT_REACHED` or `MEMBER_LIMIT_REACHED`
- If matched: show styled error with plan limit context + "Upgrade Plan →" button linking to `/subscription?upgrade=pro`
- Otherwise: show generic error text as before

No backend changes needed. Backend already returns `code` and `plan` in the 403 payload.

---

### 5. SubscriptionPage enrichment

**File:** `client/src/pages/SubscriptionPage.jsx`

#### 5a. Billing cycle section
Add below the current plan card header:
- Billing cycle label: "Monthly" / "Annual"
- Renewal date (already shown) → rename label to "Next renewal" vs "Access until" depending on status

#### 5b. Trial end section
Show only when `status?.status === 'trialing'`:
- "Trial ends on [date]" in amber warning style

#### 5c. Referral credits section
New card below upgrade options:
- Fetch `GET /api/referral/me` on mount
- Display: credits earned, total referred, converted referrals
- Show referral link with copy button
- Show "Each referral who upgrades = 1 free month added to your subscription"

#### 5d. Downgrade note
For active paid users: small text below cancel button explaining that cancelling returns them to Free at period end.

---

### 6. PricingPage copy improvements

**File:** `client/src/pages/PricingPage.jsx`

Update plan definitions:

| Plan | Current tagline | New tagline | New "ideal for" line |
|---|---|---|---|
| Free | "Get your circle started" | "Get your circle started" | "Ideal for a single informal savings circle" |
| Pro | "For growing circles" | "For growing circles" | "Ideal for coordinators managing 2–4 active circles" |
| Coordinator | "For serious coordinators" | "For professional coordinators" | "Ideal for ajo/esusu coordinators running multiple groups" |

Add `ideal` field to PLANS array. Render as small italicised line below tagline on each card.

---

### 7. Backend: no new guards needed

All paid-only routes already have `requireFeature`. The `guardGroupCreate` and `guardMemberAdd` already return `code` and `plan` in 403 payloads — sufficient for frontend upgrade CTAs.

No backend changes to payment flow. Paystack keys remain in environment variables. Graceful fallback (503 with message) already implemented when `PAYSTACK_SECRET_KEY` is absent.

---

## Out of scope

- Downgrade flow (pro → free mid-cycle): not implemented, not added here
- Trial start flow: no trial creation UI, only trial-end display
- PDF export implementation: existing route already gated, PDF generation not in scope

---

## Files touched

| File | Change |
|---|---|
| `client/src/components/UpgradeLock.jsx` | New component |
| `client/src/utils/planUtils.js` | Fix `currentPeriodEnd` expiry check |
| `client/src/pages/PenaltyPage.jsx` | Add full-page lock via `UpgradeLock` |
| `client/src/pages/ReportPage.jsx` | Swap ad-hoc lock for `UpgradeLock` |
| `client/src/pages/WhatsAppPage.jsx` | Swap ad-hoc lock for `UpgradeLock` |
| `client/src/pages/GroupsPage.jsx` | Styled upgrade CTA on 403 |
| `client/src/pages/SubscriptionPage.jsx` | Referral credits, trial end, billing clarity |
| `client/src/pages/PricingPage.jsx` | "Ideal for" copy + `ideal` field in PLANS |

No server-side changes required.
