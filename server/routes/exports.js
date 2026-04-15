/**
 * Export Routes — CSV downloads for monthly/yearly reports.
 * Feature-gated: coordinator plan only.
 *
 * GET /api/exports/monthly?groupId=&month=&year=
 * GET /api/exports/yearly?groupId=&year=
 * GET /api/exports/members?groupId=&includeScore=true
 */

const express      = require('express');
const router       = express.Router();
const Group        = require('../models/Group');
const Contribution = require('../models/Contribution');
const Penalty      = require('../models/Penalty');
const Payout       = require('../models/Payout');
const { protect }  = require('../middleware/auth');
const { requireFeature } = require('../middleware/planGuard');
const { calculateTrustScore } = require('../utils/trustScore');

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function isGroupMember(group, userId) {
  return group.members.some(m => m.user.toString() === userId.toString());
}

/** Escape a CSV cell value (quotes any cell containing commas, quotes, or newlines). */
function cell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV string from a header row and data rows. */
function buildCsv(headers, rows) {
  const lines = [
    headers.map(cell).join(','),
    ...rows.map(row => row.map(cell).join(',')),
  ];
  return lines.join('\r\n');
}

/** Send a CSV response with the correct headers. */
function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\ufeff' + csv); // UTF-8 BOM for Excel compatibility
}

