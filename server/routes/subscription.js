const express  = require('express');
const https     = require('https');
const crypto    = require('crypto');
const router    = express.Router();
const User      = require('../models/User');
const { protect } = require('../middleware/auth');
const { getEffectivePlan } = require('../middleware/planGuard');

// ─── Paystack plan codes (set these after creating plans on Paystack dashboard) ─
// These map to Paystack plan codes you create at https://dashboard.paystack.com/#/plans
const PAYSTACK_PLAN_CODES = {
  pro_monthly:         process.env.PAYSTACK_PLAN_PRO_MONTHLY         || '',
  pro_annual:          process.env.PAYSTACK_PLAN_PRO_ANNUAL          || '',
  coordinator_monthly: process.env.PAYSTACK_PLAN_COORDINATOR_MONTHLY || '',
  coordinator_annual:  process.env.PAYSTACK_PLAN_COORDINATOR_ANNUAL  || '',
};

const PLAN_PRICES = {
  pro_monthly:         3500,
  pro_annual:          35000,
  coordinator_monthly: 10000,
  coordinator_annual:  100000,
};

// ─── Paystack API helper ───────────────────────────────────────────────────────
function paystackRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── GET /api/subscription/status ────────────────────────────────────────────
// Returns current plan info for the logged-in user.
router.get('/status', protect, (req, res) => {
  const user = req.user;
  const plan = getEffectivePlan(user);

  res.json({
    plan,
    status:           user.subscription?.status      || 'active',
    billingCycle:     user.subscription?.billingCycle || 'monthly',
    currentPeriodEnd: user.subscription?.currentPeriodEnd || null,
    trialEndsAt:      user.subscription?.trialEndsAt  || null,
  });
});

