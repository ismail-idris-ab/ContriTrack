# Notification Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-side filter tabs (All, Unread, Contributions, Payouts, Penalties) to the NotificationsPage.

**Architecture:** A single `filter` state drives a `filtered` derived array. A tab bar renders above the list; each tab shows a count badge. The list maps over `filtered` instead of `notifications`. No server changes needed.

**Tech Stack:** React 18, inline styles (Dark Ledger theme — `var(--ct-*)` CSS variables).

---

## File Map

| File | Action |
|------|--------|
| `client/src/pages/NotificationsPage.jsx` | Add filter state, TAB_COUNTS, tab bar, filtered list |

---

## Task 1: Add filter state, derived data, and tab bar

**Files:**
- Modify: `client/src/pages/NotificationsPage.jsx`

- [ ] **Step 1: Add `filter` state**

Inside `NotificationsPage`, after the existing `const [hasMore, setHasMore] = useState(false);` line, add:

```js
const [filter, setFilter] = useState('all');
```

- [ ] **Step 2: Add TABS constant and TAB_COUNTS computation**

After the `filter` state line, add:

```js
const TABS = [
  { key: 'all',           label: 'All'           },
  { key: 'unread',        label: 'Unread'        },
  { key: 'contributions', label: 'Contributions' },
  { key: 'payouts',       label: 'Payouts'       },
  { key: 'penalties',     label: 'Penalties'     },
];

const TAB_COUNTS = {
  all:           notifications.length,
  unread:        unreadCount,
  contributions: notifications.filter(n => n.type.startsWith('contribution_')).length,
  payouts:       notifications.filter(n => n.type.startsWith('payout_')).length,
  penalties:     notifications.filter(n => n.type.startsWith('penalty_')).length,
};

const filtered = notifications.filter(n => {
  if (filter === 'unread')        return !n.read;
  if (filter === 'contributions') return n.type.startsWith('contribution_');
  if (filter === 'payouts')       return n.type.startsWith('payout_');
  if (filter === 'penalties')     return n.type.startsWith('penalty_');
  return true;
});
```

- [ ] **Step 3: Insert tab bar JSX into the return**

In the `return (...)` block, find the closing `</div>` of the header section (the one containing the `<h1>Notifications</h1>` and "Mark all read" button). Insert the tab bar immediately after that closing `</div>`:

```jsx
{/* Filter tabs */}
<div style={{
  display: 'flex', gap: 6, flexWrap: 'nowrap', overflowX: 'auto',
  marginBottom: 18, paddingBottom: 2,
  scrollbarWidth: 'none',
}}>
  {TABS.map(tab => {
    const isActive = filter === tab.key;
    const count    = TAB_COUNTS[tab.key];
    return (
      <button
        key={tab.key}
        onClick={() => setFilter(tab.key)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 20, border: '1px solid',
          borderColor: isActive ? 'rgba(212,160,23,0.28)' : 'rgba(0,0,0,0.08)',
          background: isActive ? 'rgba(212,160,23,0.10)' : '#fff',
          color: isActive ? '#92700f' : '#52526e',
          fontSize: 12.5, fontWeight: isActive ? 700 : 500,
          cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.16s ease',
          flexShrink: 0,
        }}
      >
        {tab.label}
        {count > 0 && (
          <span style={{
            padding: '1px 6px', borderRadius: 10, fontSize: 10.5, fontWeight: 700,
            background: tab.key === 'unread'
              ? 'rgba(225,29,72,0.10)'
              : 'rgba(212,160,23,0.14)',
            color: tab.key === 'unread' ? '#e11d48' : '#d4a017',
          }}>
            {count}
          </span>
        )}
      </button>
    );
  })}
</div>
```

- [ ] **Step 4: Change list render from `notifications.map` to `filtered.map`**

Find the existing notification list render. It currently starts with:
```jsx
{!loading && notifications.length > 0 && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {notifications.map((n, idx) => {
```

Replace with:
```jsx
{!loading && filtered.length > 0 && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {filtered.map((n, idx) => {
```

- [ ] **Step 5: Update empty state for filtered view**

Find the existing empty state block:
```jsx
{!loading && notifications.length === 0 && (
  <div style={{ ... }}>
    ...
    <h3 ...>All caught up</h3>
    <p ...>No notifications yet — you'll see activity here.</p>
  </div>
)}
```

Replace with:
```jsx
{!loading && filtered.length === 0 && (
  <div style={{
    background: '#fff', borderRadius: 'var(--ct-radius)',
    boxShadow: 'var(--ct-shadow)', border: '1px solid rgba(0,0,0,0.04)',
    textAlign: 'center', padding: '72px 24px',
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      background: 'rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 18px', fontSize: 28,
    }}>
      🔔
    </div>
    <h3 style={{
      fontFamily: 'var(--font-display)',
      color: 'var(--ct-text-1)', marginBottom: 8,
      fontSize: 20, fontWeight: 700,
    }}>
      {filter === 'all' ? 'All caught up' : `No ${TABS.find(t => t.key === filter)?.label.toLowerCase()} notifications`}
    </h3>
    <p style={{ color: 'var(--ct-text-3)', fontSize: 13.5 }}>
      {filter === 'all'
        ? 'No notifications yet — you\'ll see activity here.'
        : 'Nothing here yet — check back later.'}
    </p>
  </div>
)}
```

- [ ] **Step 6: Hide "Load More" button when not on "All" tab**

Find the Load More button. It currently renders unconditionally (guarded by `hasMore`). Add `&& filter === 'all'` to its condition:

Find:
```jsx
{hasMore && (
```
Replace with:
```jsx
{hasMore && filter === 'all' && (
```

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/NotificationsPage.jsx
git commit -m "feat: add filter tabs to notifications page (unread, contributions, payouts, penalties)"
```

---

## Task 2: Push

- [ ] **Step 1: Push**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ 5 filter tabs: All, Unread, Contributions, Payouts, Penalties — Task 1 Steps 1–3
- ✅ `filter` state — Task 1 Step 1
- ✅ `TAB_COUNTS` per tab — Task 1 Step 2
- ✅ `filtered` derived array — Task 1 Step 2
- ✅ Tab bar with active gold style and count badges — Task 1 Step 3
- ✅ Unread badge red, others gold-muted — Task 1 Step 3
- ✅ List maps over `filtered` — Task 1 Step 4
- ✅ Empty state shows filter-specific message — Task 1 Step 5
- ✅ Load More hidden when filter !== 'all' — Task 1 Step 6

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:**
- `filter` state string used in `TAB_COUNTS`, `filtered`, tab bar, empty state, Load More — consistent throughout
- `TABS` array used in tab bar render and empty state `TABS.find(...)` — consistent
- `TAB_COUNTS[tab.key]` — `tab.key` matches keys in `TAB_COUNTS` object exactly
