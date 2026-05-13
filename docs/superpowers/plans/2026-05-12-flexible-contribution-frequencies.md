# Flexible Contribution Frequencies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Rotara to support weekly, biweekly, monthly, and yearly savings circles without breaking any existing monthly data or API contracts.

**Architecture:** Additive fields on both Group and Contribution models. Server computes period metadata for non-monthly groups and always backfills `month`/`year` (so required schema fields stay valid). Old monthly path is never touched. A new sparse unique index handles duplicate prevention for non-monthly contributions alongside the existing index.

**Tech Stack:** Node.js + Express + Mongoose + Zod (server); React + Vite + React Query (client). No test framework installed — verification steps use manual server curl + browser checks.

---

## File Map

| File | Action |
|---|---|
| `server/utils/cycleUtils.js` | Add 4 new period functions; keep 2 old exports unchanged |
| `server/models/Group.js` | Add 5 new optional fields |
| `server/models/Contribution.js` | Add 5 new optional fields + sparse unique index |
| `server/validators/groups.js` | Add frequency fields to create + settings schemas with superRefine |
| `server/validators/contributions.js` | Make `month`/`year` optional |
| `server/controllers/contributionsController.js` | Dual-path createContribution; period query params in getContributions |
| `server/routes/members.js` | Add `periodStart`/`periodEnd` query support |
| `client/src/utils/dateUtils.js` | Add `formatPeriodLabel` + `getClientPeriod` helpers |
| `client/src/pages/GroupsPage.jsx` | Add frequency selector + conditional due-date fields |
| `client/src/pages/UploadPage.jsx` | Frequency-aware period display; send periodStart/periodEnd |
| `client/src/pages/DashboardPage.jsx` | Replace `MonthNav` with `PeriodNav`; pass period params to /members |
| `client/src/pages/MembersPage.jsx` | Period-aware `/members` query |

---

## Task 1: Extend cycleUtils.js with period functions

**Files:**
- Modify: `server/utils/cycleUtils.js`

- [ ] **Step 1: Read the current file**

Open `server/utils/cycleUtils.js`. It currently exports two functions:
- `getPenaltyTriggerDate(year, month, dueDay, graceDays)`
- `isLateSubmission(submittedAt, year, month, dueDay, graceDays)`

Both must remain unchanged and exported.

- [ ] **Step 2: Rewrite the file with new exports appended**

Replace the entire file with:

```js
/**
 * OLD API — kept for backward compatibility.
 * Returns the UTC Date after which a contribution is considered late.
 */
function getPenaltyTriggerDate(year, month, dueDay, graceDays) {
  return new Date(Date.UTC(year, month - 1, dueDay + 1 + (graceDays || 0)));
}

/**
 * OLD API — kept for backward compatibility.
 */
function isLateSubmission(submittedAt, year, month, dueDay, graceDays) {
  return new Date(submittedAt) > getPenaltyTriggerDate(year, month, dueDay, graceDays);
}

// ─── New period-aware API ──────────────────────────────────────────────────────

const MS_PER_DAY = 86400000;

/**
 * Compute the period object that contains `date` for the given group.
 * Returns { periodStart, periodEnd, periodLabel, dueDate, periodType }.
 * All dates are UTC midnight.
 *
 * @param {object} group  - Mongoose group document (needs contributionFrequency, startDate,
 *                          dueDayOfWeek, dueDayOfMonth, dueMonth, dueDay, graceDays)
 * @param {Date}   [date] - defaults to now
 */
function getCurrentPeriod(group, date) {
  return getPeriodForDate(group, date || new Date());
}

/**
 * Same as getCurrentPeriod but with an explicit date.
 */
function getPeriodForDate(group, date) {
  const freq = group.contributionFrequency || 'monthly';
  const d = new Date(date);
  // Work in UTC
  const utcYear  = d.getUTCFullYear();
  const utcMonth = d.getUTCMonth(); // 0-based
  const utcDay   = d.getUTCDate();

  let periodStart, periodEnd, dueDate;

  if (freq === 'weekly' || freq === 'biweekly') {
    const anchor = new Date(group.startDate);
    // Normalise anchor to UTC midnight
    const anchorMs = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const nowMs    = Date.UTC(utcYear, utcMonth, utcDay);
    const spanDays = freq === 'weekly' ? 7 : 14;
    const n        = Math.floor((nowMs - anchorMs) / (spanDays * MS_PER_DAY));
    const startMs  = anchorMs + n * spanDays * MS_PER_DAY;
    const endMs    = startMs + (spanDays - 1) * MS_PER_DAY;
    periodStart = new Date(startMs);
    periodEnd   = new Date(endMs);

    // dueDate: the dueDayOfWeek within this period + graceDays
    // dueDayOfWeek 0=Sun…6=Sat
    const startDow = periodStart.getUTCDay();
    const targetDow = group.dueDayOfWeek ?? 5; // default Friday
    let dayOffset = targetDow - startDow;
    if (dayOffset < 0) dayOffset += 7;
    // If dayOffset >= spanDays, pin to last day of period
    if (dayOffset >= spanDays) dayOffset = spanDays - 1;
    const dueDateMs = startMs + dayOffset * MS_PER_DAY;
    const graceDays = group.graceDays ?? 3;
    dueDate = new Date(dueDateMs + (graceDays + 1) * MS_PER_DAY);

  } else if (freq === 'yearly') {
    periodStart = new Date(Date.UTC(utcYear, 0, 1));
    periodEnd   = new Date(Date.UTC(utcYear, 11, 31));
    const dm    = group.dueMonth     ?? 12;
    const dd    = group.dueDayOfMonth ?? 25;
    const graceDays = group.graceDays ?? 3;
    dueDate = new Date(Date.UTC(utcYear, dm - 1, dd + 1 + graceDays));

  } else {
    // monthly (default)
    periodStart = new Date(Date.UTC(utcYear, utcMonth, 1));
    const lastDay = new Date(Date.UTC(utcYear, utcMonth + 1, 0)).getUTCDate();
    periodEnd   = new Date(Date.UTC(utcYear, utcMonth, lastDay));
    const dd    = group.dueDayOfMonth ?? group.dueDay ?? 25;
    const graceDays = group.graceDays ?? 3;
    dueDate = new Date(Date.UTC(utcYear, utcMonth, dd + 1 + graceDays));
  }

  const periodLabel = generatePeriodLabel(group, { periodStart, periodEnd, periodType: freq });
  return { periodStart, periodEnd, periodLabel, dueDate, periodType: freq };
}

/**
 * Returns whether submittedAt is past the grace window for this period.
 * New overload: accepts (submittedAt, group, period).
 */
function isLateSubmissionForPeriod(submittedAt, group, period) {
  const { dueDate } = period;
  return new Date(submittedAt) > dueDate;
}

/**
 * Returns a human-readable label for a period.
 * weekly:   "Week 3, 2026"
 * biweekly: "Jan 1–14, 2026"
 * monthly:  "April 2026"
 * yearly:   "Year 2026"
 */
function generatePeriodLabel(group, period) {
  const freq  = period.periodType || group.contributionFrequency || 'monthly';
  const start = new Date(period.periodStart);
  const end   = new Date(period.periodEnd);
  const year  = start.getUTCFullYear();

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (freq === 'weekly') {
    // ISO week number based on group startDate
    const anchor  = new Date(group.startDate);
    const anchorMs = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const startMs  = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const weekNum  = Math.floor((startMs - anchorMs) / (7 * MS_PER_DAY)) + 1;
    return `Week ${weekNum}, ${year}`;
  }

  if (freq === 'biweekly') {
    const sm = MONTHS_SHORT[start.getUTCMonth()];
    const em = MONTHS_SHORT[end.getUTCMonth()];
    const ey = end.getUTCFullYear();
    if (sm === em && year === ey) {
      return `${sm} ${start.getUTCDate()}–${end.getUTCDate()}, ${year}`;
    }
    return `${sm} ${start.getUTCDate()} – ${em} ${end.getUTCDate()}, ${ey}`;
  }

  if (freq === 'yearly') {
    return `Year ${year}`;
  }

  // monthly
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${MONTHS[start.getUTCMonth()]} ${year}`;
}

