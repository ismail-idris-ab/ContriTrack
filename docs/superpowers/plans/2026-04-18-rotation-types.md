# Rotation Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `POST /api/payouts/generate` respect `group.rotationType` (join-order, random, fixed, bid) and show the active type in the PayoutPage generate modal.

**Architecture:** Server reads `group.rotationType` after fetching the group and reorders the members array before building payout slots. The GET endpoint exposes `rotationType` in its group object. The frontend stores it in `groupMeta` and renders it in the generate modal with a human-readable label and description.

**Tech Stack:** Express + Mongoose (server), React 18 + inline styles (frontend).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `server/routes/payouts.js` | **Modify** | Reorder members by rotationType in generate; expose rotationType in GET |
| `client/src/pages/PayoutPage.jsx` | **Modify** | Add ROTATION_LABELS constant; show type + description in generate modal; disable generate for bid type |

---

## Task 1: Server — respect rotationType in generate + expose in GET

**Files:**
- Modify: `server/routes/payouts.js`

- [ ] **Step 1: Add rotationType to GET /api/payouts response**

Find the `res.json(...)` call in `router.get('/', ...)` (around line 43). It currently returns:

```js
res.json({ payouts, group: { _id: group._id, name: group.name, contributionAmount: group.contributionAmount, memberCount: group.members.length } });
```

Replace with:

```js
res.json({
  payouts,
  group: {
    _id: group._id,
    name: group.name,
    contributionAmount: group.contributionAmount,
    memberCount: group.members.length,
    rotationType: group.rotationType,
  },
});
```

- [ ] **Step 2: Apply rotationType ordering in POST /api/payouts/generate**

In `router.post('/generate', ...)`, find the lines after the members-length check:

```js
const members = group.members;
if (members.length === 0) {
  return res.status(400).json({ message: 'Group has no members' });
}

// Remove all existing scheduled slots for this year
await Payout.deleteMany({ group: groupId, year: targetYear, status: 'scheduled' });

// Build round-robin slots starting at startMonth
const docs = [];
let memberIdx = 0;
for (let i = 0; i < members.length; i++) {
```

Replace that entire block (from `const members` through the for-loop opening) with:

```js
if (group.members.length === 0) {
  return res.status(400).json({ message: 'Group has no members' });
}

// Apply rotation type ordering
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
// 'fixed': use orderedMembers as-is (insertion order)

// Remove all existing scheduled slots for this year
await Payout.deleteMany({ group: groupId, year: targetYear, status: 'scheduled' });

// Build round-robin slots starting at startMonth
const docs = [];
let memberIdx = 0;
for (let i = 0; i < orderedMembers.length; i++) {
```

- [ ] **Step 3: Update the slot-building loop body to use orderedMembers**

Inside the for-loop that was just changed, find this line:

```js
      recipient: members[memberIdx]?.user._id,
```

Replace with:

```js
      recipient: orderedMembers[memberIdx]?.user._id,
```

Also update the loop condition from `i < members.length` to `i < orderedMembers.length` if it wasn't changed in Step 2 already. And update `expectedAmount` calculation:

Find:
```js
        expectedAmount: group.contributionAmount * members.length,
```

Replace with:
```js
        expectedAmount: group.contributionAmount * group.members.length,
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/payouts.js
git commit -m "feat: respect rotationType in payout generation (join-order, random, bid)"
```

---

## Task 2: Frontend — show rotation type in generate modal

**Files:**
- Modify: `client/src/pages/PayoutPage.jsx`

- [ ] **Step 1: Add ROTATION_LABELS constant near the top of the file**

After the existing `STATUS_CONFIG` constant (around line 21), add:

```js
const ROTATION_LABELS = {
  fixed:        { name: 'Fixed Order',  desc: 'Members assigned in their current list order.' },
  'join-order': { name: 'Join Order',   desc: 'Members assigned in the order they joined the circle.' },
  random:       { name: 'Random',       desc: 'Order is shuffled each time you generate.' },
  bid:          { name: 'Bid (manual)', desc: 'Auto-generate is disabled. Use the manual rotation builder.' },
};
```

- [ ] **Step 2: Derive isBidType from groupMeta**

In the component body, after the existing `const paid = ...` and `const totalPaid = ...` lines, add:

```js
const isBidType = groupMeta?.rotationType === 'bid';
```

- [ ] **Step 3: Add rotation type info row inside the generate modal**

Find the generate modal JSX. It contains a form with a start-month selector and a submit button. Locate the section just before the submit button — it likely looks like a `<div>` containing a `<label>` for start month and a `<select>`. Add the rotation type display block immediately after the month selector `<div>` and before the submit button:

```jsx
{/* Rotation type info */}
{groupMeta?.rotationType && (
  <div style={{
    padding: '12px 16px', borderRadius: 10,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    marginBottom: 16,
  }}>
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#52526e',
      textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
    }}>
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

- [ ] **Step 4: Disable generate submit button for bid type**

Find the modal's submit button. It currently looks something like:

```jsx
<button
  type="submit"
  disabled={generating}
  ...
>
  {generating ? 'Generating…' : 'Generate'}
</button>
```

Update the `disabled` prop and add a warning message below:

```jsx
<button
  type="submit"
  disabled={generating || isBidType}
  style={{
    /* keep existing style */
    cursor: generating || isBidType ? 'not-allowed' : 'pointer',
    opacity: isBidType ? 0.5 : 1,
  }}
>
  {generating ? 'Generating…' : 'Generate'}
</button>
{isBidType && (
  <p style={{ fontSize: 12, color: '#f59e0b', margin: '8px 0 0', textAlign: 'center' }}>
    Bid rotation must be assigned manually.
  </p>
)}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/PayoutPage.jsx
git commit -m "feat: show rotation type in payout generate modal, disable for bid"
```

---

## Task 3: Push

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

Expected: `main -> main` with the 2 new commits.

---

## Self-Review

**Spec coverage:**
- ✅ `generate` reorders by `join-order` (sort by joinedAt) — Task 1 Step 2
- ✅ `generate` reorders by `random` (Fisher-Yates) — Task 1 Step 2
- ✅ `generate` returns 400 with `BID_ROTATION_MANUAL` code for `bid` — Task 1 Step 2
- ✅ `fixed` uses insertion order (no change) — Task 1 Step 2
- ✅ GET `/payouts` exposes `rotationType` — Task 1 Step 1
- ✅ `ROTATION_LABELS` constant with all 4 types — Task 2 Step 1
- ✅ Rotation type info row in generate modal — Task 2 Step 3
- ✅ Generate button disabled for bid type — Task 2 Step 4

**Placeholder scan:** No TBDs. All code is complete.

**Type consistency:**
- `orderedMembers` defined in Task 1 Step 2, used in Steps 2–3 consistently
- `groupMeta?.rotationType` read in Task 2 Steps 2–4 — `groupMeta` is already stored from GET response, now includes `rotationType` after Task 1 Step 1
- `isBidType` defined in Task 2 Step 2, used in Steps 4 — consistent
- `ROTATION_LABELS` defined in Task 2 Step 1, used in Step 3 — consistent
