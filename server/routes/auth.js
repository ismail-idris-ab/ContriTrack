const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendPasswordResetEmail, sendOtpEmail } = require('../utils/mailer');
const Notification = require('../models/Notification');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../utils/cloudinary');

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'contritrack/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image',
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Rate limit: max 10 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters' });
  }

  try {
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    // First registered user becomes admin
    const count = await User.countDocuments();
    const role = count === 0 ? 'admin' : 'member';

    // Generate 6-digit OTP
    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.create({
      name: trimmedName, email, password, role,
      emailOtp:        hashedOtp,
      emailOtpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Fire-and-forget OTP email
    sendOtpEmail(user, otp).catch(err =>
      console.error('[register] OTP email error:', err.message)
    );

    // Welcome notification
    Notification.create({
      user:  user._id,
      type:  'system',
      title: 'Welcome to ContriTrack!',
      body:  'Start by joining or creating a savings circle.',
      link:  '/groups',
    }).catch(() => {});

    res.status(201).json({
      _id:          user._id,
      name:         user.name,
      email:        user.email,
      role:         user.role,
      emailVerified: user.emailVerified,
      subscription: { plan: user.subscription?.plan || 'free', status: user.subscription?.status || 'active' },
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error('[auth]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Google-only accounts cannot use password login
    if (user && user.authProvider === 'google' && !user.password) {
      return res.status(401).json({ message: 'This account uses Google Sign-In. Please use the "Continue with Google" button.' });
    }

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id:          user._id,
      name:         user.name,
      email:        user.email,
      role:         user.role,
      emailVerified: user.emailVerified,
      phone:        user.phone,
      subscription: { plan: user.subscription?.plan || 'free', status: user.subscription?.status || 'active' },
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error('[auth]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/google
router.post('/google', authLimiter, async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ message: 'Google access token is required' });

  try {
    // Verify the access token and fetch user info from Google
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!googleRes.ok) {
      return res.status(401).json({ message: 'Invalid Google token. Please try again.' });
    }
    const payload = await googleRes.json();
    const { email, name, sub: googleId, picture } = payload;

    if (!email) return res.status(400).json({ message: 'Could not retrieve email from Google account' });

    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if a local account with this email already exists — link it
      user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      } else {
        // Brand new user via Google
        const count = await User.countDocuments();
        const role = count === 0 ? 'admin' : 'member';

        user = await User.create({
          name,
          email: email.toLowerCase(),
          googleId,
          authProvider: 'google',
          emailVerified: true,
          avatar: picture || '',
          role,
        });

        Notification.create({
          user:  user._id,
          type:  'system',
          title: 'Welcome to ContriTrack!',
          body:  'Start by joining or creating a savings circle.',
          link:  '/groups',
        }).catch(() => {});
      }
    }

    res.json({
      _id:          user._id,
      name:         user.name,
      email:        user.email,
      role:         user.role,
      emailVerified: user.emailVerified,
      phone:        user.phone || '',
      avatar:       user.avatar || '',
      subscription: { plan: user.subscription?.plan || 'free', status: user.subscription?.status || 'active' },
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error('[google auth]', err.message);
    res.status(401).json({ message: 'Google authentication failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

// PATCH /api/auth/profile — update name, email, phone
router.patch('/profile', protect, async (req, res) => {
  const { name, email, phone } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2) {
        return res.status(400).json({ message: 'Name must be at least 2 characters' });
      }
      user.name = trimmed;
    }

    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ message: 'Invalid email address' });
      }
      if (trimmedEmail !== user.email) {
        const exists = await User.findOne({ email: trimmedEmail, _id: { $ne: user._id } });
        if (exists) return res.status(400).json({ message: 'Email already in use' });
        user.email = trimmedEmail;
      }
    }

    if (phone !== undefined) {
      const digits = String(phone).replace(/\D/g, '');
      if (digits.length > 15) {
        return res.status(400).json({ message: 'Phone number must be 15 digits or fewer' });
      }
      user.phone = digits;
    }

    await user.save();

    res.json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      phone: user.phone,
      role:  user.role,
      avatar: user.avatar,
      subscription: { plan: user.subscription?.plan || 'free', status: user.subscription?.status || 'active' },
    });
  } catch (err) {
    console.error('[auth]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PATCH /api/auth/password — change password
router.patch('/password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await user.matchPassword(currentPassword);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[auth]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/forgot-password — request a reset link
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;

  // Always return 200 so we don't leak whether an account exists
  const successResponse = { message: 'If that email exists, a reset link has been sent.' };

  if (!email) return res.status(200).json(successResponse);

  try {
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(200).json(successResponse);

    // Generate raw token and store its SHA-256 hash
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken   = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Fire-and-forget — never let email failure expose user existence
    sendPasswordResetEmail(user, rawToken).catch((err) =>
      console.error('[forgot-password] email error:', err.message)
    );

    res.status(200).json(successResponse);
  } catch (err) {
    console.error('[auth]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/reset-password/:token — consume reset token and set new password
router.post('/reset-password/:token', async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    user.password              = newPassword;
    user.resetPasswordToken    = null;
    user.resetPasswordExpires  = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('[auth]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/send-verification — generate and (re)send a 6-digit OTP
router.post('/send-verification', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Email is already verified' });

    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    user.emailOtp        = hashedOtp;
    user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    sendOtpEmail(user, otp).catch(err =>
      console.error('[send-verification] OTP email error:', err.message)
    );

    res.json({ message: 'A 6-digit code has been sent to your email.' });
  } catch (err) {
    console.error('[auth]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/verify-email — verify the 6-digit OTP
router.post('/verify-email', protect, async (req, res) => {
  const { otp } = req.body;

  if (!otp || String(otp).trim().length !== 6) {
    return res.status(400).json({ message: 'Please enter the 6-digit code.' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Email is already verified.' });

    if (!user.emailOtp || !user.emailOtpExpires) {
      return res.status(400).json({ message: 'No verification code found. Request a new one.' });
    }

    if (new Date() > user.emailOtpExpires) {
      return res.status(400).json({ message: 'Code has expired. Request a new one.' });
    }

    const hashedInput = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
    if (hashedInput !== user.emailOtp) {
      return res.status(400).json({ message: 'Incorrect code. Please try again.' });
    }

    user.emailVerified   = true;
    user.emailOtp        = null;
    user.emailOtpExpires = null;
    await user.save();

    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error('[auth]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PATCH /api/auth/avatar — upload or replace profile photo
router.patch('/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete previous avatar from Cloudinary
    if (user.avatar) {
      const parts = user.avatar.split('/');
      const publicId = parts.slice(-2).join('/').replace(/\.[^.]+$/, '');
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    user.avatar = req.file.path;
    await user.save();

    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error('[auth avatar]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
