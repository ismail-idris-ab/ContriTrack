# Plan-Gating UI — Design Spec
**Date:** 2026-04-18
**Scope:** Sidebar plan badges, instant plan-lock screens, member export button

---

## Problem

Free-plan users see all sidebar items including premium features (Reports, Reminders). They navigate to these pages, a 403 fires, and only then do they see an upgrade screen. No upfront signal that a feature costs money. The WhatsApp page doesn't even handle the 403 cleanly.

Additionally, `/api/exports/members` exists on the server with no frontend trigger.

---

## Solution

Three changes, all in the frontend only (server is already correct):

1. **Sidebar plan badges** — gated items show a "Pro" pill for free users
2. **Instant lock screens** — pages check the plan from context before fetching, no 403 round trip
3. **Member export button** — added to ReportPage for coordinator users

---

## 1. Shared Plan Utility

**File:** `client/src/utils/planUtils.js` (new)

```js
export const PLAN_LEVEL = { free: 0, pro: 1, coordinator: 2 };

export function getPlanLevel(user) {
  const sub = user?.subscription;
  if (!sub || sub.plan === 'free') return 0;
  if (sub.status === 'expired' || sub.status === 'cancelled') return 0;
  if (sub.status === 'trialing' && sub.trialEndsAt && new Date() > new Date(sub.trialEndsAt)) return 0;
  return PLAN_LEVEL[sub.plan] ?? 0;
}

export function canAccess(user, requires) {
  return getPlanLevel(user) >= PLAN_LEVEL[requires];
}
```

This mirrors `getEffectivePlan` in `planGuard.js` so client and server agree on plan resolution.

---

## 2. Sidebar Changes

**File:** `client/src/components/Sidebar.jsx`

### NAV_GROUPS config additions
Add `requires` field to gated items:
- `reports` → `requires: 'pro'`
- `whatsapp` → `requires: 'pro'`

### NavItem changes
`NavItem` receives a `locked` boolean prop (computed in `Sidebar` via `canAccess`).

When `locked`:
- Show a small gold `Pro` pill badge on the right side (instead of active dot)
- Pill style: `rgba(212,160,23,0.14)` background, `#d4a017` text, `8.5px` font, `Pro` label
- Item is still a normal `<Link>` — clicking navigates to the page normally (user sees upgrade screen there)
- No visual dimming — item looks normal, badge is the only signal

### Sidebar renders each item
```jsx
const locked = item.requires ? !canAccess(user, item.requires) : false;
<NavItem item={item} active={isActive(item.path)} locked={locked} onNavigate={onNavigate} />
```

---

## 3. Instant Plan-Lock Screens

### ReportPage (`client/src/pages/ReportPage.jsx`)

Currently: fetches data → hits 403 → `setPlanLocked(true)`.

Change: compute `planLocked` synchronously at the top of the component:

```jsx
const planLocked = !canAccess(user, 'pro');
```

Remove `setPlanLocked` state, remove the `403` catch branch in `fetchMonthly`/`fetchYearly`. The lock screen renders immediately without a network call. Export and reminder buttons also never render.

### WhatsAppPage (`client/src/pages/WhatsAppPage.jsx`)

Add the same pattern at the top:

```jsx
const planLocked = !canAccess(user, 'pro');
if (planLocked) return <PlanLockScreen feature="WhatsApp Reminders" requires="pro" />;
```

Use the same lock screen markup already in ReportPage (copy the JSX block — no shared component needed, it's used in only 2 places).

---

## 4. Member Export Button

**File:** `client/src/pages/ReportPage.jsx`

Add a third export button alongside the existing monthly/yearly CSV buttons. Placed in a new "Exports" row below the tab controls, visible on both monthly and yearly tabs.

```
[ Export Monthly CSV ]  [ Export Yearly CSV ]  [ Export Members CSV ]
```

- **Label:** "Members CSV"
- **Style:** Same indigo style as the other export buttons
- **Plan check:** Only show for coordinator plan. For pro users, show the button disabled with a `title="Requires Coordinator plan"` tooltip.
- **API call:** `GET /api/exports/members?groupId=<id>&includeScore=true`
- **Filename:** `<GroupName>_Members.csv`
- Uses existing `downloadCsv` util — no new infrastructure.
- On 403, toast: "Member export requires the Coordinator plan."

---

## Data Flow

```
User opens sidebar
  → Sidebar reads user.subscription from AuthContext
  → canAccess(user, item.requires) computed per item
  → Locked items render with "Pro" badge

User navigates to /reports (free plan)
  → ReportPage computes planLocked = !canAccess(user, 'pro') synchronously
  → Lock screen renders immediately, no fetch fired

User navigates to /reports (pro plan)
  → planLocked = false
  → fetchMonthly fires normally
  → Export buttons visible; Members CSV shows disabled with tooltip

User navigates to /reports (coordinator plan)
  → All exports available including Members CSV
```

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/utils/planUtils.js` | **New** — `getPlanLevel`, `canAccess` |
| `client/src/components/Sidebar.jsx` | Add `requires` to config, pass `locked` to `NavItem`, render Pro badge |
| `client/src/pages/ReportPage.jsx` | Sync plan check, remove 403 branch, add Members CSV button |
| `client/src/pages/WhatsAppPage.jsx` | Add sync plan check + lock screen at top |

No server changes. No new shared components.

---

## Edge Cases

- **Trialing users whose trial expired:** `getPlanLevel` returns 0 (free) — they see the badge and lock screen correctly.
- **User with no subscription field:** `getPlanLevel` returns 0 safely.
- **Coordinator user on Reports:** sees all 3 export buttons, Members CSV enabled.
- **Pro user on Reports:** sees monthly + yearly export enabled, Members CSV disabled (tooltip explains).
- **Admin role ≠ plan:** system admins (`user.role === 'admin'`) are not automatically coordinator — plan gating still applies unless their subscription says coordinator.
