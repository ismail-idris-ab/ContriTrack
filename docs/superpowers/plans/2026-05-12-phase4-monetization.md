# Phase 4 Monetization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen plan-based feature gating, upgrade prompts, billing display, and pricing copy without breaking existing users or payment flows.

**Architecture:** Frontend-only changes except no backend edits needed — all paid routes are already guarded. A new shared `UpgradeLock` component replaces three ad-hoc lock screens. `planUtils.js` gets an expiry fix. `SubscriptionPage` gains referral credits and trial-end display. `PricingPage` and `GroupsPage` get better copy and upgrade CTAs.

**Tech Stack:** React 18, React Router v6, TanStack Query v5, axios, Vite, inline styles with CSS variables (`var(--ct-text-1)`, `var(--ct-gold)`, etc.)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `client/src/utils/planUtils.js` | Modify | Fix `currentPeriodEnd` expiry check |
| `client/src/components/UpgradeLock.jsx` | Create | Shared full-page lock screen component |
| `client/src/pages/PenaltyPage.jsx` | Modify | Add full-page lock for free users |
| `client/src/pages/ReportPage.jsx` | Modify | Swap ad-hoc lock for `UpgradeLock` |
| `client/src/pages/WhatsAppPage.jsx` | Modify | Swap ad-hoc lock for `UpgradeLock` |
| `client/src/pages/GroupsPage.jsx` | Modify | Styled upgrade CTA on circle/member limit 403 |
| `client/src/pages/SubscriptionPage.jsx` | Modify | Add referral credits, trial end, billing cycle clarity |
| `client/src/pages/PricingPage.jsx` | Modify | Add "ideal for" copy per plan |

---

## Task 1: Fix `planUtils.js` — account for `currentPeriodEnd` expiry

**Files:**
- Modify: `client/src/utils/planUtils.js`

The client-side `getPlanLevel` currently ignores whether `currentPeriodEnd` has passed. A user whose subscription expired but whose `status` is still `'active'` in localStorage will see unlocked UI. The server already handles this correctly in `getEffectivePlan`. We mirror that logic here.

- [ ] **Step 1: Open and read the current file**

Current content of `client/src/utils/planUtils.js`:
```js
export const PLAN_LEVEL = { free: 0, pro: 1, coordinator: 2 };

export function getPlanLevel(user) {
  const sub = user?.subscription;
  if (!sub || sub.plan === 'free') return 0;
  if (sub.status === 'expired' || sub.status === 'cancelled') return 0;
  if (sub.status === 'trialing' && sub.trialEndsAt && new Date() > new Date(sub.trialEndsAt)) return 0;
  return PLAN_LEVEL[sub.plan] ?? 0;
}

// Returns true if user's effective plan meets or exceeds `requires`
export function canAccess(user, requires) {
  return getPlanLevel(user) >= (PLAN_LEVEL[requires] ?? 0);
}
```

- [ ] **Step 2: Add `currentPeriodEnd` check**

Replace the entire file content with:
```js
export const PLAN_LEVEL = { free: 0, pro: 1, coordinator: 2 };

export function getPlanLevel(user) {
  const sub = user?.subscription;
  if (!sub || sub.plan === 'free') return 0;
  if (sub.status === 'expired' || sub.status === 'cancelled') return 0;
  if (sub.status === 'trialing' && sub.trialEndsAt && new Date() > new Date(sub.trialEndsAt)) return 0;
  if (sub.currentPeriodEnd && new Date() > new Date(sub.currentPeriodEnd)) return 0;
  return PLAN_LEVEL[sub.plan] ?? 0;
}

export function canAccess(user, requires) {
  return getPlanLevel(user) >= (PLAN_LEVEL[requires] ?? 0);
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd client && npm run build
```
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/utils/planUtils.js
git commit -m "fix: account for currentPeriodEnd expiry in client-side plan check"
```

---

## Task 2: Create shared `UpgradeLock` component

**Files:**
- Create: `client/src/components/UpgradeLock.jsx`

This component is used by PenaltyPage, ReportPage, and WhatsAppPage. Props:
- `feature` (string): display name shown in heading, e.g. `"Penalty Tracking"`
- `requiredPlan` (`'pro'` | `'coordinator'`): determines CTA destination and badge color
- `description` (string): one sentence explaining what the feature does

- [ ] **Step 1: Create the file**

Create `client/src/components/UpgradeLock.jsx` with this content:
```jsx
import { Link, useNavigate } from 'react-router-dom';

