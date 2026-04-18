# Phase 1: Circle Settings & Templates — Design Spec

> **For agentic workers:** Before implementing, invoke `superpowers:writing-plans` to produce the task-by-task implementation plan from this spec.

---

## Goal

Extend ContriTrack Circles with configurable settings (due date, grace period, rotation type) and a template system (system presets + user-saved templates), so admins can set up new circles faster and enforce contribution rules automatically.

## Context

### What already exists
- `Group` model with `name`, `description`, `contributionAmount`, `members`, `inviteCode`, `isActive`
- `Contribution` model with `month`, `year`, `status` (pending/verified/rejected), `isLate` field **does not exist yet**
- `Penalty` model with manual/auto penalty application
- `Payout` model with rotation slots (`position`, `month`, `year`, `status`)
- `GroupsPage` with create-circle modal (single-step form)
- `StatusBadge` component with three states: Pending, Verified, Rejected

### What is missing
- `dueDay`, `graceDays`, `rotationType` on Group
- Template model and system presets
- Auto-rotation seeding for join-order and random types
- `isLate` stamping on contributions
- Settings drawer UI
- Template picker in create-circle flow

---

## Decisions Made

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Frequency | Monthly only | Weekly/flexible touches every model — separate project |
| Rotation types | All 5 supported | fixed, join-order, random, bid, admin-chooses |
| Due date | Day of month + grace period | Matches real Ajo practice; hard cutoffs create admin friction |
| Templates | Presets + save-your-own | Best of both — quick start and reusable personal configs |
| Architecture | Extend Group model + Settings drawer | No separate GroupSettings model — 4 fields don't warrant it |

---

## Data Model

### Group schema additions (`server/models/Group.js`)

```js
dueDay:       { type: Number, default: 25, min: 1, max: 28 },
graceDays:    { type: Number, default: 3,  min: 0, max: 7  },
rotationType: {
  type:    String,
  enum:    ['fixed', 'join-order', 'random', 'bid'],
  default: 'fixed',
},
```

**Validation rules:**
- `dueDay` must be 1–28 (never 29–31 — avoids February edge cases)
- `graceDays` must be 0–7
- `rotationType` must be one of the four enum values

### New `Template` model (`server/models/Template.js`)

```js
{
  name:        { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: '', maxlength: 200 },
  icon:        { type: String, default: '◎' },          // emoji
  isPreset:    { type: Boolean, default: false },        // true = system template
  createdBy:   { type: ObjectId, ref: 'User', default: null }, // null = system
  settings: {
    contributionAmount: { type: Number, default: 0, min: 0 },
    dueDay:             { type: Number, default: 25 },
    graceDays:          { type: Number, default: 3  },
    rotationType:       { type: String, default: 'fixed' },
  },
}
```

**Indexes:**
- `{ isPreset: 1 }` — fast system preset lookup
- `{ createdBy: 1 }` — fast user template lookup

### Contribution schema addition (`server/models/Contribution.js`)

```js
isLate: { type: Boolean, default: false },
```

Stamped at submission time by comparing `Date.now()` against `getPenaltyTriggerDate(year, month, group.dueDay, group.graceDays)`.

---

## Backend

### Updated routes

#### `POST /api/groups` (existing, updated)
Accept three new optional body fields:
- `dueDay` (Number, default 25)
- `graceDays` (Number, default 3)
- `rotationType` (String, default 'fixed')

Validate before saving. Return updated group object.

#### `PATCH /api/groups/:id/settings` (new)
- **Auth:** group admin only
- **Body:** `{ name?, description?, contributionAmount?, dueDay?, graceDays?, rotationType? }`
- **Validation:** same rules as POST
- **Response:** updated group object
- **Side effect:** if `rotationType` changes to `join-order` or `random` and no payout rotation exists for the current year, trigger auto-seed

#### `POST /api/groups/:id/save-template` (new)
- **Auth:** group admin only
- **Body:** `{ name, description?, icon? }`
- **Action:** create a `Template` document from the group's current settings with `isPreset: false`, `createdBy: req.user._id`
- **Limit:** max 10 saved templates per user (return 400 if exceeded)
- **Response:** created template object

### New routes (`server/routes/templates.js`)

#### `GET /api/templates`
- **Auth:** optional (unauthenticated gets presets only)
- **Response:** `{ presets: Template[], mine: Template[] }` — `mine` is empty array if not authenticated

#### `DELETE /api/templates/:id`
- **Auth:** required, owner only
- **Validation:** cannot delete `isPreset: true` templates
- **Response:** `{ message: 'Template deleted' }`

### New utilities

#### `server/utils/cycleUtils.js`

```js
// Returns Date after which contribution is "late"
function getPenaltyTriggerDate(year, month, dueDay, graceDays) {
  const d = new Date(year, month - 1, dueDay);
  d.setDate(d.getDate() + graceDays);
  return d;
}

// Returns true if submittedAt is past the grace window
function isLateSubmission(submittedAt, year, month, dueDay, graceDays) {
  return new Date(submittedAt) > getPenaltyTriggerDate(year, month, dueDay, graceDays);
}

module.exports = { getPenaltyTriggerDate, isLateSubmission };
```

Used by:
- `routes/contributions.js` POST — stamp `isLate` on new submissions
- `routes/penalties.js` — reference trigger date when auto-applying penalties

#### `server/utils/rotationUtils.js`

```js
// Returns members sorted by joinedAt (join-order rotation)
function buildJoinOrderRotation(members) {
  return [...members].sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
}

// Returns members in a random order (Fisher-Yates shuffle)
function buildRandomRotation(members) {
  const arr = [...members];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Returns array of { userId, month } payout slots starting from startMonth
function buildRotationSlots(orderedMembers, startMonth, year) {
  return orderedMembers.map((m, i) => ({
    userId: m.user._id || m.user,
    month:  ((startMonth - 1 + i) % 12) + 1,
    year:   year + Math.floor((startMonth - 1 + i) / 12),
  }));
}

module.exports = { buildJoinOrderRotation, buildRandomRotation, buildRotationSlots };
```

