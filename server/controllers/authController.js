const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { cloudinary } = require('../utils/cloudinary');
const { sendPasswordResetEmail, sendOtpEmail } = require('../utils/mailer');
const { send, fail } = require('../utils/response');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const userPayload = (u) => ({
  _id:           u._id,
  name:          u.name,
  email:         u.email,
  role:          u.role,
  emailVerified: u.emailVerified,
  phone:         u.phone || '',
  avatar:        u.avatar || '',
  subscription:  { plan: u.subscription?.plan || 'free', status: u.subscription?.status || 'active' },
  token:         generateToken(u._id),
});

async function register(req, res) {
  const { name, email, password, referralCode } = req.body;
  try {
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return fail(res, 'Email already registered', 400);

    const count = await User.countDocuments();
    const role  = count === 0 ? 'admin' : 'member';

    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    let referredById = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() }).select('_id');
      if (referrer) referredById = referrer._id;
    }

    const user = await User.create({
      name: name.trim(), email, password, role,
      emailOtp:        hashedOtp,
      emailOtpExpires: new Date(Date.now() + 10 * 60 * 1000),
      ...(referredById && { referredBy: referredById }),
    });

    sendOtpEmail(user, otp).catch(err => console.error('[register] OTP email error:', err.message));

    Notification.create({
      user: user._id, type: 'system', title: 'Welcome to ROTARA!',
      body: 'Start by joining or creating a savings circle.', link: '/groups',
    }).catch(() => {});

    send(res, userPayload(user), 201);
  } catch (err) {
    console.error('[auth]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user && user.authProvider === 'google' && !user.password) {
      return fail(res, 'This account uses Google Sign-In. Please use the "Continue with Google" button.', 401);
    }

    if (!user || !(await user.matchPassword(password))) {
      return fail(res, 'Invalid email or password', 401);
    }

    send(res, userPayload(user));
  } catch (err) {
    console.error('[auth]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function googleAuth(req, res) {
  const { accessToken } = req.body;
  try {
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!googleRes.ok) return fail(res, 'Invalid Google token. Please try again.', 401);

    const { email, name, sub: googleId, picture } = await googleRes.json();
    if (!email) return fail(res, 'Could not retrieve email from Google account', 400);

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      } else {
        const count = await User.countDocuments();
        user = await User.create({
          name, email: email.toLowerCase(), googleId, authProvider: 'google',
          emailVerified: true, avatar: picture || '', role: count === 0 ? 'admin' : 'member',
        });
        Notification.create({
          user: user._id, type: 'system', title: 'Welcome to ROTARA!',
          body: 'Start by joining or creating a savings circle.', link: '/groups',
        }).catch(() => {});
      }
    }

    send(res, userPayload(user));
  } catch (err) {
    console.error('[google auth]', err.message);
    fail(res, 'Google authentication failed. Please try again.', 401);
  }
}

function getMe(req, res) {
  const u = req.user;
  send(res, {
    _id: u._id, name: u.name, email: u.email, role: u.role,
    avatar: u.avatar, phone: u.phone, emailVerified: u.emailVerified,
    authProvider: u.authProvider,
    subscription: {
      plan:             u.subscription?.plan             || 'free',
      status:           u.subscription?.status           || 'active',
      currentPeriodEnd: u.subscription?.currentPeriodEnd || null,
      trialEndsAt:      u.subscription?.trialEndsAt      || null,
      billingCycle:     u.subscription?.billingCycle     || 'monthly',
    },
  });
}

async function updateProfile(req, res) {
  const { name, email, phone } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 'User not found', 404);

    if (name !== undefined)  user.name  = String(name).trim();
    if (phone !== undefined) {
      const digits = String(phone).replace(/\D/g, '');
      if (digits.length > 15) {
        return fail(res, 'Phone number must be 15 digits or fewer', 400);
      }
      user.phone = digits;
    }

    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      if (trimmedEmail !== user.email) {
        const exists = await User.findOne({ email: trimmedEmail, _id: { $ne: user._id } });
        if (exists) return fail(res, 'Email already in use', 400);
        user.email = trimmedEmail;
      }
    }

    await user.save();
    send(res, {
      _id: user._id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, avatar: user.avatar,
      subscription: { plan: user.subscription?.plan || 'free', status: user.subscription?.status || 'active' },
    });
  } catch (err) {
    console.error('[auth]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return fail(res, 'User not found', 404);

    if (!(await user.matchPassword(currentPassword))) {
      return fail(res, 'Current password is incorrect', 401);
    }

    user.password = newPassword;
    await user.save();
    send(res, { message: 'Password updated successfully' });
  } catch (err) {
    console.error('[auth]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  const successResponse = { message: 'If that email exists, a reset link has been sent.' };
  try {
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return send(res, successResponse);

    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken   = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    sendPasswordResetEmail(user, rawToken).catch(err =>
      console.error('[forgot-password] email error:', err.message)
    );

    send(res, successResponse);
  } catch (err) {
    console.error('[auth]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function resetPassword(req, res) {
  const { newPassword } = req.body;
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) return fail(res, 'Reset link is invalid or has expired.', 400);

    user.password             = newPassword;
    user.resetPasswordToken   = null;
    user.resetPasswordExpires = null;
    await user.save();

    send(res, { message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('[auth]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function sendVerification(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 'User not found', 404);
    if (user.emailVerified) return fail(res, 'Email is already verified', 400);

    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    user.emailOtp        = hashedOtp;
    user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    sendOtpEmail(user, otp).catch(err =>
      console.error('[send-verification] OTP email error:', err.message)
    );

    send(res, { message: 'A 6-digit code has been sent to your email.' });
  } catch (err) {
    console.error('[auth]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function verifyEmail(req, res) {
  const { otp } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 'User not found', 404);
    if (user.emailVerified) return fail(res, 'Email is already verified.', 400);

    if (!user.emailOtp || !user.emailOtpExpires) {
      return fail(res, 'No verification code found. Request a new one.', 400);
    }
    if (new Date() > user.emailOtpExpires) {
      return fail(res, 'Code has expired. Request a new one.', 400);
    }

    const hashedInput = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
    if (hashedInput !== user.emailOtp) {
      return fail(res, 'Incorrect code. Please try again.', 400);
    }

    user.emailVerified   = true;
    user.emailOtp        = null;
    user.emailOtpExpires = null;
    await user.save();

    send(res, { message: 'Email verified successfully.' });
  } catch (err) {
    console.error('[auth]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

async function uploadAvatar(req, res) {
  try {
    if (!req.file) return fail(res, 'No image uploaded', 400);

    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 'User not found', 404);

    if (user.avatar) {
      const parts    = user.avatar.split('/');
      const publicId = parts.slice(-2).join('/').replace(/\.[^.]+$/, '');
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    user.avatar = req.file.path;
    await user.save();
    send(res, { avatar: user.avatar });
  } catch (err) {
    console.error('[auth avatar]', err.message);
    fail(res, 'Something went wrong. Please try again.');
  }
}

module.exports = {
  register, login, googleAuth, getMe, updateProfile, changePassword,
  forgotPassword, resetPassword, sendVerification, verifyEmail, uploadAvatar,
};