const PLAN_META = {
  pro:         { label: 'Pro',         color: '#d4a017', bg: 'rgba(212,160,23,0.10)'  },
  coordinator: { label: 'Coordinator', color: '#4f46e5', bg: 'rgba(79,70,229,0.10)'   },
};

export default function UpgradeLock({ feature, requiredPlan = 'pro', description }) {
  const meta = PLAN_META[requiredPlan] ?? PLAN_META.pro;

  return (
    <div style={{
      maxWidth: 480,
      margin: '80px auto',
      textAlign: 'center',
      padding: '0 24px',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        margin: '0 auto 20px',
        background: 'rgba(225,29,72,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
      }}>
        🔒
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 20,
        background: meta.bg,
        color: meta.color,
        fontSize: 11, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        {meta.label} feature
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22, fontWeight: 700,
        color: 'var(--ct-text-1)',
        margin: '0 0 10px',
      }}>
        {feature} requires {meta.label}
      </h2>

      {description && (
        <p style={{
          color: 'var(--ct-text-3)',
          fontSize: 14,
          lineHeight: 1.6,
          margin: '0 0 24px',
        }}>
          {description}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          to={`/subscription?upgrade=${requiredPlan}`}
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: requiredPlan === 'coordinator'
              ? 'linear-gradient(135deg, #4f46e5, #6d28d9)'
              : 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
            color: requiredPlan === 'coordinator' ? '#fff' : '#1a1206',
            borderRadius: 10,
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: 14,
            boxShadow: requiredPlan === 'coordinator'
              ? '0 4px 14px rgba(79,70,229,0.30)'
              : '0 4px 14px rgba(212,160,23,0.30)',
          }}
        >
          Upgrade to {meta.label}
        </Link>

        <Link
          to="/pricing"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: 'transparent',
            border: '1px solid rgba(0,0,0,0.12)',
            color: 'var(--ct-text-2)',
            borderRadius: 10,
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: 13.5,
          }}
        >
          View pricing
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd client && npm run build
```
Expected: build succeeds. No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/UpgradeLock.jsx
git commit -m "feat: add shared UpgradeLock component for plan-gated pages"
```

---

## Task 3: Add full-page lock to PenaltyPage

**Files:**
- Modify: `client/src/pages/PenaltyPage.jsx`

PenaltyPage currently catches 403 and silently returns `[]`, showing an empty list. Free users should see the lock screen instead. Fix: check plan before rendering, and remove the silent 403 swallow.

- [ ] **Step 1: Add import for `canAccess` and `UpgradeLock`**

At the top of `client/src/pages/PenaltyPage.jsx`, the existing imports include:
```js
import { useAuth } from '../context/AuthContext';
```

Add these two lines after that import:
```js
import { canAccess } from '../utils/planUtils';
import UpgradeLock from '../components/UpgradeLock';
```

- [ ] **Step 2: Add the plan lock check after the existing hooks**

In `PenaltyPage`, after the `useAuth` and `useGroup` hooks are destructured (around line 45–47), add:
```js
const planLocked = !canAccess(user, 'pro');
```

Then, after all hooks (before the `useQuery` call that fetches penalties), add an early return:
```js
if (planLocked) return (
  <UpgradeLock
    feature="Penalty Tracking"
    requiredPlan="pro"
    description="Track late payments and fee collection across your savings circle. Assign penalties, mark them paid or waived, and keep members accountable."
  />
);
```

**Important:** This early return must come after all `useState`/`useQuery`/hook calls (React rules of hooks). Place it immediately before the JSX `return` statement, not before any hooks.

- [ ] **Step 3: Remove the silent 403 swallow from the useQuery**

Find this block in the penalties `useQuery`:
```js
queryFn: () =>
  api.get(`/penalties?groupId=${activeGroup._id}`)
     .then(r => r.data)
     .catch(err => { if (err.response?.status === 403) return []; throw err; }),
```

Replace with:
```js
queryFn: () =>
  api.get(`/penalties?groupId=${activeGroup._id}`)
     .then(r => r.data),
```

