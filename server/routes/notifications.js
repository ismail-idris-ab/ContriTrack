const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notification');
const { protect }  = require('../middleware/auth');

// ── GET /api/notifications ────────────────────────────────────────────────────
// Fetch the current user's notifications (most recent first).
// Query params:
//   limit  — number of items to return (default 30, max 50)
//   before — cursor: only return notifications older than this _id (for pagination)
router.get('/', protect, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 50);
  const { before } = req.query;

  try {
    const filter = { user: req.user._id };
    if (before) filter._id = { $lt: before };

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);

    const hasMore = notifications.length === limit;

    res.json({ notifications, unreadCount, hasMore });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
// Mark a single notification as read.
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    res.json(n);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/notifications/read-all ────────────────────────────────────────
// Mark all of the current user's notifications as read.
router.patch('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/notifications/:id ────────────────────────────────────────────
// Delete a single notification.
router.delete('/:id', protect, async (req, res) => {
  try {
    const n = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
