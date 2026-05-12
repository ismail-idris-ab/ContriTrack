# Phase 5: Trust & Accountability Features — Design Spec

**Date:** 2026-05-12  
**Status:** Approved  
**Approach:** Incremental vertical slices (A)

---

## Context

Rotara is a savings circles app. Phase 5 adds stronger trust, transparency, and accountability features for group admins and members. The backend has solid foundations (AuditLog, Contribution, Penalty, Payout, Notification, trustScore.js, planGuard.js). This spec describes targeted improvements on top of those foundations.

**No real financial transfer logic. No automated SMS/WhatsApp unless Termii integration already wired.**

---

## Section 1: Audit Log Improvements

### Backend

Four audit events currently missing from `logAudit()` call sites:

| Event | Route to update | Meta fields |
|---|---|---|
| `contribution.resubmitted` | resubmit contribution route | `{ month, year, userId }` |
| `member.added` | invite/join route | `{ userId, role }` |
| `member.removed` | remove member route | `{ userId }` |
| `payout.paid` | payout mark-paid route | `{ month, year, recipientId, amount }` |

Existing events (`contribution.verified`, `contribution.rejected`, `member.role_changed`, `penalty.issued`, `penalty.status_changed`, `group.settings_changed`) remain unchanged.

### Frontend — AdminPage AuditTab

- Add icon/color/label rendering for 4 new event types
- Add **action type filter** dropdown (all | contributions | members | payouts | penalties | settings)
- Add **date range filter** (from/to date pickers, default: last 30 days)
- Show **triggered-by user name** on each entry (already in `adminId`, need to populate/display)

---

## Section 2: Late Payment Handling

### Backend — Contribution Model

Add two optional fields to `server/models/Contribution.js`:

```js
isLate: { type: Boolean, default: false },
lateDaysOverdue: { type: Number, default: 0 },
```

Set these fields when an admin **verifies** a contribution: compare `verifiedAt` date against the group's `dueDay + graceDays` for that contribution's month/year. If verified after deadline, set `isLate: true` and compute `lateDaysOverdue`.

### Backend — Trust Score

Update `server/utils/trustScore.js`:
- Add `latePayments` count to returned metrics
- Add deduction: `–1 point per late payment` (capped at –10)

### Frontend

- `StatusBadge` — add `late` variant: amber background, label "Late +N days" when `isLate && lateDaysOverdue > 0`
- **AdminPage ContributionsTab** — show late badge on verified contributions past deadline
- **MyPaymentsPage** — show late badge in personal contribution history
- **MembersPage** — add "Late" count column to member history view

---

## Section 3: Trust Score Display

**Plan gate: Coordinator plan** (existing `requireFeature('trustScoring')` / `UpgradeLock`).

### Backend

Add `GET /api/trust-score/:userId?groupId=` endpoint in a new `server/routes/trustScore.js` route file. Returns full JSON breakdown from `calculateTrustScore()`. The existing `/exports/trust-scores` only returns CSV — this new endpoint returns JSON for UI consumption. Requires auth + group membership check.

### Frontend — 4 locations

1. **MembersPage inline badge**  
   Grade chip (A+ / B / C / F etc.) beside each member name. Colored per `gradeColor` from trustScore response. Fetched in bulk from existing scores endpoint.

2. **Member detail hover/drawer**  
   Click member row → side drawer or popover shows:
   - Score out of 100
   - Grade + label (e.g., "Excellent")
   - Payment rate %
   - Consecutive on-time streak
   - Late payment count
   - Active penalty count

3. **AdminPage ProofModal**  
   When admin opens a contribution proof image:
   - Show submitter's grade badge at top of modal
   - Show "X / Y months verified" stat
   - Helps admin contextualize submission

4. **ReportPage reliability section**  
   New collapsible card: table of all members with columns:  
   `Member | Grade | Payment Rate | Late Count | Penalties | Score`  
   Plan-gated behind `UpgradeLock` (Coordinator).

---

## Section 4: Reports Improvements

All additions are **collapsible cards** inside existing `ReportPage`. No new route.

### 4a: Reliability Summary
- Member reliability table (from Section 3 trust scores)
- Coordinator plan gate

### 4b: Payout Summary
- Table: `Month | Recipient | Expected Amount | Actual Amount | Status`
- Data from existing Payout model via reports endpoint
- Pro plan gate (reports feature)

### 4c: Penalty Summary
- Table: `Member | Amount | Reason | Issued Date | Status`
- Data from existing Penalty model via reports endpoint
- Pro plan gate (reports feature)

Backend: extend `GET /api/reports/monthly` (or add sub-routes) to include payout and penalty arrays in response if not already present.

---

## Section 5: Reminders Improvements

Automated bulk WhatsApp send stays **Pro plan gated** via existing Termii integration and `requireFeature('reminders')`.

### 5a: Copy Reminder Text
- New **"Copy message"** button in WhatsAppPage next to each unpaid member (or global copy-all)
- Copies formatted reminder text to clipboard
- No plan gate (copy is just text, no API call)

### 5b: Preview Modal
- Before sending bulk reminder, show preview modal with generated message text
- Admin can review before confirming send
- Applies to existing bulk send flow in WhatsAppPage

### 5c: Reminder Log in Member List
- Surface `lastReminderSent` timestamp per member per month
- Source: existing Notification model (type: `reminder`)
- Show in member list as "Last reminded: X days ago" or "Not yet reminded"

---

## Plan Gating Summary

| Feature | Required Plan |
|---|---|
| Trust scoring display | Coordinator |
| Reliability summary in reports | Coordinator |
| Payout/penalty summary in reports | Pro |
| Bulk WhatsApp reminders (send) | Pro |
| Copy reminder text | Free (no API call) |
| Audit log (view) | Admin role (any plan) |
| Late payment badge | Free (display only) |

All gates use existing `planGuard.js` FEATURES map and `UpgradeLock` component.

---

## Implementation Order (Vertical Slices)

1. Audit log — backend events + frontend AuditTab improvements
2. Late payment — Contribution model fields + verification logic + UI badges
3. Trust score display — JSON endpoint + 4 frontend locations
4. Reports — 3 new collapsible sections + backend data
5. Reminders — copy button + preview modal + reminder log

---

## Out of Scope

- Real financial transfers
- New automated SMS/WhatsApp integrations (Termii already exists)
- New database migrations (Mongoose schema additions are additive)
- New pages/routes for audit log (improving existing AuditTab)