module.exports = {
  // OLD API — do not remove
  getPenaltyTriggerDate,
  isLateSubmission,
  // NEW API
  getCurrentPeriod,
  getPeriodForDate,
  isLateSubmissionForPeriod,
  generatePeriodLabel,
};
```

- [ ] **Step 3: Manual smoke check**

Start a Node REPL in the server directory:

```bash
cd server
node -e "
const u = require('./utils/cycleUtils');

// Old API still works
console.log('Old API:', u.getPenaltyTriggerDate(2026, 4, 25, 3));

// Monthly group
const monthly = { contributionFrequency: 'monthly', dueDay: 25, graceDays: 3 };
const p = u.getCurrentPeriod(monthly, new Date('2026-05-12'));
console.log('Monthly period:', p.periodLabel, p.periodStart, p.periodEnd);

// Weekly group
const weekly = {
  contributionFrequency: 'weekly',
  startDate: new Date('2026-01-05'),
  dueDayOfWeek: 5,
  graceDays: 2
};
const wp = u.getCurrentPeriod(weekly, new Date('2026-05-12'));
console.log('Weekly period:', wp.periodLabel, wp.periodStart, wp.periodEnd);

// Yearly
const yearly = { contributionFrequency: 'yearly', dueMonth: 12, dueDayOfMonth: 25, graceDays: 3 };
const yp = u.getCurrentPeriod(yearly, new Date('2026-05-12'));
console.log('Yearly period:', yp.periodLabel);
"
```

Expected output (roughly):
```
Old API: 2026-04-29T00:00:00.000Z
Monthly period: May 2026 2026-05-01T00:00:00.000Z 2026-05-31T00:00:00.000Z
Weekly period: Week 19, 2026 <some monday> <some sunday>
Yearly period: Year 2026
```

- [ ] **Step 4: Commit**

```bash
git add server/utils/cycleUtils.js
git commit -m "feat: add period-aware cycle utilities (getCurrentPeriod, getPeriodForDate, generatePeriodLabel)"
```

---

## Task 2: Extend Group model

**Files:**
- Modify: `server/models/Group.js`

- [ ] **Step 1: Add 5 new optional fields to groupSchema**

Open `server/models/Group.js`. Inside `groupSchema`, after the existing `cyclesPerMonth` field and before the closing `}`, add:

```js
    contributionFrequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    startDate: {
      type: Date, default: null,
    },
    dueDayOfWeek: {
      type: Number, min: 0, max: 6, default: null,
    },
    dueDayOfMonth: {
      type: Number, min: 1, max: 28, default: null,
    },
    dueMonth: {
      type: Number, min: 1, max: 12, default: null,
    },
```

Do NOT remove or change `dueDay`, `graceDays`, or `cyclesPerMonth`.

- [ ] **Step 2: Manual verify — start server, check existing group still loads**

```bash
cd server && node -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Group = require('./models/Group');
  const g = await Group.findOne();
  console.log('contributionFrequency:', g?.contributionFrequency); // should print 'monthly'
  console.log('dueDay still present:', g?.dueDay);
  await mongoose.disconnect();
});
"
```

Expected: `contributionFrequency: monthly` (default applied), `dueDay` still present.

- [ ] **Step 3: Commit**

```bash
git add server/models/Group.js
git commit -m "feat: add contributionFrequency and period fields to Group model"
```

---

## Task 3: Extend Contribution model

**Files:**
- Modify: `server/models/Contribution.js`

- [ ] **Step 1: Add 5 new optional fields**

Open `server/models/Contribution.js`. After `lateDaysOverdue` and before the closing `}` of `contributionSchema`, add:

```js
    periodType:  { type: String, enum: ['weekly', 'biweekly', 'monthly', 'yearly'], default: null },
    periodStart: { type: Date, default: null },
    periodEnd:   { type: Date, default: null },
    dueDate:     { type: Date, default: null },
    periodLabel: { type: String, default: null },
```

Do NOT change or remove `month`, `year`, `cycleNumber`, or the existing indexes.

- [ ] **Step 2: Add sparse unique index for non-monthly deduplication**

After the existing index lines, add:

```js
contributionSchema.index(
  { user: 1, group: 1, periodStart: 1, periodEnd: 1 },
  { unique: true, sparse: true }
);
```

The `sparse: true` means this index only fires on documents where `periodStart` is not null. Old monthly contributions (where `periodStart` is null) are completely unaffected.

- [ ] **Step 3: Manual verify**

```bash
cd server && node -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const C = require('./models/Contribution');
  const c = await C.findOne();
  console.log('periodStart:', c?.periodStart); // null for old docs
  console.log('month still present:', c?.month);
  const indexes = await C.collection.indexes();
  console.log('Indexes count:', indexes.length);
  await mongoose.disconnect();
});
"
```

Expected: `periodStart: null`, `month` present, index count increased by 1.

- [ ] **Step 4: Commit**

```bash
git add server/models/Contribution.js
git commit -m "feat: add period fields and sparse unique index to Contribution model"
```

---

## Task 4: Update group validators

**Files:**
- Modify: `server/validators/groups.js`

- [ ] **Step 1: Add frequency fields and cross-field validation**

Replace the entire `server/validators/groups.js` with:

```js
const { z } = require('zod');

const rotationTypes = ['fixed', 'join-order', 'random', 'bid'];
const frequencies   = ['weekly', 'biweekly', 'monthly', 'yearly'];

const frequencyFields = {
  contributionFrequency: z.enum(frequencies).optional().default('monthly'),
  startDate:      z.coerce.date().optional().nullable(),
  dueDayOfWeek:   z.coerce.number().int().min(0).max(6).optional().nullable(),
  dueDayOfMonth:  z.coerce.number().int().min(1).max(28).optional().nullable(),
  dueMonth:       z.coerce.number().int().min(1).max(12).optional().nullable(),
};

