const express      = require('express');
const router       = express.Router();
const Group        = require('../models/Group');
const Contribution = require('../models/Contribution');
const Penalty      = require('../models/Penalty');
const Payout       = require('../models/Payout');
const User         = require('../models/User');
const { protect }  = require('../middleware/auth');
const { requireFeature, getEffectivePlan } = require('../middleware/planGuard');
const { sendBulkReminders } = require('../utils/whatsapp');

function isGroupAdmin(group, userId) {
  const m = group.members.find(m => m.user.toString() === userId.toString());
  return m?.role === 'admin';
}
function isGroupMember(group, userId) {
  return group.members.some(m => m.user.toString() === userId.toString());
}

// ── GET /api/reports/monthly?groupId=&month=&year= ────────────────────────────
// Full monthly summary for a group.
router.get('/monthly', protect, requireFeature('reports'), async (req, res) => {
  const { groupId, month, year } = req.query;
  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  const now       = new Date();
  const targetMonth = Number(month) || now.getMonth() + 1;
  const targetYear  = Number(year)  || now.getFullYear();

  try {
    const group = await Group.findById(groupId)
      .populate('members.user', 'name email phone avatar');

    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupMember(group, req.user._id))
      return res.status(403).json({ message: 'You are not a member of this group' });

    const memberIds = group.members.map(m => m.user._id);

    // Contributions this month
    const contributions = await Contribution.find({
      group: groupId,
      month: targetMonth,
      year:  targetYear,
      user:  { $in: memberIds },
    }).populate('user', 'name email');

    const contribMap = {};
    contributions.forEach(c => { contribMap[c.user._id.toString()] = c; });

    // Penalties for this month
    const penalties = await Penalty.find({
      group: groupId,
      month: targetMonth,
      year:  targetYear,
    }).populate('user', 'name email');

    const penaltyMap = {};
    penalties.forEach(p => {
      const uid = p.user._id.toString();
      if (!penaltyMap[uid]) penaltyMap[uid] = [];
      penaltyMap[uid].push(p);
    });

    // Payout slot for this month
    const payout = await Payout.findOne({ group: groupId, month: targetMonth, year: targetYear })
      .populate('recipient', 'name email');

    // Build per-member rows
    const members = group.members.map(m => {
      const uid   = m.user._id.toString();
      const contrib = contribMap[uid] || null;
      return {
        _id:          m.user._id,
        name:         m.user.name,
        email:        m.user.email,
        groupRole:    m.role,
        paid:         !!contrib,
        contribution: contrib ? {
          _id:    contrib._id,
          amount: contrib.amount,
          status: contrib.status,
          submittedAt: contrib.createdAt,
        } : null,
        penalties:    penaltyMap[uid] || [],
        penaltyTotal: (penaltyMap[uid] || []).reduce((s, p) => s + p.amount, 0),
      };
    });

    const verified  = members.filter(m => m.contribution?.status === 'verified');
    const pending   = members.filter(m => m.contribution?.status === 'pending');
    const unpaid    = members.filter(m => !m.paid);
    const collected = verified.reduce((s, m) => s + m.contribution.amount, 0);
    const expected  = group.contributionAmount * group.members.length;
    const penaltyTotal = penalties.reduce((s, p) => s + p.amount, 0);

    res.json({
      group: {
        _id:                group._id,
        name:               group.name,
        contributionAmount: group.contributionAmount,
        memberCount:        group.members.length,
      },
      period: { month: targetMonth, year: targetYear },
      summary: {
        expected,
        collected,
        verifiedCount:  verified.length,
        pendingCount:   pending.length,
        unpaidCount:    unpaid.length,
        totalMembers:   group.members.length,
        progressPct:    group.members.length
          ? Math.round((verified.length / group.members.length) * 100)
          : 0,
        penaltyTotal,
      },
      payout: payout || null,
      members,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/reports/yearly?groupId=&year= ────────────────────────────────────
// Yearly overview — 12-month breakdown of collection rates.
router.get('/yearly', protect, requireFeature('reports'), async (req, res) => {
  const { groupId, year } = req.query;
  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  const targetYear = Number(year) || new Date().getFullYear();

  try {
    const group = await Group.findById(groupId);
    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupMember(group, req.user._id))
      return res.status(403).json({ message: 'You are not a member of this group' });

    const contributions = await Contribution.find({
      group: groupId,
      year:  targetYear,
    });

    const payouts = await Payout.find({ group: groupId, year: targetYear })
      .populate('recipient', 'name');

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthContribs = contributions.filter(c => c.month === month);
      const verified = monthContribs.filter(c => c.status === 'verified');
      const payout   = payouts.find(p => p.month === month) || null;

      return {
        month,
        totalSubmissions: monthContribs.length,
        verified:         verified.length,
        collected:        verified.reduce((s, c) => s + c.amount, 0),
        expected:         group.contributionAmount * group.members.length,
        payout:           payout ? { status: payout.status, recipient: payout.recipient?.name, amount: payout.actualAmount || payout.expectedAmount } : null,
      };
    });

    const totalCollected = monthlyData.reduce((s, m) => s + m.collected, 0);
    const totalExpected  = monthlyData.reduce((s, m) => s + m.expected,  0);

    res.json({
      group: { _id: group._id, name: group.name, contributionAmount: group.contributionAmount },
      year:  targetYear,
      summary: { totalCollected, totalExpected, collectionRate: totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0 },
      months: monthlyData,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/reports/remind?groupId=&month=&year= ────────────────────────────
// Send WhatsApp reminders to all unpaid members for a given month.
router.post('/remind', protect, requireFeature('reminders'), async (req, res) => {
  const { groupId, month, year } = req.body;
  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  const now          = new Date();
  const targetMonth  = Number(month) || now.getMonth() + 1;
  const targetYear   = Number(year)  || now.getFullYear();

  try {
    const group = await Group.findById(groupId)
      .populate('members.user', 'name email phone');

    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupAdmin(group, req.user._id))
      return res.status(403).json({ message: 'Only group admins can send reminders' });

    const memberIds = group.members.map(m => m.user._id);
    const paid = await Contribution.find({
      group: groupId, month: targetMonth, year: targetYear,
      user: { $in: memberIds },
    }).select('user');

    const paidIds    = new Set(paid.map(c => c.user.toString()));
    const unpaidMembers = group.members
      .filter(m => !paidIds.has(m.user._id.toString()))
      .map(m => ({ name: m.user.name, phone: m.user.phone || '' }));

    if (unpaidMembers.length === 0) {
      return res.json({ message: 'All members have paid — no reminders needed.', sent: 0, skipped: 0 });
    }

    const { sent, skipped } = await sendBulkReminders(unpaidMembers, {
      groupName: group.name,
      month:     targetMonth,
      year:      targetYear,
      amount:    group.contributionAmount,
    });

    res.json({
      message: `Reminders sent to ${sent} member(s). ${skipped} skipped (no phone number).`,
      sent, skipped,
      unpaidCount: unpaidMembers.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
