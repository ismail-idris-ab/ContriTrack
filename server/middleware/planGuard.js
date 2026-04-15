const Group = require('../models/Group');

// Plan limits
const LIMITS = {
  free:        { groups: 1,  members: 10,  historyMonths: 6  },
  pro:         { groups: 1,  members: Infinity, historyMonths: Infinity },
  coordinator: { groups: 10, members: Infinity, historyMonths: Infinity },
};

// Features available per plan
const FEATURES = {
  free:        { reminders: false, exports: false, penaltyTracking: false, trustScoring: false, reports: false },
  pro:         { reminders: true,  exports: false, penaltyTracking: true,  trustScoring: false, reports: true  },
  coordinator: { reminders: true,  exports: true,  penaltyTracking: true,  trustScoring: true,  reports: true  },
};

/**
 * Returns the effective plan for a user.
 * Treats expired/cancelled subscriptions as free.
 */
function getEffectivePlan(user) {
  const sub = user.subscription;
  if (!sub || sub.plan === 'free') return 'free';

  // If subscription has expired, treat as free
  if (sub.status === 'expired' || sub.status === 'cancelled') return 'free';

  // If trial period ended, treat as free
  if (sub.status === 'trialing' && sub.trialEndsAt && new Date() > sub.trialEndsAt) return 'free';

  return sub.plan;
}

/**
 * Middleware: blocks group creation if the user has reached their group limit.
 */
async function guardGroupCreate(req, res, next) {
  try {
    const plan = getEffectivePlan(req.user);
    const limit = LIMITS[plan].groups;

    const count = await Group.countDocuments({
      createdBy: req.user._id,
      isActive: true,
    });

    if (count >= limit) {
      const planLabel = plan === 'free'
        ? 'Free plan allows 1 group. Upgrade to Pro to create more.'
        : `Your ${plan} plan allows up to ${limit} groups.`;
      return res.status(403).json({ message: planLabel, code: 'GROUP_LIMIT_REACHED', plan });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Middleware: blocks member joins if the group has reached the plan member limit.
 * Reads groupId from req.params.id (join route passes the group in the body,
 * but we look it up from the invite-code route — so we attach after lookup).
 * Use guardMemberAdd for the join route instead.
 */
async function guardMemberAdd(req, res, next) {
  try {
    // group is attached by the route handler before calling this, or we look it up
    const group = req.resolvedGroup;
    if (!group) return next(); // safety fallback

    // The creator of the group owns the subscription
    const Group_ = require('../models/Group');
    const User   = require('../models/User');
    const owner  = await User.findById(group.createdBy).select('subscription');

    if (!owner) return next();

    const plan  = getEffectivePlan(owner);
    const limit = LIMITS[plan].members;

    if (group.members.length >= limit) {
      return res.status(403).json({
        message: `This group has reached the ${limit}-member limit on the Free plan. The group admin must upgrade to Pro to add more members.`,
        code: 'MEMBER_LIMIT_REACHED',
        plan,
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Returns a middleware that blocks access to a feature not available on the user's plan.
 * Usage: router.get('/export', protect, requireFeature('exports'), handler)
 */
function requireFeature(feature) {
  return (req, res, next) => {
    const plan = getEffectivePlan(req.user);
    if (!FEATURES[plan][feature]) {
      return res.status(403).json({
        message: `The "${feature}" feature requires a higher plan. Upgrade to access it.`,
        code: 'FEATURE_NOT_AVAILABLE',
        requiredPlan: feature === 'exports' || feature === 'trustScoring' ? 'coordinator' : 'pro',
        currentPlan: plan,
      });
    }
    next();
  };
}

module.exports = { guardGroupCreate, guardMemberAdd, requireFeature, getEffectivePlan, LIMITS, FEATURES };