// ─── POST /api/subscription/initialize ───────────────────────────────────────
// Kicks off a Paystack payment session for an upgrade.
// Body: { plan: 'pro'|'coordinator', billingCycle: 'monthly'|'annual' }
router.post('/initialize', protect, async (req, res) => {
  const { plan, billingCycle = 'monthly' } = req.body;

  if (!['pro', 'coordinator'].includes(plan)) {
    return res.status(400).json({ message: 'Invalid plan. Choose "pro" or "coordinator".' });
  }
  if (!['monthly', 'annual'].includes(billingCycle)) {
    return res.status(400).json({ message: 'Invalid billing cycle.' });
  }

  const planKey  = `${plan}_${billingCycle}`;
  const planCode = PAYSTACK_PLAN_CODES[planKey];
  const amount   = PLAN_PRICES[planKey] * 100; // Paystack uses kobo

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(503).json({ message: 'Payment gateway not configured yet. Contact support.' });
  }

  try {
    const body = {
      email:        req.user.email,
      amount,
      currency:     'NGN',
      callback_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/subscription`,
      metadata: {
        userId:      req.user._id.toString(),
        plan,
        billingCycle,
        cancel_action: `${process.env.CLIENT_URL || 'http://localhost:5173'}/pricing`,
      },
    };

    // Attach Paystack plan code if available (enables automatic subscription renewal)
    if (planCode) body.plan = planCode;

    const response = await paystackRequest('POST', '/transaction/initialize', body);

    if (!response.status) {
      return res.status(502).json({ message: response.message || 'Payment initialization failed.' });
    }

    res.json({
      authorizationUrl: response.data.authorization_url,
      reference:        response.data.reference,
      accessCode:       response.data.access_code,
    });
  } catch (err) {
    console.error('[subscription]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ─── GET /api/subscription/verify/:reference ─────────────────────────────────
// Called after the user returns from Paystack checkout.
router.get('/verify/:reference', protect, async (req, res) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(503).json({ message: 'Payment gateway not configured.' });
  }

  try {
    const response = await paystackRequest('GET', `/transaction/verify/${req.params.reference}`);

    if (!response.status || response.data.status !== 'success') {
      return res.status(402).json({ message: 'Payment not successful.', status: response.data?.status });
    }

    const { metadata, customer, subscription_code } = response.data;
    const { plan, billingCycle } = metadata;

    // Calculate period end
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const user = await User.findById(req.user._id);
    user.subscription = {
      plan,
      status:                   'active',
      paystackCustomerId:       customer?.customer_code || '',
      paystackSubscriptionCode: subscription_code       || '',
      currentPeriodEnd:         periodEnd,
      trialEndsAt:              null,
      billingCycle,
    };
    await user.save();

    // Award 1 month credit to referrer on first upgrade (fire-and-forget)
    if (user.referredBy && user.referralCredits === 0) {
      User.findById(user.referredBy).then(async (referrer) => {
        if (!referrer) return;
        const now        = new Date();
        const currentEnd = referrer.subscription?.currentPeriodEnd;
        const base       = currentEnd && currentEnd > now ? currentEnd : now;
        const newEnd     = new Date(base);
        newEnd.setDate(newEnd.getDate() + 30);

        await User.findByIdAndUpdate(referrer._id, {
          'subscription.currentPeriodEnd': newEnd,
          $inc: { referralCredits: 1 },
        });

        // Sentinel: mark new user so credit is never awarded twice
        await User.findByIdAndUpdate(user._id, { referralCredits: -1 });

        const Notification = require('../models/Notification');
        Notification.create({
          user:  referrer._id,
          type:  'system',
          title: 'You earned 1 free month!',
          body:  'Someone you referred just upgraded. Your subscription has been extended by 30 days.',
          link:  '/profile',
        }).catch(() => {});
      }).catch((err) => console.error('[referral credit]', err.message));
    }

    res.json({
      message:  `Successfully upgraded to ${plan} plan.`,
      plan,
      billingCycle,
      currentPeriodEnd: periodEnd,
    });
  } catch (err) {
    console.error('[subscription]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ─── POST /api/subscription/webhook ──────────────────────────────────────────
// Paystack sends events here for renewals, cancellations, etc.
// Must be excluded from express.json() body parsing — raw body needed for HMAC.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret    = process.env.PAYSTACK_SECRET_KEY || '';
  const signature = req.headers['x-paystack-signature'];

  if (!signature) return res.status(400).send('No signature');

  const hash = crypto
    .createHmac('sha512', secret)
    .update(req.body)
    .digest('hex');

  if (hash !== signature) {
    return res.status(401).send('Invalid signature');
  }

  let event;
  try { event = JSON.parse(req.body.toString()); }
  catch { return res.status(400).send('Invalid JSON'); }

  try {
    switch (event.event) {
      case 'subscription.create': {
        // Subscription created — already handled via verify, but good to log
        break;
      }

      case 'invoice.payment_failed':
      case 'subscription.not_renew': {
        // Subscription failed to renew — mark as expired
        const email = event.data?.customer?.email;
        if (email) {
          await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { 'subscription.status': 'expired' }
          );
        }
        break;
      }

      case 'subscription.disable': {
        // Subscription cancelled by user or Paystack
        const email = event.data?.customer?.email;
        if (email) {
          await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { 'subscription.status': 'cancelled' }
          );
        }
        break;
      }

      case 'charge.success': {
        // Recurring charge succeeded — extend period
        const email    = event.data?.customer?.email;
        const metadata = event.data?.metadata;
        if (email && metadata?.plan) {
          const billingCycle = metadata.billingCycle || 'monthly';
          const newEnd = new Date();
          if (billingCycle === 'annual') newEnd.setFullYear(newEnd.getFullYear() + 1);
          else newEnd.setMonth(newEnd.getMonth() + 1);

          await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
              'subscription.status':          'active',
              'subscription.plan':            metadata.plan,
              'subscription.currentPeriodEnd': newEnd,
            }
          );
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Don't let webhook processing errors affect the 200 response to Paystack
    console.error('Webhook processing error:', err.message);
  }

  res.sendStatus(200);
});

// ─── POST /api/subscription/cancel ───────────────────────────────────────────
// Cancel the user's subscription (disables recurring billing on Paystack).
router.post('/cancel', protect, async (req, res) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(503).json({ message: 'Payment gateway not configured.' });
  }

  const user = req.user;
  const subCode = user.subscription?.paystackSubscriptionCode;
  const emailToken = user.subscription?.paystackEmailToken;

  if (!subCode) {
    return res.status(400).json({ message: 'No active subscription found.' });
  }

  try {
    const response = await paystackRequest('POST', '/subscription/disable', {
      code:  subCode,
      token: emailToken,
    });

    if (!response.status) {
      return res.status(502).json({ message: response.message || 'Cancellation failed.' });
    }

    await User.findByIdAndUpdate(user._id, {
      'subscription.status': 'cancelled',
    });

    res.json({ message: 'Subscription cancelled. Your plan remains active until the end of the billing period.' });
  } catch (err) {
    console.error('[subscription]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
