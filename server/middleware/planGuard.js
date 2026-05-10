const Group = require('../models/Group');
const User  = require('../models/User');

// Plan limits
const LIMITS = {
  free:        { groups: 1,        members: 10,       historyMonths: 6        },
  pro:         { groups: 4,        members: Infinity, historyMonths: Infinity },
  coordinator: { groups: Infinity, members: Infinity, historyMonths: Infinity },
};

// Features available per plan
const FEATURES = {
  free:        { reminders: false, exports: false, penaltyTracking: false, trustScoring: false, reports: false },
  pro:         { reminders: true,  exports: true,  penaltyTracking: true,  trustScoring: false, reports: true  },
  coordinator: { reminders: true,  exports: true,  penaltyTracking: true,  trustScoring: true,  reports: true  },
};

function getEffectivePlan(user) {
  const sub = user.subscription;
  if (!sub || sub.plan === 'free') return 'free';
  if (sub.status === 'expired' || sub.status === 'cancelled') return 'free';
  if (sub.status === 'trialing' && sub.trialEndsAt && new Date() > sub.trialEndsAt) return 'free';
  if (sub.currentPeriodEnd && new Date() > new Date(sub.currentPeriodEnd)) return 'free';
  return sub.plan;
}

async function guardGroupCreate(req, res, next) {
  try {
    const plan  = getEffectivePlan(req.user);
    const limit = LIMITS[plan].groups;

    if (limit === Infinity) return next();

    const count = await Group.countDocuments({ createdBy: req.user._id, isActive: true });

    if (count >= limit) {
      const msg = plan === 'free'
        ? 'Free plan allows 1 circle. Upgrade to Pro to create up to 4.'
        : `Your ${plan} plan allows up to ${limit} circles.`;
      return res.status(403).json({ message: msg, code: 'GROUP_LIMIT_REACHED', plan });
    }

    next();
  } catch (err) {
    console.error('[planGuard]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
}

async function guardMemberAdd(req, res, next) {
  try {
    const group = req.resolvedGroup;
    if (!group) return next();

    const owner = await User.findById(group.createdBy).select('subscription');
    if (!owner) return next();

    const plan  = getEffectivePlan(owner);
    const limit = LIMITS[plan].members;

    if (limit !== Infinity && group.members.length >= limit) {
      return res.status(403).json({
        message: `This circle has reached the ${limit}-member limit on the Free plan. The circle admin must upgrade to Pro to add more members.`,
        code: 'MEMBER_LIMIT_REACHED',
        plan,
      });
    }

    next();
  } catch (err) {
    console.error('[planGuard]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
}

function requireFeature(feature) {
  return (req, res, next) => {
    const plan = getEffectivePlan(req.user);
    if (!FEATURES[plan][feature]) {
      return res.status(403).json({
        message: `The "${feature}" feature requires a higher plan. Upgrade to access it.`,
        code: 'FEATURE_NOT_AVAILABLE',
        requiredPlan: feature === 'trustScoring' ? 'coordinator' : 'pro',
        currentPlan: plan,
      });
    }
    next();
  };
}

module.exports = { guardGroupCreate, guardMemberAdd, requireFeature, getEffectivePlan, LIMITS, FEATURES };