The plan check now prevents the API call from ever being made for free users.

- [ ] **Step 4: Verify build passes**

```bash
cd client && npm run build
```
Expected: build succeeds.

- [ ] **Step 5: Manual verification**

Log in as a free-plan user and navigate to `/penalties`. Should see the `UpgradeLock` screen with "Penalty Tracking requires Pro" heading and two buttons: "Upgrade to Pro" and "View pricing".

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/PenaltyPage.jsx
git commit -m "feat: add full-page upgrade lock to PenaltyPage for free users"
```

---

## Task 4: Swap ReportPage lock screen to use `UpgradeLock`

**Files:**
- Modify: `client/src/pages/ReportPage.jsx`

ReportPage has its own ad-hoc lock screen (lines ~372–393). Replace with `UpgradeLock`.

- [ ] **Step 1: Add import for `UpgradeLock`**

At the top of `client/src/pages/ReportPage.jsx`, after existing imports, add:
```js
import UpgradeLock from '../components/UpgradeLock';
```

- [ ] **Step 2: Replace the ad-hoc lock screen**

Find and remove this block (approximately lines 372–393):
```jsx
// ── Guard: plan locked ────────────────────────────────────────────────
if (planLocked) return (
  <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
    <div style={{
      width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
      background: 'rgba(225,29,72,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 32,
    }}>🔒</div>
    <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--ct-text-1)', marginBottom: 8 }}>Reports require Pro</h2>
    <p style={{ color: 'var(--ct-text-3)', marginBottom: 24, lineHeight: 1.6, fontSize: 14 }}>
      Upgrade to unlock monthly and yearly reports for your savings circles.
    </p>
    <Link to="/subscription" style={{
      display: 'inline-block', padding: '10px 24px',
      background: 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
      color: '#1a1206', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14,
    }}>
      Upgrade Plan
    </Link>
  </div>
);
```

Replace with:
```jsx
// ── Guard: plan locked ────────────────────────────────────────────────
if (planLocked) return (
  <UpgradeLock
    feature="Reports"
    requiredPlan="pro"
    description="Unlock monthly and yearly collection reports, CSV exports, and WhatsApp reminder sending for your savings circles."
  />
);
```

- [ ] **Step 3: Remove the `Link` import if it's only used in the removed block**

Check if `Link` from `react-router-dom` is used elsewhere in `ReportPage.jsx`. If the only usage was in the old lock screen, remove it from the import line. (In practice, ReportPage uses `Link` for breadcrumb navigation, so it's likely still needed — just verify.)

- [ ] **Step 4: Verify build passes**

```bash
cd client && npm run build
```
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ReportPage.jsx
git commit -m "refactor: use shared UpgradeLock in ReportPage"
```

---

## Task 5: Swap WhatsAppPage lock screen to use `UpgradeLock`

**Files:**
- Modify: `client/src/pages/WhatsAppPage.jsx`

WhatsAppPage has the same ad-hoc lock pattern as ReportPage (lines ~144–165).

- [ ] **Step 1: Add import for `UpgradeLock`**

At the top of `client/src/pages/WhatsAppPage.jsx`, after existing imports, add:
```js
import UpgradeLock from '../components/UpgradeLock';
```

- [ ] **Step 2: Replace the ad-hoc lock screen**

Find and remove this block (approximately lines 144–165):
```jsx
// ── Guard: plan locked ────────────────────────────────────────────────────────
if (planLocked) return (
  <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
    <div style={{
      width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
      background: 'rgba(225,29,72,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 32,
    }}>🔒</div>
    <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--ct-text-1)', marginBottom: 8 }}>Reminders require Pro</h2>
    <p style={{ color: 'var(--ct-text-3)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
      Upgrade to Pro or Coordinator to send WhatsApp payment reminders to unpaid members.
    </p>
    <Link to="/subscription" style={{
      display: 'inline-block', padding: '10px 24px',
      background: 'linear-gradient(135deg, var(--ct-gold), var(--ct-gold-light))',
      color: '#1a1206', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14,
    }}>
      Upgrade Plan
    </Link>
  </div>
);
```

