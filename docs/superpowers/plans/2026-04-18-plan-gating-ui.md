# Plan-Gating UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Pro/Coordinator plan badges on gated sidebar items, make lock screens render instantly from context (no 403 round trip), and add a Members CSV export button to the Reports page.

**Architecture:** A new `planUtils.js` util mirrors the server's `getEffectivePlan` logic on the client. The Sidebar reads this to badge gated nav items. ReportPage and WhatsAppPage replace async-discovered plan locks with a synchronous check at render time. Members CSV export is wired up inside ReportPage using the existing `downloadCsv` util.

**Tech Stack:** React 18, existing `useAuth` context, existing `downloadCsv` util, Tailwind + inline styles (follow existing patterns).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `client/src/utils/planUtils.js` | **Create** | `getPlanLevel`, `canAccess` helpers |
| `client/src/components/Sidebar.jsx` | **Modify** | Add `requires` to nav config, pass `locked` to `NavItem`, render Pro badge |
| `client/src/pages/ReportPage.jsx` | **Modify** | Sync plan check, remove `planLocked` state, add Members CSV button |
| `client/src/pages/WhatsAppPage.jsx` | **Modify** | Sync plan check + lock screen at top |

---

## Task 1: Create `planUtils.js`

**Files:**
- Create: `client/src/utils/planUtils.js`

- [ ] **Step 1: Create the file**