// ── GET /api/exports/monthly ──────────────────────────────────────────────────
router.get('/monthly', protect, requireFeature('exports'), async (req, res) => {
  const { groupId, month, year } = req.query;
  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  const now         = new Date();
  const targetMonth = Number(month) || now.getMonth() + 1;
  const targetYear  = Number(year)  || now.getFullYear();
  const monthName   = MONTHS[targetMonth - 1];

  try {
    const group = await Group.findById(groupId)
      .populate('members.user', 'name email phone');

    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupMember(group, req.user._id))
      return res.status(403).json({ message: 'You are not a member of this group' });

    const memberIds = group.members.map(m => m.user._id);

    const [contributions, penalties, payout] = await Promise.all([
      Contribution.find({ group: groupId, month: targetMonth, year: targetYear, user: { $in: memberIds } })
        .populate('user', 'name email'),
      Penalty.find({ group: groupId, month: targetMonth, year: targetYear }),
      Payout.findOne({ group: groupId, month: targetMonth, year: targetYear })
        .populate('recipient', 'name'),
    ]);

    const contribMap = {};
    contributions.forEach(c => { contribMap[c.user._id.toString()] = c; });

    const penaltyMap = {};
    penalties.forEach(p => {
      const uid = p.user.toString();
      penaltyMap[uid] = (penaltyMap[uid] || 0) + p.amount;
    });

    const headers = ['Name', 'Email', 'Role', 'Status', 'Amount (₦)', 'Submitted At', 'Penalties (₦)'];

    const rows = group.members.map(m => {
      const uid    = m.user._id.toString();
      const contrib = contribMap[uid];
      return [
        m.user.name,
        m.user.email,
        m.role,
        contrib ? contrib.status : 'unpaid',
        contrib ? contrib.amount : 0,
        contrib ? new Date(contrib.createdAt).toISOString() : '',
        penaltyMap[uid] || 0,
      ];
    });

    // Summary rows at the bottom
    const verified  = contributions.filter(c => c.status === 'verified');
    const collected = verified.reduce((s, c) => s + c.amount, 0);
    const expected  = group.contributionAmount * group.members.length;

    rows.push([]);
    rows.push(['SUMMARY']);
    rows.push(['Group',      group.name]);
    rows.push(['Period',     `${monthName} ${targetYear}`]);
    rows.push(['Expected',   expected]);
    rows.push(['Collected',  collected]);
    rows.push(['Members',    group.members.length]);
    rows.push(['Verified',   verified.length]);
    if (payout) rows.push(['Payout Recipient', payout.recipient?.name || '', 'Status', payout.status]);

    const csv = buildCsv(headers, rows);
    sendCsv(res, `${group.name.replace(/\s+/g, '_')}_${monthName}_${targetYear}.csv`, csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/exports/yearly ───────────────────────────────────────────────────
router.get('/yearly', protect, requireFeature('exports'), async (req, res) => {
  const { groupId, year } = req.query;
  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  const targetYear = Number(year) || new Date().getFullYear();

  try {
    const group = await Group.findById(groupId);
    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupMember(group, req.user._id))
      return res.status(403).json({ message: 'You are not a member of this group' });

    const [contributions, payouts] = await Promise.all([
      Contribution.find({ group: groupId, year: targetYear }),
      Payout.find({ group: groupId, year: targetYear }).populate('recipient', 'name'),
    ]);

    const headers = ['Month', 'Total Submissions', 'Verified', 'Collected (₦)', 'Expected (₦)', 'Rate (%)', 'Payout Recipient', 'Payout Status', 'Payout Amount (₦)'];

    const rows = Array.from({ length: 12 }, (_, i) => {
      const m          = i + 1;
      const monthContribs = contributions.filter(c => c.month === m);
      const verified   = monthContribs.filter(c => c.status === 'verified');
      const collected  = verified.reduce((s, c) => s + c.amount, 0);
      const expected   = group.contributionAmount * group.members.length;
      const rate       = expected > 0 ? Math.round((collected / expected) * 100) : 0;
      const payout     = payouts.find(p => p.month === m);

      return [
        MONTHS[i],
        monthContribs.length,
        verified.length,
        collected,
        expected,
        rate,
        payout?.recipient?.name || '',
        payout?.status          || '',
        payout ? (payout.actualAmount || payout.expectedAmount || 0) : '',
      ];
    });

    // Summary
    const totalCollected = rows.reduce((s, r) => s + (Number(r[3]) || 0), 0);
    const totalExpected  = rows.reduce((s, r) => s + (Number(r[4]) || 0), 0);
    rows.push([]);
    rows.push(['TOTAL', '', '', totalCollected, totalExpected,
      totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0]);

    const csv = buildCsv(headers, rows);
    sendCsv(res, `${group.name.replace(/\s+/g, '_')}_${targetYear}_Yearly.csv`, csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/exports/members ──────────────────────────────────────────────────
// Member roster with optional trust scores.
router.get('/members', protect, requireFeature('exports'), async (req, res) => {
  const { groupId, includeScore } = req.query;
  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  try {
    const group = await Group.findById(groupId)
      .populate('members.user', 'name email phone createdAt');

    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupMember(group, req.user._id))
      return res.status(403).json({ message: 'You are not a member of this group' });

    const withScores = includeScore === 'true';
    const headers = ['Name', 'Email', 'Phone', 'Circle Role', 'Joined At', ...(withScores ? ['Trust Score', 'Grade'] : [])];

    const rows = await Promise.all(group.members.map(async m => {
      const row = [
        m.user.name,
        m.user.email,
        m.user.phone || '',
        m.role,
        new Date(m.user.createdAt).toISOString().split('T')[0],
      ];
      if (withScores) {
        const ts = await calculateTrustScore(m.user._id, groupId);
        row.push(ts.score, ts.grade);
      }
      return row;
    }));

    const csv = buildCsv(headers, rows);
    sendCsv(res, `${group.name.replace(/\s+/g, '_')}_Members.csv`, csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/exports/trust-scores ────────────────────────────────────────────
// Trust score summary for all group members.
router.get('/trust-scores', protect, requireFeature('trustScoring'), async (req, res) => {
  const { groupId } = req.query;
  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  try {
    const group = await Group.findById(groupId)
      .populate('members.user', 'name email');

    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupMember(group, req.user._id))
      return res.status(403).json({ message: 'You are not a member of this group' });

    const scores = await Promise.all(
      group.members.map(async m => {
        const ts = await calculateTrustScore(m.user._id, groupId);
        return {
          _id:   m.user._id,
          name:  m.user.name,
          email: m.user.email,
          role:  m.role,
          ...ts,
        };
      })
    );

    // Sort best score first
    scores.sort((a, b) => b.score - a.score);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
