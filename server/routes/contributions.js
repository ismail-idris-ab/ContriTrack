const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { storage: cloudinaryStorage } = require('../utils/cloudinary');
const Contribution = require('../models/Contribution');
const Pledge = require('../models/Pledge');
const Group  = require('../models/Group');
const User   = require('../models/User');
const rateLimit = require('express-rate-limit');
const { protect, adminOnly } = require('../middleware/auth');
const { sendStatusNotification } = require('../utils/mailer');
const { isLateSubmission } = require('../utils/cycleUtils');
const { logAudit } = require('../utils/audit');

// Max 10 uploads per user per 15 minutes
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { message: 'Too many uploads. Please wait 15 minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Multer config — store uploads in Cloudinary
const fileFilter = (req, file, cb) => {
  const allowedExts = /\.(jpeg|jpg|png|gif|webp|pdf)$/i;
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  const extOk = allowedExts.test(path.extname(file.originalname));
  const mimeOk = allowedMimes.includes(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Only image files and PDFs are allowed'));
};

const upload = multer({ storage: cloudinaryStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/contributions — upload proof of payment
router.post('/', protect, uploadLimiter, upload.single('proof'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Proof image is required' });

  const { amount, month, year, note, groupId } = req.body;

  if (!amount || !month || !year) {
    return res.status(400).json({ message: 'Amount, month, and year are required' });
  }

  const parsedAmount = Number(amount);
  const parsedMonth = Number(month);
  const parsedYear = Number(year);

  if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100_000_000) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }
  if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    return res.status(400).json({ message: 'Month must be between 1 and 12' });
  }
  if (!Number.isInteger(parsedYear) || parsedYear < 2020 || parsedYear > 2100) {
    return res.status(400).json({ message: 'Year is out of valid range' });
  }

  // Sanitise note: strip HTML tags, limit length
  const safeNote = note
    ? String(note).replace(/<[^>]*>/g, '').trim().slice(0, 500)
    : '';

  try {
    // Fetch group settings to determine if submission is late
    let dueDay = 25, graceDays = 3;
    if (groupId) {
      const grp = await Group.findById(groupId).select('dueDay graceDays isActive');
      if (!grp || !grp.isActive) {
        return res.status(404).json({ message: 'Group not found' });
      }
      dueDay    = grp.dueDay    ?? 25;
      graceDays = grp.graceDays ?? 3;
    }

    const late = isLateSubmission(new Date(), parsedYear, parsedMonth, dueDay, graceDays);

    const data = {
      user:       req.user._id,
      amount:     parsedAmount,
      month:      parsedMonth,
      year:       parsedYear,
      note:       safeNote,
      proofImage: req.file.path,
      isLate:     late,
    };
    if (groupId) data.group = groupId;

    const contribution = await Contribution.create(data);
    await contribution.populate('user', 'name email');

    // Auto-fulfill any matching pledge for this user/group/month/year (fire-and-forget)
    Pledge.findOneAndUpdate(
      {
        user:   req.user._id,
        group:  groupId || null,
        month:  parsedMonth,
        year:   parsedYear,
        status: 'pending',
      },
      {
        status:       'fulfilled',
        fulfilledAt:  new Date(),
        contribution: contribution._id,
      }
    ).catch(() => {}); // never crash submission on pledge update failure

    res.status(201).json(contribution);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You already submitted a contribution for this month' });
    }
    console.error('[contributions]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// GET /api/contributions — paginated contributions (optionally scoped to a group/month/year)
// Query params: month, year, groupId, page (default 1), limit (default 20, max 100)
router.get('/', protect, async (req, res) => {
  const { month, year, groupId } = req.query;
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const filter = {};
  if (month)   filter.month = Number(month);
  if (year)    filter.year  = Number(year);
  if (groupId) filter.group = groupId;

  try {
    const [docs, total] = await Promise.all([
      Contribution.find(filter)
        .populate('user', 'name email')
        .populate('verifiedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Contribution.countDocuments(filter),
    ]);

    res.json({
      docs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
  } catch (err) {
    console.error('[contributions]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// GET /api/contributions/mine — current user's contributions
router.get('/mine', protect, async (req, res) => {
  try {
    const contributions = await Contribution.find({ user: req.user._id })
      .sort({ year: -1, month: -1 })
      .lean();
    res.json(contributions);
  } catch (err) {
    console.error('[contributions]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PATCH /api/contributions/:id/status — global admin OR group admin can verify/reject
router.patch('/:id/status', protect, async (req, res) => {
  const { status, rejectionNote } = req.body;
  if (!['verified', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const contribution = await Contribution.findById(req.params.id)
      .populate('user', 'name email');
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });

    // Authorization: global admin OR group admin of the contribution's group
    const isGlobalAdmin = req.user.role === 'admin';
    let isGroupAdmin = false;

    if (!isGlobalAdmin && contribution.group) {
      const group = await Group.findById(contribution.group).select('members');
      if (group) {
        const membership = group.members.find(
          m => String(m.user?._id ?? m.user) === String(req.user._id)
        );
        isGroupAdmin = membership?.role === 'admin';
      }
    }

    if (!isGlobalAdmin && !isGroupAdmin) {
      return res.status(403).json({ message: 'Only admins can verify contributions' });
    }

    const update = { status };
    if (status === 'verified' || status === 'rejected') {
      update.verifiedBy = req.user._id;
      update.verifiedAt = new Date();
    } else {
      update.verifiedBy = null;
      update.verifiedAt = null;
    }

    // Store rejection note if provided
    if (status === 'rejected' && rejectionNote) {
      update.rejectionNote = String(rejectionNote).replace(/<[^>]*>/g, '').trim().slice(0, 500);
    }

    const updated = await Contribution.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    )
      .populate('user', 'name email')
      .populate('verifiedBy', 'name');

    // Email notification (fire-and-forget)
    if (status === 'verified' || status === 'rejected') {
      sendStatusNotification(
        { name: updated.user.name, email: updated.user.email },
        {
          month: updated.month,
          year:  updated.year,
          amount: updated.amount,
          status,
          rejectionNote: update.rejectionNote || '',
        }
      );
    }

    if (status === 'verified' || status === 'rejected') {
      logAudit({
        action:       `contribution.${status}`,
        adminId:      req.user._id,
        groupId:      contribution.group || null,
        entityType:   'Contribution',
        entityId:     contribution._id,
        targetUserId: contribution.user?._id || contribution.user,
        meta: {
          oldStatus:     contribution.status,
          rejectionNote: update.rejectionNote || null,
          amount:        contribution.amount,
          month:         contribution.month,
          year:          contribution.year,
        },
      });
    }

    res.json(updated);
  } catch (err) {
    console.error('[contributions]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PATCH /api/contributions/:id/resubmit — member uploads new proof after rejection
router.patch('/:id/resubmit', protect, uploadLimiter, upload.single('proof'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'New proof image is required' });

  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });

    // Only the owning member can resubmit
    if (String(contribution.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only resubmit your own contributions' });
    }

    if (contribution.status !== 'rejected') {
      return res.status(400).json({ message: 'Only rejected contributions can be resubmitted' });
    }

    // Archive current rejection into history
    const historyEntry = {
      proofImage:    contribution.proofImage,
      rejectionNote: contribution.rejectionNote || '',
      rejectedBy:    contribution.verifiedBy,
      rejectedAt:    contribution.verifiedAt,
    };

    const safeNote = req.body.note
      ? String(req.body.note).replace(/<[^>]*>/g, '').trim().slice(0, 500)
      : contribution.note;

    const updated = await Contribution.findByIdAndUpdate(
      req.params.id,
      {
        $push:  { rejectionHistory: historyEntry },
        $set: {
          proofImage:    req.file.path,
          note:          safeNote,
          status:        'pending',
          verifiedBy:    null,
          verifiedAt:    null,
          rejectionNote: '',
        },
      },
      { new: true }
    ).populate('user', 'name email');

    logAudit({
      action:       'contribution.resubmitted',
      adminId:      null,
      groupId:      contribution.group || null,
      entityType:   'Contribution',
      entityId:     contribution._id,
      targetUserId: req.user._id,
      meta: {
        month: contribution.month,
        year:  contribution.year,
        resubmissionCount: updated.rejectionHistory.length,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('[contributions/resubmit]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
