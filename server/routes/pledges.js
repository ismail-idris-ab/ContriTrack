const express = require('express');
const router  = express.Router();
const Pledge  = require('../models/Pledge');
const { protect } = require('../middleware/auth');

// ─── POST /api/pledges ────────────────────────────────────────────────────────
// Create a pledge for a future month.
router.post('/', protect, async (req, res) => {
  const { month, year, amount, note, groupId, remindAt } = req.body;

  const parsedMonth  = Number(month);
  const parsedYear   = Number(year);
  const parsedAmount = Number(amount);

  if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12) {
    return res.status(400).json({ message: 'Month must be between 1 and 12' });
  }
  if (!parsedYear || parsedYear < 2020 || parsedYear > 2100) {
    return res.status(400).json({ message: 'Year is out of valid range' });
  }
  if (!parsedAmount || parsedAmount <= 0 || parsedAmount > 100_000_000) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  const safeNote = note
    ? String(note).replace(/<[^>]*>/g, '').trim().slice(0, 500)
    : '';

  try {
    const data = {
      user:   req.user._id,
      month:  parsedMonth,
      year:   parsedYear,
      amount: parsedAmount,
      note:   safeNote,
    };
    if (groupId)  data.group    = groupId;
    if (remindAt) data.remindAt = new Date(remindAt);

    const pledge = await Pledge.create(data);
    await pledge.populate('user', 'name email');
    res.status(201).json(pledge);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You already have a pledge for this month' });
    }
    console.error('[pledges]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ─── GET /api/pledges/mine ────────────────────────────────────────────────────
// Get the current user's pledges, newest first.
router.get('/mine', protect, async (req, res) => {
  const { groupId } = req.query;
  const filter = { user: req.user._id };
  if (groupId) filter.group = groupId;

  try {
    const pledges = await Pledge.find(filter)
      .populate('contribution', 'status amount')
      .sort({ year: -1, month: -1 });
    res.json(pledges);
  } catch (err) {
    console.error('[pledges]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ─── GET /api/pledges ─────────────────────────────────────────────────────────
// Get all pledges for a group/month/year (admins or group members).
router.get('/', protect, async (req, res) => {
  const { month, year, groupId } = req.query;
  const filter = {};
  if (month)   filter.month = Number(month);
  if (year)    filter.year  = Number(year);
  if (groupId) filter.group = groupId;

  try {
    const pledges = await Pledge.find(filter)
      .populate('user', 'name email')
      .populate('contribution', 'status amount')
      .sort({ createdAt: -1 });
    res.json(pledges);
  } catch (err) {
    console.error('[pledges]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ─── PATCH /api/pledges/:id ───────────────────────────────────────────────────
// Update a pledge (owner only). Allows editing amount/note/remindAt while still pending.
router.patch('/:id', protect, async (req, res) => {
  try {
    const pledge = await Pledge.findById(req.params.id);
    if (!pledge) return res.status(404).json({ message: 'Pledge not found' });

    if (pledge.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your pledge' });
    }
    if (pledge.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending pledges can be edited' });
    }

    const { amount, note, remindAt } = req.body;
    if (amount !== undefined) {
      const n = Number(amount);
      if (n <= 0 || n > 100_000_000) return res.status(400).json({ message: 'Invalid amount' });
      pledge.amount = n;
    }
    if (note !== undefined) {
      pledge.note = String(note).replace(/<[^>]*>/g, '').trim().slice(0, 500);
    }
    if (remindAt !== undefined) {
      pledge.remindAt = remindAt ? new Date(remindAt) : null;
    }

    await pledge.save();
    await pledge.populate('user', 'name email');
    res.json(pledge);
  } catch (err) {
    console.error('[pledges]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ─── DELETE /api/pledges/:id ──────────────────────────────────────────────────
// Cancel a pending pledge (owner only).
router.delete('/:id', protect, async (req, res) => {
  try {
    const pledge = await Pledge.findById(req.params.id);
    if (!pledge) return res.status(404).json({ message: 'Pledge not found' });

    if (pledge.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your pledge' });
    }
    if (pledge.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending pledges can be cancelled' });
    }

    await pledge.deleteOne();
    res.json({ message: 'Pledge cancelled' });
  } catch (err) {
    console.error('[pledges]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
