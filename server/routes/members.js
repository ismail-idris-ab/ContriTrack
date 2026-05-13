const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Group = require('../models/Group');
const Contribution = require('../models/Contribution');
const { protect, adminOnly } = require('../middleware/auth');

// Inline guard: only system admins may use the global (no-groupId) query
function globalAdminOnly(req, res, next) {
  if (req.query.groupId) return next(); // scoped queries are fine for everyone
  if (req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'groupId is required' });
}

// GET /api/members — all members with payment status for a given month/year
// If ?groupId= is provided, returns only members of that group.
// Without groupId, only system admins can call this endpoint.
router.get('/', protect, globalAdminOnly, async (req, res) => {
  const now = new Date();
  const month   = Number(req.query.month)  || now.getMonth() + 1;
  const year    = Number(req.query.year)   || now.getFullYear();
  const groupId = req.query.groupId || null;

  try {
    let members;

    if (groupId) {
      const group = await Group.findById(groupId)
        .populate('members.user', 'name email phone role avatar');

      if (!group || !group.isActive) {
        return res.status(404).json({ message: 'Group not found' });
      }

      const isMember = group.members.some(
        (m) => m.user._id.toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({ message: 'You are not a member of this group' });
      }

      // Period-aware contribution lookup
      const freq        = group.contributionFrequency || 'monthly';
      const periodStart = req.query.periodStart;
      const periodEnd   = req.query.periodEnd;
      const now         = new Date();
      const month       = Number(req.query.month)  || now.getMonth() + 1;
      const year        = Number(req.query.year)   || now.getFullYear();

      let contribFilter = { group: groupId };
      if (periodStart && periodEnd) {
        const psDate = new Date(periodStart);
        const peDate = new Date(periodEnd);
        if (!isNaN(psDate) && !isNaN(peDate)) {
          contribFilter.periodStart = { $gte: psDate };
          contribFilter.periodEnd   = { $lte: peDate };
        }
      } else if (freq !== 'monthly') {
        const { getCurrentPeriod } = require('../utils/cycleUtils');
        const period = getCurrentPeriod(group, now);
        contribFilter.periodStart = { $gte: period.periodStart };
        contribFilter.periodEnd   = { $lte: period.periodEnd };
      } else {
        contribFilter.month = month;
        contribFilter.year  = year;
      }

      const contributions = await Contribution.find(contribFilter);
      const contribMap = {};
      contributions.forEach((c) => { contribMap[c.user.toString()] = c; });

      members = group.members.map((m) => {
        const uid = m.user._id.toString();
        return {
          _id:          m.user._id,
          name:         m.user.name,
          email:        m.user.email,
          phone:        m.user.phone || '',
          role:         m.user.role,
          groupRole:    m.role,
          paid:         !!contribMap[uid],
          contribution: contribMap[uid] || null,
        };
      });
    } else {
      // Global (no group filter) — original behaviour
      const allUsers    = await User.find().select('-password').lean();
      const contributions = await Contribution.find({ month, year, group: null });
      const contribMap  = {};
      contributions.forEach((c) => { contribMap[c.user.toString()] = c; });

      members = allUsers.map((u) => {
        const uid = u._id.toString();
        return {
          _id:          u._id,
          name:         u.name,
          email:        u.email,
          phone:        u.phone || '',
          role:         u.role,
          paid:         !!contribMap[uid],
          contribution: contribMap[uid] || null,
        };
      });
    }

    res.json(members);
  } catch (err) {
    console.error('[members]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PATCH /api/members/:id/role — promote or demote a user globally (system admin only)
router.patch('/:id/role', protect, adminOnly, async (req, res) => {
  const { role } = req.body;

  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ message: 'Role must be "admin" or "member"' });
  }

  try {
    // Cannot demote yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('[members]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
