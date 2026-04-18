# Audit Log — Design Spec
**Date:** 2026-04-18
**Scope:** Log top-5 admin actions, expose via GET /api/audit, show in AdminPage Audit tab

---

## Problem
When admins verify contributions, change roles, issue penalties, or edit settings there is no record of who did what and when. Disputes have no paper trail.

## Solution
Fire-and-forget audit logging on 5 high-value routes + a read endpoint + a new Audit tab in AdminPage.

---

## 1. Model: `server/models/AuditLog.js`

```js
const auditLogSchema = new mongoose.Schema({
  action:       { type: String, required: true },        // e.g. 'contribution.verified'
  adminId:      { type: ObjectId, ref: 'User', required: true },
  groupId:      { type: ObjectId, ref: 'Group', default: null },
  entityType:   { type: String },                        // 'Contribution'|'User'|'Penalty'|'Group'
  entityId:     { type: ObjectId, default: null },
  targetUserId: { type: ObjectId, ref: 'User', default: null },
  meta:         { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, versionKey: false });

auditLogSchema.index({ groupId: 1, createdAt: -1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });
```

### Action strings
| Action | Trigger |
|--------|---------|
| `contribution.verified` | Contribution PATCH → verified |
| `contribution.rejected` | Contribution PATCH → rejected |
| `member.role_changed` | Group member role PATCH |
| `penalty.issued` | Penalty POST |
| `penalty.status_changed` | Penalty PATCH status |
| `group.settings_changed` | Group PATCH /settings |

---

## 2. Utility: `server/utils/audit.js`

Fire-and-forget — never blocks a route response:

```js
const AuditLog = require('../models/AuditLog');

function logAudit(data) {
  AuditLog.create(data).catch(err => console.error('[audit]', err.message));
}

module.exports = { logAudit };
```

---

## 3. Routes — add logAudit calls

### contributions.js — PATCH /:id/status
After `await contribution.save()`, add:
```js
logAudit({
  action:       `contribution.${status}`,   // 'contribution.verified' or 'contribution.rejected'
  adminId:      req.user._id,
  groupId:      contribution.group,
  entityType:   'Contribution',
  entityId:     contribution._id,
  targetUserId: contribution.user,
  meta:         { oldStatus: oldStatus, note: note || null },
});
```
(Capture `oldStatus` before mutation: `const oldStatus = contribution.status;`)

### groups.js — PATCH /:id/members/:userId/role
After role is saved, add:
```js
logAudit({
  action:       'member.role_changed',
  adminId:      req.user._id,
  groupId:      group._id,
  entityType:   'User',
  entityId:     req.params.userId,
  targetUserId: req.params.userId,
  meta:         { oldRole, newRole: req.body.role },
});
```
(Capture `oldRole` from the member object before mutation.)

### penalties.js — POST /
After `await penalty.save()`, add:
```js
logAudit({
  action:       'penalty.issued',
  adminId:      req.user._id,
  groupId:      penalty.group,
  entityType:   'Penalty',
  entityId:     penalty._id,
  targetUserId: penalty.user,
  meta:         { amount: penalty.amount, reason: penalty.reason, month: penalty.month, year: penalty.year },
});
```

### penalties.js — PATCH /:id/status
After `await penalty.save()`, add:
```js
logAudit({
  action:       'penalty.status_changed',
  adminId:      req.user._id,
  groupId:      penalty.group,
  entityType:   'Penalty',
  entityId:     penalty._id,
  targetUserId: penalty.user,
  meta:         { oldStatus, newStatus: req.body.status, note: req.body.note || null },
});
```

### groups.js — PATCH /:id/settings
After group is saved, add:
```js
logAudit({
  action:     'group.settings_changed',
  adminId:    req.user._id,
  groupId:    group._id,
  entityType: 'Group',
  entityId:   group._id,
  meta:       { changes: req.body },  // raw body already sanitized at this point
});
```

---

## 4. Read Route: `GET /api/audit`

New file: `server/routes/audit.js`

```
GET /api/audit?groupId=&page=1&limit=20
```

- `protect` middleware
- If `groupId` provided: return logs for that group, only if requester is a group admin
- If no `groupId`: system admin (`req.user.role === 'admin'`) sees all logs
- Populate `adminId` (name), `targetUserId` (name)
- Sort by `createdAt: -1`
- Returns `{ logs, total, page, pages }`

---

## 5. Frontend: Audit tab in AdminPage

**New tab:** Add `{ id: 'audit', label: 'Audit Log' }` to the existing tabs array in AdminPage.

**AuditTab component:**
- Fetches `GET /api/audit?groupId=<activeGroup._id>&page=1&limit=30`
- Renders a chronological list of entries
- Each entry shows:
  - Icon + color per action type (verified=green, rejected=red, role=indigo, penalty=amber, settings=gold)
  - `"[Admin Name] [action label] [target name]"` — e.g. "Ismail A. verified Fatima's contribution"
  - `meta` detail line (amount, reason, etc.)
  - Time ago (using existing `timeAgo` pattern)

### Action labels for display
```js
const ACTION_LABELS = {
  'contribution.verified':  { label: 'verified contribution',  color: '#059669', bg: 'rgba(5,150,105,0.10)',  icon: '✅' },
  'contribution.rejected':  { label: 'rejected contribution',  color: '#e11d48', bg: 'rgba(225,29,72,0.10)',   icon: '❌' },
  'member.role_changed':    { label: 'changed member role',    color: '#4f46e5', bg: 'rgba(79,70,229,0.10)',   icon: '🛡️' },
  'penalty.issued':         { label: 'issued a penalty',       color: '#d97706', bg: 'rgba(217,119,6,0.10)',   icon: '⚠️' },
  'penalty.status_changed': { label: 'updated penalty',        color: '#d97706', bg: 'rgba(217,119,6,0.10)',   icon: '📋' },
  'group.settings_changed': { label: 'changed circle settings',color: '#d4a017', bg: 'rgba(212,160,23,0.10)',  icon: '⚙️' },
};
```

---

## Files Changed

| File | Action |
|------|--------|
| `server/models/AuditLog.js` | **New** — audit log schema |
| `server/utils/audit.js` | **New** — `logAudit` fire-and-forget helper |
| `server/routes/audit.js` | **New** — GET /api/audit read endpoint |
| `server/server.js` (or app.js) | Register `/api/audit` route |
| `server/routes/contributions.js` | Add logAudit after status change |
| `server/routes/groups.js` | Add logAudit after role change + settings change |
| `server/routes/penalties.js` | Add logAudit after issue + status change |
| `client/src/pages/AdminPage.jsx` | Add Audit tab + AuditTab component |
