# Phase 1: Circle Settings & Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add due date, grace period, rotation type, and a template system (presets + save-your-own) to ContriTrack Circles.

**Architecture:** Extend the existing `Group` schema with 3 new fields; create a `Template` model for preset and user-saved templates; add `isLate` to `Contribution`; wire late-stamping into the contributions POST route; build a 2-step create-circle modal and a settings drawer on the frontend.

**Tech Stack:** Node.js + Express + Mongoose (backend), React 18 + React Router v6 + Tailwind + CSS variables (frontend), existing `useToast` / `useAuth` / `useGroup` hooks.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `server/models/Group.js` | Modify | Add `dueDay`, `graceDays`, `rotationType` |
| `server/models/Contribution.js` | Modify | Add `isLate` field |
| `server/models/Template.js` | Create | Template schema |
| `server/utils/cycleUtils.js` | Create | `getPenaltyTriggerDate`, `isLateSubmission` |
| `server/utils/rotationUtils.js` | Create | `buildJoinOrderRotation`, `buildRandomRotation`, `buildRotationSlots` |
| `server/routes/templates.js` | Create | `GET /api/templates`, `DELETE /api/templates/:id` |
| `server/routes/groups.js` | Modify | Update POST body, add PATCH settings, add POST save-template |
| `server/routes/contributions.js` | Modify | Stamp `isLate` on submission |
| `server/server.js` | Modify | Register `/api/templates` route |
| `server/seeds/templates.js` | Create | One-time system preset seed |
| `client/src/components/StatusBadge.jsx` | Modify | Add `late` state |
| `client/src/components/TemplatePickerStep.jsx` | Create | Step 1 of create modal |
| `client/src/components/CircleSettingsDrawer.jsx` | Create | Settings panel overlay |
| `client/src/pages/GroupsPage.jsx` | Modify | 2-step modal, settings button, My Templates section |

---

## Task 1: Extend Group model

**Files:**
- Modify: `server/models/Group.js`

- [ ] **Step 1: Add the three new fields to the schema**

Open `server/models/Group.js`. After the `isActive` field, add:

```js
    dueDay: {
      type: Number, default: 25, min: 1, max: 28,
    },
    graceDays: {
      type: Number, default: 3, min: 0, max: 7,
    },
    rotationType: {
      type: String,
      enum: ['fixed', 'join-order', 'random', 'bid'],
      default: 'fixed',
    },
```

The full schema block after editing should look like:

```js
const groupSchema = new mongoose.Schema(
  {
    name:               { type: String, required: true, trim: true, maxlength: 100 },
    description:        { type: String, default: '', maxlength: 500 },
    contributionAmount: { type: Number, default: 0, min: 0 },
    currency:           { type: String, default: 'NGN' },
    inviteCode:         { type: String, unique: true },
    members:            [memberSchema],
    createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive:           { type: Boolean, default: true },
    dueDay:             { type: Number, default: 25, min: 1, max: 28 },
    graceDays:          { type: Number, default: 3,  min: 0, max: 7  },
    rotationType: {
      type: String, enum: ['fixed', 'join-order', 'random', 'bid'], default: 'fixed',
    },
  },
  { timestamps: true }
);
```

- [ ] **Step 2: Verify the server still starts**

```bash
cd server && node -e "require('./models/Group'); console.log('OK')"
```

Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add server/models/Group.js
git commit -m "feat: add dueDay, graceDays, rotationType to Group model"
```

---

## Task 2: Add isLate to Contribution model

**Files:**
- Modify: `server/models/Contribution.js`

- [ ] **Step 1: Add isLate field**

Open `server/models/Contribution.js`. Add after `rejectionNote`:

```js
    isLate: { type: Boolean, default: false },
```

The full schema block after editing:

```js
const contributionSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    group:         { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    month:         { type: Number, required: true, min: 1, max: 12 },
    year:          { type: Number, required: true, min: 2020, max: 2100 },
    amount:        { type: Number, required: true, min: 1 },
    proofImage:    { type: String, required: true },
    note:          { type: String, default: '', maxlength: 500 },
    status: {
      type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending',
    },
    verifiedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt:    { type: Date, default: null },
    rejectionNote: { type: String, default: '', maxlength: 500 },
    isLate:        { type: Boolean, default: false },
  },
  { timestamps: true }
);
```

- [ ] **Step 2: Verify**

```bash
cd server && node -e "require('./models/Contribution'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add server/models/Contribution.js
git commit -m "feat: add isLate field to Contribution model"
```

---

## Task 3: Create Template model

**Files:**
- Create: `server/models/Template.js`

- [ ] **Step 1: Create the file**

```js
const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 200 },
    icon:        { type: String, default: '◎' },
    isPreset:    { type: Boolean, default: false },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    settings: {
      contributionAmount: { type: Number, default: 0, min: 0 },
      dueDay:             { type: Number, default: 25, min: 1, max: 28 },
      graceDays:          { type: Number, default: 3,  min: 0, max: 7  },
      rotationType: {
        type: String, enum: ['fixed', 'join-order', 'random', 'bid'], default: 'fixed',
      },
    },
  },
  { timestamps: true }
);

templateSchema.index({ isPreset: 1 });
templateSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Template', templateSchema);
```

- [ ] **Step 2: Verify**

```bash
cd server && node -e "require('./models/Template'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add server/models/Template.js
git commit -m "feat: add Template model"
```

---

## Task 4: Create cycleUtils.js

**Files:**
- Create: `server/utils/cycleUtils.js`

- [ ] **Step 1: Create the file**

```js
/**
 * Returns the Date after which a contribution is considered late.
 * dueDay 25, graceDays 3, month 4, year 2026 → May 28 2026 at 00:00:00
 */
