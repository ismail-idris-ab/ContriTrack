# Phase 3: Product Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve UX with an onboarding checklist, better empty/loading states, and mobile-responsive tables — without changing backend or visual identity.

**Architecture:** Targeted patch approach — extract duplicated helpers into shared utils, add `OnboardingChecklist` component with data derived from existing queries, add mobile CSS classes to `index.css`, apply them to pages with table overflow problems.

**Tech Stack:** React, TanStack Query, CSS variables (no Tailwind), localStorage for two flags (`rotara_checklist_dismissed`, `rotara_viewed_report`)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `client/src/utils/avatarUtils.js` | **Create** | `AVATAR_COLORS`, `getAvatarGradient`, `getInitials` |
| `client/src/utils/dateUtils.js` | **Create** | `MONTHS`, `MONTHS_SHORT` |
| `client/src/components/OnboardingChecklist.jsx` | **Create** | Collapsible 5-step checklist widget |
| `client/src/pages/DashboardPage.jsx` | **Modify** | Import shared utils, render `OnboardingChecklist` |
| `client/src/pages/AdminPage.jsx` | **Modify** | Import shared utils, Skeleton loading, mobile table classes |
| `client/src/pages/MembersPage.jsx` | **Modify** | Import shared utils, no-members empty state, mobile table classes |
| `client/src/pages/GroupsPage.jsx` | **Modify** | Import shared utils, skeleton loading for groups list |
| `client/src/pages/UploadPage.jsx` | **Modify** | No-circles empty state |
| `client/src/pages/ReportPage.jsx` | **Modify** | Set `rotara_viewed_report` in localStorage on mount |
| `client/src/index.css` | **Modify** | New mobile utility classes for tables, stat grid, member grid |

---

## Task 1: Create shared avatar and date utils

**Files:**
- Create: `client/src/utils/avatarUtils.js`
- Create: `client/src/utils/dateUtils.js`

- [ ] **Step 1: Create `avatarUtils.js`**

```js
// client/src/utils/avatarUtils.js
export const AVATAR_COLORS = [
  ['#4f46e5', '#7c3aed'],
  ['#059669', '#0d9488'],
  ['#d97706', '#b45309'],
  ['#e11d48', '#be123c'],
  ['#0ea5e9', '#0284c7'],
];

export const getAvatarGradient = (name = '') => {
  const i = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
};

export const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
```

- [ ] **Step 2: Create `dateUtils.js`**

```js
// client/src/utils/dateUtils.js
export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export const MONTHS_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];
```

- [ ] **Step 3: Update `DashboardPage.jsx` imports**

Remove lines 13–35 (the local `MONTHS`, `getInitials`, `AVATAR_COLORS`, `getAvatarGradient` definitions) and add at the top of the imports block:

```js
import { MONTHS } from '../utils/dateUtils';
import { getInitials, getAvatarGradient } from '../utils/avatarUtils';
```

Also remove the `MONTHS_SHORT` array inside `MonthNav` (lines 101) and import it instead:

```js
import { MONTHS, MONTHS_SHORT } from '../utils/dateUtils';
```

Then in `MonthNav`, change `const MONTHS_SHORT = [...]` to use the imported `MONTHS_SHORT`.

- [ ] **Step 4: Update `AdminPage.jsx` imports**

Remove lines 8–20 (local `MONTHS`, `getInitials`, `AVATAR_COLORS`, `getAvatarGradient`) and add:

```js
import { MONTHS } from '../utils/dateUtils';
import { getInitials, getAvatarGradient } from '../utils/avatarUtils';
```

- [ ] **Step 5: Update `MembersPage.jsx` imports**

Remove lines 11–26 (local `getInitials`, `AVATAR_COLORS`, `getAvatarGradient`) and add:

```js
import { getInitials, getAvatarGradient } from '../utils/avatarUtils';
```

- [ ] **Step 6: Update `GroupsPage.jsx` imports**

Find and remove the local `AVATAR_COLORS` / `getAvatarGradient` / `getInitials` definitions (they appear near the top of the file), and add:

```js
import { getInitials, getAvatarGradient } from '../utils/avatarUtils';
```

- [ ] **Step 7: Run build to verify no breakage**