Replace with:
```jsx
// ── Guard: plan locked ────────────────────────────────────────────────────────
if (planLocked) return (
  <UpgradeLock
    feature="WhatsApp Reminders"
    requiredPlan="pro"
    description="Send WhatsApp payment reminders to unpaid members. Schedule bulk reminders and track delivery."
  />
);
```

- [ ] **Step 3: Verify build passes**

```bash
cd client && npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/WhatsAppPage.jsx
git commit -m "refactor: use shared UpgradeLock in WhatsAppPage"
```

---

## Task 6: GroupsPage — styled upgrade CTA on circle/member limit 403

**Files:**
- Modify: `client/src/pages/GroupsPage.jsx`

When `POST /groups` returns 403 with `code: 'GROUP_LIMIT_REACHED'` or `POST /groups/join` returns 403 with `code: 'MEMBER_LIMIT_REACHED'`, show a styled error with an "Upgrade Plan →" link instead of raw error text.

- [ ] **Step 1: Add `useNavigate` import if not present**

At the top of `client/src/pages/GroupsPage.jsx`, check the existing import from `react-router-dom`. It likely already imports `useSearchParams`. Make sure `useNavigate` is also imported:
```js
import { useSearchParams, useNavigate } from 'react-router-dom';
```

- [ ] **Step 2: Add a `navigate` call inside the component**

Inside the `GroupsPage` component function body (where other hooks are called), add:
```js
const navigate = useNavigate();
```

- [ ] **Step 3: Replace raw error text in `handleCreate` with upgrade-aware error**

Find the `catch` block in the create group handler:
```js
} catch (err) {
  setCreateError(err.response?.data?.message || 'Failed to create group');
}
```

Replace with:
```js
} catch (err) {
  const code = err.response?.data?.code;
  if (code === 'GROUP_LIMIT_REACHED' || code === 'MEMBER_LIMIT_REACHED') {
    setCreateError('__UPGRADE__');
  } else {
    setCreateError(err.response?.data?.message || 'Failed to create group');
  }
}
```

- [ ] **Step 4: Replace raw error text in `handleJoin` with upgrade-aware error**

Find the `catch` block in the join group handler:
```js
} catch (err) {
  setJoinError(err.response?.data?.message || 'Failed to join group');
}
```

Replace with:
```js
} catch (err) {
  const code = err.response?.data?.code;
  if (code === 'MEMBER_LIMIT_REACHED') {
    setJoinError('__UPGRADE__');
  } else {
    setJoinError(err.response?.data?.message || 'Failed to join group');
  }
}
```

- [ ] **Step 5: Add the upgrade error banner component**

Add this helper component near the bottom of `GroupsPage.jsx` (before the `export default`):
```jsx
function UpgradeErrorBanner({ onDismiss }) {
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 10,
      marginBottom: 16,
      background: 'rgba(212,160,23,0.08)',
      border: '1px solid rgba(212,160,23,0.28)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <span style={{ color: '#92690a', fontSize: 13.5, fontWeight: 500 }}>
        You've reached your plan limit.
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <a
          href="/subscription?upgrade=pro"
          style={{
            padding: '6px 14px', borderRadius: 8,
            background: 'linear-gradient(135deg, #d4a017, #e8b820)',
            color: '#1a1206',
            fontSize: 12.5, fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Upgrade Plan →
        </a>
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none',
            color: '#92690a', fontSize: 18,
            cursor: 'pointer', lineHeight: 1, padding: '2px 4px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Render the banner in the create modal and join modal**

In the create group form/modal, find where `createError` is rendered (it will look like):
```jsx
{createError && <div style={{ color: '#e11d48', ... }}>{createError}</div>}
```

Replace with:
```jsx
{createError === '__UPGRADE__'
  ? <UpgradeErrorBanner onDismiss={() => setCreateError('')} />
  : createError
  ? <div style={{ color: '#e11d48', fontSize: 13, marginBottom: 12 }}>{createError}</div>
  : null
}
```

Similarly for `joinError`:
```jsx
{joinError === '__UPGRADE__'
  ? <UpgradeErrorBanner onDismiss={() => setJoinError('')} />
  : joinError
  ? <div style={{ color: '#e11d48', fontSize: 13, marginBottom: 12 }}>{joinError}</div>
  : null
}
```

- [ ] **Step 7: Verify build passes**

```bash
cd client && npm run build
```
Expected: build succeeds.

- [ ] **Step 8: Manual verification**

To test: log in as a free user who already has 1 circle. Try to create another circle. Should see the yellow upgrade banner with "Upgrade Plan →" link instead of the plain error text.

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/GroupsPage.jsx
git commit -m "feat: show upgrade CTA on circle/member limit errors in GroupsPage"
```

