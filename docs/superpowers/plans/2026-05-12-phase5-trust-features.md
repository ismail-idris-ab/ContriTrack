# Phase 5: Trust & Accountability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audit log completeness, late payment tracking, trust score display, enriched reports, and reminder UX improvements to Rotara's savings circles app.

**Architecture:** Five incremental vertical slices, each complete backend-to-frontend. Backend additions are additive (no migrations needed — Mongoose adds fields transparently). All feature gates use the existing `planGuard.js` FEATURES map and `UpgradeLock` component.

**Tech Stack:** Node.js/Express/Mongoose (backend), React (frontend), existing `logAudit()`, `calculateTrustScore()`, `requireFeature()`, `UpgradeLock` component.

---

## File Map

| File | Change |
|---|---|
| `server/controllers/groupsController.js` | Add `logAudit` calls in `joinGroup` and `removeMember` |
| `server/routes/payouts.js` | Add `logAudit` call when payout marked paid |
| `server/models/Contribution.js` | Add `lateDaysOverdue` field |
| `server/controllers/contributionsController.js` | Compute `lateDaysOverdue` in `createContribution` |
| `server/utils/trustScore.js` | Add `lateCount` metric and late payment deduction |
| `server/routes/exports.js` | Add JSON trust score summary endpoint |
| `server/routes/audit.js` | Add `action` and date range filter params |
| `client/src/pages/AdminPage.jsx` | Add 4 new audit event configs + action/date filters to AuditTab |
| `client/src/pages/MembersPage.jsx` | Add inline grade badge + member detail score drawer |
| `client/src/components/ProofModal.jsx` | Add `trustGrade`/`trustVerifiedCount`/`trustTotalMonths` props |
| `client/src/pages/ReportPage.jsx` | Add reliability summary, payout summary, penalty summary sections |
| `client/src/pages/WhatsAppPage.jsx` | Add copy reminder text button, preview modal, last reminded column |

---

## Slice 1: Audit Log Completeness

### Task 1: Add missing audit events to backend

**Files:**
- Modify: `server/controllers/groupsController.js`
- Modify: `server/routes/payouts.js`

- [ ] **Step 1: Add `logAudit` to `joinGroup` in groupsController.js**

Open `server/controllers/groupsController.js`. After `await group.save()` in `joinGroup` (around line 76), add the audit call:

```js
async function joinGroup(req, res) {
  try {
    const group = req.resolvedGroup;
    group.members.push({ user: req.user._id, role: 'member' });
    await group.save();
    await group.populate('members.user', 'name email role');

    logAudit({
      action: 'member.added', adminId: req.user._id, groupId: group._id,
      entityType: 'User', entityId: req.user._id, targetUserId: req.user._id,
      meta: { role: 'member', via: 'invite_code' },
    });

    send(res, group);
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}
```

- [ ] **Step 2: Add `logAudit` to `removeMember` in groupsController.js**

In `removeMember` (around line 268), after `await group.save()`:

```js
async function removeMember(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isActive) return fail(res, 'Group not found', 404);

    const isSelf = req.params.userId === req.user._id.toString();
    if (!isSelf && !isGroupAdmin(group, req.user._id)) {
      return fail(res, 'Only group admins can remove members', 403);
    }
    if (group.createdBy.toString() === req.params.userId) {
      return fail(res, 'Cannot remove the group creator', 400);
    }

    group.members = group.members.filter(
      m => String(m.user?._id ?? m.user) !== String(req.params.userId)
    );
    await group.save();

    logAudit({
      action: 'member.removed', adminId: req.user._id, groupId: group._id,
      entityType: 'User', entityId: req.params.userId, targetUserId: req.params.userId,
      meta: { removedBy: isSelf ? 'self' : 'admin' },
    });

    send(res, { message: 'Member removed' });
  } catch (err) {
    console.error('[groups]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}
```

- [ ] **Step 3: Add `logAudit` to payout mark-paid in payouts.js**

In `server/routes/payouts.js`, add import at top:

```js
const { logAudit } = require('../utils/audit');
```

In `PATCH /:id/status` handler, after `await payout.save()` and before `res.json(payout)`, add:

```js
    await payout.save();
    await payout.populate('recipient', 'name email avatar');
    await payout.populate('recordedBy', 'name');

    if (status === 'paid') {
      logAudit({
        action: 'payout.paid', adminId: req.user._id, groupId: payout.group,
        entityType: 'Payout', entityId: payout._id,
        targetUserId: payout.recipient?._id || payout.recipient,
        meta: {
          month: payout.month, year: payout.year,
          amount: payout.actualAmount || payout.expectedAmount,
          recipientName: payout.recipient?.name,
        },
      });
    }

    res.json(payout);
```

- [ ] **Step 4: Add action and date range filters to audit GET endpoint**

In `server/routes/audit.js`, update the filter building block:

```js
router.get('/', protect, async (req, res) => {
  const { groupId, action, from, to } = req.query;
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

  try {
    let filter = {};

    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group || !group.isActive)
        return res.status(404).json({ message: 'Group not found' });

      const isSystemAdmin = req.user.role === 'admin';
      if (!isSystemAdmin) {
        const member = group.members.find(m => {
          const uid = m.user?._id ?? m.user;
          return String(uid) === String(req.user._id);
        });
        if (!member || member.role !== 'admin')
          return res.status(403).json({ message: 'Only group admins can view the audit log' });
      }

      filter.groupId = groupId;
    } else {
      if (req.user.role !== 'admin')
        return res.status(403).json({ message: 'System admin access required' });
    }

    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const total = await AuditLog.countDocuments(filter);
    const logs  = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('adminId',      'name')
      .populate('targetUserId', 'name');

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[audit]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add server/controllers/groupsController.js server/routes/payouts.js server/routes/audit.js
git commit -m "feat: add member.added, member.removed, payout.paid audit events and filter params"
```