```bash
cd client && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 8: Commit**

```bash
git add client/src/utils/avatarUtils.js client/src/utils/dateUtils.js \
  client/src/pages/DashboardPage.jsx client/src/pages/AdminPage.jsx \
  client/src/pages/MembersPage.jsx client/src/pages/GroupsPage.jsx
git commit -m "refactor: extract avatar and date helpers into shared utils"
```

---

## Task 2: Create OnboardingChecklist component

**Files:**
- Create: `client/src/components/OnboardingChecklist.jsx`

- [ ] **Step 1: Create the component**

```jsx
// client/src/components/OnboardingChecklist.jsx
import { useState, useEffect } from 'react';

const DISMISS_KEY = 'rotara_checklist_dismissed';

export default function OnboardingChecklist({ groups, activeGroup, members }) {
  const [collapsed, setCollapsed] = useState(false);
  const [done,      setDone]      = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1'
  );

  const hasUploaded  = members.some(m => m.contribution?.proofImage);
  const hasVerified  = members.some(m => m.contribution?.status === 'verified');
  const hasViewed    = localStorage.getItem('rotara_viewed_report') === '1';

  const steps = [
    {
      label: 'Create your first circle',
      done: groups.length > 0,
      link: '/groups?action=create',
    },
    {
      label: 'Invite at least one member',
      done: (activeGroup?.members?.length ?? 0) > 1,
      link: '/groups',
    },
    {
      label: 'Upload your first proof of payment',
      done: hasUploaded,
      link: '/upload',
    },
    {
      label: 'Verify a member contribution',
      done: hasVerified,
      link: '/admin',
    },
    {
      label: 'View your first report',
      done: hasViewed,
      link: '/reports',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  useEffect(() => {
    if (!allDone) return;
    setDone(true);
    const t = setTimeout(() => setDismissed(true), 3000);
    return () => clearTimeout(t);
  }, [allDone]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 'var(--ct-radius)',
      boxShadow: 'var(--ct-shadow)',
      border: '1px solid rgba(0,0,0,0.05)',
      marginBottom: 18,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid rgba(0,0,0,0.05)',
          background: done ? 'rgba(5,150,105,0.04)' : 'rgba(212,160,23,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: done ? 'rgba(5,150,105,0.12)' : 'rgba(212,160,23,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: done ? 'var(--ct-emerald)' : 'var(--ct-gold)',
          }}>
            {done ? (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            ) : (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            )}
          </div>
          <div>
            <span style={{
              fontSize: 13.5, fontWeight: 700,
              color: done ? 'var(--ct-emerald)' : 'var(--ct-text-1)',
              letterSpacing: '-0.01em',
            }}>
              {done ? 'Setup complete!' : 'Getting started'}
            </span>
            <span style={{
              fontSize: 11.5, color: 'var(--ct-text-3)', marginLeft: 10,
            }}>
              {completedCount}/{steps.length} steps
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Progress bar */}
          <div style={{ width: 80, height: 4, borderRadius: 2, background: '#f0ede6', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(completedCount / steps.length) * 100}%`,
              background: done ? 'var(--ct-emerald)' : 'var(--ct-gold)',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <button
            onClick={e => { e.stopPropagation(); handleDismiss(); }}
            title="Dismiss"
            style={{
              border: 'none', background: 'transparent', padding: 4,
              cursor: 'pointer', color: 'var(--ct-text-4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <svg
            width={13} height={13} viewBox="0 0 24 24" fill="none"
            stroke="var(--ct-text-3)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s ease' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Steps list */}
      {!collapsed && (
        <div style={{ padding: '8px 20px 16px' }}>
          {steps.map((step, i) => (
            <a
              key={i}
              href={step.done ? undefined : step.link}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 0',
                borderBottom: i < steps.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                textDecoration: 'none',
                cursor: step.done ? 'default' : 'pointer',
                opacity: step.done ? 0.7 : 1,
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: step.done ? 'rgba(5,150,105,0.12)' : 'rgba(0,0,0,0.04)',
                border: step.done ? '1.5px solid rgba(5,150,105,0.25)' : '1.5px solid rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: step.done ? 'var(--ct-emerald)' : 'var(--ct-text-4)',
              }}>
                {step.done ? (
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 13, fontWeight: step.done ? 500 : 600,
                color: step.done ? 'var(--ct-text-3)' : 'var(--ct-text-1)',
                textDecoration: step.done ? 'line-through' : 'none',
              }}>
                {step.label}
              </span>
              {!step.done && (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--ct-text-4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <path d="M9 5l7 7-7 7"/>
                </svg>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/OnboardingChecklist.jsx
git commit -m "feat: add OnboardingChecklist component"
```

---

## Task 3: Wire OnboardingChecklist into DashboardPage

**Files:**
- Modify: `client/src/pages/DashboardPage.jsx`

- [ ] **Step 1: Add import**

At the top of `DashboardPage.jsx`, add:

```js
import OnboardingChecklist from '../components/OnboardingChecklist';
```

- [ ] **Step 2: Derive `isGroupAdmin` flag**

Inside the `DashboardPage` component body, after the existing `const { user } = useAuth();` line, add:

```js
const isGroupAdmin = activeGroup?.members?.some(
  m => String(m.user?._id || m.user) === String(user?._id) && m.role === 'admin'
);
```

- [ ] **Step 3: Place checklist in JSX**

In the JSX, find the block that renders stat cards followed by the referral banner. The checklist goes between stat cards and the referral banner. Locate:

```jsx
{/* Referral invite banner */}
<div
  onClick={() => navigate('/profile')}
```

Insert immediately before it:

```jsx
{isGroupAdmin && (
  <OnboardingChecklist
    groups={groups}
    activeGroup={activeGroup}
    members={members}
  />
)}
```

- [ ] **Step 4: Run build**

```bash
cd client && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/DashboardPage.jsx
git commit -m "feat: wire OnboardingChecklist into Dashboard for group admins"
```

---

## Task 4: Fix AdminPage loading states

**Files:**
- Modify: `client/src/pages/AdminPage.jsx`

The file has three tabs: `ContributionsTab` (line 24), `RolesTab` (line 335), `PenaltiesTab` (line ~546).

**ContributionsTab** (line 158): `loading` state shows plain text `"Loading…"`. Replace with Skeleton rows.

**RolesTab** (line 362): `if (loading) return <div>Loading…</div>`. Replace with Skeleton rows.

- [ ] **Step 1: Add Skeleton import to AdminPage**

At the top of `AdminPage.jsx`, add:

```js
import Skeleton from '../components/Skeleton';
```

- [ ] **Step 2: Replace ContributionsTab loading text**

Find (around line 158–159):

```jsx
{loading ? (
  <div style={{ textAlign: 'center', color: 'var(--ct-text-3)', padding: '80px 0', fontSize: 14 }}>Loading…</div>
) : fetchError ? (
```

Replace with:

```jsx
{loading ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {[1,2,3,4].map(i => (
      <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: 'var(--ct-shadow)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Skeleton width={44} height={44} borderRadius={12} />
        <div style={{ flex: 1 }}>
          <Skeleton height={13} width={140} style={{ marginBottom: 8 }} />
          <Skeleton height={10} width={100} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={56} height={30} borderRadius={8} />
          <Skeleton width={56} height={30} borderRadius={8} />
        </div>
      </div>
    ))}
  </div>
) : fetchError ? (
```

- [ ] **Step 3: Add "Try again" to ContributionsTab error**

Find (around line 160–164):

```jsx
) : fetchError ? (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <div style={{ fontSize: 13.5, color: 'var(--ct-rose)', marginBottom: 14 }}>{fetchError}</div>
    <button onClick={() => fetchContributions()} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>Try again</button>
  </div>
```

This already has a "Try again" button — confirm it's there; if so, no change needed.

- [ ] **Step 4: Replace RolesTab loading (line ~362)**

Find:

```jsx
if (loading) return <div style={{ textAlign: 'center', color: 'var(--ct-text-3)', padding: '80px 0', fontSize: 14 }}>Loading…</div>;
if (fetchError) return <div style={{ textAlign: 'center', color: 'var(--ct-rose)', padding: '60px 0', fontSize: 13.5 }}>{fetchError}</div>;
```

Replace with:

```jsx
if (loading) return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
    {[1,2,3,4].map(i => (
      <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', boxShadow: 'var(--ct-shadow)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton width={40} height={40} borderRadius={10} />
          <div>
            <Skeleton height={13} width={120} style={{ marginBottom: 6 }} />
            <Skeleton height={10} width={160} />
          </div>
        </div>
        <Skeleton width={80} height={30} borderRadius={8} />
      </div>
    ))}
  </div>
);
if (fetchError) return (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <div style={{ fontSize: 13.5, color: 'var(--ct-rose)', marginBottom: 14 }}>{fetchError}</div>
    <button
      onClick={() => { setFetchError(''); setLoading(true); api.get('/members').then(({ data }) => setUsers(data)).catch(err => setFetchError(err.response?.data?.message || 'Failed to load members.')).finally(() => setLoading(false)); }}
      style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}
    >
      Try again
    </button>
  </div>
);
```

- [ ] **Step 5: Run build**

```bash
cd client && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/AdminPage.jsx
git commit -m "ui: replace plain loading text with Skeleton rows in AdminPage"
```

---

## Task 5: Add no-members empty state to MembersPage

**Files:**
- Modify: `client/src/pages/MembersPage.jsx`

MembersPage already has Skeleton loading (line 356–369). The gap is: when `!loading && members.length === 0` (members tab), there is no empty state — it just shows the summary strip with zero counts and a blank area.

- [ ] **Step 1: Find the members tab empty render point**

In the members tab JSX block, after the loading skeleton and before the summary strip, find:

```jsx
{!loading && (
  <>
    {/* Summary strip */}
    {members.length > 0 && (
```

- [ ] **Step 2: Add empty state**

Insert between `{!loading && (` and `{/* Summary strip */}`:

```jsx
{members.length === 0 && !activeGroup && (
  <div style={{
    textAlign: 'center', padding: '60px 24px',
    background: '#fff', borderRadius: 'var(--ct-radius)',
    boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(0,0,0,0.05)',
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: 16,
      background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 18px', color: 'var(--ct-gold)',
    }}>
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    </div>
    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 8, letterSpacing: '-0.01em' }}>
      Select a circle
    </h3>
    <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
      Choose a circle from the top bar to view its members.
    </p>
  </div>
)}
{members.length === 0 && !!activeGroup && (
  <div style={{
    textAlign: 'center', padding: '60px 24px',
    background: '#fff', borderRadius: 'var(--ct-radius)',
    boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(0,0,0,0.05)',
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: 16,
      background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 18px', color: 'var(--ct-indigo)',
    }}>
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="8.5" cy="7" r="4"/>
        <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
      </svg>
    </div>
    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 8, letterSpacing: '-0.01em' }}>
      No members yet
    </h3>
    <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', lineHeight: 1.7, maxWidth: 340, margin: '0 auto 20px' }}>
      Share your invite code so people can join <strong style={{ color: 'var(--ct-text-2)' }}>{activeGroup.name}</strong>.
    </p>
    <a
      href="/groups"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '9px 20px', borderRadius: 10,
        background: 'rgba(79,70,229,0.08)', border: '1.5px solid rgba(79,70,229,0.18)',
        color: '#6366f1', fontSize: 13, fontWeight: 600,
        textDecoration: 'none', transition: 'all 0.15s',
      }}
    >
      View invite code
    </a>
  </div>
)}
```

- [ ] **Step 3: Run build**

```bash
cd client && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/MembersPage.jsx
git commit -m "ui: add no-members empty state to MembersPage"
```

---

## Task 6: Add no-circles empty state to UploadPage

**Files:**
- Modify: `client/src/pages/UploadPage.jsx`

`UploadPage` gets `groups` and `activeGroup` from `useGroup()`. When `groups.length === 0` after the context has loaded, the form currently renders with a broken `selectedGroupId = null` — leading to a confusing submit error.

- [ ] **Step 1: Find the return statement**

In `UploadPage.jsx`, locate the main `return (` (around line 145). The `useGroup` hook call is at line 35:

```js
const { groups, activeGroup: selectedGroup } = useGroup();
```

- [ ] **Step 2: Add early return before the main return**

After all the `useEffect` hooks and before the `return (`, insert:

```jsx
if (groups.length === 0 && !loadingContributions) {
  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      <div style={{
        textAlign: 'center', padding: '72px 24px',
        background: '#fff', borderRadius: 'var(--ct-radius)',
        boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16,
          background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', color: 'var(--ct-gold)',
        }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 10, letterSpacing: '-0.01em' }}>
          Join a circle first
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ct-text-3)', lineHeight: 1.7, maxWidth: 360, margin: '0 auto 24px' }}>
          You need to be part of a savings circle before uploading proof of payment.
        </p>
        <a
          href="/groups"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '11px 24px', borderRadius: 10,
            background: 'rgba(212,160,23,0.1)', border: '1.5px solid rgba(212,160,23,0.25)',
            color: '#a07010', fontSize: 14, fontWeight: 700,
            textDecoration: 'none', transition: 'all 0.15s',
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          Browse circles
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run build**

```bash
cd client && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/UploadPage.jsx
git commit -m "ui: add no-circles empty state to UploadPage"
```

---

## Task 7: Add skeleton loading to GroupsPage groups list

**Files:**
- Modify: `client/src/pages/GroupsPage.jsx`

`GroupsPage` uses `groups` from `GroupContext` but the context also exposes `loadingGroups`. Need to show skeleton cards while loading.

- [ ] **Step 1: Add Skeleton import**

At the top of `GroupsPage.jsx`:

```js
import Skeleton from '../components/Skeleton';
```

- [ ] **Step 2: Destructure `loadingGroups` from context**

Find:

```js
const { groups, activeGroup, selectGroup, loadGroups } = useGroup();
```

Change to:

```js
const { groups, activeGroup, selectGroup, loadGroups, loadingGroups } = useGroup();
```

- [ ] **Step 3: Add skeleton before groups grid**

Find the groups grid block (around line 525):

```jsx
{/* Groups grid */}
{groups.length === 0 ? (
```

Insert before it:

```jsx
{loadingGroups && (
  <div className="groups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
    {[1,2,3].map(i => (
      <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <Skeleton height={18} width={160} style={{ marginBottom: 10 }} />
        <Skeleton height={12} width={220} style={{ marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <Skeleton height={28} width={80} borderRadius={8} />
          <Skeleton height={28} width={80} borderRadius={8} />
        </div>
        <Skeleton height={36} borderRadius={10} />
      </div>
    ))}
  </div>
)}
{!loadingGroups && groups.length === 0 ? (
```

Then close out the existing `groups.length === 0 ?` ternary by changing `{groups.length === 0 ? (` to `{!loadingGroups && groups.length === 0 ? (`.

- [ ] **Step 4: Run build**

```bash
cd client && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/GroupsPage.jsx
git commit -m "ui: add skeleton loading to GroupsPage groups grid"
```

---

## Task 8: Mark report as viewed in ReportPage

**Files:**
- Modify: `client/src/pages/ReportPage.jsx`

- [ ] **Step 1: Add localStorage flag on mount**

In `ReportPage.jsx`, find the `export default function ReportPage()` declaration (line 251). Inside the component body, after `useDocumentTitle(...)`, add:

```js
useEffect(() => {
  localStorage.setItem('rotara_viewed_report', '1');
}, []);
```

The `useEffect` import is already in the file (line 1).

- [ ] **Step 2: Run build**

```bash
cd client && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ReportPage.jsx
git commit -m "ui: mark report as viewed for onboarding checklist step 5"
```

---

## Task 9: Add mobile CSS utility classes

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Add the new classes**

At the end of `client/src/index.css`, append:

```css
/* ─── Mobile table responsiveness ───────────────────────────────────────────── */
.ct-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--ct-radius);
}

@media (max-width: 640px) {
  .ct-table-stack thead { display: none; }
  .ct-table-stack tr {
    display: block;
    margin-bottom: 10px;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.06);
    padding: 12px 14px;
    background: #fff;
    box-shadow: var(--ct-shadow);
  }
  .ct-table-stack td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    font-size: 12.5px;
    border: none;
  }
  .ct-table-stack td::before {
    content: attr(data-label);
    font-weight: 700;
    color: var(--ct-text-3);
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
    margin-right: 8px;
  }
}

/* ─── Stat grid: 2-column on very small screens ─────────────────────────────── */
@media (max-width: 480px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .dash-member-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
```

- [ ] **Step 2: Run build**

```bash
cd client && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/index.css
git commit -m "ui: add mobile table and grid utility classes"
```

---

## Task 10: Apply mobile classes to AdminPage and MembersPage tables

**Files:**
- Modify: `client/src/pages/AdminPage.jsx`
- Modify: `client/src/pages/MembersPage.jsx`

### AdminPage

The "All Submissions" table (around line 229) currently has an inline `overflowX: auto` wrapper div. Replace it with the new CSS classes and add `data-label` attributes.

- [ ] **Step 1: Wrap AdminPage table with CSS classes**

Find (around line 229):

```jsx
<div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--ct-shadow)' }}>
  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 580 }}>
```

Replace with:

```jsx
<div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--ct-shadow)' }}>
  <div className="ct-table-wrap">
  <table className="ct-table-stack" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 580 }}>
```

- [ ] **Step 2: Add `data-label` to AdminPage table cells**

In the same table's `<tbody>` rows (around lines 241–270), add `data-label` to each `<td>`:

```jsx
<td data-label="Member" style={tdStyle}>
  {/* member name cell content */}
</td>
<td data-label="Amount" style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ct-emerald)' }}>
  ₦{c.amount.toLocaleString()}
</td>
<td data-label="Date" style={{ ...tdStyle, color: 'var(--ct-text-3)' }}>
  {new Date(c.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
</td>
<td data-label="Status" style={tdStyle}>
  <StatusBadge status={c.status} />
</td>
<td data-label="Actions" style={tdStyle}>
  {/* action buttons */}
</td>
```

### MembersPage

MembersPage has two tables: the **members tab** table (line 228 — trust scores) and potentially a **members list**. Actually line 228 is the trust scores table. Check if there is a separate members-tab table.

- [ ] **Step 3: Wrap MembersPage trust score table**

Find (around line 226–228):

```jsx
{/* Trust score table */}
<div className="ct-table-wrap">
  <table className="ct-table">
```

Add `ct-table-stack` class:

```jsx
{/* Trust score table */}
<div className="ct-table-wrap">
  <table className="ct-table ct-table-stack">
```

Then add `data-label` attributes to each `<td>` in the trust scores `<tbody>` (around lines 239–280):

```jsx
<td data-label="#">...</td>
<td data-label="Member">...</td>
<td data-label="Record">...</td>
<td data-label="Score">...</td>
<td data-label="Grade" style={{ textAlign: 'center' }}>...</td>
```

The second table at line 499 already has `.ct-table-wrap` on its parent div (`className="members-table-view ct-table-wrap"`). Just add `ct-table-stack` to the `<table>` itself:

```jsx
<table className="ct-table ct-table-stack">
```

Then add `data-label` to each `<td>` in its `<tbody>` (lines ~517–560):

```jsx
<td data-label="#">{String(idx + 1).padStart(2, '0')}</td>
<td data-label="Member">{/* avatar + name */}</td>
<td data-label="Email">{/* email */}</td>
<td data-label="Status"><StatusPill status={status} /></td>
<td data-label="Amount">{/* amount */}</td>
<td data-label="Role">{/* role */}</td>
{isGroupAdmin && <td data-label="">{/* action */}</td>}
```

- [ ] **Step 4: Run build**

```bash
cd client && npm run build
```

Expected: `✓ built in` with no errors.

- [ ] **Step 5: Final commit**

```bash
git add client/src/pages/AdminPage.jsx client/src/pages/MembersPage.jsx
git commit -m "ui: apply mobile table classes to AdminPage and MembersPage"
```

---

## Task 11: Final build check and summary commit

- [ ] **Step 1: Run full build**

```bash
cd client && npm run build
```

Expected: `✓ built in` with no errors. The pre-existing duplicate-key warning in `Topbar.jsx` is acceptable — it's not from our changes.

- [ ] **Step 2: Server syntax check**

```bash
cd ../server && node --check server.js
```

Expected: no output (clean).

- [ ] **Step 3: Verify no regressions**

Check that:
- `DashboardPage` renders without errors when `groups.length === 0` (shows `NoGroupsState`, not checklist)
- `DashboardPage` renders checklist when `isGroupAdmin === true` and `groups.length > 0`
- `AdminPage` shows Skeleton rows while loading, not plain text
- `UploadPage` shows the join-circle empty state when `groups.length === 0`
- `GroupsPage` shows skeleton cards while `loadingGroups === true`

- [ ] **Step 4: Create final summary commit**

```bash
git add -A
git commit -m "ui: improve onboarding and product polish"
```