---

## Task 7: SubscriptionPage enrichment

**Files:**
- Modify: `client/src/pages/SubscriptionPage.jsx`

Add: referral credits section (fetch `/api/referral/me`), trial end date display, billing cycle label, and downgrade note.

- [ ] **Step 1: Add referral state and fetch**

In `SubscriptionPage`, add a new state variable after the existing ones:
```js
const [referral, setReferral] = useState(null);
```

Add a `useEffect` to fetch referral data after the component mounts (after the existing `loadStatus` effect):
```js
useEffect(() => {
  api.get('/referral/me')
    .then(({ data }) => setReferral(data))
    .catch(() => {});
}, []);
```

- [ ] **Step 2: Improve billing cycle display in the current plan card**

In the current plan card section, after the plan name and status badge, add a billing cycle row. Find the closing `</div>` of the plan name/status flex row, and after the `periodEnd` block add:

```jsx
{currentPlan !== 'free' && status?.billingCycle && (
  <div style={{ marginTop: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ct-text-3)', marginBottom: 3 }}>
        Billing cycle
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ct-text-1)' }}>
        {status.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Add trial end warning**

After the billing cycle block, add:
```jsx
{status?.status === 'trialing' && status?.trialEndsAt && (
  <div style={{
    marginTop: 14, padding: '10px 14px', borderRadius: 8,
    background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.22)',
    color: '#92600a', fontSize: 13, fontWeight: 500,
  }}>
    ⚠ Trial ends on {new Date(status.trialEndsAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}. Upgrade to keep access.
  </div>
)}
```

- [ ] **Step 4: Add downgrade note below cancel button**

In the cancel subscription section (inside the `currentPlan !== 'free' && status?.status === 'active'` block), after the cancel button add:
```jsx
<p style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 10, marginBottom: 0 }}>
  Cancelling returns you to the Free plan at the end of your billing period. Your data is never deleted.