Auto-seeding is triggered by `POST /api/payouts/rotation` when `rotationType` is `join-order` or `random` and no existing rotation is found.

### Seed script (`server/seeds/templates.js`)

One-time script: `node server/seeds/templates.js`

Inserts these system presets (skips if already exists by name + `isPreset: true`):

| Name | Amount | Due Day | Grace | Rotation |
|------|--------|---------|-------|----------|
| Family Ajo | ₦20,000 | 25th | 3 days | Fixed |
| Office Thrift | ₦10,000 | 28th | 2 days | Join order |
| Church Circle | ₦5,000 | 1st | 5 days | Random |
| Friends Esusu | ₦15,000 | 20th | 3 days | Fixed |
| Market Women | ₦30,000 | 15th | 2 days | Join order |

---

## Frontend

### Files changed / created

| File | Change |
|------|--------|
| `client/src/pages/GroupsPage.jsx` | Add template picker step, settings button on cards, My Templates section |
| `client/src/components/CircleSettingsDrawer.jsx` | New — settings panel overlay |
| `client/src/components/TemplatePickerStep.jsx` | New — step 1 of create modal |
| `client/src/components/StatusBadge.jsx` | Add Late state |
| `server/models/Group.js` | Add 3 fields |
| `server/models/Contribution.js` | Add `isLate` |
| `server/models/Template.js` | New |
| `server/routes/groups.js` | Update POST, add PATCH settings, add POST save-template |
| `server/routes/templates.js` | New |
| `server/utils/cycleUtils.js` | New |
| `server/utils/rotationUtils.js` | New |
| `server/seeds/templates.js` | New |

### Create Circle modal — 2-step flow

**Step 1: TemplatePickerStep**
- Grid of template cards (3 columns desktop, 2 mobile)
- Each card: icon (large emoji), name, settings summary line ("₦20,000 · Due 25th · Fixed rotation")
- "Start from scratch" card always first, visually distinct
- User-saved templates shown in a separate row below presets with a "My saved" label
- Clicking a card pre-fills Step 2 and advances automatically

**Step 2: Configure & Create (existing form + new fields)**
- Existing: name, description, contributionAmount
- New fields below contributionAmount:
  - **Due day** — `<input type="number" min="1" max="28">` + label "of each month"
  - **Grace period** — `<select>`: None · 1 day · 2 days · 3 days · 5 days · 7 days
  - **Rotation type** — 4 pill buttons: Fixed · Join Order · Random · Bid
- Live preview sentence below new fields: *"Contributions are due on the 25th. Members have 3 extra days (until the 28th) before a penalty applies."*
- Back button returns to Step 1

### CircleSettingsDrawer

Triggered by a ⚙ icon button on each group card (admin only). Slides in from the right as a fixed overlay panel (same z-index pattern as mobile sidebar).

**Sections:**
1. **General** — name, description, contribution amount
2. **Schedule** — due day + grace period with live preview sentence
3. **Rotation** — 4 pill buttons + one-line explanation per type:
   - Fixed: "You assign payout order manually"
   - Join Order: "First to join gets paid first"
   - Random: "Rotation is shuffled randomly at cycle start"
   - Bid: "Members request payout via the Pledge system"
4. **Save as Template** — text input for template name + save button (calls `POST /api/groups/:id/save-template`)
5. **Danger zone** — placeholder labels for Archive and Clone (greyed out, labelled "Coming in Phase 3")

Save button at bottom calls `PATCH /api/groups/:id/settings`. Toast on success. Drawer closes.

### My Templates section (GroupsPage footer)

Shown only when `mine.length > 0`. A horizontal scroll row of compact template cards with a delete (×) button. Max 10 per user enforced server-side.

### StatusBadge — Late state

```jsx
// New case added to StatusBadge.jsx
if (status === 'late' || isLate) {
  return <Badge color="#e11d48" bg="rgba(225,29,72,0.10)">Late</Badge>;
}
```

Displayed in MembersPage, DashboardPage, UploadPage contribution lists wherever `isLate: true` and `status === 'pending'`.

---

## Integration: Due Date → Late Status Flow

```
Member submits contribution
  → contributions.js POST handler
  → fetch group by groupId to get dueDay + graceDays
  → call isLateSubmission(now, year, month, dueDay, graceDays)
  → set contribution.isLate = true/false
  → save contribution
  → response includes isLate

Admin views MembersPage / DashboardPage
  → contributions loaded with isLate field
  → StatusBadge renders "Late" if isLate && status === 'pending'

Penalty auto-apply (existing route)
  → uses getPenaltyTriggerDate to find all members past grace window
  → creates penalty records (existing Penalty model, no change)
```

---

## Error Handling

| Scenario | Response |
|----------|----------|
| `dueDay` outside 1–28 | 400 "Due day must be between 1 and 28" |
| `graceDays` outside 0–7 | 400 "Grace period must be between 0 and 7 days" |
| Invalid `rotationType` | 400 "Invalid rotation type" |
| Save template — over 10 limit | 400 "Template limit reached (max 10)" |
| Delete system preset | 403 "System templates cannot be deleted" |
| Settings update by non-admin | 403 "Only group admins can update settings" |

---

## Out of Scope for Phase 1

- Contribution frequency (weekly, bi-weekly, quarterly) — Phase 1.5
- Archiving and cloning circles — Phase 3
- Audit log — Phase 4
- Member data isolation — Phase 4
- Reminders/notifications triggered by due date — Phase 2 enhancement