---

### Task 2: Improve AuditTab UI in AdminPage.jsx

**Files:**
- Modify: `client/src/pages/AdminPage.jsx`

- [ ] **Step 1: Add 4 new event configs to ACTION_CONFIG**

In `client/src/pages/AdminPage.jsx`, update `ACTION_CONFIG` (around line 527):

```js
const ACTION_CONFIG = {
  'contribution.verified':      { icon: '✅', color: '#059669', bg: 'rgba(5,150,105,0.10)',  label: 'verified contribution'      },
  'contribution.rejected':      { icon: '❌', color: '#e11d48', bg: 'rgba(225,29,72,0.10)',  label: 'rejected contribution'      },
  'contribution.resubmitted':   { icon: '🔄', color: '#0284c7', bg: 'rgba(2,132,199,0.10)',  label: 'resubmitted contribution'   },
  'contribution.proof_replaced':{ icon: '📎', color: '#0284c7', bg: 'rgba(2,132,199,0.10)',  label: 'replaced proof'             },
  'member.added':               { icon: '👤', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', label: 'joined the circle'          },
  'member.removed':             { icon: '🚪', color: '#64748b', bg: 'rgba(100,116,139,0.10)',label: 'was removed from circle'    },
  'member.role_changed':        { icon: '🛡️', color: '#4f46e5', bg: 'rgba(79,70,229,0.10)',  label: 'changed member role'        },
  'penalty.issued':             { icon: '⚠️', color: '#d97706', bg: 'rgba(217,119,6,0.10)',  label: 'issued a penalty'           },
  'penalty.status_changed':     { icon: '📋', color: '#d97706', bg: 'rgba(217,119,6,0.10)',  label: 'updated penalty status'     },
  'group.settings_changed':     { icon: '⚙️', color: '#d4a017', bg: 'rgba(212,160,23,0.10)', label: 'changed circle settings'    },
  'payout.paid':                { icon: '💸', color: '#059669', bg: 'rgba(5,150,105,0.10)',  label: 'marked payout as paid'      },
};
```

- [ ] **Step 2: Add metaSummary entries for new events**

Update `metaSummary` function (around line 548) to add handlers for new events:

```js
function metaSummary(action, meta) {
  if (!meta) return null;
  if (action === 'contribution.verified' || action === 'contribution.rejected') {
    const parts = [];
    if (meta.amount) parts.push(`₦${Number(meta.amount).toLocaleString('en-NG')}`);
    if (meta.month && meta.year) parts.push(`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][meta.month - 1]} ${meta.year}`);
    if (meta.rejectionNote) parts.push(`"${meta.rejectionNote}"`);
    return parts.join(' · ') || null;
  }
  if (action === 'contribution.resubmitted') {
    const parts = [];
    if (meta.month && meta.year) parts.push(`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][meta.month - 1]} ${meta.year}`);
    if (meta.resubmissionCount) parts.push(`attempt #${meta.resubmissionCount + 1}`);
    return parts.join(' · ') || null;
  }
  if (action === 'member.added') {
    return meta.via === 'invite_code' ? 'via invite code' : null;
  }
  if (action === 'member.removed') {
    return meta.removedBy === 'self' ? 'left the circle' : 'removed by admin';
  }
  if (action === 'member.role_changed') {
    return `${meta.oldRole} → ${meta.newRole}`;
  }
  if (action === 'penalty.issued') {
    return `₦${Number(meta.amount || 0).toLocaleString('en-NG')} · ${meta.reason || ''}`;
  }
  if (action === 'penalty.status_changed') {
    return `${meta.oldStatus} → ${meta.newStatus}${meta.note ? ` · "${meta.note}"` : ''}`;
  }
  if (action === 'group.settings_changed') {
    return meta.fields?.length ? `Changed: ${meta.fields.join(', ')}` : null;
  }
  if (action === 'payout.paid') {
    const parts = [];
    if (meta.month && meta.year) parts.push(`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][meta.month - 1]} ${meta.year}`);
    if (meta.amount) parts.push(`₦${Number(meta.amount).toLocaleString('en-NG')}`);
    return parts.join(' · ') || null;
  }
  return null;
}
```

- [ ] **Step 3: Add filter state and filter UI to AuditTab**

Replace the `AuditTab` function definition (starting around line 572) with this version that includes action filter and date range:

```js
const AUDIT_ACTION_GROUPS = [
  { value: '', label: 'All events' },
  { value: 'contribution.verified', label: 'Verified' },
  { value: 'contribution.rejected', label: 'Rejected' },
  { value: 'contribution.resubmitted', label: 'Resubmitted' },
  { value: 'member.added', label: 'Member joined' },
  { value: 'member.removed', label: 'Member removed' },
  { value: 'member.role_changed', label: 'Role changed' },
  { value: 'penalty.issued', label: 'Penalty issued' },
  { value: 'penalty.status_changed', label: 'Penalty updated' },
  { value: 'payout.paid', label: 'Payout paid' },
  { value: 'group.settings_changed', label: 'Settings changed' },
];