function getPenaltyTriggerDate(year, month, dueDay, graceDays) {
  const d = new Date(year, month - 1, dueDay);
  d.setDate(d.getDate() + (graceDays || 0));
  return d;
}

/**
 * Returns true if submittedAt is past the grace window.
 */
function isLateSubmission(submittedAt, year, month, dueDay, graceDays) {
  return new Date(submittedAt) > getPenaltyTriggerDate(year, month, dueDay, graceDays);
}

module.exports = { getPenaltyTriggerDate, isLateSubmission };
```

- [ ] **Step 2: Verify manually**

```bash
cd server && node -e "
const { getPenaltyTriggerDate, isLateSubmission } = require('./utils/cycleUtils');
const d = getPenaltyTriggerDate(2026, 4, 25, 3);
console.log(d.toDateString()); // Tue Apr 28 2026
console.log(isLateSubmission(new Date('2026-04-29'), 2026, 4, 25, 3)); // true
console.log(isLateSubmission(new Date('2026-04-27'), 2026, 4, 25, 3)); // false
"
```

Expected output:
```
Tue Apr 28 2026
true
false
```

- [ ] **Step 3: Commit**

```bash
git add server/utils/cycleUtils.js
git commit -m "feat: add cycleUtils for due date and late submission logic"
```

---

## Task 5: Create rotationUtils.js

**Files:**
- Create: `server/utils/rotationUtils.js`

- [ ] **Step 1: Create the file**

```js
/**
 * Returns members sorted by joinedAt ascending (join-order rotation).
 * Each element is a group member subdocument { user, role, joinedAt }.
 */
function buildJoinOrderRotation(members) {
  return [...members].sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
}

/**
 * Returns members in a randomly shuffled order (Fisher-Yates).
 */
