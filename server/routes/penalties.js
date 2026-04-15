const express = require('express');
const router  = express.Router();
const Penalty = require('../models/Penalty');
const Group   = require('../models/Group');
const { protect } = require('../middleware/auth');
const { requireFeature } = require('../middleware/planGuard');

function isGroupAdmin(group, userId) {
  const m = group.members.find(m => m.user.toString() === userId.toString());
  return m?.role === 'admin';
}
function isGroupMember(group, userId) {
  return group.members.some(m => m.user.toString() === userId.toString());
}

// ── GET /api/penalties?groupId= ───────────────────────────────────────────────
// All penalties for a group (members see all; admins can filter by userId).
router.get('/', protect, requireFeature('penaltyTracking'), async (req, res) => {
  const { groupId, userId, status } = req.query;
  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  try {
    const group = await Group.findById(groupId);
    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupMember(group, req.user._id))
      return res.status(403).json({ message: 'You are not a member of this group' });

    const filter = { group: groupId };
    if (userId) filter.user   = userId;
    if (status) filter.status = status;

    const penalties = await Penalty.find(filter)
      .populate('user',     'name email')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(penalties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/penalties/mine?groupId= ─────────────────────────────────────────
// Current user's own penalties (optionally filtered by group).
router.get('/mine', protect, async (req, res) => {
  const { groupId } = req.query;
  const filter = { user: req.user._id };
  if (groupId) filter.group = groupId;

  try {
    const penalties = await Penalty.find(filter)
      .populate('group',    'name')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(penalties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/penalties ───────────────────────────────────────────────────────
// Issue a penalty (group admin only).
router.post('/', protect, requireFeature('penaltyTracking'), async (req, res) => {
  const { groupId, userId, amount, reason, month, year, note } = req.body;

  if (!groupId || !userId || !amount || !reason) {
    return res.status(400).json({ message: 'groupId, userId, amount, and reason are required' });
  }
  if (Number(amount) <= 0) {
    return res.status(400).json({ message: 'amount must be positive' });
  }

  try {
    const group = await Group.findById(groupId);
    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupAdmin(group, req.user._id))
      return res.status(403).json({ message: 'Only group admins can issue penalties' });
    if (!isGroupMember(group, userId))
      return res.status(400).json({ message: 'User is not a member of this group' });

    const penalty = await Penalty.create({
      group:    groupId,
      user:     userId,
      amount:   Number(amount),
      reason:   String(reason).replace(/<[^>]*>/g, '').trim().slice(0, 500),
      month:    month  ? Number(month)  : null,
      year:     year   ? Number(year)   : null,
      note:     note   ? String(note).replace(/<[^>]*>/g, '').trim().slice(0, 500) : '',
      issuedBy: req.user._id,
    });

    await penalty.populate('user', 'name email');
    await penalty.populate('issuedBy', 'name');
    res.status(201).json(penalty);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/penalties/:id/status ──────────────────────────────────────────
// Mark penalty as paid or waived (group admin only).
router.patch('/:id/status', protect, requireFeature('penaltyTracking'), async (req, res) => {
  const { status, note } = req.body;
  if (!['paid', 'waived', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'status must be "paid", "waived", or "pending"' });
  }

  try {
    const penalty = await Penalty.findById(req.params.id);
    if (!penalty) return res.status(404).json({ message: 'Penalty not found' });

    const group = await Group.findById(penalty.group);
    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupAdmin(group, req.user._id))
      return res.status(403).json({ message: 'Only group admins can update penalties' });

    penalty.status = status;
    if (status === 'paid')   penalty.paidAt   = new Date();
    if (status === 'waived') penalty.waivedAt = new Date();
    if (status === 'pending') { penalty.paidAt = null; penalty.waivedAt = null; }
    if (note !== undefined)
      penalty.note = String(note).replace(/<[^>]*>/g, '').trim().slice(0, 500);

    await penalty.save();
    await penalty.populate('user', 'name email');
    await penalty.populate('issuedBy', 'name');
    res.json(penalty);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/penalties/:id ─────────────────────────────────────────────────
// Delete a pending penalty (group admin only; cannot delete paid ones).
router.delete('/:id', protect, requireFeature('penaltyTracking'), async (req, res) => {
  try {
    const penalty = await Penalty.findById(req.params.id);
    if (!penalty) return res.status(404).json({ message: 'Penalty not found' });
    if (penalty.status === 'paid')
      return res.status(400).json({ message: 'Cannot delete a paid penalty' });

    const group = await Group.findById(penalty.group);
    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });
    if (!isGroupAdmin(group, req.user._id))
      return res.status(403).json({ message: 'Only group admins can delete penalties' });

    await penalty.deleteOne();
    res.json({ message: 'Penalty deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
