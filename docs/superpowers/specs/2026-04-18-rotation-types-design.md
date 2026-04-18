# Rotation Types Implementation — Design Spec
**Date:** 2026-04-18
**Scope:** Server respects `group.rotationType` on generate, frontend shows active type in modal

---

## Problem

`POST /api/payouts/generate` always assigns members in insertion order (round-robin) regardless of the group's `rotationType` field. Groups set to `join-order` or `random` get the same result as `fixed`. The frontend gives no indication of which rotation strategy will be used before generating.

---

## Solution

Two focused changes — one server, one frontend:

1. **Server:** `generate` reads `group.rotationType` and reorders the members array before building slots
2. **Frontend:** `GET /api/payouts` exposes `rotationType`; generate modal shows the active type with a description

`bid` rotation is not automated — it returns a 400 directing the admin to the manual rotation builder.

---

## 1. Server: `POST /api/payouts/generate`

**File:** `server/routes/payouts.js`

After the group is fetched and member-count validated, apply the rotation type before building docs:

```js
// Apply rotation type to member ordering
let orderedMembers = [...group.members];

if (group.rotationType === 'join-order') {
  orderedMembers.sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
} else if (group.rotationType === 'random') {
  for (let i = orderedMembers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orderedMembers[i], orderedMembers[j]] = [orderedMembers[j], orderedMembers[i]];
  }
} else if (group.rotationType === 'bid') {
  return res.status(400).json({
    message: 'Bid rotation must be set manually using the custom rotation builder.',
    code: 'BID_ROTATION_MANUAL',
  });
}
// 'fixed' uses orderedMembers as-is (insertion order)
```

The slot-building loop then uses `orderedMembers` instead of `members`.

**Behaviour per type:**
| Type | Ordering |
|------|----------|
| `fixed` | Insertion order (current behaviour) |
| `join-order` | Ascending `joinedAt` date |
| `random` | Fisher-Yates shuffle at generate time |
| `bid` | 400 — manual only |

---

## 2. Server: `GET /api/payouts`

**File:** `server/routes/payouts.js`

Add `rotationType` to the group object in the response:

```js
res.json({
  payouts,
  group: {
    _id: group._id,
    name: group.name,
    contributionAmount: group.contributionAmount,
    memberCount: group.members.length,
    rotationType: group.rotationType,   // ← add this
  }
});
```

---

## 3. Frontend: `PayoutPage.jsx`

**File:** `client/src/pages/PayoutPage.jsx`

### `groupMeta` already stored from GET response — no state change needed.

### Generate modal: add rotation type display

Inside the "Generate Rotation" modal, below the start-month selector and above the submit button, add a read-only info row:

```jsx
{groupMeta?.rotationType && (
  <div style={{
    padding: '12px 16px', borderRadius: 10,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    marginBottom: 16,
  }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#52526e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
      Rotation Type
    </div>
    <div style={{ fontSize: 13, color: '#c8c4d8', fontWeight: 600 }}>
      {ROTATION_LABELS[groupMeta.rotationType]?.name ?? groupMeta.rotationType}
    </div>
    <div style={{ fontSize: 12, color: '#52526e', marginTop: 3 }}>
      {ROTATION_LABELS[groupMeta.rotationType]?.desc}
    </div>
  </div>
)}
```

### `ROTATION_LABELS` constant (add near top of file):

```js
const ROTATION_LABELS = {
  fixed:       { name: 'Fixed Order',   desc: 'Members assigned in their current list order.' },
  'join-order':{ name: 'Join Order',    desc: 'Members assigned in the order they joined the circle.' },
  random:      { name: 'Random',        desc: 'Order is shuffled each time you generate.' },
  bid:         { name: 'Bid (manual)',  desc: 'Auto-generate is disabled. Use the manual rotation builder.' },
};
```

### Bid type: disable generate button

When `groupMeta?.rotationType === 'bid'`, disable the generate submit button and show a note:

```jsx
const isBidType = groupMeta?.rotationType === 'bid';

// On the submit button:
disabled={generating || isBidType}

// Below the button if bid:
{isBidType && (
  <p style={{ fontSize: 12, color: '#f59e0b', margin: '8px 0 0', textAlign: 'center' }}>
    Bid rotation must be assigned manually.
  </p>
)}
```

---

## Data Flow

```
Admin opens PayoutPage
  → GET /api/payouts?groupId=&year=
  → Response includes rotationType in group object
  → groupMeta.rotationType stored in state

Admin opens Generate modal
  → Sees rotation type + description
  → If bid: submit disabled, note shown
  → If other: submits normally

POST /api/payouts/generate
  → Server reads group.rotationType
  → Reorders members accordingly
  → Builds and returns slots
```

---

## Files Changed

| File | Change |
|------|--------|
| `server/routes/payouts.js` | `generate`: reorder by rotationType; `GET /`: add rotationType to response |
| `client/src/pages/PayoutPage.jsx` | Add `ROTATION_LABELS`, show type in modal, disable generate for bid type |

No model changes. No new routes.
