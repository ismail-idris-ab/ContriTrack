const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createContributionSchema, updateStatusSchema, resubmitSchema } = require('../validators/contributions');
const ctrl = require('../controllers/contributionsController');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { message: 'Too many uploads. Please wait 15 minutes before trying again.' },
  standardHeaders: true, legacyHeaders: false,
});

router.post('/',              protect, uploadLimiter, ctrl.uploadSingle, validate(createContributionSchema), ctrl.createContribution);
router.get('/',               protect,                                                                         ctrl.getContributions);
router.get('/mine',           protect,                                                                         ctrl.getMyContributions);
router.patch('/:id/status',   protect, validate(updateStatusSchema),                                          ctrl.updateStatus);
router.patch('/:id/resubmit', protect, uploadLimiter, ctrl.uploadSingle, validate(resubmitSchema),           ctrl.resubmit);

module.exports = router;