function buildRandomRotation(members) {
  const arr = [...members];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Maps an ordered member array to payout slot objects.
 * startMonth: 1-12, the first month to assign.
 * Returns [{ userId, month, year, position }]
 */
function buildRotationSlots(orderedMembers, startMonth, startYear) {
  return orderedMembers.map((m, i) => {
    const totalMonths = startMonth - 1 + i;
    return {
      userId:   m.user._id || m.user,
      month:    (totalMonths % 12) + 1,
      year:     startYear + Math.floor(totalMonths / 12),
      position: i + 1,
    };
  });
}

module.exports = { buildJoinOrderRotation, buildRandomRotation, buildRotationSlots };
```

- [ ] **Step 2: Verify manually**

```bash
cd server && node -e "
const { buildJoinOrderRotation, buildRandomRotation, buildRotationSlots } = require('./utils/rotationUtils');
const members = [
  { user: 'u1', joinedAt: new Date('2026-01-10') },
  { user: 'u2', joinedAt: new Date('2026-01-05') },
  { user: 'u3', joinedAt: new Date('2026-01-20') },
];
const ordered = buildJoinOrderRotation(members);
console.log(ordered.map(m => m.user)); // ['u2', 'u1', 'u3']
const slots = buildRotationSlots(ordered, 4, 2026);
console.log(slots.map(s => s.month + '/' + s.year)); // ['4/2026','5/2026','6/2026']
"
```

Expected:
```
[ 'u2', 'u1', 'u3' ]
[ '4/2026', '5/2026', '6/2026' ]
```

- [ ] **Step 3: Commit**

```bash
git add server/utils/rotationUtils.js
git commit -m "feat: add rotationUtils for join-order and random rotation seeding"
```

---

## Task 6: Create templates route

**Files:**
- Create: `server/routes/templates.js`

- [ ] **Step 1: Create the file**

```js
const express = require('express');
const router  = express.Router();
const Template = require('../models/Template');
const { protect } = require('../middleware/auth');

// GET /api/templates — system presets + caller's saved templates
router.get('/', async (req, res) => {
  try {
    let token = null;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    const presets = await Template.find({ isPreset: true }).sort({ createdAt: 1 });

    let mine = [];
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        mine = await Template.find({ createdBy: decoded.id, isPreset: false }).sort({ createdAt: -1 });
      } catch {
        // invalid token — just return presets
      }
    }

    res.json({ presets, mine });
  } catch (err) {
    console.error('[templates]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// DELETE /api/templates/:id — owner only, cannot delete presets
router.delete('/:id', protect, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    if (template.isPreset) return res.status(403).json({ message: 'System templates cannot be deleted' });
    if (String(template.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own templates' });
    }
    await template.deleteOne();
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('[templates]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/templates.js
git commit -m "feat: add templates API route (GET presets+mine, DELETE)"
```

---

## Task 7: Register templates route + update groups POST

**Files:**
- Modify: `server/server.js`
- Modify: `server/routes/groups.js`

- [ ] **Step 1: Register the route in server.js**

Open `server/server.js`. After the existing `app.use('/api/notifications', ...)` line, add:

```js
app.use('/api/templates',     require('./routes/templates'));
```

- [ ] **Step 2: Update POST /api/groups to accept new fields**

Open `server/routes/groups.js`. Find the `POST /` handler. Replace the destructure line and the `Group.create` call:

```js
router.post('/', protect, guardGroupCreate, async (req, res) => {
  const { name, description, contributionAmount, dueDay, graceDays, rotationType } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Group name is required' });
  }

  // Validate new settings fields
  const parsedDueDay = dueDay !== undefined ? Number(dueDay) : 25;
  const parsedGraceDays = graceDays !== undefined ? Number(graceDays) : 3;
  const validRotations = ['fixed', 'join-order', 'random', 'bid'];
  const parsedRotationType = validRotations.includes(rotationType) ? rotationType : 'fixed';

  if (parsedDueDay < 1 || parsedDueDay > 28 || !Number.isInteger(parsedDueDay)) {
    return res.status(400).json({ message: 'Due day must be between 1 and 28' });
  }
  if (parsedGraceDays < 0 || parsedGraceDays > 7 || !Number.isInteger(parsedGraceDays)) {
    return res.status(400).json({ message: 'Grace period must be between 0 and 7 days' });
  }

  const safeDescription = description
    ? String(description).replace(/<[^>]*>/g, '').trim().slice(0, 500)
    : '';

  try {
    const group = await Group.create({
      name:               name.trim().slice(0, 100),
      description:        safeDescription,
      contributionAmount: Number(contributionAmount) || 0,
      dueDay:             parsedDueDay,
      graceDays:          parsedGraceDays,
      rotationType:       parsedRotationType,
      createdBy:          req.user._id,
      members:            [{ user: req.user._id, role: 'admin' }],
    });

    await group.populate('members.user', 'name email role');
    res.status(201).json(group);
  } catch (err) {
    console.error('[groups]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});
```

- [ ] **Step 3: Verify server starts without errors**

```bash
cd server && node -e "require('./server')" 2>&1 | head -5
```

Expected: `MongoDB connected` and `Server running on port 5000` (or no crash).

- [ ] **Step 4: Commit**

```bash
git add server/server.js server/routes/groups.js
git commit -m "feat: register templates route, update groups POST to accept settings"
```

---

## Task 8: Add PATCH /api/groups/:id/settings

**Files:**
- Modify: `server/routes/groups.js`

- [ ] **Step 1: Add the route**

In `server/routes/groups.js`, find the existing `PATCH /:id` route (the general edit). Add a NEW route directly after it:

```js
// ─── PATCH /api/groups/:id/settings ──────────────────────────────────────────
// Group admin only. Updates schedule and rotation settings.
router.patch('/:id/settings', protect, async (req, res) => {
  const { name, description, contributionAmount, dueDay, graceDays, rotationType } = req.body;

  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group admins can update settings' });
    }

    if (name !== undefined) {
      const trimmed = String(name).trim().slice(0, 100);
      if (!trimmed) return res.status(400).json({ message: 'Group name is required' });
      group.name = trimmed;
    }
    if (description !== undefined) {
      group.description = String(description).replace(/<[^>]*>/g, '').trim().slice(0, 500);
    }
    if (contributionAmount !== undefined) {
      const amt = Number(contributionAmount);
      if (isNaN(amt) || amt < 0) return res.status(400).json({ message: 'Invalid contribution amount' });
      group.contributionAmount = amt;
    }
    if (dueDay !== undefined) {
      const d = Number(dueDay);
      if (!Number.isInteger(d) || d < 1 || d > 28) {
        return res.status(400).json({ message: 'Due day must be between 1 and 28' });
      }
      group.dueDay = d;
    }
    if (graceDays !== undefined) {
      const g = Number(graceDays);
      if (!Number.isInteger(g) || g < 0 || g > 7) {
        return res.status(400).json({ message: 'Grace period must be between 0 and 7 days' });
      }
      group.graceDays = g;
    }
    if (rotationType !== undefined) {
      const valid = ['fixed', 'join-order', 'random', 'bid'];
      if (!valid.includes(rotationType)) {
        return res.status(400).json({ message: 'Invalid rotation type' });
      }
      group.rotationType = rotationType;
    }

    await group.save();
    await group.populate('members.user', 'name email role');
    res.json(group);
  } catch (err) {
    console.error('[groups]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/groups.js
git commit -m "feat: add PATCH /api/groups/:id/settings route"
```

---

## Task 9: Add POST /api/groups/:id/save-template

**Files:**
- Modify: `server/routes/groups.js`

- [ ] **Step 1: Add require at the top of groups.js**

At the very top of `server/routes/groups.js`, add after the existing requires:

```js
const Template = require('../models/Template');
```

- [ ] **Step 2: Add the save-template route**

After the settings PATCH route, add:

```js
// ─── POST /api/groups/:id/save-template ──────────────────────────────────────
// Group admin only. Saves current group settings as a personal template.
router.post('/:id/save-template', protect, async (req, res) => {
  const { name, description, icon } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'Template name is required' });
  }

  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group admins can save templates' });
    }

    // Enforce per-user limit of 10 saved templates
    const existing = await Template.countDocuments({ createdBy: req.user._id, isPreset: false });
    if (existing >= 10) {
      return res.status(400).json({ message: 'Template limit reached (max 10). Delete one to save a new template.' });
    }

    const template = await Template.create({
      name:      String(name).trim().slice(0, 80),
      description: description ? String(description).trim().slice(0, 200) : '',
      icon:      icon || '◎',
      isPreset:  false,
      createdBy: req.user._id,
      settings: {
        contributionAmount: group.contributionAmount,
        dueDay:             group.dueDay,
        graceDays:          group.graceDays,
        rotationType:       group.rotationType,
      },
    });

    res.status(201).json(template);
  } catch (err) {
    console.error('[groups]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/groups.js
git commit -m "feat: add POST /api/groups/:id/save-template route"
```

---

## Task 10: Seed system templates

**Files:**
- Create: `server/seeds/templates.js`

- [ ] **Step 1: Create the seed script**

```js
require('dotenv').config();
const mongoose  = require('mongoose');
const Template  = require('../models/Template');

const PRESETS = [
  {
    name: 'Family Ajo',
    description: 'Classic family savings circle with fixed payout rotation',
    icon: '👨‍👩‍👧‍👦',
    settings: { contributionAmount: 20000, dueDay: 25, graceDays: 3, rotationType: 'fixed' },
  },
  {
    name: 'Office Thrift',
    description: 'Workplace savings club — first to join gets paid first',
    icon: '🏢',
    settings: { contributionAmount: 10000, dueDay: 28, graceDays: 2, rotationType: 'join-order' },
  },
  {
    name: 'Church Circle',
    description: 'Community savings with fair random rotation',
    icon: '⛪',
    settings: { contributionAmount: 5000, dueDay: 1, graceDays: 5, rotationType: 'random' },
  },
  {
    name: 'Friends Esusu',
    description: 'Small group of friends with manual payout order',
    icon: '🤝',
    settings: { contributionAmount: 15000, dueDay: 20, graceDays: 3, rotationType: 'fixed' },
  },
  {
    name: 'Market Women',
    description: 'High-contribution traders circle with join-order priority',
    icon: '🛒',
    settings: { contributionAmount: 30000, dueDay: 15, graceDays: 2, rotationType: 'join-order' },
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const preset of PRESETS) {
    const exists = await Template.findOne({ name: preset.name, isPreset: true });
    if (exists) {
      console.log(`  SKIP  "${preset.name}" (already exists)`);
      continue;
    }
    await Template.create({ ...preset, isPreset: true, createdBy: null });
    console.log(`  ADDED "${preset.name}"`);
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run the seed**

```bash
cd server && node seeds/templates.js
```

Expected output:
```
Connected to MongoDB
  ADDED "Family Ajo"
  ADDED "Office Thrift"
  ADDED "Church Circle"
  ADDED "Friends Esusu"
  ADDED "Market Women"
Seed complete.
```

- [ ] **Step 3: Verify via API (server must be running)**

```bash
curl http://localhost:5000/api/templates
```

Expected: JSON with `presets` array of 5 objects, `mine: []`.

- [ ] **Step 4: Commit**

```bash
git add server/seeds/templates.js
git commit -m "feat: add system template seed script (5 presets)"
```

---

## Task 11: Stamp isLate on contribution submission

**Files:**
- Modify: `server/routes/contributions.js`

- [ ] **Step 1: Add cycleUtils import**

At the top of `server/routes/contributions.js`, after the existing requires:

```js
const { isLateSubmission } = require('../utils/cycleUtils');
```

- [ ] **Step 2: Update the POST / handler to stamp isLate**

Find the `POST /` handler. Inside the `try` block, after the `parsedYear` validation and before `Group` is referenced, add a lookup for the group's due settings. Replace the `data` object construction:

```js
  try {
    // Fetch group to get dueDay + graceDays for late-stamping
    let dueDay = 25, graceDays = 3;
    if (groupId) {
      const grp = await Group.findById(groupId).select('dueDay graceDays isActive members');
      if (!grp || !grp.isActive) {
        return res.status(404).json({ message: 'Group not found' });
      }
      dueDay    = grp.dueDay    ?? 25;
      graceDays = grp.graceDays ?? 3;
    }

    const submittedAt = new Date();
    const late = isLateSubmission(submittedAt, parsedYear, parsedMonth, dueDay, graceDays);

    const data = {
      user:       req.user._id,
      amount:     parsedAmount,
      month:      parsedMonth,
      year:       parsedYear,
      note:       safeNote,
      proofImage: req.file.path,
      isLate:     late,
    };
    if (groupId) data.group = groupId;
```

> Note: `Group` is already imported in contributions.js. If it is not, add `const Group = require('../models/Group');` at the top.

- [ ] **Step 3: Verify Group is imported**

```bash
grep "require.*Group" server/routes/contributions.js
```

Expected: a line with `require('../models/Group')`. If missing, add it.

- [ ] **Step 4: Commit**

```bash
git add server/routes/contributions.js
git commit -m "feat: stamp isLate on contribution submission using group dueDay/graceDays"
```

---

## Task 12: Add Late state to StatusBadge

**Files:**
- Modify: `client/src/components/StatusBadge.jsx`

- [ ] **Step 1: Add late to the config object**

Open `client/src/components/StatusBadge.jsx`. Add the `late` key to `config`:

```js
const config = {
  verified: {
    bg: 'rgba(5,150,105,0.10)', border: 'rgba(5,150,105,0.22)',
    color: '#047857', dot: '#10b981', label: 'Verified',
  },
  pending: {
    bg: 'rgba(217,119,6,0.10)', border: 'rgba(217,119,6,0.22)',
    color: '#92650a', dot: '#f59e0b', label: 'Pending',
  },
  rejected: {
    bg: 'rgba(225,29,72,0.10)', border: 'rgba(225,29,72,0.22)',
    color: '#be123c', dot: '#f43f5e', label: 'Rejected',
  },
  unpaid: {
    bg: 'rgba(100,100,140,0.07)', border: 'rgba(100,100,140,0.15)',
    color: '#5a5a80', dot: '#8888a8', label: 'Not Paid',
  },
  late: {
    bg: 'rgba(225,29,72,0.10)', border: 'rgba(225,29,72,0.22)',
    color: '#be123c', dot: '#f43f5e', label: 'Late',
  },
};
```

- [ ] **Step 2: Update component to accept isLate prop**

```jsx
export default function StatusBadge({ status, isLate }) {
  const resolvedStatus = (isLate && status === 'pending') ? 'late' : status;
  const c = config[resolvedStatus] || config.unpaid;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 20, fontSize: 11.5,
      fontWeight: 600, letterSpacing: '0.01em',
      background: c.bg, color: c.color,
      border: `1.5px solid ${c.border}`,
      fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: c.dot, flexShrink: 0,
        boxShadow: `0 0 4px ${c.dot}80`,
      }} />
      {c.label}
    </span>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/StatusBadge.jsx
git commit -m "feat: add Late state to StatusBadge component"
```

---

## Task 13: Create TemplatePickerStep component

**Files:**
- Create: `client/src/components/TemplatePickerStep.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';

const ROTATION_LABELS = {
  'fixed':      'Fixed rotation',
  'join-order': 'Join order',
  'random':     'Random draw',
  'bid':        'Pledge/Bid',
};

function fmt(n) {
  if (!n) return '—';
  return '₦' + Number(n).toLocaleString('en-NG');
}

function TemplateCard({ template, onSelect, selected }) {
  return (
    <button
      onClick={() => onSelect(template)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '16px', borderRadius: 12, cursor: 'pointer',
        border: selected
          ? '2px solid var(--ct-gold)'
          : '1.5px solid rgba(0,0,0,0.08)',
        background: selected ? 'rgba(212,160,23,0.06)' : '#fff',
        boxShadow: selected
          ? '0 0 0 3px rgba(212,160,23,0.15)'
          : 'var(--ct-shadow)',
        textAlign: 'left', width: '100%',
        transition: 'all 0.16s ease',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1 }}>
        {template.icon || '◎'}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ct-text-1)' }}>
        {template.name}
      </div>
      {template.settings && (
        <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)', lineHeight: 1.5 }}>
          {fmt(template.settings.contributionAmount)} · Due {template.settings.dueDay}th
          · {ROTATION_LABELS[template.settings.rotationType] || template.settings.rotationType}
        </div>
      )}
      {template.description && (
        <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)', lineHeight: 1.4 }}>
          {template.description}
        </div>
      )}
    </button>
  );
}

export default function TemplatePickerStep({ onSelect, onSkip }) {
  const [presets, setPresets]   = useState([]);
  const [mine, setMine]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/templates')
      .then(({ data }) => {
        setPresets(data.presets || []);
        setMine(data.mine || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (template) => {
    setSelected(template._id);
    onSelect(template.settings || {});
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', marginBottom: 4 }}>
          Start from a template
        </div>
        <div style={{ fontSize: 13, color: 'var(--ct-text-3)' }}>
          Pick a starting point — you can change everything after.
        </div>
      </div>

      {/* Scratch option */}
      <button
        onClick={onSkip}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          border: '1.5px dashed rgba(0,0,0,0.15)', background: '#faf9f6',
          cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'var(--font-sans)', transition: 'all 0.16s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ct-gold)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'; }}
      >
        <span style={{ fontSize: 22 }}>✦</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ct-text-1)' }}>Start from scratch</div>
          <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>Fill in every detail yourself</div>
        </div>
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ct-text-3)', fontSize: 13 }}>
          Loading templates…
        </div>
      ) : (
        <>
          {/* System presets */}
          {presets.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Presets
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {presets.map(t => (
                  <TemplateCard key={t._id} template={t} onSelect={handleSelect} selected={selected === t._id} />
                ))}
              </div>
            </>
          )}

          {/* User-saved templates */}
          {mine.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                My saved templates
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {mine.map(t => (
                  <TemplateCard key={t._id} template={t} onSelect={handleSelect} selected={selected === t._id} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/TemplatePickerStep.jsx
git commit -m "feat: add TemplatePickerStep component for create-circle modal"
```

---

## Task 14: Create CircleSettingsDrawer component

**Files:**
- Create: `client/src/components/CircleSettingsDrawer.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const ROTATION_OPTIONS = [
  { value: 'fixed',      label: 'Fixed',      desc: 'You assign payout order manually' },
  { value: 'join-order', label: 'Join Order',  desc: 'First to join gets paid first' },
  { value: 'random',     label: 'Random',      desc: 'Rotation is shuffled at cycle start' },
  { value: 'bid',        label: 'Bid / Pledge', desc: 'Members request payout via Pledge' },
];

const GRACE_OPTIONS = [0, 1, 2, 3, 5, 7];

function dueSentence(dueDay, graceDays) {
  if (!dueDay) return '';
  const triggerDay = Number(dueDay) + Number(graceDays || 0);
  const suffix = d => d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th';
  if (!graceDays || graceDays === 0) {
    return `Contributions are due on the ${dueDay}${suffix(dueDay)} of each month.`;
  }
  return `Due on the ${dueDay}${suffix(dueDay)}. Members have ${graceDays} extra day${graceDays > 1 ? 's' : ''} (until the ${triggerDay}${suffix(triggerDay)}) before a penalty applies.`;
}

export default function CircleSettingsDrawer({ group, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name:               group?.name || '',
    description:        group?.description || '',
    contributionAmount: String(group?.contributionAmount || ''),
    dueDay:             String(group?.dueDay ?? 25),
    graceDays:          String(group?.graceDays ?? 3),
    rotationType:       group?.rotationType || 'fixed',
  });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [tplName, setTplName]   = useState('');
  const [savingTpl, setSavingTpl] = useState(false);

  // Re-sync if group prop changes
  useEffect(() => {
    if (group) {
      setForm({
        name:               group.name || '',
        description:        group.description || '',
        contributionAmount: String(group.contributionAmount || ''),
        dueDay:             String(group.dueDay ?? 25),
        graceDays:          String(group.graceDays ?? 3),
        rotationType:       group.rotationType || 'fixed',
      });
    }
  }, [group?._id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) return setError('Circle name is required');
    setSaving(true);
    try {
      const { data: updated } = await api.patch(`/groups/${group._id}/settings`, {
        name:               form.name.trim(),
        description:        form.description,
        contributionAmount: Number(form.contributionAmount) || 0,
        dueDay:             Number(form.dueDay),
        graceDays:          Number(form.graceDays),
        rotationType:       form.rotationType,
      });
      toast.success('Settings saved.');
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim()) return;
    setSavingTpl(true);
    try {
      await api.post(`/groups/${group._id}/save-template`, { name: tplName.trim() });
      toast.success(`Template "${tplName.trim()}" saved.`);
      setTplName('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save template');
    } finally {
      setSavingTpl(false);
    }
  };

  const labelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 6, display: 'block' };
  const inputStyle = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid var(--ct-border)', borderRadius: 8,
    fontSize: 13.5, fontFamily: 'var(--font-sans)',
    background: '#fff', color: 'var(--ct-text-1)',
    boxSizing: 'border-box',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 440,
        background: '#fff', zIndex: 301,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        animation: 'slideDown 0.22s ease both',
        fontFamily: 'var(--font-sans)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--ct-border-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--ct-text-1)' }}>
              Circle Settings
            </div>
            <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 2 }}>{group?.name}</div>
          </div>
          <button onClick={onClose} aria-label="Close settings" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ct-text-3)', fontSize: 20, padding: 4 }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* ── General ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>General</div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Circle name</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} maxLength={100} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} value={form.description} onChange={e => set('description', e.target.value)} maxLength={500} />
            </div>
            <div>
              <label style={labelStyle}>Monthly contribution (₦)</label>
              <input style={inputStyle} type="number" min="0" value={form.contributionAmount} onChange={e => set('contributionAmount', e.target.value)} />
            </div>
          </div>

          {/* ── Schedule ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Schedule</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Due day</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input style={{ ...inputStyle, width: 80 }} type="number" min="1" max="28" value={form.dueDay} onChange={e => set('dueDay', e.target.value)} />
                  <span style={{ fontSize: 12, color: 'var(--ct-text-3)', whiteSpace: 'nowrap' }}>of each month</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Grace period</label>
                <select style={inputStyle} value={form.graceDays} onChange={e => set('graceDays', e.target.value)}>
                  {GRACE_OPTIONS.map(d => (
                    <option key={d} value={d}>{d === 0 ? 'None' : `${d} day${d > 1 ? 's' : ''}`}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Live preview */}
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(212,160,23,0.07)', border: '1px solid rgba(212,160,23,0.18)', fontSize: 12.5, color: '#92700f', lineHeight: 1.5 }}>
              {dueSentence(form.dueDay, form.graceDays)}
            </div>
          </div>

          {/* ── Rotation ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Rotation type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROTATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set('rotationType', opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: form.rotationType === opt.value ? '2px solid var(--ct-gold)' : '1.5px solid var(--ct-border)',
                    background: form.rotationType === opt.value ? 'rgba(212,160,23,0.06)' : '#faf9f6',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${form.rotationType === opt.value ? 'var(--ct-gold)' : 'var(--ct-border)'}`,
                    background: form.rotationType === opt.value ? 'var(--ct-gold)' : 'transparent',
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-1)' }}>{opt.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Save as Template ── */}
          <div style={{ marginBottom: 28, padding: '16px', borderRadius: 12, background: '#faf9f6', border: '1.5px solid var(--ct-border-2)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 10 }}>Save as template</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Template name…"
                value={tplName}
                onChange={e => setTplName(e.target.value)}
                maxLength={80}
              />
              <button
                onClick={handleSaveTemplate}
                disabled={!tplName.trim() || savingTpl}
                className="btn-gold"
                style={{ flexShrink: 0, opacity: !tplName.trim() ? 0.5 : 1 }}
              >
                {savingTpl ? '…' : 'Save'}
              </button>
            </div>
          </div>

          {/* ── Danger zone placeholder ── */}
          <div style={{ padding: '14px 16px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.07)', opacity: 0.45 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Coming in Phase 3</div>
            <div style={{ fontSize: 12.5, color: 'var(--ct-text-3)', display: 'flex', gap: 16 }}>
              <span>🗄 Archive circle</span>
              <span>📋 Clone circle</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        {error && (
          <div style={{ padding: '8px 24px', background: 'rgba(225,29,72,0.07)', borderTop: '1px solid rgba(225,29,72,0.15)', fontSize: 12.5, color: '#be123c' }}>
            {error}
          </div>
        )}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--ct-border-2)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-gold">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/CircleSettingsDrawer.jsx
git commit -m "feat: add CircleSettingsDrawer component"
```

---

## Task 15: Update GroupsPage — 2-step create modal + settings button + My Templates

**Files:**
- Modify: `client/src/pages/GroupsPage.jsx`

- [ ] **Step 1: Add imports at the top of GroupsPage.jsx**

After existing imports, add:

```js
import TemplatePickerStep from '../components/TemplatePickerStep';
import CircleSettingsDrawer from '../components/CircleSettingsDrawer';
```

- [ ] **Step 2: Add state variables inside GroupsPage component**

After the existing state declarations (after `const [saving, setSaving] = useState(false);`), add:

```js
// Create modal step: 'template' | 'form'
const [createStep, setCreateStep] = useState('template');
// Settings drawer
const [settingsGroup, setSettingsGroup] = useState(null);
```

- [ ] **Step 3: Update createForm state to include new fields**

Replace the existing `createForm` useState:

```js
const [createForm, setCreateForm] = useState({
  name: '', description: '', contributionAmount: '',
  dueDay: '25', graceDays: '3', rotationType: 'fixed',
});
```

- [ ] **Step 4: Reset createStep when modal opens/closes**

Update the `setShowCreate(true)` calls to also reset step:

```js
// Wherever setShowCreate(true) is called, add:
setCreateStep('template');
setCreateForm({ name: '', description: '', contributionAmount: '', dueDay: '25', graceDays: '3', rotationType: 'fixed' });
```

Also in `setShowCreate(false)` (at end of handleCreate success):

```js
setCreateStep('template');
```

- [ ] **Step 5: Update handleCreate to send new fields**

Replace the `api.post('/groups', createForm)` call inside handleCreate:

```js
const { data: newGroup } = await api.post('/groups', {
  name:               createForm.name.trim(),
  description:        createForm.description,
  contributionAmount: Number(createForm.contributionAmount) || 0,
  dueDay:             Number(createForm.dueDay) || 25,
  graceDays:          Number(createForm.graceDays) || 3,
  rotationType:       createForm.rotationType || 'fixed',
});
```

- [ ] **Step 6: Add onSaved handler for CircleSettingsDrawer**

After `handleArchive`, add:

```js
const handleSettingsSaved = async (updatedGroup) => {
  await loadGroups();
  if (activeGroup?._id === updatedGroup._id) selectGroup(updatedGroup);
};
```

- [ ] **Step 7: Add the template picker step inside the create modal JSX**

Inside the existing Create Circle modal JSX, wrap the form content so that when `createStep === 'template'` the TemplatePickerStep shows, and when `createStep === 'form'` the original form shows:

Find the line that renders the create modal form (it starts with `e.preventDefault()` in `handleCreate` and the JSX that has the input fields). Wrap the modal body:

```jsx
{/* Inside create modal — replace just the modal body content, keep the modal shell */}
{createStep === 'template' ? (
  <TemplatePickerStep
    onSelect={(settings) => {
      setCreateForm(f => ({
        ...f,
        contributionAmount: String(settings.contributionAmount || f.contributionAmount),
        dueDay:             String(settings.dueDay ?? f.dueDay),
        graceDays:          String(settings.graceDays ?? f.graceDays),
        rotationType:       settings.rotationType || f.rotationType,
      }));
      setCreateStep('form');
    }}
    onSkip={() => setCreateStep('form')}
  />
) : (
  <form onSubmit={handleCreate}>
    {/* ── existing name / description / amount fields ── */}

    {/* New fields below contributionAmount */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
          Due day <span style={{ fontWeight: 400, color: 'var(--ct-text-3)' }}>(1–28)</span>
        </label>
        <input
          type="number" min="1" max="28"
          value={createForm.dueDay}
          onChange={e => setCreateForm(f => ({ ...f, dueDay: e.target.value }))}
          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--ct-border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-sans)', background: '#fff' }}
        />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
          Grace period
        </label>
        <select
          value={createForm.graceDays}
          onChange={e => setCreateForm(f => ({ ...f, graceDays: e.target.value }))}
          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--ct-border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-sans)', background: '#fff' }}
        >
          {[0,1,2,3,5,7].map(d => <option key={d} value={d}>{d === 0 ? 'None' : `${d} day${d > 1 ? 's' : ''}`}</option>)}
        </select>
      </div>
    </div>

    <div style={{ marginTop: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 8 }}>
        Rotation type
      </label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[
          { v: 'fixed', l: 'Fixed' },
          { v: 'join-order', l: 'Join Order' },
          { v: 'random', l: 'Random' },
          { v: 'bid', l: 'Bid' },
        ].map(({ v, l }) => (
          <button
            key={v} type="button"
            onClick={() => setCreateForm(f => ({ ...f, rotationType: v }))}
            className={createForm.rotationType === v ? 'filter-pill active' : 'filter-pill'}
          >
            {l}
          </button>
        ))}
      </div>
    </div>

    {/* Back button + submit */}
    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
      <button type="button" className="btn-outline" onClick={() => setCreateStep('template')}>
        ← Back
      </button>
      <button type="submit" disabled={creating} className="btn-gold" style={{ flex: 1, justifyContent: 'center' }}>
        {creating ? 'Creating…' : 'Create Circle'}
      </button>
    </div>
    {createError && <div style={{ color: 'var(--ct-rose)', fontSize: 12.5, marginTop: 8 }}>{createError}</div>}
  </form>
)}
```

- [ ] **Step 8: Add Settings button to each group card**

In the group card action buttons area (where the Edit and Archive buttons are), add a Settings button for group admins:

```jsx
{/* Add alongside existing edit/archive buttons */}
{isGroupAdmin(group, user?._id) && (
  <button
    onClick={e => { e.stopPropagation(); setSettingsGroup(group); }}
    title="Circle settings"
    style={{
      background: 'none', border: '1.5px solid var(--ct-border)',
      borderRadius: 7, padding: '4px 8px', cursor: 'pointer',
      color: 'var(--ct-text-3)', fontSize: 12, fontFamily: 'var(--font-sans)',
      display: 'inline-flex', alignItems: 'center', gap: 4,
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ct-gold)'; e.currentTarget.style.color = 'var(--ct-gold)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ct-border)'; e.currentTarget.style.color = 'var(--ct-text-3)'; }}
  >
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
    Settings
  </button>
)}
```

- [ ] **Step 9: Add My Templates section at the bottom of GroupsPage**

After the groups grid (before the closing return tag), add:

```jsx
{/* ── My Templates ── */}
{/* Rendered at bottom of page, fetched inline from context */}
<MyTemplatesSection />
```

And add this helper component **outside** GroupsPage (at the bottom of the file):

```jsx
function MyTemplatesSection() {
  const [mine, setMine] = useState([]);
  const toast = useToast();

  useEffect(() => {
    api.get('/templates').then(({ data }) => setMine(data.mine || [])).catch(() => {});
  }, []);

  if (!mine.length) return null;

  const handleDelete = async (id, name) => {
    try {
      await api.delete(`/templates/${id}`);
      setMine(prev => prev.filter(t => t._id !== id));
      toast.success(`Template "${name}" deleted.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete template');
    }
  };

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-2)', marginBottom: 14 }}>
        My saved templates
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {mine.map(t => (
          <div key={t._id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 10,
            background: '#fff', border: '1.5px solid var(--ct-border-2)',
            boxShadow: 'var(--ct-shadow)',
          }}>
            <span style={{ fontSize: 20 }}>{t.icon || '◎'}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text-1)' }}>{t.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ct-text-3)' }}>
                ₦{Number(t.settings?.contributionAmount || 0).toLocaleString('en-NG')} · Due {t.settings?.dueDay}th
              </div>
            </div>
            <button
              onClick={() => handleDelete(t._id, t.name)}
              aria-label={`Delete template ${t.name}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ct-text-4)', fontSize: 16, padding: '2px 4px', marginLeft: 4 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--ct-rose)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--ct-text-4)'; }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Render CircleSettingsDrawer at the bottom of GroupsPage return**

Just before the closing `</>` or `</div>` of the GroupsPage return:

```jsx
{/* Settings drawer — rendered when settingsGroup is set */}
{settingsGroup && (
  <CircleSettingsDrawer
    group={settingsGroup}
    onClose={() => setSettingsGroup(null)}
    onSaved={(updated) => {
      handleSettingsSaved(updated);
      setSettingsGroup(null);
    }}
  />
)}
```

- [ ] **Step 11: Add the isGroupAdmin helper inside GroupsPage (if not already present)**

Check if `isGroupAdmin` is used in the JSX (it checks if a user is a group admin). If it doesn't exist as a local function in GroupsPage, add before the return:

```js
const isGroupAdmin = (group, userId) =>
  group?.members?.some(m => String(m.user?._id || m.user) === String(userId) && m.role === 'admin');
```

- [ ] **Step 12: Build and verify**

```bash
cd client && npm run build 2>&1 | grep -E "error|Error|built in"
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 13: Commit**

```bash
git add client/src/pages/GroupsPage.jsx client/src/components/TemplatePickerStep.jsx client/src/components/CircleSettingsDrawer.jsx
git commit -m "feat: 2-step create modal with templates, settings drawer, My Templates section"
```

---

## Task 16: Final integration check + smoke test

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

- [ ] **Step 2: Smoke test — create a circle from a template**

1. Open `http://localhost:3000`
2. Log in
3. Go to `/groups`
4. Click "Create Circle"
5. Verify Step 1 shows template picker with preset cards
6. Click "Family Ajo" template → verify Step 2 pre-fills ₦20,000, due day 25, grace 3 days, rotation Fixed
7. Enter a name and submit → verify circle is created with correct settings

- [ ] **Step 3: Smoke test — settings drawer**

1. On the groups page, find your new circle
2. Click the ⚙ Settings button
3. Verify drawer opens with correct current values
4. Change due day to 20, grace to 5, rotation to Random
5. Click Save → verify toast appears and group updates

- [ ] **Step 4: Smoke test — save as template**

1. Open settings drawer again
2. Type a template name in the "Save as template" input
3. Click Save → verify toast "Template saved"
4. Close drawer
5. Click "Create Circle" → verify your saved template appears in Step 1 under "My saved templates"

- [ ] **Step 5: Smoke test — isLate stamping**

1. Create a circle with `dueDay: 1` (so any contribution today would be late for last month)
2. Go to `/upload` and submit a contribution for last month
3. Check the response JSON includes `isLate: true`
4. Go to `/members` → verify the badge shows "Late" for pending late contributions

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 complete — Circle settings, templates, isLate stamping"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `dueDay`, `graceDays`, `rotationType` on Group — Task 1
- ✅ `isLate` on Contribution — Task 2
- ✅ Template model — Task 3
- ✅ `cycleUtils.js` — Task 4
- ✅ `rotationUtils.js` — Task 5
- ✅ Templates route (GET + DELETE) — Task 6
- ✅ Register templates route — Task 7
- ✅ Groups POST updated — Task 7
- ✅ PATCH settings — Task 8
- ✅ POST save-template — Task 9
- ✅ Seed script — Task 10
- ✅ Stamp isLate on submission — Task 11
- ✅ StatusBadge Late state — Task 12
- ✅ TemplatePickerStep — Task 13
- ✅ CircleSettingsDrawer — Task 14
- ✅ GroupsPage 2-step modal + settings button + My Templates — Task 15

**Type consistency check:** `buildRotationSlots` defined in Task 5 with params `(orderedMembers, startMonth, startYear)` — referenced correctly in spec but not directly called from these tasks (it's available for future use in the payouts route). No inconsistencies.

**Placeholder check:** All steps have concrete code. No TBDs.