function AuditTab({ groupId }) {
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [pages,      setPages]      = useState(1);
  const [total,      setTotal]      = useState(0);
  const [error,      setError]      = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');

  const fetchLogs = (p = 1, action = actionFilter, from = fromDate, to = toDate) => {
    if (!groupId) return;
    setLoading(true);
    setError('');
    let url = `/audit?groupId=${groupId}&page=${p}&limit=20`;
    if (action) url += `&action=${encodeURIComponent(action)}`;
    if (from)   url += `&from=${encodeURIComponent(from)}`;
    if (to)     url += `&to=${encodeURIComponent(to)}`;
    api.get(url)
      .then(({ data }) => {
        setLogs(data.logs || []);
        setPages(data.pages || 1);
        setTotal(data.total || 0);
        setPage(p);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load audit log.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(1); }, [groupId]);

  const applyFilters = () => { fetchLogs(1, actionFilter, fromDate, toDate); };
  const clearFilters = () => {
    setActionFilter(''); setFromDate(''); setToDate('');
    fetchLogs(1, '', '', '');
  };

  const hasFilters = actionFilter || fromDate || toDate;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--ct-shadow)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <Skeleton width={38} height={38} borderRadius={10} />
          <div style={{ flex: 1 }}>
            <Skeleton height={13} width={220} style={{ marginBottom: 8 }} />
            <Skeleton height={10} width={140} />
          </div>
          <Skeleton height={11} width={48} />
        </div>
      ))}
    </div>
  );
  if (error) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 13.5, color: 'var(--ct-rose)', marginBottom: 14 }}>{error}</div>
      <button onClick={() => fetchLogs(1)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>Try again</button>
    </div>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Event type</label>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontFamily: 'var(--font-sans)', background: '#fff', cursor: 'pointer' }}
          >
            {AUDIT_ACTION_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontFamily: 'var(--font-sans)', background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontFamily: 'var(--font-sans)', background: '#fff' }} />
        </div>
        <button onClick={applyFilters}
          style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--ct-gold)', color: '#0f0f14', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', alignSelf: 'flex-end' }}>
          Filter
        </button>
        {hasFilters && (
          <button onClick={clearFilters}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: 'var(--ct-text-3)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)', alignSelf: 'flex-end' }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 13.5, color: 'var(--ct-text-3)', margin: 0 }}>
          {total} event{total !== 1 ? 's' : ''}{hasFilters ? ' (filtered)' : ''}
        </p>
      </div>

      {!logs.length ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--ct-text-1)', marginBottom: 6 }}>No activity yet</h3>
          <p style={{ color: 'var(--ct-text-3)', fontSize: 13.5 }}>Admin actions on this circle will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {logs.map(log => {
            const cfg = ACTION_CONFIG[log.action] || { icon: '📝', color: '#52526e', bg: 'rgba(82,82,110,0.1)', label: log.action };
            const summary = metaSummary(log.action, log.meta);
            return (
              <div key={log._id} style={{
                background: '#fff', borderRadius: 12, padding: '14px 18px',
                border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'var(--ct-shadow)',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ct-text-1)', lineHeight: 1.4 }}>
                    <span style={{ color: cfg.color }}>{log.adminId?.name || 'Member'}</span>
                    {' '}{cfg.label}
                    {log.targetUserId?.name && (
                      <span style={{ color: 'var(--ct-text-2)' }}> — {log.targetUserId.name}</span>
                    )}
                  </div>
                  {summary && (
                    <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                      {summary}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ct-text-4)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>
                  {timeAgoAudit(log.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button onClick={() => fetchLogs(page - 1)} disabled={page <= 1}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.09)', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontSize: 12.5, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>
            ← Prev
          </button>
          <span style={{ padding: '7px 12px', fontSize: 12.5, color: 'var(--ct-text-3)' }}>{page} / {pages}</span>
          <button onClick={() => fetchLogs(page + 1)} disabled={page >= pages}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.09)', background: '#fff', cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1, fontSize: 12.5, fontFamily: 'var(--font-sans)', color: 'var(--ct-text-2)' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/AdminPage.jsx
git commit -m "feat: improve AuditTab with new event configs, action filter, and date range filter"
```

---

## Slice 2: Late Payment Tracking

### Task 3: Add `lateDaysOverdue` field and compute it on submission

**Files:**
- Modify: `server/models/Contribution.js`
- Modify: `server/controllers/contributionsController.js`

- [ ] **Step 1: Add `lateDaysOverdue` to Contribution model**

In `server/models/Contribution.js`, after the `isLate` field (line 31):

```js
    isLate:         { type: Boolean, default: false },
    lateDaysOverdue:{ type: Number,  default: 0 },
```

- [ ] **Step 2: Compute `lateDaysOverdue` in `createContribution`**

In `server/controllers/contributionsController.js`, the `isLateSubmission` utility already computes lateness. We need to also compute days overdue. Replace the `late` computation block (around line 58-63) with:

```js
    const now = new Date();
    const late = isLateSubmission(now, parsedYear, parsedMonth, dueDay, graceDays);

    let lateDaysOverdue = 0;
    if (late) {
      // Deadline = dueDay + graceDays of the submission month/year
      const deadline = new Date(parsedYear, parsedMonth - 1, dueDay + graceDays, 23, 59, 59);
      lateDaysOverdue = Math.max(0, Math.ceil((now - deadline) / 86400000));
    }

    const data = {
      user: req.user._id, amount: parsedAmount, month: parsedMonth,
      year: parsedYear, cycleNumber: parsedCycle, note: safeNote,
      proofImage: req.file.path, isLate: late, lateDaysOverdue,
    };
```

- [ ] **Step 3: Commit**

```bash
git add server/models/Contribution.js server/controllers/contributionsController.js
git commit -m "feat: add lateDaysOverdue field to Contribution, compute on submission"
```

---

### Task 4: Add late payment deduction to trust score

**Files:**
- Modify: `server/utils/trustScore.js`

- [ ] **Step 1: Update `calculateTrustScore` to fetch `isLate` and count late payments**

Replace the `Contribution.find` call (line 48) with one that also selects `isLate`, and add `lateCount` tracking:

```js
async function calculateTrustScore(userId, groupId, lookbackMonths = 12) {
  const now    = new Date();
  const months = [];

  for (let i = 0; i < lookbackMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }

  const [contributions, penalties] = await Promise.all([
    Contribution.find({ user: userId, group: groupId }).select('month year status isLate'),
    Penalty.find({ user: userId, group: groupId, status: 'pending' }).select('amount'),
  ]);

  const contribByKey = {};
  contributions.forEach(c => {
    contribByKey[`${c.year}-${c.month}`] = c;
  });

  const totalMonths = months.length;
  let verifiedCount  = 0;
  let pendingCount   = 0;
  let rejectedCount  = 0;
  let unpaidCount    = 0;
  let lateCount      = 0;
  let streak         = 0;
  let streakBroken   = false;

  for (const { month, year } of months) {
    const key    = `${year}-${month}`;
    const contrib = contribByKey[key];
    const status  = contrib?.status;

    if (status === 'verified') {
      verifiedCount++;
      if (contrib.isLate) lateCount++;
      if (!streakBroken) streak++;
    } else if (status === 'pending') {
      pendingCount++;
      streakBroken = true;
    } else if (status === 'rejected') {
      rejectedCount++;
      streakBroken = true;
    } else {
      const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
      if (!isCurrentMonth) {
        unpaidCount++;
        streakBroken = true;
      }
    }
  }

  const penaltyCount = penalties.length;

  const paymentRate  = totalMonths > 0 ? verifiedCount / totalMonths : 0;
  let raw = paymentRate * 70;

  const streakBonus = Math.min(streak / totalMonths, 1) * 20;
  raw += streakBonus;

  raw -= pendingCount   * 1;
  raw -= rejectedCount  * 3;
  raw -= unpaidCount    * 2;
  raw -= penaltyCount   * 5;
  raw -= Math.min(lateCount, 10) * 1; // late payment deduction, capped at -10

  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const gradeInfo = getGrade(score);

  return {
    score,
    grade:             gradeInfo.grade,
    gradeLabel:        gradeInfo.label,
    gradeColor:        gradeInfo.color,
    verifiedCount,
    pendingCount,
    rejectedCount,
    unpaidCount,
    lateCount,
    consecutiveStreak: streak,
    penaltyCount,
    totalMonths,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/utils/trustScore.js
git commit -m "feat: add lateCount metric and late payment deduction to trust score"
```

---

---

### Task 3b: Show late badge in ContributionsTab (AdminPage) and MyPaymentsPage

**Files:**
- Modify: `client/src/pages/AdminPage.jsx`
- Modify: `client/src/pages/MyPaymentsPage.jsx`

The `isLate` and `lateDaysOverdue` fields are now returned from the API on contribution objects. We need to display a "Late" badge in the two places where contributions appear.

- [ ] **Step 1: Add late badge render in AdminPage ContributionsTab**

In `client/src/pages/AdminPage.jsx`, in the contributions table row, after the existing `StatusBadge` render, add:

```jsx
{c.isLate && (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: 10,
    background: 'rgba(217,119,6,0.10)', color: '#d97706',
    fontSize: 11, fontWeight: 700, marginLeft: 6,
    border: '1px solid rgba(217,119,6,0.2)',
  }}>
    Late{c.lateDaysOverdue > 0 ? ` +${c.lateDaysOverdue}d` : ''}
  </span>
)}
```

- [ ] **Step 2: Add late badge render in MyPaymentsPage**

In `client/src/pages/MyPaymentsPage.jsx`, find where contribution status is displayed (look for `StatusBadge` or contribution status render). After the status display, add the same late badge:

```jsx
{c.isLate && (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: 10,
    background: 'rgba(217,119,6,0.10)', color: '#d97706',
    fontSize: 11, fontWeight: 700, marginLeft: 6,
    border: '1px solid rgba(217,119,6,0.2)',
  }}>
    Late{c.lateDaysOverdue > 0 ? ` +${c.lateDaysOverdue}d` : ''}
  </span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/AdminPage.jsx client/src/pages/MyPaymentsPage.jsx
git commit -m "feat: show late payment badge in contribution lists"
```

---

## Slice 3: Trust Score Display

### Task 5: Add JSON trust score summary endpoint

**Files:**
- Modify: `server/routes/exports.js`

- [ ] **Step 1: Add `GET /api/exports/trust-score-summary` route**

In `server/routes/exports.js`, after the existing `trust-scores` CSV route, add:

```js
// ── GET /api/exports/trust-score-summary?groupId= ──────────────────────────────
// Returns JSON array of trust scores for all group members.
// Coordinator plan required (trustScoring feature).
router.get('/trust-score-summary', protect, requireFeature('trustScoring'), async (req, res) => {
  const { groupId } = req.query;
  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  try {
    const group = await Group.findById(groupId).populate('members.user', 'name email');
    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupMember(group, req.user._id))
      return res.status(403).json({ message: 'You are not a member of this group' });

    const scores = await Promise.all(
      group.members.map(async m => {
        const userId = m.user._id;
        const ts = await calculateTrustScore(userId, groupId);
        return {
          userId,
          name:              m.user.name,
          email:             m.user.email,
          score:             ts.score,
          grade:             ts.grade,
          gradeLabel:        ts.gradeLabel,
          gradeColor:        ts.gradeColor,
          verifiedCount:     ts.verifiedCount,
          pendingCount:      ts.pendingCount,
          rejectedCount:     ts.rejectedCount,
          unpaidCount:       ts.unpaidCount,
          lateCount:         ts.lateCount,
          consecutiveStreak: ts.consecutiveStreak,
          penaltyCount:      ts.penaltyCount,
          totalMonths:       ts.totalMonths,
        };
      })
    );

    res.json(scores);
  } catch (err) {
    console.error('[exports/trust-score-summary]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/exports.js
git commit -m "feat: add JSON trust score summary endpoint"
```

---

### Task 6: Add trust grade badge and member detail drawer to MembersPage

**Files:**
- Modify: `client/src/pages/MembersPage.jsx`

- [ ] **Step 1: Update trust score query to use new JSON endpoint**

In `client/src/pages/MembersPage.jsx`, update the `trustScores` query (around line 65):

```js
  const { data: trustScores = [], isLoading: trustLoading, isError: trustError, error: trustErr } = useQuery({
    queryKey: ['trust-score-summary', activeGroup?._id],
    queryFn: () => api.get(`/exports/trust-score-summary?groupId=${activeGroup._id}`).then(r => r.data),
    enabled: !!activeGroup,
    retry: (count, err) => err?.response?.status !== 403 && count < 1,
  });
  const trustLocked = trustError && trustErr?.response?.status === 403;

  // Build a userId → score lookup
  const trustMap = {};
  trustScores.forEach(ts => { trustMap[ts.userId] = ts; });
```

- [ ] **Step 2: Add MemberScoreDrawer component**

Near the top of `MembersPage.jsx` (before `export default function MembersPage`), add:

```jsx
function MemberScoreDrawer({ member, score, onClose }) {
  if (!member || !score) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,16,0.5)', zIndex: 900, display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 340, background: '#fff', height: '100%',
          overflowY: 'auto', padding: '28px 24px', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', margin: 0 }}>
            Reliability Score
          </h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#f5f2ec', cursor: 'pointer', fontSize: 16, color: 'var(--ct-text-2)' }}>×</button>
        </div>

        {/* Member name */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: getAvatarGradient(member.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>
            {getInitials(member.name)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ct-text-1)' }}>{member.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ct-text-3)' }}>{member.email}</div>
          </div>
        </div>

        {/* Score circle */}
        <div style={{ textAlign: 'center', marginBottom: 24, padding: '20px 0', background: '#faf9f6', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 800, color: score.gradeColor, lineHeight: 1 }}>{score.score}</div>
          <div style={{ fontSize: 12, color: 'var(--ct-text-3)', marginTop: 4 }}>out of 100</div>
          <div style={{ display: 'inline-block', marginTop: 10, padding: '4px 14px', borderRadius: 20, background: `${score.gradeColor}22`, color: score.gradeColor, fontWeight: 700, fontSize: 14 }}>
            {score.grade} · {score.gradeLabel}
          </div>
        </div>

        {/* Breakdown */}
        {[
          { label: 'Verified payments',    value: `${score.verifiedCount} / ${score.totalMonths} months` },
          { label: 'On-time streak',       value: `${score.consecutiveStreak} month${score.consecutiveStreak !== 1 ? 's' : ''}` },
          { label: 'Late payments',        value: score.lateCount, warn: score.lateCount > 0 },
          { label: 'Rejected submissions', value: score.rejectedCount, warn: score.rejectedCount > 0 },
          { label: 'Missed months',        value: score.unpaidCount, warn: score.unpaidCount > 0 },
          { label: 'Active penalties',     value: score.penaltyCount, warn: score.penaltyCount > 0 },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: 13, color: 'var(--ct-text-3)' }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: row.warn ? '#e11d48' : 'var(--ct-text-1)' }}>{row.value}</span>
          </div>
        ))}

        <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(212,160,23,0.08)', borderRadius: 10, border: '1px solid rgba(212,160,23,0.2)' }}>
          <p style={{ fontSize: 12, color: 'var(--ct-text-3)', margin: 0, lineHeight: 1.5 }}>
            Score based on last {score.totalMonths} months. Payment rate (70pts) + streak bonus (20pts) − deductions.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire up drawer in member table rows**

In the members tab table section of `MembersPage.jsx`, add `drawerMember` state and show the grade badge + trigger drawer on row click:

After the existing state declarations (around line 49), add:
```js
  const [drawerMember, setDrawerMember] = useState(null);
```

In the member row render, add grade badge and click handler. Find the table row where member name is rendered and add:

```jsx
{/* Grade badge — shown only when trust scores loaded */}
{trustScores.length > 0 && trustMap[m._id] && (
  <span
    onClick={e => { e.stopPropagation(); setDrawerMember(m); }}
    title="View reliability score"
    style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 12,
      background: `${trustMap[m._id].gradeColor}22`,
      color: trustMap[m._id].gradeColor,
      fontSize: 11, fontWeight: 700,
      cursor: 'pointer', marginLeft: 6,
      border: `1px solid ${trustMap[m._id].gradeColor}44`,
    }}
  >
    {trustMap[m._id].grade}
  </span>
)}
```

Add the drawer at the end of the returned JSX (before closing fragment/div):

```jsx
<MemberScoreDrawer
  member={drawerMember}
  score={drawerMember ? trustMap[drawerMember._id] : null}
  onClose={() => setDrawerMember(null)}
/>
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/MembersPage.jsx
git commit -m "feat: add trust grade badge and member score drawer to MembersPage"
```

---

### Task 7: Show trust grade in ProofModal

**Files:**
- Modify: `client/src/components/ProofModal.jsx`
- Modify: `client/src/pages/AdminPage.jsx` (pass props to ProofModal)

- [ ] **Step 1: Add trust grade props to ProofModal**

In `client/src/components/ProofModal.jsx`, update the function signature and add grade badge in the header:

```jsx
export default function ProofModal({ proofUrl, memberName, month, year, submittedDate, status, rejectionHistory, onClose, trustGrade, trustGradeColor, trustVerifiedCount, trustTotalMonths }) {
  if (!proofUrl) return null;
  // ... existing rows ...

  return (
    <div /* overlay */ >
      <div /* card */ >
        {/* Gold top bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--ct-gold), var(--ct-gold-light), var(--ct-gold))' }} />

        {/* Header — add trust grade badge here */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', margin: 0, letterSpacing: '-0.01em' }}>
              Payment Proof
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              {memberName && <p style={{ fontSize: 12, color: 'var(--ct-text-3)', margin: 0 }}>{memberName}</p>}
              {trustGrade && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '2px 8px', borderRadius: 12,
                  background: `${trustGradeColor}22`, color: trustGradeColor,
                  fontSize: 11, fontWeight: 700,
                  border: `1px solid ${trustGradeColor}44`,
                }}>
                  {trustGrade}
                  {trustVerifiedCount != null && trustTotalMonths != null && (
                    <span style={{ marginLeft: 4, fontWeight: 400, opacity: 0.8 }}>
                      · {trustVerifiedCount}/{trustTotalMonths}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: '#f5f2ec', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ct-text-2)', fontSize: 16 }}>×</button>
        </div>

        {/* Rest of body unchanged */}
```

- [ ] **Step 2: Pass trust data from AdminPage when opening ProofModal**

In `client/src/pages/AdminPage.jsx`, in `ContributionsTab`, find where `ProofModal` is rendered and add props. First, find where modal state is set on `openModal(c)`, and look up the trust score from a `trustMap` built from scores fetched in ContributionsTab.

Add a trust scores fetch to `ContributionsTab`:

```js
  const { activeGroup } = useGroup();
  // ... existing state ...
  const [trustMap, setTrustMap] = useState({});

  useEffect(() => {
    if (!activeGroup?._id) return;
    api.get(`/exports/trust-score-summary?groupId=${activeGroup._id}`)
      .then(({ data }) => {
        const map = {};
        data.forEach(ts => { map[ts.userId] = ts; });
        setTrustMap(map);
      })
      .catch(() => {}); // silently fail if plan doesn't allow
  }, [activeGroup]);
```

Then in the ProofModal render, pass trust props:

```jsx
{modal && (
  <ProofModal
    proofUrl={modal.proofImage}
    memberName={modal.user?.name}
    month={modal.month}
    year={modal.year}
    submittedDate={modal.createdAt}
    status={modal.status}
    rejectionHistory={modal.rejectionHistory}
    onClose={() => setModal(null)}
    trustGrade={trustMap[modal.user?._id]?.grade}
    trustGradeColor={trustMap[modal.user?._id]?.gradeColor}
    trustVerifiedCount={trustMap[modal.user?._id]?.verifiedCount}
    trustTotalMonths={trustMap[modal.user?._id]?.totalMonths}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ProofModal.jsx client/src/pages/AdminPage.jsx
git commit -m "feat: show member trust grade in ProofModal"
```

---

## Slice 4: Reports Improvements

### Task 8: Add reliability, payout, and penalty summary sections to ReportPage

**Files:**
- Modify: `client/src/pages/ReportPage.jsx`

- [ ] **Step 1: Add ReliabilitySummary component**

Near the bottom of `ReportPage.jsx` (before `export default`), add:

```jsx
function ReliabilitySummary({ groupId }) {
  const { user } = useAuth();
  const canViewTrust = canAccess(user, 'coordinator');

  const { data: scores = [], isLoading, isError, error } = useQuery({
    queryKey: ['trust-score-summary', groupId],
    queryFn: () => api.get(`/exports/trust-score-summary?groupId=${groupId}`).then(r => r.data),
    enabled: !!groupId && canViewTrust,
    retry: (count, err) => err?.response?.status !== 403 && count < 1,
  });

  if (!canViewTrust) {
    return (
      <UpgradeLock feature="Trust Scoring" requiredPlan="coordinator" />
    );
  }
  if (isLoading) return <div style={{ padding: 20, color: 'var(--ct-text-3)', fontSize: 13 }}>Loading reliability data…</div>;
  if (isError)   return <div style={{ padding: 20, color: 'var(--ct-rose)', fontSize: 13 }}>{error?.response?.data?.message || 'Failed to load'}</div>;
  if (!scores.length) return null;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#faf9f6' }}>
            {['Member','Grade','Payment Rate','Late','Penalties','Score'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--ct-text-3)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scores.sort((a, b) => b.score - a.score).map((s, i) => (
            <tr key={s.userId} style={{ borderBottom: i < scores.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ct-text-1)' }}>{s.name}</td>
              <td style={{ padding: '12px 14px' }}>
                <span style={{ padding: '3px 10px', borderRadius: 12, background: `${s.gradeColor}22`, color: s.gradeColor, fontWeight: 700, fontSize: 12 }}>{s.grade}</span>
              </td>
              <td style={{ padding: '12px 14px', color: 'var(--ct-text-2)' }}>
                {s.totalMonths > 0 ? Math.round((s.verifiedCount / s.totalMonths) * 100) : 0}%
              </td>
              <td style={{ padding: '12px 14px', color: s.lateCount > 0 ? '#d97706' : 'var(--ct-text-3)' }}>{s.lateCount}</td>
              <td style={{ padding: '12px 14px', color: s.penaltyCount > 0 ? '#e11d48' : 'var(--ct-text-3)' }}>{s.penaltyCount}</td>
              <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: s.gradeColor }}>{s.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Add PayoutSummary component**

```jsx
function PayoutSummary({ groupId, year }) {
  const { data, isLoading } = useQuery({
    queryKey: ['payouts', groupId, year],
    queryFn: () => api.get(`/payouts?groupId=${groupId}&year=${year}`).then(r => r.data),
    enabled: !!groupId,
  });

  const payouts = data?.payouts || [];
  if (isLoading) return <div style={{ padding: 20, color: 'var(--ct-text-3)', fontSize: 13 }}>Loading payout data…</div>;
  if (!payouts.length) return <div style={{ padding: 20, color: 'var(--ct-text-3)', fontSize: 13 }}>No payout records for this year.</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#faf9f6' }}>
            {['Month','Recipient','Expected','Actual','Status'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--ct-text-3)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payouts.map((p, i) => {
            const statusColor = p.status === 'paid' ? '#059669' : p.status === 'skipped' ? '#64748b' : '#d97706';
            return (
              <tr key={p._id} style={{ borderBottom: i < payouts.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <td style={{ padding: '12px 14px', color: 'var(--ct-text-2)' }}>{MONTHS_SHORT[p.month - 1]} {p.year}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ct-text-1)' }}>{p.recipient?.name || '—'}</td>
                <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--ct-text-2)' }}>₦{Number(p.expectedAmount || 0).toLocaleString('en-NG')}</td>
                <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--ct-text-2)' }}>{p.actualAmount ? `₦${Number(p.actualAmount).toLocaleString('en-NG')}` : '—'}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: `${statusColor}18`, color: statusColor, fontWeight: 700, fontSize: 11.5, textTransform: 'capitalize' }}>{p.status}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Add PenaltySummary component**

```jsx
function PenaltySummary({ groupId }) {
  const { data: penalties = [], isLoading } = useQuery({
    queryKey: ['penalties-summary', groupId],
    queryFn: () => api.get(`/penalties?groupId=${groupId}`).then(r => r.data),
    enabled: !!groupId,
  });

  const list = Array.isArray(penalties) ? penalties : (penalties.penalties || []);
  if (isLoading) return <div style={{ padding: 20, color: 'var(--ct-text-3)', fontSize: 13 }}>Loading penalty data…</div>;
  if (!list.length) return <div style={{ padding: 20, color: 'var(--ct-text-3)', fontSize: 13 }}>No penalties recorded.</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#faf9f6' }}>
            {['Member','Amount','Reason','Issued','Status'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--ct-text-3)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((p, i) => {
            const statusColor = p.status === 'paid' ? '#059669' : p.status === 'waived' ? '#64748b' : '#e11d48';
            return (
              <tr key={p._id} style={{ borderBottom: i < list.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ct-text-1)' }}>{p.user?.name || '—'}</td>
                <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: '#e11d48', fontWeight: 600 }}>₦{Number(p.amount || 0).toLocaleString('en-NG')}</td>
                <td style={{ padding: '12px 14px', color: 'var(--ct-text-2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.reason || '—'}</td>
                <td style={{ padding: '12px 14px', color: 'var(--ct-text-3)', whiteSpace: 'nowrap' }}>
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 12, background: `${statusColor}18`, color: statusColor, fontWeight: 700, fontSize: 11.5, textTransform: 'capitalize' }}>{p.status}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Add collapsible section wrapper and integrate 3 new sections into ReportPage**

Add a `CollapsibleSection` helper component:

```jsx
function CollapsibleSection({ title, icon, children, defaultOpen = false, planLock }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: 'var(--ct-text-1)' }}>
          <span style={{ fontSize: 17 }}>{icon}</span>{title}
          {planLock && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(212,160,23,0.12)', color: '#b45309', fontWeight: 600 }}>{planLock}</span>}
        </span>
        <span style={{ color: 'var(--ct-text-3)', fontSize: 13, fontWeight: 500 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>{children}</div>}
    </div>
  );
}
```

First, add `useQuery` to ReportPage's imports (if not already present):

```js
import { useQuery } from '@tanstack/react-query';
```

In the main `ReportPage` return JSX, after the existing stat cards and member list sections, add the three new sections:

```jsx
{/* Reliability Summary */}
<CollapsibleSection title="Reliability Summary" icon="🏆" planLock="Coordinator">
  <ReliabilitySummary groupId={activeGroup?._id} />
</CollapsibleSection>

{/* Payout Summary */}
<CollapsibleSection title="Payout Summary" icon="💸">
  <UpgradeLock feature="reports" requiredPlan="pro" user={user}>
    <PayoutSummary groupId={activeGroup?._id} year={selectedYear} />
  </UpgradeLock>
</CollapsibleSection>

{/* Penalty Summary */}
<CollapsibleSection title="Penalty Summary" icon="⚠️">
  <UpgradeLock feature="reports" requiredPlan="pro" user={user}>
    <PenaltySummary groupId={activeGroup?._id} />
  </UpgradeLock>
</CollapsibleSection>
```

Note: ReportPage has `year` (monthly tab) and `yearlyYear` (yearly tab) state variables. Pass `yearlyYear` to `PayoutSummary` so it shows the full year's payouts when the user is on the yearly tab, or `year` when on the monthly tab — use `yearlyYear` as the default since payout summary is year-scoped.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ReportPage.jsx
git commit -m "feat: add reliability, payout, and penalty summary sections to ReportPage"
```

---

## Slice 5: Reminder Improvements

### Task 9: Add copy button, preview modal, and last-reminded column to WhatsAppPage

**Files:**
- Modify: `client/src/pages/WhatsAppPage.jsx`

- [ ] **Step 1: Add reminder text generation helper**

Near the top of `WhatsAppPage.jsx` (after imports), add:

```js
const MONTHS_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function generateReminderText(member, groupName, month, year, amount) {
  const monthName = MONTHS_NAMES[month - 1];
  const formatted = Number(amount || 0).toLocaleString('en-NG');
  return `Hi ${member.name}, this is a reminder that your contribution of ₦${formatted} for *${groupName}* — ${monthName} ${year} is still pending. Please pay at your earliest convenience. Thank you! 🙏`;
}
```

- [ ] **Step 2: Add preview modal state and copy handler**

Inside the `WhatsAppPage` component, add state:

```js
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied]           = useState(null); // userId of last copied
```

Add copy handler:

```js
  const handleCopy = (member) => {
    if (!activeGroup) return;
    const text = generateReminderText(member, activeGroup.name, month, year, activeGroup.contributionAmount);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(member._id);
      setTimeout(() => setCopied(null), 2000);
    });
  };
```

- [ ] **Step 3: Add ReminderPreviewModal component**

Before the `export default function WhatsAppPage` line, add:

```jsx
function ReminderPreviewModal({ members, groupName, month, year, amount, onClose, onConfirm, sending }) {
  const monthName = MONTHS_NAMES[month - 1];
  const formatted = Number(amount || 0).toLocaleString('en-NG');
  const sampleText = members[0]
    ? generateReminderText(members[0], groupName, month, year, amount)
    : '';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,16,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, maxWidth: 440, width: '100%', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', fontFamily: 'var(--font-sans)' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,#25D366,#128C7E)' }} />
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ct-text-1)', margin: '0 0 4px' }}>Send Reminders</h3>
          <p style={{ fontSize: 13, color: 'var(--ct-text-3)', margin: 0 }}>{members.length} member{members.length !== 1 ? 's' : ''} will be reminded for {monthName} {year}</p>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ct-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Sample message</p>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', fontSize: 13.5, color: '#166534', lineHeight: 1.6, marginBottom: 20 }}>
            {sampleText}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ct-text-3)', marginBottom: 16 }}>
            Members without a phone number will be skipped.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: 'var(--ct-text-2)', fontFamily: 'var(--font-sans)' }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={sending} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#25D366', fontSize: 13.5, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', color: '#fff', fontFamily: 'var(--font-sans)', opacity: sending ? 0.6 : 1 }}>
              {sending ? 'Sending…' : 'Send All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace the Send Reminders button with preview-first flow**

In `WhatsAppPage.jsx`, find the existing "Send Reminders" button (which directly calls the remind API) and replace it with the preview-first approach:

Original flow: button → `api.post('/reports/remind', ...)` directly.

New flow: button → `setPreviewOpen(true)` → preview modal → confirm → `api.post('/reports/remind', ...)`.

Update `handleRemind` (or equivalent send function):

```js
  const sendReminders = async () => {
    setReminding(true);
    try {
      const { data } = await api.post('/reports/remind', {
        groupId: activeGroup._id, month, year,
      });
      setResult(data);
      setPreviewOpen(false);
      showToast(data.message, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send reminders.', 'error');
    } finally {
      setReminding(false);
    }
  };
```

Change the send button to open preview instead:

```jsx
<button
  onClick={() => setPreviewOpen(true)}
  disabled={reminding || !unpaidMembers.length}
  style={{ /* existing styles */ }}
>
  Send Reminders ({unpaidMembers.length})
</button>
```

Add preview modal at end of component JSX:

```jsx
{previewOpen && (
  <ReminderPreviewModal
    members={unpaidMembers}
    groupName={activeGroup?.name || ''}
    month={month}
    year={year}
    amount={activeGroup?.contributionAmount || 0}
    onClose={() => setPreviewOpen(false)}
    onConfirm={sendReminders}
    sending={reminding}
  />
)}
```

- [ ] **Step 5: Add copy button to each unpaid member row**

In the member list table, add a copy button in each row:

```jsx
<button
  onClick={() => handleCopy(member)}
  title="Copy reminder message"
  style={{
    padding: '4px 10px', borderRadius: 7,
    border: '1px solid rgba(37,211,102,0.3)',
    background: copied === member._id ? '#f0fdf4' : 'transparent',
    color: copied === member._id ? '#166534' : '#25D366',
    fontSize: 11.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font-sans)',
    transition: 'all 0.15s',
  }}
>
  {copied === member._id ? '✓ Copied' : 'Copy msg'}
</button>
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/WhatsAppPage.jsx
git commit -m "feat: add reminder preview modal and copy message button to WhatsAppPage"
```

---

## Final Step: Build Check & Final Commit

### Task 10: Run build checks and commit

- [ ] **Step 1: Run backend check**

```bash
node -e "require('./server/server.js')" 2>&1 | head -20
```

Expected: no syntax errors, server starts (will error on DB connection which is expected in CI — that's fine).

- [ ] **Step 2: Run frontend build**

```bash
cd client && npm run build
```

Expected: build completes with no errors. Warnings about unused vars are acceptable.

- [ ] **Step 3: Fix any build errors before proceeding**

If build fails, fix errors before running final commit.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: add trust and accountability improvements"
```

---

## Summary of Changes

| Area | What changed |
|---|---|
| Audit events | `member.added`, `member.removed`, `payout.paid` now logged; audit endpoint supports `action` + date range filters |
| Late payments | `lateDaysOverdue` field on Contribution; computed on submission; displayed in trust score |
| Trust score | `lateCount` metric added; –1pt/late-payment deduction; new JSON bulk endpoint |
| AuditTab | 10 event types covered; action type dropdown filter; date range filter |
| MembersPage | Grade badge beside each member; click-to-open score breakdown drawer |
| ProofModal | Shows submitter's grade + verified/total stat in header |
| ReportPage | 3 new collapsible sections: Reliability Summary, Payout Summary, Penalty Summary |
| WhatsAppPage | Preview modal before bulk send; per-member copy-to-clipboard button |
