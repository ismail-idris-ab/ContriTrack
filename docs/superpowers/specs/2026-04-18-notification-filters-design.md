# Notification Filters — Design Spec
**Date:** 2026-04-18
**Scope:** Client-side filter tabs on NotificationsPage

---

## Problem
NotificationsPage lists all notifications with no way to narrow by type or read status. Users with many notifications can't quickly find contribution updates or penalties.

## Solution
Add a filter bar with 5 tabs below the page header. Filtering is client-side on the already-loaded `notifications` array — instant, no server changes needed.

---

## Filter Tabs

| Tab | Filter logic | Badge |
|-----|-------------|-------|
| All | no filter | total count |
| Unread | `!n.read` | `unreadCount` from state |
| Contributions | `n.type.startsWith('contribution_')` | count from array |
| Payouts | `n.type.startsWith('payout_')` | count from array |
| Penalties | `n.type.startsWith('penalty_')` | count from array |

---

## State Change
Add one new state variable:
```js
const [filter, setFilter] = useState('all');
```

---

## Filter Computation
Derived from existing `notifications` state — no new fetches:
```js
const filtered = notifications.filter(n => {
  if (filter === 'unread')        return !n.read;
  if (filter === 'contributions') return n.type.startsWith('contribution_');
  if (filter === 'payouts')       return n.type.startsWith('payout_');
  if (filter === 'penalties')     return n.type.startsWith('penalty_');
  return true;
});
```

Tab counts (computed from full `notifications` array, not `filtered`):
```js
const TAB_COUNTS = {
  all:           notifications.length,
  unread:        unreadCount,
  contributions: notifications.filter(n => n.type.startsWith('contribution_')).length,
  payouts:       notifications.filter(n => n.type.startsWith('payout_')).length,
  penalties:     notifications.filter(n => n.type.startsWith('penalty_')).length,
};
```

---

## Tab Bar UI

Inserted between the page header and the loading skeleton/list. Horizontal scrollable row of pill buttons.

Active tab style: gold text, `rgba(212,160,23,0.12)` background, `1px solid rgba(212,160,23,0.28)` border.
Inactive tab style: muted text (`#52526e`), transparent background, `1px solid rgba(255,255,255,0.07)` border.

Each tab shows a small count badge to the right of the label when count > 0:
- Unread badge: red (`#e11d48`)
- All others: gold-muted (`rgba(212,160,23,0.14)`, text `#d4a017`)

```jsx
const TABS = [
  { key: 'all',           label: 'All'           },
  { key: 'unread',        label: 'Unread'        },
  { key: 'contributions', label: 'Contributions' },
  { key: 'payouts',       label: 'Payouts'       },
  { key: 'penalties',     label: 'Penalties'     },
];
```

---

## Empty State When Filtered

When `filtered.length === 0` and `filter !== 'all'`, show:
> "No [label] notifications"
> "Nothing here yet — check back later."

When `filter === 'all'` and empty, keep the existing "All caught up" message unchanged.

---

## List Renders `filtered` Instead of `notifications`

The `.map()` over notifications changes from `notifications.map(...)` to `filtered.map(...)`.

Load More button: hide when `filter !== 'all'` (pagination only applies to the full unfiltered list).

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/pages/NotificationsPage.jsx` | Add filter state, TAB_COUNTS, tab bar UI, filtered list render |

No server changes. No new files.