</p>
```

- [ ] **Step 5: Add referral credits card**

After the upgrade options section (after the coordinator "highest plan" block and before the "View full pricing" link), add a new card:
```jsx
{referral && (
  <div style={{
    background: '#fff',
    borderRadius: 16,
    border: '1px solid rgba(0,0,0,0.07)',
    padding: '24px 26px',
    marginTop: 24,
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  }}>
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 4 }}>
        Referral programme
      </div>
      <p style={{ color: 'var(--ct-text-3)', fontSize: 13.5, margin: 0 }}>
        Each friend who upgrades earns you 30 free days added to your subscription.
      </p>
    </div>

    {/* Stats row */}
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
      {[
        { label: 'Friends referred', value: referral.totalReferred },
        { label: 'Upgraded',         value: referral.convertedReferrals },
        { label: 'Credits earned',   value: `${referral.creditsEarned > 0 ? '+' : ''}${referral.creditsEarned} mo` },
      ].map(({ label, value }) => (
        <div key={label} style={{
          flex: '1 1 80px',
          background: '#faf9f6',
          borderRadius: 10, padding: '12px 14px',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--ct-text-1)' }}>
            {value}
          </div>
        </div>
      ))}
    </div>

    {/* Referral link */}
    <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginBottom: 8 }}>Your referral link</div>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <code style={{
        flex: 1, minWidth: 0,
        padding: '8px 12px', borderRadius: 8,
        background: '#f0ece4',
        border: '1px solid rgba(0,0,0,0.07)',
        fontSize: 12.5, color: 'var(--ct-text-2)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'block',
      }}>
        {referral.link}
      </code>
      <button
        onClick={() => { navigator.clipboard.writeText(referral.link).catch(() => {}); }}
        style={{
          padding: '8px 16px', borderRadius: 8,
          border: '1px solid rgba(0,0,0,0.10)',
          background: '#fff',
          color: 'var(--ct-text-2)',
          fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Copy link
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Verify build passes**

```bash
cd client && npm run build
```
Expected: build succeeds.

- [ ] **Step 7: Manual verification**

Navigate to `/subscription`. Should see:
- Billing cycle label on paid plans
- Trial end warning if `status === 'trialing'`
- Downgrade note below cancel button
- Referral credits card with stats and copy link button

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/SubscriptionPage.jsx
git commit -m "feat: add referral credits, trial end, and billing cycle to SubscriptionPage"
```

---

## Task 8: PricingPage — add "ideal for" copy

**Files:**
- Modify: `client/src/pages/PricingPage.jsx`

Add an `ideal` field to each plan and render it as a small line below the tagline.

- [ ] **Step 1: Update the PLANS array**

Find the `PLANS` array at the top of `client/src/pages/PricingPage.jsx`. Add an `ideal` field to each plan:

For the free plan object, add:
```js
ideal: 'Ideal for a single informal savings circle',
```

For the pro plan object, add:
```js
ideal: 'Ideal for coordinators managing 2–4 active circles',
```

For the coordinator plan object, change the tagline and add ideal:
```js
tagline: 'For professional coordinators',
ideal: 'Ideal for ajo/esusu coordinators running multiple groups',
```

- [ ] **Step 2: Render the `ideal` line in the card**

In the plan card JSX, find the tagline paragraph:
```jsx
<p style={{ color: 'var(--ct-text-3)', fontSize: 13, margin: 0 }}>
  {plan.tagline}
</p>
```

Replace with:
```jsx
<p style={{ color: 'var(--ct-text-3)', fontSize: 13, margin: '0 0 4px' }}>
  {plan.tagline}
</p>
{plan.ideal && (
  <p style={{ color: 'var(--ct-text-3)', fontSize: 12, fontStyle: 'italic', margin: 0, opacity: 0.8 }}>
    {plan.ideal}
  </p>
)}
```

- [ ] **Step 3: Verify build passes**

```bash
cd client && npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Manual verification**

Navigate to `/pricing`. Each plan card should show the tagline plus an italic "Ideal for..." line beneath it.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/PricingPage.jsx
git commit -m "feat: add ideal-for copy to pricing plan cards"
```

---

## Task 9: Final build check and summary commit

- [ ] **Step 1: Full clean build**

```bash
cd client && npm run build
```
Expected: build succeeds with no errors or warnings related to changed files.

- [ ] **Step 2: Verify no regressions in key pages**

Start the dev server and manually visit:
```bash
cd client && npm run dev
```

Check:
- `/pricing` — three plan cards each show tagline + italic ideal-for line
- `/subscription` — referral credits card visible, billing cycle shown
- `/penalties` as free user — UpgradeLock screen shown
- `/reports` as free user — UpgradeLock screen shown
- `/whatsapp` as free user — UpgradeLock screen shown
- Create a second circle as free user — yellow upgrade banner shown
- `/subscription?upgrade=pro` from lock screen — upgrade flow initiates

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: improve subscription monetization flow"
```

---

## Self-Review

**Spec coverage check:**
1. ✅ Circle/member limit upgrade prompt — Task 6
2. ✅ Export/report/reminder/penalty/trust scoring lock screens — Tasks 3, 4, 5 (exports/trust scoring already locked via ReportPage which is now gated; trust score export button already shows 🔒)
3. ✅ SubscriptionPage: current plan, status, billing cycle, trial end, referral credits, upgrade CTA — Task 7
4. ✅ PricingPage "who it's for" copy — Task 8
5. ✅ Backend routes protected — all already gated, no changes needed
6. ✅ Frontend guards/upgrade banners — Tasks 3, 4, 5, 6
7. ✅ Payment provider safety — no payment code touched
8. ✅ Env vars for keys — already correct in subscription.js
9. ✅ Graceful fallback when payment config missing — already returns 503
10. ✅ Backward-compatible subscription data — no schema changes
11. ✅ Build checks — each task ends with build verification
12. ✅ planUtils expiry fix — Task 1

**Placeholder scan:** No TBDs, no "similar to Task N", all code blocks present.

**Type consistency:** `UpgradeLock` props (`feature`, `requiredPlan`, `description`) used identically in Tasks 2, 3, 4, 5. `referral` state shape matches `/api/referral/me` response (`code`, `link`, `totalReferred`, `convertedReferrals`, `creditsEarned`).
