const express = require('express');
const router  = express.Router();
const Payout  = require('../models/Payout');
const Group   = require('../models/Group');
const Contribution = require('../models/Contribution');
const { protect } = require('../middleware/auth');

// ── Helpers ───────────────────────────────────────────────────────────────────

function isGroupAdmin(group, userId) {
  const m = group.members.find(m => m.user.toString() === userId.toString());
  return m?.role === 'admin';
}

function isGroupMember(group, userId) {
  return group.members.some(m => m.user.toString() === userId.toString());
}

// ── GET /api/payouts?groupId=&year= ───────────────────────────────────────────
// Return all payout slots for a group in a given year (defaults to current year).
router.get('/', protect, async (req, res) => {
  const { groupId, year } = req.query;
  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  try {
    const group = await Group.findById(groupId)
      .populate('members.user', 'name email avatar');

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const targetYear = Number(year) || new Date().getFullYear();

    const payouts = await Payout.find({ group: groupId, year: targetYear })
      .populate('recipient', 'name email avatar')
      .populate('recordedBy', 'name')
      .sort({ month: 1 });

    res.json({ payouts, group: { _id: group._id, name: group.name, contributionAmount: group.contributionAmount, memberCount: group.members.length } });
  } catch (err) {
    console.error('[payouts]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ── POST /api/payouts/rotation ────────────────────────────────────────────────
// Set or replace the full rotation for a group/year.
// Body: { groupId, year, rotation: [{ userId, month }] }
// Each entry sets who receives the pot for that month.
router.post('/rotation', protect, async (req, res) => {
  const { groupId, year, rotation } = req.body;

  if (!groupId) return res.status(400).json({ message: 'groupId is required' });
  if (!Array.isArray(rotation) || rotation.length === 0) {
    return res.status(400).json({ message: 'rotation array is required' });
  }

  const targetYear = Number(year) || new Date().getFullYear();

  try {
    const group = await Group.findById(groupId)
      .populate('members.user', 'name email');

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group admins can set the rotation' });
    }

    const memberIds = new Set(group.members.map(m => m.user._id.toString()));

    // Validate each slot
    for (const [i, slot] of rotation.entries()) {
      if (!slot.userId || !slot.month) {
        return res.status(400).json({ message: `Slot ${i + 1}: userId and month are required` });
      }
      if (!memberIds.has(String(slot.userId))) {
        return res.status(400).json({ message: `User ${slot.userId} is not a member of this group` });
      }
      const m = Number(slot.month);
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        return res.status(400).json({ message: `Slot ${i + 1}: month must be 1–12` });
      }
    }

    // Delete existing scheduled slots for this year (don't touch paid/skipped)
    await Payout.deleteMany({ group: groupId, year: targetYear, status: 'scheduled' });

    // Create new slots
    const docs = rotation.map((slot, i) => ({
      group:     groupId,
      recipient: slot.userId,
      month:     Number(slot.month),
      year:      targetYear,
      position:  i + 1,
      expectedAmount: group.contributionAmount * group.members.length,
      status:    'scheduled',
    }));

    const created = await Payout.insertMany(docs);

    const populated = await Payout.find({ _id: { $in: created.map(d => d._id) } })
      .populate('recipient', 'name email avatar')
      .sort({ month: 1 });

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Duplicate slot: a member can only receive once per month in this group' });
    }
    console.error('[payouts]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ── POST /api/payouts/generate ────────────────────────────────────────────────
// Auto-generate a round-robin rotation for a group/year from a given start month.
// Body: { groupId, year, startMonth }
router.post('/generate', protect, async (req, res) => {
  const { groupId, year, startMonth = 1 } = req.body;

  if (!groupId) return res.status(400).json({ message: 'groupId is required' });

  const targetYear = Number(year) || new Date().getFullYear();
  const start      = Number(startMonth);

  if (!Number.isInteger(start) || start < 1 || start > 12) {
    return res.status(400).json({ message: 'startMonth must be 1–12' });
  }

  try {
    const group = await Group.findById(groupId)
      .populate('members.user', 'name email avatar');

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group admins can generate the rotation' });
    }

    const members = group.members;
    if (members.length === 0) {
      return res.status(400).json({ message: 'Group has no members' });
    }

    // Remove all existing scheduled slots for this year
    await Payout.deleteMany({ group: groupId, year: targetYear, status: 'scheduled' });

    // Build round-robin slots starting at startMonth
    const docs = [];
    let memberIdx = 0;
    for (let i = 0; i < members.length; i++) {
      const month = start + i;
      if (month > 12) break; // stop at year boundary
      docs.push({
        group:     groupId,
        recipient: members[memberIdx]?.user._id,
        month,
        year:      targetYear,
        position:  i + 1,
        expectedAmount: group.contributionAmount * members.length,
        status:    'scheduled',
      });
      memberIdx = (memberIdx + 1) % members.length;
    }

    if (docs.length === 0) {
      return res.status(400).json({ message: 'startMonth is past December — no slots to generate' });
    }

    const created = await Payout.insertMany(docs, { ordered: false });

    const populated = await Payout.find({ _id: { $in: created.map(d => d._id) } })
      .populate('recipient', 'name email avatar')
      .sort({ month: 1 });

    res.status(201).json(populated);
  } catch (err) {
    console.error('[payouts]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ── PATCH /api/payouts/:id/status ─────────────────────────────────────────────
// Mark a payout slot as paid or skipped (group admin only).
// Body: { status: 'paid'|'skipped', actualAmount?, note? }
router.patch('/:id/status', protect, async (req, res) => {
  const { status, actualAmount, note } = req.body;

  if (!['paid', 'skipped', 'scheduled'].includes(status)) {
    return res.status(400).json({ message: 'status must be "paid", "skipped", or "scheduled"' });
  }

  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ message: 'Payout slot not found' });

    const group = await Group.findById(payout.group);
    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group admins can update payout status' });
    }

    payout.status     = status;
    payout.recordedBy = req.user._id;

    if (status === 'paid') {
      payout.paidAt        = new Date();
      payout.actualAmount  = actualAmount != null ? Number(actualAmount) : payout.expectedAmount;
    } else if (status === 'scheduled') {
      payout.paidAt        = null;
      payout.actualAmount  = 0;
    }

    if (note !== undefined) {
      payout.note = String(note).replace(/<[^>]*>/g, '').trim().slice(0, 500);
    }

    await payout.save();
    await payout.populate('recipient', 'name email avatar');
    await payout.populate('recordedBy', 'name');

    res.json(payout);
  } catch (err) {
    console.error('[payouts]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ── DELETE /api/payouts/:id ───────────────────────────────────────────────────
// Remove a scheduled slot (group admin only — cannot delete paid slots).
router.delete('/:id', protect, async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ message: 'Payout slot not found' });

    if (payout.status === 'paid') {
      return res.status(400).json({ message: 'Cannot delete a slot that has already been paid' });
    }

    const group = await Group.findById(payout.group);
    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group admins can remove payout slots' });
    }

    await payout.deleteOne();
    res.json({ message: 'Payout slot removed' });
  } catch (err) {
    console.error('[payouts]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