function addFrequencyRefine(schema) {
  return schema.superRefine((data, ctx) => {
    const freq = data.contributionFrequency || 'monthly';
    if ((freq === 'weekly' || freq === 'biweekly') && data.dueDayOfWeek == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueDayOfWeek'], message: 'dueDayOfWeek is required for weekly/biweekly circles' });
    }
    if ((freq === 'weekly' || freq === 'biweekly') && !data.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: 'startDate is required for weekly/biweekly circles' });
    }
    if (freq === 'yearly' && data.dueMonth == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueMonth'], message: 'dueMonth is required for yearly circles' });
    }
    if (freq === 'yearly' && data.dueDayOfMonth == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueDayOfMonth'], message: 'dueDayOfMonth is required for yearly circles' });
    }
  });
}

const createGroupSchema = addFrequencyRefine(z.object({
  name:               z.string().trim().min(1, 'Group name is required').max(100),
  description:        z.string().max(500).optional().default(''),
  contributionAmount: z.coerce.number().min(0).optional().default(0),
  dueDay:             z.coerce.number().int().min(1).max(28).optional().default(25),
  graceDays:          z.coerce.number().int().min(0).max(7).optional().default(3),
  rotationType:       z.enum(rotationTypes).optional().default('fixed'),
  ...frequencyFields,
}));

const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(1, 'Invite code is required'),
});

const updateGroupSchema = z.object({
  name:               z.string().trim().min(1, 'Group name cannot be empty').max(100).optional(),
  description:        z.string().max(500).optional(),
  contributionAmount: z.coerce.number().min(0, 'contributionAmount must be a non-negative number').optional(),
});

const updateSettingsSchema = addFrequencyRefine(z.object({
  name:               z.string().trim().min(1, 'Group name is required').max(100).optional(),
  description:        z.string().max(500).optional(),
  contributionAmount: z.coerce.number().min(0, 'Invalid contribution amount').optional(),
  dueDay:             z.coerce.number().int().min(1, 'Due day must be between 1 and 28').max(28, 'Due day must be between 1 and 28').optional(),
  graceDays:          z.coerce.number().int().min(0, 'Grace period must be between 0 and 7 days').max(7, 'Grace period must be between 0 and 7 days').optional(),
  rotationType:       z.enum(rotationTypes, { errorMap: () => ({ message: 'Invalid rotation type' }) }).optional(),
  ...frequencyFields,
}));

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member'], { errorMap: () => ({ message: 'Role must be "admin" or "member"' }) }),
});

const saveTemplateSchema = z.object({
  name:        z.string().trim().min(1, 'Template name is required').max(80),
  description: z.string().max(200).optional().default(''),
  icon:        z.string().optional().default('◎'),
});

module.exports = {
  createGroupSchema,
  joinGroupSchema,
  updateGroupSchema,
  updateSettingsSchema,
  updateMemberRoleSchema,
  saveTemplateSchema,
};
```

- [ ] **Step 2: Manual verify — start server and POST a weekly group**

```bash
cd server && npm run dev
```

In another terminal:
```bash
# Should fail with validation error about missing dueDayOfWeek and startDate
curl -s -X POST http://localhost:5000/api/groups \
  -H "Content-Type: application/json" \
  -H "Cookie: <your auth cookie>" \
  -d '{"name":"Weekly Test","contributionFrequency":"weekly"}' | jq .
# Expected: error mentioning dueDayOfWeek and startDate required

# Should succeed
curl -s -X POST http://localhost:5000/api/groups \
  -H "Content-Type: application/json" \
  -H "Cookie: <your auth cookie>" \
  -d '{"name":"Weekly Test","contributionFrequency":"weekly","startDate":"2026-01-05","dueDayOfWeek":5}' | jq .
# Expected: group created with contributionFrequency: "weekly"
```

- [ ] **Step 3: Commit**

```bash
git add server/validators/groups.js
git commit -m "feat: add frequency fields and cross-field validation to group validators"
```

---

## Task 5: Update contribution validator

**Files:**
- Modify: `server/validators/contributions.js`

- [ ] **Step 1: Make month and year optional**

Replace the entire file:

```js
const { z } = require('zod');

const createContributionSchema = z.object({
  amount:      z.coerce.number().positive('Amount must be a positive number').max(100_000_000),
  month:       z.coerce.number().int().min(1, 'Month must be between 1 and 12').max(12, 'Month must be between 1 and 12').optional(),
  year:        z.coerce.number().int().min(2020, 'Year is out of valid range').max(2100, 'Year is out of valid range').optional(),
  note:        z.string().max(500).optional().default(''),
  groupId:     z.string().optional(),
  cycleNumber: z.coerce.number().int().min(1).optional().default(1),
  // Non-monthly groups send these instead of month/year
  periodStart: z.string().optional(), // ISO date string
  periodEnd:   z.string().optional(), // ISO date string
});

const updateStatusSchema = z.object({
  status:        z.enum(['verified', 'rejected', 'pending'], { errorMap: () => ({ message: 'Invalid status' }) }),
  rejectionNote: z.string().max(500).optional(),
});

const resubmitSchema = z.object({
  note: z.string().max(500).optional(),
});

