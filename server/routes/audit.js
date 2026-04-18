const express    = require('express');
const router     = express.Router();
const AuditLog   = require('../models/AuditLog');
const Group      = require('../models/Group');
const { protect } = require('../middleware/auth');

// GET /api/audit?groupId=&page=1&limit=20
router.get('/', protect, async (req, res) => {
  const { groupId } = req.query;
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

  try {
    let filter = {};

    if (groupId) {
      // Group-scoped: requester must be a group admin
      const group = await Group.findById(groupId);
      if (!group || !group.isActive)
        return res.status(404).json({ message: 'Group not found' });

      const member = group.members.find(m => {
        const uid = m.user?._id ?? m.user;
        return String(uid) === String(req.user._id);
      });
      if (!member || member.role !== 'admin')
        return res.status(403).json({ message: 'Only group admins can view the audit log' });

      filter.groupId = groupId;
    } else {
      // No groupId: system admin only
      if (req.user.role !== 'admin')
        return res.status(403).json({ message: 'System admin access required' });
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

module.exports = router;
