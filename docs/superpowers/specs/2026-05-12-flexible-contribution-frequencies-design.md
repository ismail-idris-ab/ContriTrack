# Flexible Contribution Frequencies — Design Spec

**Date:** 2026-05-12  
**Approach:** Option A — Additive fields, dual-index  
**Scope:** Extend Rotara to support weekly, biweekly, monthly, and yearly savings circles without breaking existing monthly data.

---

## Goals

- Support `weekly | biweekly | monthly | yearly` contribution frequencies per group.
- Existing monthly groups and contributions work unchanged.
- No data migration. No field removal.

---

## 1. Data Models

### Group — new fields

```js
contributionFrequency: { type: String, enum: ['weekly','biweekly','monthly','yearly'], default: 'monthly' }
startDate:             { type: Date, default: null }         // anchors week 1 for weekly/biweekly
dueDayOfWeek:          { type: Number, min: 0, max: 6, default: null }   // 0=Sun…6=Sat
dueDayOfMonth:         { type: Number, min: 1, max: 28, default: null }  // monthly/yearly
dueMonth:              { type: Number, min: 1, max: 12, default: null }  // yearly only
```

**Kept unchanged:** `dueDay`, `graceDays`, `cyclesPerMonth`.  
Groups without `contributionFrequency` behave as `'monthly'` via the default.

### Contribution — new fields

```js
periodType:  { type: String, enum: ['weekly','biweekly','monthly','yearly'], default: null }
periodStart: { type: Date, default: null }
periodEnd:   { type: Date, default: null }
dueDate:     { type: Date, default: null }
periodLabel: { type: String, default: null }
```

**Kept unchanged:** `month`, `year`, `cycleNumber`, existing unique index.  
`month`/`year` are always filled by the server (computed from `periodStart` for non-monthly groups).

New sparse unique index added alongside old one:

```js
{ user: 1, group: 1, periodStart: 1, periodEnd: 1 }, { unique: true, sparse: true }
```

Old index `{ user, group, month, year, cycleNumber }` stays.

---

## 2. cycleUtils.js

### Existing exports — unchanged
- `getPenaltyTriggerDate(year, month, dueDay, graceDays)`
- `isLateSubmission(submittedAt, year, month, dueDay, graceDays)`

### New exports

```js
getCurrentPeriod(group, date?)
// Returns { periodStart, periodEnd, periodLabel, dueDate, periodType }
// date defaults to now. Computes which period 'date' falls in.

getPeriodForDate(group, date)
// Same as getCurrentPeriod but explicit date arg (for past period display).

getPenaltyTriggerDate(group, period)
// New overload: accepts (group, period) instead of raw year/month/dueDay/graceDays.

isLateSubmission(submittedAt, group, period)
// New overload: accepts (submittedAt, group, period).

generatePeriodLabel(group, period)
// Returns human label per frequency:
//   weekly:   "Week 3, 2026"
//   biweekly: "Jan 1–14, 2026"
//   monthly:  "April 2026"
//   yearly:   "Year 2026"
```

### Period computation

| Frequency  | periodStart                          | periodEnd                    |
|------------|--------------------------------------|------------------------------|
| `weekly`   | `startDate + N×7d`                   | `periodStart + 6d`           |
| `biweekly` | `startDate + N×14d`                  | `periodStart + 13d`          |
| `monthly`  | `1st of month/year`                  | last day of month            |
| `yearly`   | `Jan 1 of year`                      | `Dec 31 of year`             |

N = `floor((date − startDate) / periodLength)` for weekly/biweekly.

---

## 3. Backend — Controller & Validators

### contributionsController.js — createContribution

```
1. Load group: add new fields to .select()
2. IF group.contributionFrequency is non-monthly (or no group):
   a. Call getCurrentPeriod(group, now)
   b. Compute month/year from periodStart (satisfies required fields)
   c. cycleNumber = 1
   d. isLate = isLateSubmission(now, group, period)  ← new overload
3. ELSE (monthly / legacy):
   a. Use month/year/cycleNumber from req.body unchanged
   b. isLate = old isLateSubmission signature
4. Contribution.create() always writes both old + new period fields
```

Duplicate 11000 error handling unchanged — same message covers both indexes.

### contributionsController.js — getContributions

Add optional `periodStart`/`periodEnd` query params. When provided, filter on those instead of `month`/`year`. Old callers unaffected.

### validators/contributions.js

`month` and `year` become optional (server-computed for non-monthly):

```js
month: z.coerce.number().int().min(1).max(12).optional()
year:  z.coerce.number().int().min(2020).max(2100).optional()
```

### validators/groups.js

New fields added to `createGroupSchema` and `updateSettingsSchema`:

```js
contributionFrequency: z.enum(['weekly','biweekly','monthly','yearly']).optional().default('monthly')
startDate:      z.coerce.date().optional()
dueDayOfWeek:   z.coerce.number().int().min(0).max(6).optional()
dueDayOfMonth:  z.coerce.number().int().min(1).max(28).optional()
dueMonth:       z.coerce.number().int().min(1).max(12).optional()
```

`.superRefine()` cross-field validation:
- `weekly` / `biweekly` → `dueDayOfWeek` + `startDate` required
- `monthly` → no extra required fields (`dueDay` fallback stays)
- `yearly` → `dueMonth` + `dueDayOfMonth` required

---

## 4. Frontend

### GroupsPage — create/edit form

Frequency selector: pill-button row (matches existing rotation type UI pattern).

Conditional fields shown by selected frequency:

| Frequency          | Extra fields                                      |
|--------------------|---------------------------------------------------|
| `weekly`/`biweekly`| `startDate` (date picker) + `dueDayOfWeek` (Mon–Sun select) |
| `monthly`          | `dueDayOfMonth` (1–28, relabelled from `dueDay`) |
| `yearly`           | `dueMonth` (month select) + `dueDayOfMonth`      |

Existing `dueDay` field hidden when non-monthly is selected; its value migrates to `dueDayOfMonth` field.

### UploadPage — period section

```
IF group.contributionFrequency === 'monthly' (or undefined):
  → existing month/year selectors, unchanged

ELSE:
  → hide month/year selectors
  → show auto-detected read-only period label + date range
  → send { periodStart, periodEnd } to server (not month/year)
  → server computes and stores month/year from periodStart
```

`alreadySubmitted` check matches on `periodStart` for non-monthly groups.

### DashboardPage — period navigator

`MonthNav` → `PeriodNav` (extended, not replaced):

| Group frequency | Nav behaviour           | Label            |
|-----------------|-------------------------|------------------|
| `monthly`       | prev/next month         | "April 2026"     |
| `weekly`        | prev/next week          | "Week 20, 2026"  |
| `biweekly`      | prev/next 2-week block  | "May 1–14, 2026" |
| `yearly`        | prev/next year          | "Year 2026"      |

`getContributions` call passes `periodStart`+`periodEnd` for non-monthly groups, `month`+`year` for monthly (old path untouched).

### MembersPage — contribution lookup

```
monthly group:     match c.month === month && c.year === year  (unchanged)
non-monthly group: match c.periodStart === currentPeriod.periodStart
```

### Period label helper (shared client util)

```js
formatPeriodLabel(contribution, group)
// Has periodLabel → return it
// Fallback → `${MONTHS[month-1]} ${year}` (covers all old data)
```

---

## 5. Backward Compatibility Guarantees

| Scenario | Behaviour |
|---|---|
| Existing group, no `contributionFrequency` | Treated as `monthly` via schema default |
| Existing contribution, no `periodStart` | `periodLabel` fallback uses `month`/`year` |
| Old API callers sending `month`+`year` | Works unchanged — monthly path untouched |
| Old `cycleUtils` imports | Both old function signatures still exported |
| Dashboard/Members for monthly groups | Uses old `month`/`year` filter path |

---

## 6. Validation Rules

| Frequency  | Required fields                       |
|------------|---------------------------------------|
| `weekly`   | `startDate`, `dueDayOfWeek`           |
| `biweekly` | `startDate`, `dueDayOfWeek`           |
| `monthly`  | none (falls back to `dueDay`)         |
| `yearly`   | `dueMonth`, `dueDayOfMonth`           |
| all        | `graceDays` 0–7                       |

---

## 7. Files Changed

| File | Change type |
|---|---|
| `server/models/Group.js` | Add 5 new optional fields |
| `server/models/Contribution.js` | Add 5 new optional fields + sparse index |
| `server/utils/cycleUtils.js` | Add 4 new exports, keep 2 old |
| `server/controllers/contributionsController.js` | Dual-path logic in createContribution; add period query params to getContributions |
| `server/validators/contributions.js` | month/year → optional |
| `server/validators/groups.js` | Add frequency fields + superRefine |
| `client/src/pages/GroupsPage.jsx` | Frequency selector + conditional fields |
| `client/src/pages/UploadPage.jsx` | Frequency-aware period section |
| `client/src/pages/DashboardPage.jsx` | MonthNav → PeriodNav |
| `client/src/pages/MembersPage.jsx` | Period-aware contribution lookup |
| `client/src/utils/dateUtils.js` (or new file) | `formatPeriodLabel` helper |

---

## 8. What Is NOT Changed

- Existing `month`, `year`, `cycleNumber` fields and their indexes
- Old `cycleUtils` function signatures
- `getContributions` behaviour when `month`/`year` params are used
- Report/export CSV structure for monthly groups
- All non-frequency group/contribution fields
- Auth, pledge, audit, notification systems
