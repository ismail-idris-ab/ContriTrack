const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { cloudinary } = require('../utils/cloudinary');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  registerSchema, loginSchema, googleSchema, profileSchema,
  changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema,
} = require('../validators/auth');
const ctrl = require('../controllers/authController');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { message: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true, legacyHeaders: false,
});

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

router.post('/register',             authLimiter, validate(registerSchema),      ctrl.register);
router.post('/login',                authLimiter, validate(loginSchema),          ctrl.login);
router.post('/google',               authLimiter, validate(googleSchema),         ctrl.googleAuth);
router.post('/logout',                                                             ctrl.logout);
router.get('/me',                    protect,                                      ctrl.getMe);
router.patch('/profile',             protect,     validate(profileSchema),        ctrl.updateProfile);
router.patch('/password',            protect,     validate(changePasswordSchema), ctrl.changePassword);
router.post('/forgot-password',      authLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password/:token',             validate(resetPasswordSchema),  ctrl.resetPassword);
router.post('/send-verification',    protect,                                      ctrl.sendVerification);
router.post('/verify-email',         protect,     validate(verifyEmailSchema),    ctrl.verifyEmail);
router.patch('/avatar',              protect,     avatarUpload.single('avatar'),  ctrl.uploadAvatar);

module.exports = router;