```js
// client/src/utils/planUtils.js

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

- [ ] **Step 2: Commit**

```bash
git add client/src/utils/planUtils.js
git commit -m "feat: add planUtils helpers for client-side plan gating"
```

---

## Task 2: Sidebar — Pro badges on gated items

**Files:**
- Modify: `client/src/components/Sidebar.jsx`

- [ ] **Step 1: Import `canAccess` at the top of Sidebar.jsx**

Add this import after the existing imports:

```js
import { canAccess } from '../utils/planUtils';
```

- [ ] **Step 2: Add `requires` fields to NAV_GROUPS**

In `NAV_GROUPS`, the `Tools` section currently looks like:

```js
{
  label: 'Tools',
  items: [
    { id: 'reports',      label: 'Reports',      path: '/reports',      icon: Icon.reports      },
    { id: 'whatsapp',     label: 'Reminders',    path: '/whatsapp',     icon: Icon.whatsapp     },
    { id: 'subscription', label: 'Subscription', path: '/subscription', icon: Icon.subscription },
  ],
},
```

Replace it with:

```js
{
  label: 'Tools',
  items: [
    { id: 'reports',      label: 'Reports',      path: '/reports',      icon: Icon.reports,      requires: 'pro' },
    { id: 'whatsapp',     label: 'Reminders',    path: '/whatsapp',     icon: Icon.whatsapp,     requires: 'pro' },
    { id: 'subscription', label: 'Subscription', path: '/subscription', icon: Icon.subscription },
  ],
},
```

- [ ] **Step 3: Add `locked` prop to `NavItem`**

The `NavItem` function signature is:

```jsx
function NavItem({ item, active, onNavigate }) {
```

Change it to:

```jsx
function NavItem({ item, active, locked, onNavigate }) {
```

- [ ] **Step 4: Render the Pro badge inside `NavItem`**

Find the badge/active-dot section inside `NavItem`. It currently looks like:

```jsx
{item.badge ? (
  <div style={{ ... }}>
    {item.badge > 99 ? '99+' : item.badge}
  </div>
) : active ? (
  <div style={{
    width: 5, height: 5, borderRadius: '50%',
    background: 'var(--ct-gold)',
    boxShadow: '0 0 6px rgba(212,160,23,0.7)',
    flexShrink: 0,
  }} />
) : null}
```

Replace with:

```jsx
{item.badge ? (
  <div style={{
    minWidth: 18, height: 18, borderRadius: 9,
    background: '#e11d48',
    color: '#fff', fontSize: 9.5, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 4px', flexShrink: 0,
    boxShadow: '0 2px 6px rgba(225,29,72,0.35)',
  }}>
    {item.badge > 99 ? '99+' : item.badge}
  </div>
) : locked ? (
  <span style={{
    padding: '2px 6px', borderRadius: 4,
    background: 'rgba(212,160,23,0.14)',
    color: '#d4a017',
    fontSize: 8.5, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    flexShrink: 0,
  }}>
    Pro
  </span>
) : active ? (
  <div style={{
    width: 5, height: 5, borderRadius: '50%',
    background: 'var(--ct-gold)',
    boxShadow: '0 0 6px rgba(212,160,23,0.7)',
    flexShrink: 0,
  }} />
) : null}
```

- [ ] **Step 5: Pass `locked` when rendering nav items in `Sidebar`**

Find the map over `NAV_GROUPS` items in the `Sidebar` component:

```jsx
{group.items.map(item => (
  <NavItem
    key={item.id}
    item={item}
    active={isActive(item.path)}
    onNavigate={onNavigate}
  />
))}
```

Replace with:

```jsx
{group.items.map(item => (
  <NavItem
    key={item.id}
    item={item}
    active={isActive(item.path)}
    locked={item.requires ? !canAccess(user, item.requires) : false}
    onNavigate={onNavigate}
  />
))}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/Sidebar.jsx
git commit -m "feat: show Pro badge on gated sidebar items for free users"
```

---

## Task 3: ReportPage — sync plan check + Members CSV

**Files:**
- Modify: `client/src/pages/ReportPage.jsx`

- [ ] **Step 1: Add `canAccess` import**

At the top of `ReportPage.jsx`, add alongside the existing imports:

```js
import { canAccess } from '../utils/planUtils';
```

- [ ] **Step 2: Replace `planLocked` state with sync computation**

Remove this line:
```js
const [planLocked, setPlanLocked] = useState(false);
```

Add this line right after `const { user } = useAuth();`:
```js
const planLocked = !canAccess(user, 'pro');
```

- [ ] **Step 3: Remove `setPlanLocked` from fetch callbacks**

In `fetchMonthly`, the catch block currently is:
```js
} catch (err) {
  if (err.response?.status === 403) setPlanLocked(true);
} finally {
```

Replace with:
```js
} catch (err) {
  // 403 handled synchronously via planLocked above
} finally {
```

In `fetchYearly`, the catch block currently is:
```js
} catch (err) {
  if (err.response?.status === 403) setPlanLocked(true);
} finally {
```

Replace with:
```js
} catch (err) {
  // 403 handled synchronously via planLocked above
} finally {
```

- [ ] **Step 4: Add `exportingMembers` state and Members CSV handler**

After the existing `const [exporting, setExporting] = useState(false);` line, add:

```js
const [exportingMembers, setExportingMembers] = useState(false);

const handleMembersExport = async () => {
  if (!activeGroup || exportingMembers) return;
  setExportingMembers(true);
  try {
    const fname = `${activeGroup.name.replace(/\s+/g, '_')}_Members.csv`;
    await downloadCsv(`/api/exports/members?groupId=${activeGroup._id}&includeScore=true`, fname);
  } catch (err) {
    showToast(err.message || 'Members export failed', 'error');
  } finally {
    setExportingMembers(false);
  }
};

const isCoordinator = canAccess(user, 'coordinator');
```

- [ ] **Step 5: Add Members CSV button to the monthly tab toolbar**

In the monthly tab, find the existing Export CSV button block (around line 328–346):

```jsx
{/* Export CSV */}
<button
  onClick={() => handleExport('monthly')}
  disabled={exporting || !monthly}
  style={{ ... }}
>
  ...
  {exporting ? 'Exporting…' : 'Export CSV'}
</button>
```

Add the Members CSV button immediately after it (before the Send Reminders button):

```jsx
{/* Members CSV — coordinator only */}
<button
  onClick={isCoordinator ? handleMembersExport : undefined}
  disabled={!isCoordinator || exportingMembers}
  title={!isCoordinator ? 'Requires Coordinator plan' : 'Download member roster with trust scores'}
  style={{
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 16px', borderRadius: 9,
    background: isCoordinator ? 'rgba(79,70,229,0.10)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${isCoordinator ? 'rgba(79,70,229,0.22)' : 'rgba(255,255,255,0.07)'}`,
    color: isCoordinator ? '#818cf8' : '#38385a',
    fontSize: 12.5, fontWeight: 600,
    cursor: isCoordinator && !exportingMembers ? 'pointer' : 'not-allowed',
    fontFamily: 'var(--font-sans)', transition: 'all 0.18s ease',
  }}
>
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z"/>
  </svg>
  {exportingMembers ? 'Exporting…' : 'Members CSV'}
</button>
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/ReportPage.jsx
git commit -m "feat: sync plan check in ReportPage, add Members CSV export"
```

---

## Task 4: WhatsAppPage — sync plan check + lock screen

**Files:**
- Modify: `client/src/pages/WhatsAppPage.jsx`

- [ ] **Step 1: Add imports**

At the top of `WhatsAppPage.jsx`, add after existing imports:

```js
import { Link } from 'react-router-dom';
import { canAccess } from '../utils/planUtils';
```

Note: `Link` may already be imported — check first and skip if so.

- [ ] **Step 2: Add sync plan check at the top of the component**

After `const { showToast } = useToast();`, add:

```js
const planLocked = !canAccess(user, 'pro');
```

- [ ] **Step 3: Add the lock screen early return**

After the `isAdmin` computation block and before the `useEffect`, add:

```jsx
if (planLocked) {
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#ede8de', marginBottom: 8 }}>
        Reminders require Pro
      </h2>
      <p style={{ color: '#52526e', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        Upgrade to the Pro or Coordinator plan to send WhatsApp payment reminders to unpaid members.
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
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/WhatsAppPage.jsx
git commit -m "feat: instant plan-lock screen on WhatsApp reminders page"
```

---

## Task 5: Push

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

Expected output: `main -> main` with the 4 new commits.

---

## Self-Review

**Spec coverage:**
- ✅ `planUtils.js` with `getPlanLevel` + `canAccess` — Task 1
- ✅ Sidebar `requires` field on Reports and Reminders — Task 2, Step 2
- ✅ `NavItem` Pro badge when locked — Task 2, Steps 3–4
- ✅ `locked` prop passed in Sidebar render — Task 2, Step 5
- ✅ ReportPage sync plan check (remove state) — Task 3, Steps 2–3
- ✅ Members CSV button (coordinator only, disabled with tooltip for pro) — Task 3, Steps 4–5
- ✅ WhatsAppPage sync lock screen — Task 4

**Placeholder scan:** No TBDs or vague steps. Every step has exact code.

**Type consistency:**
- `canAccess(user, 'pro')` used in Task 2 (Sidebar), Task 3 (ReportPage), Task 4 (WhatsAppPage) — consistent
- `canAccess(user, 'coordinator')` used in Task 3 for `isCoordinator` — consistent with `PLAN_LEVEL` definition in Task 1
- `downloadCsv` import already exists in ReportPage — no new import needed for Task 3
- `exportingMembers` state defined in Task 3 Step 4 and used in Step 5 — consistent
