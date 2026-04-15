const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Contribution = require('../models/Contribution');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { guardGroupCreate, guardMemberAdd } = require('../middleware/planGuard');

// Helper: check if requesting user is an admin of the given group
function isGroupAdmin(group, userId) {
  const member = group.members.find((m) => m.user.toString() === userId.toString());
  return member?.role === 'admin';
}

// Helper: check if requesting user is a member of the given group
function isGroupMember(group, userId) {
  return group.members.some((m) => m.user.toString() === userId.toString());
}

// ─── POST /api/groups ─────────────────────────────────────────────────────────
// Create a new group. Creator becomes group admin.
router.post('/', protect, guardGroupCreate, async (req, res) => {
  const { name, description, contributionAmount } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Group name is required' });
  }

  const safeDescription = description
    ? String(description).replace(/<[^>]*>/g, '').trim().slice(0, 500)
    : '';

  try {
    const group = await Group.create({
      name: name.trim().slice(0, 100),
      description: safeDescription,
      contributionAmount: Number(contributionAmount) || 0,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });

    await group.populate('members.user', 'name email role');
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/groups/mine ─────────────────────────────────────────────────────
// Get all groups the current user belongs to.
router.get('/mine', protect, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.user': req.user._id, isActive: true })
      .populate('members.user', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/groups/join ────────────────────────────────────────────────────
// Join a group using an invite code.
router.post('/join', protect, async (req, res, next) => {
  // Resolve the group first so guardMemberAdd can check member limits
  const { inviteCode } = req.body;

  if (!inviteCode || !inviteCode.trim()) {
    return res.status(400).json({ message: 'Invite code is required' });
  }

  try {
    const group = await Group.findOne({
      inviteCode: inviteCode.trim().toUpperCase(),
      isActive: true,
    });

    if (!group) {
      return res.status(404).json({ message: 'Invalid invite code — group not found' });
    }

    const alreadyMember = isGroupMember(group, req.user._id);
    if (alreadyMember) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }

    req.resolvedGroup = group;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}, guardMemberAdd, async (req, res) => {
  try {
    const group = req.resolvedGroup;
    group.members.push({ user: req.user._id, role: 'member' });
    await group.save();
    await group.populate('members.user', 'name email role');
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/groups/:id ──────────────────────────────────────────────────────
// Get a single group by ID (must be a member).
router.get('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email role')
      .populate('createdBy', 'name email');

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/groups/:id/members ─────────────────────────────────────────────
// List group members with their payment status for a given month/year.
router.get('/:id/members', protect, async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year  = Number(req.query.year)  || now.getFullYear();

  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email role avatar');

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const memberUserIds = group.members.map((m) => m.user._id);
    const contributions = await Contribution.find({
      group: group._id,
      month,
      year,
      user: { $in: memberUserIds },
    });

    const contribMap = {};
    contributions.forEach((c) => { contribMap[c.user.toString()] = c; });

    const result = group.members.map((m) => {
      const uid = m.user._id.toString();
      return {
        _id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar,
        groupRole: m.role,
        joinedAt: m.joinedAt,
        paid: !!contribMap[uid],
        contribution: contribMap[uid] || null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/groups/:id/members/:userId/role ───────────────────────────────
// Promote or demote a member within the group (group admin only).
router.patch('/:id/members/:userId/role', protect, async (req, res) => {
  const { role } = req.body;

  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ message: 'Role must be "admin" or "member"' });
  }

  try {
    const group = await Group.findById(req.params.id);

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group admins can change member roles' });
    }

    // Prevent the creator from being demoted
    if (
      group.createdBy.toString() === req.params.userId &&
      role === 'member'
    ) {
      return res.status(400).json({ message: 'Cannot demote the group creator' });
    }

    const memberEntry = group.members.find(
      (m) => m.user.toString() === req.params.userId
    );

    if (!memberEntry) {
      return res.status(404).json({ message: 'User is not a member of this group' });
    }

    memberEntry.role = role;
    await group.save();
    await group.populate('members.user', 'name email role');

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/groups/:id ────────────────────────────────────────────────────
// Edit group details (group admin only).
router.patch('/:id', protect, async (req, res) => {
  const { name, description, contributionAmount } = req.body;

  try {
    const group = await Group.findById(req.params.id);

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group admins can edit group details' });
    }

    if (name !== undefined) {
      const trimmed = String(name).trim().slice(0, 100);
      if (!trimmed) return res.status(400).json({ message: 'Group name cannot be empty' });
      group.name = trimmed;
    }

    if (description !== undefined) {
      group.description = String(description).replace(/<[^>]*>/g, '').trim().slice(0, 500);
    }

    if (contributionAmount !== undefined) {
      const amount = Number(contributionAmount);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({ message: 'contributionAmount must be a non-negative number' });
      }
      group.contributionAmount = amount;
    }

    await group.save();
    await group.populate('members.user', 'name email role');
    await group.populate('createdBy', 'name email');

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/groups/:id ───────────────────────────────────────────────────
// Soft-delete (archive) a group. Only the group creator can do this.
router.delete('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group creator can archive this circle' });
    }

    group.isActive = false;
    await group.save();

    res.json({ message: 'Circle archived successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/groups/:id/members/:userId ───────────────────────────────────
// Remove a member from the group (group admin only, or user removing themselves).
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isSelf = req.params.userId === req.user._id.toString();
    if (!isSelf && !isGroupAdmin(group, req.user._id)) {
      return res.status(403).json({ message: 'Only group admins can remove members' });
    }

    if (group.createdBy.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove the group creator' });
    }

    group.members = group.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await group.save();

    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
