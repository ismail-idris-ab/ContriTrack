# Pro Plan Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Pro to 4 circles + CSV/PDF exports, bump Coordinator to unlimited circles, and fix the landing page Pro price from ₦4,500 to ₦3,500.

**Architecture:** Three isolated file edits — one server config (planGuard.js), one in-app UI (PricingPage.jsx), one landing UI (PricingSection.jsx). No new routes, no schema changes, no migrations.

**Tech Stack:** Node.js/Express (server), React (client)

---

## Files Modified

- Modify: `server/middleware/planGuard.js` — runtime limits and feature flags
- Modify: `client/src/pages/PricingPage.jsx` — in-app pricing cards
- Modify: `client/src/components/landing/PricingSection.jsx` — public landing page pricing section

---

### Task 1: Update server plan limits and feature flags

**Files:**
- Modify: `server/middleware/planGuard.js`

- [ ] **Step 1: Update LIMITS and FEATURES in planGuard.js**

In `server/middleware/planGuard.js`, replace the LIMITS and FEATURES objects:

```js
// Plan limits
const LIMITS = {
  free:        { groups: 1,        members: 10,       historyMonths: 6        },
  pro:         { groups: 4,        members: Infinity, historyMonths: Infinity },
  coordinator: { groups: Infinity, members: Infinity, historyMonths: Infinity },
};

// Features available per plan
const FEATURES = {
  free:        { reminders: false, exports: false, penaltyTracking: false, trustScoring: false, reports: false },
  pro:         { reminders: true,  exports: true,  penaltyTracking: true,  trustScoring: false, reports: true  },
  coordinator: { reminders: true,  exports: true,  penaltyTracking: true,  trustScoring: true,  reports: true  },
};
```

- [ ] **Step 2: Fix the guardGroupCreate error message**

In `guardGroupCreate`, the error message currently reads:
```js
const msg = plan === 'free'
  ? 'Free plan allows 1 group. Upgrade to Pro to create more.'
  : `Your ${plan} plan allows up to ${limit} groups.`;
```

Replace with:
```js
const msg = plan === 'free'
  ? 'Free plan allows 1 circle. Upgrade to Pro to create up to 4.'
  : `Your ${plan} plan allows up to ${limit} circles.`;
```

- [ ] **Step 3: Verify server logic manually**

Start the server and confirm:
- A free user creating a 2nd group gets: `"Free plan allows 1 circle. Upgrade to Pro to create up to 4."`
- A pro user can create up to 4 groups and is blocked on the 5th
- A coordinator user is not blocked at any count

Run: `cd server && node server.js` (or however you start the server locally)

- [ ] **Step 4: Commit**

```bash
git add server/middleware/planGuard.js
git commit -m "feat: upgrade Pro to 4 circles + exports, Coordinator to unlimited"
```

---

### Task 2: Update in-app PricingPage

**Files:**
- Modify: `client/src/pages/PricingPage.jsx`

- [ ] **Step 1: Update the Pro plan features array**

In `client/src/pages/PricingPage.jsx`, find the `PLANS` array entry for `key: 'pro'` and update its `features` array:

```js
{
  key: 'pro',
  name: 'Pro',
  price: { monthly: 3500, annual: 35000 },
  tagline: 'For growing circles',
  color: '#d4a017',
  border: 'rgba(212,160,23,0.4)',
  badge: 'Most Popular',
  features: [
    { label: 'Up to 4 savings circles',  included: true  },
    { label: 'Unlimited members',         included: true  },
    { label: 'Payout rotation tracking',  included: true  },
    { label: 'Full payment history',      included: true  },
    { label: 'Penalty tracking',          included: true  },
    { label: 'WhatsApp reminders',        included: true  },
    { label: 'Monthly reports',           included: true  },
    { label: 'CSV / PDF exports',         included: true  },
    { label: 'Member trust scoring',      included: false },
    { label: 'Priority support',          included: false },
  ],
},
```

- [ ] **Step 2: Update the Coordinator plan features array**

In the same `PLANS` array, find the entry for `key: 'coordinator'` and change the first feature:

```js
{ label: 'Unlimited circles',          included: true  },
```

(was `'Up to 10 circles'`)

- [ ] **Step 3: Verify in browser**

Navigate to `/pricing` in the app. Confirm:
- Pro card shows "Up to 4 savings circles" ✓ and "CSV / PDF exports" ✓
- Coordinator card shows "Unlimited circles" ✓

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/PricingPage.jsx
git commit -m "feat: update PricingPage — Pro 4 circles + exports, Coordinator unlimited"
```

---

### Task 3: Fix landing page PricingSection

**Files:**
- Modify: `client/src/components/landing/PricingSection.jsx`

- [ ] **Step 1: Fix the Pro price display**

In `client/src/components/landing/PricingSection.jsx`, find the hardcoded price in the Pro card and change it from ₦4,500 to ₦3,500:

```jsx
<div
  style={{
    fontFamily: "var(--font-display)",
    fontSize: 44,
    fontWeight: 900,
    color: "#f5f2ec",
    letterSpacing: "-0.03em",
    lineHeight: 1,
  }}
>
  ₦3,500
</div>
```

Also update the CTA button text from:
```jsx
Go Pro — Only ₦4,500/month
```
to:
```jsx
Go Pro — Only ₦3,500/month
```

- [ ] **Step 2: Update the proFeatures list**

Replace the existing `proFeatures` array with:

```js
const proFeatures = [
  "Up to 4 Circles",
  "Unlimited members",
  "Contribution tracking + receipt verification",
  "CSV / PDF exports",
  "Advanced automation & reminders",
  "Penalty tracking & health scoring",
  "Multi-group overview dashboard",
  "Priority support",
];
```

- [ ] **Step 3: Verify in browser**

Navigate to the landing page (`/`) and scroll to the pricing section. Confirm:
- Pro card shows ₦3,500/month
- CTA button reads "Go Pro — Only ₦3,500/month"
- Pro features list reflects 4 circles and exports

- [ ] **Step 4: Commit**

```bash
git add client/src/components/landing/PricingSection.jsx
git commit -m "fix: sync landing PricingSection — Pro price ₦3,500, 4 circles, exports"
```

---

## Done

All three files updated. The plan limits are enforced at runtime by `planGuard.js` — no DB migration needed. Both pricing UIs now reflect the same plan structure.