module.exports = { createContributionSchema, updateStatusSchema, resubmitSchema };
```

- [ ] **Step 2: Commit**

```bash
git add server/validators/contributions.js
git commit -m "feat: make month/year optional in contribution validator; add periodStart/periodEnd"
```

---

## Task 6: Update contributionsController

**Files:**
- Modify: `server/controllers/contributionsController.js`

- [ ] **Step 1: Update createContribution with dual-path logic**

Replace the `createContribution` function (lines 33–90 of the current file) with:

```js
async function createContribution(req, res) {
  if (!req.file) return fail(res, 'Proof image is required', 400);
  const { amount, month, year, note, groupId, cycleNumber, periodStart: psRaw, periodEnd: peRaw } = req.body;

  const parsedAmount = Number(amount);
  const safeNote = note ? String(note).replace(/<[^>]*>/g, '').trim().slice(0, 500) : '';

  try {
    let group = null;
    if (groupId) {
      group = await Group.findById(groupId).select(
        'dueDay graceDays isActive cyclesPerMonth contributionFrequency startDate dueDayOfWeek dueDayOfMonth dueMonth'
      );
      if (!group || !group.isActive) return fail(res, 'Group not found', 404);
    }

    const freq = group?.contributionFrequency || 'monthly';
    const now  = new Date();

    let parsedMonth, parsedYear, parsedCycle, isLate, lateDaysOverdue, periodData;

    if (freq !== 'monthly' && group) {
      // ── Non-monthly path ───────────────────────────────────────────────────
      const period = getCurrentPeriod(group, now);
      periodData   = period;
      parsedMonth  = period.periodStart.getUTCMonth() + 1;
      parsedYear   = period.periodStart.getUTCFullYear();
      parsedCycle  = 1;
      isLate       = isLateSubmissionForPeriod(now, group, period);
      lateDaysOverdue = isLate
        ? Math.max(0, Math.ceil((now - period.dueDate) / 86400000))
        : 0;

    } else {
      // ── Monthly / legacy path ──────────────────────────────────────────────
      parsedMonth  = Number(month);
      parsedYear   = Number(year);
      parsedCycle  = Number(cycleNumber) || 1;
      const dueDay        = group?.dueDay        ?? 25;
      const graceDays     = group?.graceDays      ?? 3;
      const cyclesPerMonth = group?.cyclesPerMonth ?? 1;

      if (!parsedMonth || !parsedYear) {
        return fail(res, 'month and year are required for monthly groups', 400);
      }
      if (!Number.isInteger(parsedCycle) || parsedCycle < 1 || parsedCycle > cyclesPerMonth) {
        return fail(res, `Cycle number must be between 1 and ${cyclesPerMonth}`, 400);
      }

      isLate = isLateSubmission(now, parsedYear, parsedMonth, dueDay, graceDays);
      lateDaysOverdue = isLate
        ? Math.max(0, Math.ceil((now - new Date(parsedYear, parsedMonth - 1, dueDay + graceDays, 23, 59, 59)) / 86400000))
        : 0;
    }

    const data = {
      user: req.user._id,
      amount: parsedAmount,
      month: parsedMonth,
      year: parsedYear,
      cycleNumber: parsedCycle,
      note: safeNote,
      proofImage: req.file.path,
      isLate,
      lateDaysOverdue,
    };
    if (groupId) data.group = groupId;

    // Attach period fields for non-monthly groups
    if (periodData) {
      data.periodType  = periodData.periodType;
      data.periodStart = periodData.periodStart;
      data.periodEnd   = periodData.periodEnd;
      data.dueDate     = periodData.dueDate;
      data.periodLabel = periodData.periodLabel;
    }

    const contribution = await Contribution.create(data);
    await contribution.populate('user', 'name email');

    Pledge.findOneAndUpdate(
      { user: req.user._id, group: groupId || null, month: parsedMonth, year: parsedYear, status: 'pending' },
      { status: 'fulfilled', fulfilledAt: new Date(), contribution: contribution._id }
    ).catch(() => {});

    send(res, contribution, 201);
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 'You already submitted a contribution for this cycle', 400);
    }
    console.error('[contributions]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}
```

- [ ] **Step 2: Update the imports at the top of the file**

The file already imports `isLateSubmission` from `cycleUtils`. Update that import line to also import the new functions:

```js
const { isLateSubmission, getCurrentPeriod, isLateSubmissionForPeriod } = require('../utils/cycleUtils');
```

- [ ] **Step 3: Update getContributions to accept periodStart/periodEnd query params**

Replace the `getContributions` function with:

```js
async function getContributions(req, res) {
  const { month, year, groupId, periodStart, periodEnd } = req.query;
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = {};

  if (periodStart && periodEnd) {
    filter.periodStart = { $gte: new Date(periodStart) };
    filter.periodEnd   = { $lte: new Date(periodEnd) };
  } else {
    if (month) filter.month = Number(month);
    if (year)  filter.year  = Number(year);
  }
  if (groupId) filter.group = groupId;

  try {
    const [docs, total] = await Promise.all([
      Contribution.find(filter)
        .populate('user', 'name email')
        .populate('verifiedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Contribution.countDocuments(filter),
    ]);
    send(res, { docs, total, page, totalPages: Math.ceil(total / limit), limit });
  } catch (err) {
    console.error('[contributions]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}
```

- [ ] **Step 4: Manual verify — create a non-monthly contribution**

With the server running and a weekly group created (from Task 4 verification):

```bash
# Submit a contribution to the weekly group (replace GROUP_ID and auth cookie)
curl -s -X POST http://localhost:5000/api/contributions \
  -H "Cookie: <your auth cookie>" \
  -F "proof=@/path/to/test-image.jpg" \
  -F "amount=5000" \
  -F "groupId=<WEEKLY_GROUP_ID>" | jq '{periodLabel, periodStart, periodEnd, month, year}'
```

Expected: `periodLabel` like `"Week 19, 2026"`, `periodStart`/`periodEnd` populated, `month`/`year` also present.

- [ ] **Step 5: Commit**

```bash
git add server/controllers/contributionsController.js
git commit -m "feat: dual-path createContribution for flexible frequencies; period query params in getContributions"
```

---

## Task 7: Update members route

**Files:**
- Modify: `server/routes/members.js`

- [ ] **Step 1: Add period-based contribution lookup**

Replace the scoped group query block inside the `router.get('/')` handler. Find the section that starts `if (groupId) {` and replace the contribution lookup within it:

```js
if (groupId) {
  const group = await Group.findById(groupId)
    .populate('members.user', 'name email phone role avatar');

  if (!group || !group.isActive) {
    return res.status(404).json({ message: 'Group not found' });
  }

  const isMember = group.members.some(
    (m) => m.user._id.toString() === req.user._id.toString()
  );
  if (!isMember) {
    return res.status(403).json({ message: 'You are not a member of this group' });
  }

  // Period-aware contribution lookup
  const freq        = group.contributionFrequency || 'monthly';
  const periodStart = req.query.periodStart;
  const periodEnd   = req.query.periodEnd;
  const now         = new Date();
  const month       = Number(req.query.month)  || now.getMonth() + 1;
  const year        = Number(req.query.year)   || now.getFullYear();

  let contribFilter = { group: groupId };
  if (periodStart && periodEnd) {
    contribFilter.periodStart = { $gte: new Date(periodStart) };
    contribFilter.periodEnd   = { $lte: new Date(periodEnd) };
  } else if (freq !== 'monthly') {
    // Auto-compute current period for non-monthly groups when no period params given
    const { getCurrentPeriod } = require('../utils/cycleUtils');
    const period = getCurrentPeriod(group, now);
    contribFilter.periodStart = { $gte: period.periodStart };
    contribFilter.periodEnd   = { $lte: period.periodEnd };
  } else {
    contribFilter.month = month;
    contribFilter.year  = year;
  }

  const contributions = await Contribution.find(contribFilter);
  const contribMap = {};
  contributions.forEach((c) => { contribMap[c.user.toString()] = c; });

  members = group.members.map((m) => {
    const uid = m.user._id.toString();
    return {
      _id:          m.user._id,
      name:         m.user.name,
      email:        m.user.email,
      phone:        m.user.phone || '',
      role:         m.user.role,
      groupRole:    m.role,
      paid:         !!contribMap[uid],
      contribution: contribMap[uid] || null,
    };
  });
}
```

Also add `Group` to the requires at the top if not already present (it already is in the current file).

- [ ] **Step 2: Commit**

```bash
git add server/routes/members.js
git commit -m "feat: period-aware contribution lookup in members route"
```

---

## Task 8: Add client-side period helpers

**Files:**
- Modify: `client/src/utils/dateUtils.js`

- [ ] **Step 1: Add formatPeriodLabel and getClientPeriod**

Append to the existing `client/src/utils/dateUtils.js` (which currently only has `MONTHS` and `MONTHS_SHORT`):

```js
/**
 * Returns a human label for a contribution, handling both old and new data.
 * Old data: has month/year but no periodLabel → "April 2026"
 * New data: has periodLabel → use it directly
 */
export function formatPeriodLabel(contribution) {
  if (contribution?.periodLabel) return contribution.periodLabel;
  if (contribution?.month && contribution?.year) {
    return `${MONTHS[contribution.month - 1]} ${contribution.year}`;
  }
  return '—';
}

/**
 * Compute the current period for a group on the client side.
 * Returns { periodStart, periodEnd, periodLabel, periodType }
 * Mirrors server-side cycleUtils.getCurrentPeriod logic.
 *
 * @param {object} group - group object from API
 * @param {Date}   [date] - defaults to now
 */
export function getClientPeriod(group, date) {
  const freq = group?.contributionFrequency || 'monthly';
  const d    = date ? new Date(date) : new Date();

  const MS_PER_DAY = 86400000;
  const utcYear    = d.getUTCFullYear();
  const utcMonth   = d.getUTCMonth();
  const utcDay     = d.getUTCDate();

  let periodStart, periodEnd;

  if (freq === 'weekly' || freq === 'biweekly') {
    const anchor   = new Date(group.startDate);
    const anchorMs = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const nowMs    = Date.UTC(utcYear, utcMonth, utcDay);
    const spanDays = freq === 'weekly' ? 7 : 14;
    const n        = Math.floor((nowMs - anchorMs) / (spanDays * MS_PER_DAY));
    const startMs  = anchorMs + n * spanDays * MS_PER_DAY;
    const endMs    = startMs + (spanDays - 1) * MS_PER_DAY;
    periodStart    = new Date(startMs);
    periodEnd      = new Date(endMs);

  } else if (freq === 'yearly') {
    periodStart = new Date(Date.UTC(utcYear, 0, 1));
    periodEnd   = new Date(Date.UTC(utcYear, 11, 31));

  } else {
    // monthly
    periodStart = new Date(Date.UTC(utcYear, utcMonth, 1));
    const lastDay = new Date(Date.UTC(utcYear, utcMonth + 1, 0)).getUTCDate();
    periodEnd   = new Date(Date.UTC(utcYear, utcMonth, lastDay));
  }

  const periodLabel = _clientPeriodLabel(group, freq, periodStart, periodEnd);
  return { periodStart, periodEnd, periodLabel, periodType: freq };
}

/**
 * Navigate to previous period for a given group.
 * Returns new { periodStart, periodEnd, periodLabel, periodType }.
 */
export function getPrevPeriod(group, currentPeriodStart) {
  const freq = group?.contributionFrequency || 'monthly';
  const MS_PER_DAY = 86400000;
  const start = new Date(currentPeriodStart);

  let prevDate;
  if (freq === 'weekly')   prevDate = new Date(start.getTime() - 7  * MS_PER_DAY);
  else if (freq === 'biweekly') prevDate = new Date(start.getTime() - 14 * MS_PER_DAY);
  else if (freq === 'yearly') {
    prevDate = new Date(Date.UTC(start.getUTCFullYear() - 1, 0, 1));
  } else {
    // monthly
    const y = start.getUTCFullYear();
    const m = start.getUTCMonth();
    prevDate = m === 0
      ? new Date(Date.UTC(y - 1, 11, 1))
      : new Date(Date.UTC(y, m - 1, 1));
  }
  return getClientPeriod(group, prevDate);
}

/**
 * Navigate to next period.
 */
export function getNextPeriod(group, currentPeriodEnd) {
  const freq = group?.contributionFrequency || 'monthly';
  const MS_PER_DAY = 86400000;
  const end = new Date(currentPeriodEnd);

  let nextDate;
  if (freq === 'weekly')        nextDate = new Date(end.getTime() + MS_PER_DAY);
  else if (freq === 'biweekly') nextDate = new Date(end.getTime() + MS_PER_DAY);
  else if (freq === 'yearly') {
    nextDate = new Date(Date.UTC(end.getUTCFullYear() + 1, 0, 1));
  } else {
    // monthly
    const y = end.getUTCFullYear();
    const m = end.getUTCMonth();
    nextDate = m === 11
      ? new Date(Date.UTC(y + 1, 0, 1))
      : new Date(Date.UTC(y, m + 1, 1));
  }
  return getClientPeriod(group, nextDate);
}

function _clientPeriodLabel(group, freq, periodStart, periodEnd) {
  const year = periodStart.getUTCFullYear();
  if (freq === 'weekly') {
    const anchor   = new Date(group.startDate);
    const anchorMs = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const startMs  = Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate());
    const weekNum  = Math.floor((startMs - anchorMs) / (7 * 86400000)) + 1;
    return `Week ${weekNum}, ${year}`;
  }
  if (freq === 'biweekly') {
    const sm = MONTHS_SHORT[periodStart.getUTCMonth()];
    const em = MONTHS_SHORT[periodEnd.getUTCMonth()];
    const ey = periodEnd.getUTCFullYear();
    if (sm === em && year === ey) return `${sm} ${periodStart.getUTCDate()}–${periodEnd.getUTCDate()}, ${year}`;
    return `${sm} ${periodStart.getUTCDate()} – ${em} ${periodEnd.getUTCDate()}, ${ey}`;
  }
  if (freq === 'yearly') return `Year ${year}`;
  return `${MONTHS[periodStart.getUTCMonth()]} ${year}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/utils/dateUtils.js
git commit -m "feat: add formatPeriodLabel, getClientPeriod, getPrevPeriod, getNextPeriod to dateUtils"
```

---

## Task 9: Update GroupsPage — frequency selector

**Files:**
- Modify: `client/src/pages/GroupsPage.jsx`

- [ ] **Step 1: Add contributionFrequency to createForm state**

Find the `createForm` state initialiser (around line 99). Change it to:

```js
const [createForm, setCreateForm] = useState({
  name: '', description: '', contributionAmount: '',
  dueDay: '25', graceDays: '3', rotationType: 'fixed',
  contributionFrequency: 'monthly',
  startDate: '', dueDayOfWeek: '', dueDayOfMonth: '', dueMonth: '',
});
```

Also update `resetCreate` to reset these fields:

```js
const resetCreate = () => {
  setCreateStep('template');
  setCreateForm({
    name: '', description: '', contributionAmount: '',
    dueDay: '25', graceDays: '3', rotationType: 'fixed',
    contributionFrequency: 'monthly',
    startDate: '', dueDayOfWeek: '', dueDayOfMonth: '', dueMonth: '',
  });
  setCreateError('');
};
```

- [ ] **Step 2: Add frequency selector and conditional fields to the create form**

In the create form JSX, after the rotation type selector (`<div style={{ marginTop: 14 }}>` block for rotation), add:

```jsx
{/* Contribution frequency */}
<div style={{ marginTop: 14 }}>
  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 8 }}>
    Contribution frequency
  </label>
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {[
      { v: 'monthly',  l: 'Monthly' },
      { v: 'weekly',   l: 'Weekly' },
      { v: 'biweekly', l: 'Biweekly' },
      { v: 'yearly',   l: 'Yearly' },
    ].map(({ v, l }) => (
      <button
        key={v} type="button"
        onClick={() => setCreateForm(f => ({ ...f, contributionFrequency: v }))}
        className={createForm.contributionFrequency === v ? 'filter-pill active' : 'filter-pill'}
      >
        {l}
      </button>
    ))}
  </div>
</div>

{/* Conditional due-date fields */}
{(createForm.contributionFrequency === 'weekly' || createForm.contributionFrequency === 'biweekly') && (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
        Circle start date
      </label>
      <input
        type="date"
        value={createForm.startDate}
        onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value }))}
        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--ct-border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-sans)', background: '#fff', boxSizing: 'border-box' }}
      />
    </div>
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
        Due day of week
      </label>
      <select
        value={createForm.dueDayOfWeek}
        onChange={e => setCreateForm(f => ({ ...f, dueDayOfWeek: e.target.value }))}
        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--ct-border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-sans)', background: '#fff', boxSizing: 'border-box' }}
      >
        <option value="">Select day</option>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
          <option key={i} value={i}>{d}</option>
        ))}
      </select>
    </div>
  </div>
)}

{createForm.contributionFrequency === 'monthly' && (
  <div style={{ marginTop: 14 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
      Due day of month <span style={{ fontWeight: 400, color: 'var(--ct-text-3)' }}>(1–28)</span>
    </label>
    <input
      type="number" min="1" max="28"
      value={createForm.dueDayOfMonth || createForm.dueDay}
      onChange={e => setCreateForm(f => ({ ...f, dueDayOfMonth: e.target.value, dueDay: e.target.value }))}
      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--ct-border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-sans)', background: '#fff', boxSizing: 'border-box' }}
    />
  </div>
)}

{createForm.contributionFrequency === 'yearly' && (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
        Due month
      </label>
      <select
        value={createForm.dueMonth}
        onChange={e => setCreateForm(f => ({ ...f, dueMonth: e.target.value }))}
        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--ct-border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-sans)', background: '#fff', boxSizing: 'border-box' }}
      >
        <option value="">Select month</option>
        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
          <option key={i} value={i + 1}>{m}</option>
        ))}
      </select>
    </div>
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
        Due day
      </label>
      <input
        type="number" min="1" max="28"
        value={createForm.dueDayOfMonth}
        onChange={e => setCreateForm(f => ({ ...f, dueDayOfMonth: e.target.value }))}
        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--ct-border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-sans)', background: '#fff', boxSizing: 'border-box' }}
      />
    </div>
  </div>
)}
```

Also remove the old standalone "Due day (1–28)" input (the existing `dueDay` grid row), since it's now replaced by the conditional fields above. Find and remove this block from the form JSX:

```jsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
  <div>
    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
      Due day <span style={{ fontWeight: 400, color: 'var(--ct-text-3)' }}>(1–28)</span>
    </label>
    <input
      type="number" min="1" max="28"
      value={createForm.dueDay}
      ...
    />
  </div>
  <div>
    <label ...>Grace period</label>
    <select ...>
```

Replace it with just the grace period selector (keep grace period, remove the due day input):

```jsx
<div style={{ marginTop: 14, maxWidth: 200 }}>
  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-2)', display: 'block', marginBottom: 5 }}>
    Grace period
  </label>
  <select
    value={createForm.graceDays}
    onChange={e => setCreateForm(f => ({ ...f, graceDays: e.target.value }))}
    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--ct-border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-sans)', background: '#fff', boxSizing: 'border-box' }}
  >
    {[0,1,2,3,5,7].map(d => <option key={d} value={d}>{d === 0 ? 'None' : `${d} day${d > 1 ? 's' : ''}`}</option>)}
  </select>
</div>
```

- [ ] **Step 3: Update handleCreate to send new fields**

Find `handleCreate` and update the `api.post('/groups', {...})` call:

```js
const { data: newGroup } = await api.post('/groups', {
  name:               createForm.name.trim(),
  description:        createForm.description,
  contributionAmount: Number(createForm.contributionAmount) || 0,
  dueDay:             Number(createForm.dueDay)    || 25,
  graceDays:          Number(createForm.graceDays) || 3,
  rotationType:       createForm.rotationType      || 'fixed',
  contributionFrequency: createForm.contributionFrequency || 'monthly',
  ...(createForm.startDate     && { startDate:     createForm.startDate }),
  ...(createForm.dueDayOfWeek  !== '' && { dueDayOfWeek:  Number(createForm.dueDayOfWeek) }),
  ...(createForm.dueDayOfMonth !== '' && { dueDayOfMonth: Number(createForm.dueDayOfMonth) }),
  ...(createForm.dueMonth      !== '' && { dueMonth:      Number(createForm.dueMonth) }),
});
```

- [ ] **Step 4: Update label "Monthly Target" → "Contribution Target" in the form**

Find `<label style={labelStyle}>Monthly Target (₦)</label>` (in create form) and change to:

```jsx
<label style={labelStyle}>Contribution Target (₦)</label>
```

Do the same in the edit form modal.

- [ ] **Step 5: Update group card to show frequency badge**

In the group card stats row, find the "Monthly Target" stat div and update its label:

```jsx
<div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
  {group.contributionFrequency
    ? group.contributionFrequency.charAt(0).toUpperCase() + group.contributionFrequency.slice(1) + ' Target'
    : 'Monthly Target'}
</div>
```

- [ ] **Step 6: Manual verify in browser**

Start client (`cd client && npm run dev`). Go to Groups page → New Circle. Verify:
- Frequency selector appears with 4 options
- Selecting "Weekly" shows start date + due day of week fields
- Selecting "Monthly" shows due day of month field
- Selecting "Yearly" shows due month + due day fields
- Creating a weekly group succeeds

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/GroupsPage.jsx
git commit -m "feat: add contribution frequency selector and conditional fields to GroupsPage"
```

---

## Task 10: Update UploadPage — frequency-aware period

**Files:**
- Modify: `client/src/pages/UploadPage.jsx`

- [ ] **Step 1: Import getClientPeriod from dateUtils**

At the top of `UploadPage.jsx`, add to existing imports:

```js
import { getClientPeriod } from '../utils/dateUtils';
```

- [ ] **Step 2: Add period state for non-monthly groups**

After the existing `const cyclesPerMonth = selectedGroup?.cyclesPerMonth ?? 1;` line, add:

```js
const freq = selectedGroup?.contributionFrequency || 'monthly';
const isMonthly = freq === 'monthly' || !selectedGroup;

// For non-monthly groups, compute the current period
const currentPeriod = (!isMonthly && selectedGroup)
  ? getClientPeriod(selectedGroup, now)
  : null;
```

- [ ] **Step 3: Update alreadySubmitted check to handle non-monthly**

Find the `alreadySubmitted` constant and replace it:

```js
const alreadySubmitted = !loadingContributions && myContributions.some(c => {
  if (!isMonthly && currentPeriod) {
    // Non-monthly: match by periodStart
    return c.periodStart &&
      new Date(c.periodStart).getTime() === currentPeriod.periodStart.getTime() &&
      String(c.group?._id ?? c.group ?? null) === String(selectedGroupId ?? null) &&
      c.status !== 'rejected';
  }
  return matchesSelected(c) && c.status !== 'rejected';
});
```

Also update `rejectedContribution`:

```js
const rejectedContribution = !loadingContributions
  ? myContributions.find(c => {
      if (!isMonthly && currentPeriod) {
        return c.periodStart &&
          new Date(c.periodStart).getTime() === currentPeriod.periodStart.getTime() &&
          String(c.group?._id ?? c.group ?? null) === String(selectedGroupId ?? null) &&
          c.status === 'rejected';
      }
      return matchesSelected(c) && c.status === 'rejected';
    })
  : null;
```

- [ ] **Step 4: Update handleSubmit to send period data for non-monthly groups**

In `handleSubmit`, replace the `formData.append` block with:

```js
const formData = new FormData();
formData.append('proof', file);
formData.append('amount', form.amount);
formData.append('note', form.note);
if (selectedGroupId) formData.append('groupId', selectedGroupId);

if (isMonthly) {
  formData.append('month', form.month);
  formData.append('year', form.year);
  formData.append('cycleNumber', form.cycleNumber);
} else if (currentPeriod) {
  formData.append('periodStart', currentPeriod.periodStart.toISOString());
  formData.append('periodEnd',   currentPeriod.periodEnd.toISOString());
}
```

Also update the duplicate check error message for non-monthly:

```js
if (alreadySubmitted) {
  const label = isMonthly
    ? `${MONTHS[Number(form.month) - 1]} ${form.year}${selectedGroup ? ` — ${selectedGroup.name}` : ''}`
    : `${currentPeriod?.periodLabel ?? 'this period'}${selectedGroup ? ` — ${selectedGroup.name}` : ''}`;
  return setError(`Already submitted for ${label}.`);
}
```

- [ ] **Step 5: Replace period section JSX for non-monthly groups**

Find the period section inside the JSX (the `<div className="vault-section vault-fade">` block with `"Contribution Period"` title). Replace its `vault-section-body` contents with:

```jsx
<div className="vault-section-body">
  {isMonthly ? (
    <>
      <div className="vault-period-grid">
        <div>
          <label className="vault-label">Month</label>
          <div className="vault-select-wrap">
            <select name="month" value={form.month} onChange={handleChange} className="vault-select">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
        <div>
          <label className="vault-label">Year</label>
          <input type="number" name="year" value={form.year}
            onChange={handleChange} min="2020" max="2100"
            className="vault-input" inputMode="numeric"
          />
        </div>
      </div>
      <div className="vault-summary">
        <div className="vault-summary-tag">Summary</div>
        <div className="vault-summary-item">
          <span className="vault-summary-lbl">Period</span>
          <span className="vault-summary-val">{MONTHS[form.month - 1].slice(0,3)} {form.year}</span>
        </div>
        <div className="vault-summary-item">
          <span className="vault-summary-lbl">Amount</span>
          <span className="vault-summary-val" style={{ color: form.amount ? '#6ee7b7' : 'rgba(242,236,224,0.22)' }}>
            {form.amount ? `₦${Number(form.amount).toLocaleString()}` : '—'}
          </span>
        </div>
        {selectedGroup && (
          <div className="vault-summary-item">
            <span className="vault-summary-lbl">Circle</span>
            <span className="vault-summary-val" style={{ color: '#d4a017', fontSize: 11 }}>{selectedGroup.name}</span>
          </div>
        )}
      </div>
    </>
  ) : (
    <div className="vault-summary">
      <div className="vault-summary-tag">Period</div>
      <div className="vault-summary-item" style={{ flex: 2 }}>
        <span className="vault-summary-lbl">Current period</span>
        <span className="vault-summary-val" style={{ color: '#d4a017' }}>
          {currentPeriod?.periodLabel ?? '—'}
        </span>
      </div>
      <div className="vault-summary-item">
        <span className="vault-summary-lbl">Amount</span>
        <span className="vault-summary-val" style={{ color: form.amount ? '#6ee7b7' : 'rgba(242,236,224,0.22)' }}>
          {form.amount ? `₦${Number(form.amount).toLocaleString()}` : '—'}
        </span>
      </div>
      {selectedGroup && (
        <div className="vault-summary-item">
          <span className="vault-summary-lbl">Circle</span>
          <span className="vault-summary-val" style={{ color: '#d4a017', fontSize: 11 }}>{selectedGroup.name}</span>
        </div>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 6: Manual verify in browser**

With a weekly group selected in context, open Upload page. Verify:
- Month/year selectors are hidden
- Period label shows e.g. "Week 19, 2026"
- Submit sends correct payload (check Network tab: `periodStart`/`periodEnd` present, no `month`/`year`)

With a monthly group selected, verify the existing month/year UI works exactly as before.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/UploadPage.jsx
git commit -m "feat: frequency-aware period display in UploadPage; send periodStart/periodEnd for non-monthly groups"
```

---

## Task 11: Update DashboardPage — PeriodNav

**Files:**
- Modify: `client/src/pages/DashboardPage.jsx`

- [ ] **Step 1: Add imports**

At the top of `DashboardPage.jsx`, add to the existing dateUtils import line:

```js
import { MONTHS, MONTHS_SHORT, getClientPeriod, getPrevPeriod, getNextPeriod } from '../utils/dateUtils';
```

- [ ] **Step 2: Replace MonthNav with PeriodNav**

Find the `MonthNav` component (around line 85) and replace the entire function with `PeriodNav`:

```jsx
function PeriodNav({ periodLabel, onPrev, onNext, isCurrentPeriod }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: '#fff',
      border: '1.5px solid rgba(0,0,0,0.07)',
      borderRadius: 11,
      padding: 4,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <button
        onClick={onPrev}
        style={{
          width: 30, height: 30, borderRadius: 7,
          border: 'none', background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--ct-text-3)',
          transition: 'all 0.14s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
      </button>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '0 10px',
        minWidth: 160, justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15, fontWeight: 700,
          color: 'var(--ct-text-1)',
          letterSpacing: '-0.01em',
        }}>
          {periodLabel}
        </span>
        {isCurrentPeriod && (
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            background: 'rgba(212,160,23,0.12)',
            color: '#a07010',
            padding: '2px 8px', borderRadius: 10,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            border: '1px solid rgba(212,160,23,0.22)',
          }}>
            Now
          </span>
        )}
      </div>

      <button
        onClick={onNext}
        style={{
          width: 30, height: 30, borderRadius: 7,
          border: 'none', background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--ct-text-3)',
          transition: 'all 0.14s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Update DashboardPage state and query**

Find the `DashboardPage` function body. Replace the state and query section:

```jsx
export default function DashboardPage() {
  useDocumentTitle('Dashboard — ROTARA');
  const now = new Date();
  const navigate = useNavigate();
  const { activeGroup, groups, loadingGroups } = useGroup();
  const { user } = useAuth();

  const freq = activeGroup?.contributionFrequency || 'monthly';
  const isMonthly = freq === 'monthly' || !activeGroup;

  // Period state — a single { periodStart, periodEnd, periodLabel, periodType } object
  const [period, setPeriod] = useState(() =>
    activeGroup ? getClientPeriod(activeGroup, now) : getClientPeriod({ contributionFrequency: 'monthly' }, now)
  );

  // Reset period when activeGroup changes
  useEffect(() => {
    if (activeGroup) setPeriod(getClientPeriod(activeGroup, now));
  }, [activeGroup?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');

  const isGroupAdmin = activeGroup?.members?.some(
    m => String(m.user?._id || m.user) === String(user?._id) && m.role === 'admin'
  );

  // Build query params based on frequency
  const queryParams = isMonthly
    ? `month=${period.periodStart.getUTCMonth() + 1}&year=${period.periodStart.getUTCFullYear()}&groupId=${activeGroup?._id}`
    : `periodStart=${period.periodStart.toISOString()}&periodEnd=${period.periodEnd.toISOString()}&groupId=${activeGroup?._id}`;

  const { data: members = [], isLoading: loading, isError, error: fetchError, refetch } = useQuery({
    queryKey: ['members', activeGroup?._id, period.periodStart.toISOString()],
    queryFn: () =>
      api.get(`/members?${queryParams}`).then(r => r.data),
    enabled: !!activeGroup && !loadingGroups,
  });

  const error = isError ? (fetchError?.response?.data?.message || 'Failed to load members.') : '';

  const nowPeriod = activeGroup ? getClientPeriod(activeGroup, now) : null;
  const isCurrentPeriod = nowPeriod
    ? period.periodStart.getTime() === nowPeriod.periodStart.getTime()
    : false;

  const prevPeriod = () => setPeriod(p => getPrevPeriod(activeGroup || { contributionFrequency: 'monthly' }, p.periodStart));
  const nextPeriod = () => setPeriod(p => getNextPeriod(activeGroup || { contributionFrequency: 'monthly' }, p.periodEnd));
```

Remove the old `const [month, setMonth]`, `const [year, setYear]`, `prevMonth`, `nextMonth` lines.

- [ ] **Step 4: Update MonthNav usage to PeriodNav**

Find where `<MonthNav` is rendered (around line 617) and replace with:

```jsx
<PeriodNav
  periodLabel={period.periodLabel}
  onPrev={prevPeriod}
  onNext={nextPeriod}
  isCurrentPeriod={isCurrentPeriod}
/>
```

- [ ] **Step 5: Update openModal to use period label**

Find `openModal` and update:

```js
const openModal = (m) => {
  if (!m.contribution?.proofImage) return;
  setModal({
    proofUrl: m.contribution.proofImage,
    memberName: m.name,
    month: period.periodStart.getUTCMonth() + 1,
    year: period.periodStart.getUTCFullYear(),
    submittedDate: m.contribution.createdAt,
    status: m.contribution.status,
    periodLabel: period.periodLabel,
  });
};
```

- [ ] **Step 6: Fix "No contributions this month" text**

Find all occurrences of `"this month"` in DashboardPage JSX and change to `"this period"`.

- [ ] **Step 7: Manual verify in browser**

- Open Dashboard with a monthly group active → prev/next nav works, label shows "May 2026"
- Switch to a weekly group → label shows "Week X, 2026", navigating changes week
- "Now" badge shows on current period

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/DashboardPage.jsx
git commit -m "feat: replace MonthNav with PeriodNav in DashboardPage; period-aware member query"
```

---

## Task 12: Update MembersPage — period-aware query

**Files:**
- Modify: `client/src/pages/MembersPage.jsx`

- [ ] **Step 1: Add imports**

Add to imports at top of `MembersPage.jsx`:

```js
import { getClientPeriod } from '../utils/dateUtils';
```

- [ ] **Step 2: Replace month/year query with period-aware query**

Find (around line 123):

```js
const qMonth = now.getMonth() + 1;
const qYear  = now.getFullYear();
const { data: members = [], isLoading: loading } = useQuery({
  queryKey: ['members', activeGroup?._id, qMonth, qYear],
  queryFn: () => {
    const groupParam = activeGroup ? `&groupId=${activeGroup._id}` : '';
    return api.get(`/members?month=${qMonth}&year=${qYear}${groupParam}`).then(r => r.data);
  },
});
```

Replace with:

```js
const freq      = activeGroup?.contributionFrequency || 'monthly';
const isMonthly = freq === 'monthly' || !activeGroup;
const period    = activeGroup ? getClientPeriod(activeGroup, now) : getClientPeriod({ contributionFrequency: 'monthly' }, now);

const { data: members = [], isLoading: loading } = useQuery({
  queryKey: ['members', activeGroup?._id, period.periodStart.toISOString()],
  queryFn: () => {
    if (!activeGroup) return Promise.resolve([]);
    const groupParam = `&groupId=${activeGroup._id}`;
    const periodParam = isMonthly
      ? `month=${period.periodStart.getUTCMonth() + 1}&year=${period.periodStart.getUTCFullYear()}`
      : `periodStart=${period.periodStart.toISOString()}&periodEnd=${period.periodEnd.toISOString()}`;
    return api.get(`/members?${periodParam}${groupParam}`).then(r => r.data);
  },
});
```

- [ ] **Step 3: Manual verify in browser**

Open Members page with a weekly group active → member payment statuses reflect current week's contributions, not current month.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/MembersPage.jsx
git commit -m "feat: period-aware member query in MembersPage"
```

---

## Task 13: Build check + final commit

- [ ] **Step 1: Run client build**

```bash
cd client && npm run build
```

Expected: build completes with no errors. Fix any TypeScript/JSX errors before proceeding.

- [ ] **Step 2: Start server and verify old monthly groups still work end-to-end**

```bash
cd server && npm run dev
```

1. Open Dashboard → select an existing monthly group → confirm member cards load
2. Open Upload page → confirm month/year selectors still appear
3. Open Members page → confirm existing data displays correctly
4. Submit a test contribution to a monthly group → confirm it saves with correct `month`/`year`, `periodStart` is null

- [ ] **Step 3: Verify weekly group end-to-end**

1. Create a weekly group via Groups page (set startDate + dueDayOfWeek)
2. Open Dashboard → switch to the weekly group → PeriodNav shows "Week X, 2026"
3. Open Upload page → period label shown, month/year selectors hidden
4. Submit a contribution → check DB: `periodStart`/`periodEnd` populated, `month`/`year` computed from `periodStart`
5. Submit again → should get "already submitted" error

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: add flexible contribution frequencies

Support weekly, biweekly, monthly, and yearly savings circles.
All existing monthly data and API contracts unchanged.
New period fields are additive; sparse index handles deduplication."
```

---

## Backward Compatibility Checklist

Before marking complete, verify:

- [ ] Existing monthly contributions load in Dashboard without errors
- [ ] `GET /api/contributions?month=5&year=2026` still works (returns monthly-filtered results)
- [ ] `GET /api/members?month=5&year=2026&groupId=X` still works
- [ ] Old `cycleUtils.getPenaltyTriggerDate` and `isLateSubmission` still importable with old signature
- [ ] Groups created before this change load with `contributionFrequency: 'monthly'` (schema default)
- [ ] Contributions created before this change show correct labels via `formatPeriodLabel` fallback
