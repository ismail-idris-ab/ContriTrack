const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

function generateCode() {
  return 'ROT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// GET /api/referral/me
// Returns the user's referral code (generates one if missing), link, and stats.
router.get('/me', protect, async (req, res) => {
  try {
    let user = req.user;

    if (!user.referralCode) {
      let code;
      let attempts = 0;
      while (attempts < 5) {
        code = generateCode();
        const taken = await User.exists({ referralCode: code });
        if (!taken) break;
        attempts++;
      }
      user = await User.findByIdAndUpdate(
        user._id,
        { referralCode: code },
        { new: true }
      );
    }

    const baseUrl = process.env.CLIENT_URL || 'https://contri-track.vercel.app';
    const link    = `${baseUrl}/register?ref=${user.referralCode}`;

    const [totalReferred, convertedReferrals] = await Promise.all([
      User.countDocuments({ referredBy: user._id }),
      User.countDocuments({ referredBy: user._id, 'subscription.plan': { $ne: 'free' } }),
    ]);

    res.json({
      code:              user.referralCode,
      link,
      totalReferred,
      convertedReferrals,
      creditsEarned:     user.referralCredits,
    });
  } catch (err) {
    console.error('[referral/me]', err.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
