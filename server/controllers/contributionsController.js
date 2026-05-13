const path = require('path');
const multer = require('multer');
const { storage: cloudinaryStorage } = require('../utils/cloudinary');
const Contribution = require('../models/Contribution');
const Pledge = require('../models/Pledge');
const Group = require('../models/Group');
const { sendStatusNotification } = require('../utils/mailer');
const { isLateSubmission, getCurrentPeriod, isLateSubmissionForPeriod } = require('../utils/cycleUtils');
const { logAudit } = require('../utils/audit');
const { send, fail } = require('../utils/response');

const fileFilter = (req, file, cb) => {
  const allowedExts  = /\.(jpeg|jpg|png|gif|webp|pdf)$/i;
  const allowedMimes = ['image/jpeg','image/jpg','image/png','image/gif','image/webp','application/pdf'];
  if (allowedExts.test(path.extname(file.originalname)) && allowedMimes.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Only image files and PDFs are allowed'));
};

const upload = multer({ storage: cloudinaryStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

function uploadSingle(req, res, next) {
  upload.single('proof')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File is too large. Maximum size is 5 MB.'
      : err.message || 'File upload failed';
    res.status(400).json({ message });
  });
}

async function createContribution(req, res) {
  if (!req.file) return fail(res, 'Proof image is required', 400);
  const { amount, month, year, note, groupId, cycleNumber, periodStart: psRaw, periodEnd: peRaw } = req.body;

  const parsedAmount = Number(amount);
  const safeNote = note ? String(note).replace(/<[^>]*>/g, '').trim().slice(0, 500) : '';

  try {
    let group = null;
    if (groupId) {
      group = await Group.findById(groupId).select(
        'dueDay graceDays isActive cyclesPerMonth contributionFrequency startDate dueDayOfWeek dueDayOfMonth dueMonth'
      );
      if (!group || !group.isActive) return fail(res, 'Group not found', 404);
    }

    const freq = group?.contributionFrequency || 'monthly';
    const now  = new Date();

    let parsedMonth, parsedYear, parsedCycle, isLate, lateDaysOverdue, periodData;

    if (freq !== 'monthly' && group) {
      const period = getCurrentPeriod(group, now);
      periodData   = period;
      parsedMonth  = period.periodStart.getUTCMonth() + 1;
      parsedYear   = period.periodStart.getUTCFullYear();
      parsedCycle  = 1;
      isLate       = isLateSubmissionForPeriod(now, group, period);
      lateDaysOverdue = isLate
        ? Math.max(0, Math.ceil((now - period.dueDate) / 86400000))
        : 0;

    } else {
      parsedMonth  = Number(month);
      parsedYear   = Number(year);
      parsedCycle  = Number(cycleNumber) || 1;
      const dueDay        = group?.dueDay        ?? 25;
      const graceDays     = group?.graceDays      ?? 3;
      const cyclesPerMonth = group?.cyclesPerMonth ?? 1;

      if (!parsedMonth || !parsedYear) {
        return fail(res, 'month and year are required for monthly groups', 400);
      }
      if (!Number.isInteger(parsedCycle) || parsedCycle < 1 || parsedCycle > cyclesPerMonth) {
        return fail(res, `Cycle number must be between 1 and ${cyclesPerMonth}`, 400);
      }

      isLate = isLateSubmission(now, parsedYear, parsedMonth, dueDay, graceDays);
      lateDaysOverdue = isLate
        ? Math.max(0, Math.ceil((now - new Date(parsedYear, parsedMonth - 1, dueDay + graceDays, 23, 59, 59)) / 86400000))
        : 0;
    }

    const data = {
      user: req.user._id,
      amount: parsedAmount,
      month: parsedMonth,
      year: parsedYear,
      cycleNumber: parsedCycle,
      note: safeNote,
      proofImage: req.file.path,
      isLate,
      lateDaysOverdue,
    };
    if (groupId) data.group = groupId;

    if (periodData) {
      data.periodType  = periodData.periodType;
      data.periodStart = periodData.periodStart;
      data.periodEnd   = periodData.periodEnd;
      data.dueDate     = periodData.dueDate;
      data.periodLabel = periodData.periodLabel;
    }

    const contribution = await Contribution.create(data);
    await contribution.populate('user', 'name email');

    Pledge.findOneAndUpdate(
      { user: req.user._id, group: groupId || null, month: parsedMonth, year: parsedYear, status: 'pending' },
      { status: 'fulfilled', fulfilledAt: new Date(), contribution: contribution._id }
    ).catch(() => {});

    send(res, contribution, 201);
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 'You already submitted a contribution for this cycle', 400);
    }
    console.error('[contributions]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function getContributions(req, res) {
  const { month, year, groupId, periodStart, periodEnd } = req.query;
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = {};

  if (periodStart && periodEnd) {
    const psDate = new Date(periodStart);
    const peDate = new Date(periodEnd);
    if (isNaN(psDate) || isNaN(peDate)) {
      return fail(res, 'Invalid periodStart or periodEnd date', 400);
    }
    filter.periodStart = { $gte: psDate };
    filter.periodEnd   = { $lte: peDate };
  } else {
    if (month) filter.month = Number(month);
    if (year)  filter.year  = Number(year);
  }
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
    send(res, { docs, total, page, totalPages: Math.ceil(total / limit), limit });
  } catch (err) {
    console.error('[contributions]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function getMyContributions(req, res) {
  try {
    const contributions = await Contribution.find({ user: req.user._id })
      .populate('group', 'name')
      .sort({ year: -1, month: -1 })
      .lean();
    send(res, contributions);
  } catch (err) {
    console.error('[contributions]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function updateStatus(req, res) {
  const { status, rejectionNote } = req.body;
  try {
    const contribution = await Contribution.findById(req.params.id).populate('user', 'name email');
    if (!contribution) return fail(res, 'Contribution not found', 404);

    const isGlobalAdmin = req.user.role === 'admin';
    let isGrpAdmin = false;
    if (!isGlobalAdmin && contribution.group) {
      const group = await Group.findById(contribution.group).select('members');
      if (group) {
        const membership = group.members.find(m => String(m.user?._id ?? m.user) === String(req.user._id));
        isGrpAdmin = membership?.role === 'admin';
      }
    }
    if (!isGlobalAdmin && !isGrpAdmin) return fail(res, 'Only admins can verify contributions', 403);

    const update = { status };
    if (status === 'verified' || status === 'rejected') {
      update.verifiedBy = req.user._id;
      update.verifiedAt = new Date();
    } else {
      update.verifiedBy = null;
      update.verifiedAt = null;
    }
    if (status === 'rejected' && rejectionNote) {
      update.rejectionNote = String(rejectionNote).replace(/<[^>]*>/g, '').trim().slice(0, 500);
    }

    const updated = await Contribution.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email')
      .populate('verifiedBy', 'name');

    if (status === 'verified' || status === 'rejected') {
      sendStatusNotification(
        { name: updated.user.name, email: updated.user.email },
        { month: updated.month, year: updated.year, amount: updated.amount, status, rejectionNote: update.rejectionNote || '' }
      );

      logAudit({
        action: `contribution.${status}`, adminId: req.user._id,
        groupId: contribution.group || null, entityType: 'Contribution',
        entityId: contribution._id, targetUserId: contribution.user?._id || contribution.user,
        meta: {
          oldStatus: contribution.status, rejectionNote: update.rejectionNote || null,
          amount: contribution.amount, month: contribution.month, year: contribution.year,
        },
      });
    }

    send(res, updated);
  } catch (err) {
    console.error('[contributions]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function resubmit(req, res) {
  if (!req.file) return fail(res, 'New proof image is required', 400);
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return fail(res, 'Contribution not found', 404);
    if (String(contribution.user) !== String(req.user._id)) {
      return fail(res, 'You can only update your own contributions', 403);
    }
    if (!['pending', 'rejected'].includes(contribution.status)) {
      return fail(res, 'Only pending or rejected contributions can be updated', 400);
    }

    const safeNote   = req.body.note
      ? String(req.body.note).replace(/<[^>]*>/g, '').trim().slice(0, 500)
      : contribution.note;
    const isRejected = contribution.status === 'rejected';

    const updateOp = isRejected
      ? {
          $push: { rejectionHistory: {
            proofImage: contribution.proofImage, rejectionNote: contribution.rejectionNote || '',
            rejectedBy: contribution.verifiedBy, rejectedAt: contribution.verifiedAt,
          }},
          $set: {
            proofImage: req.file.path, note: safeNote,
            status: 'pending', verifiedBy: null, verifiedAt: null, rejectionNote: '',
          },
        }
      : { $set: { proofImage: req.file.path, note: safeNote } };

    const updated = await Contribution.findByIdAndUpdate(req.params.id, updateOp, { new: true })
      .populate('user', 'name email');

    logAudit({
      action: isRejected ? 'contribution.resubmitted' : 'contribution.proof_replaced',
      adminId: null, groupId: contribution.group || null,
      entityType: 'Contribution', entityId: contribution._id, targetUserId: req.user._id,
      meta: {
        month: contribution.month, year: contribution.year,
        ...(isRejected && { resubmissionCount: updated.rejectionHistory.length }),
      },
    });

    send(res, updated);
  } catch (err) {
    console.error('[contributions/resubmit]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

module.exports = { uploadSingle, createContribution, getContributions, getMyContributions, updateStatus, resubmit };
