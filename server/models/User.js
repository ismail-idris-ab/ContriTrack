const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const subscriptionSchema = new mongoose.Schema(
  {
    plan:                    { type: String, enum: ['free', 'pro', 'coordinator'], default: 'free' },
    status:                  { type: String, enum: ['active', 'trialing', 'expired', 'cancelled'], default: 'active' },
    paystackCustomerId:      { type: String, default: '' },
    paystackSubscriptionCode:{ type: String, default: '' },
    paystackEmailToken:      { type: String, default: '' },
    currentPeriodEnd:        { type: Date, default: null },
    trialEndsAt:             { type: Date, default: null },
    billingCycle:            { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true },
    password:     { type: String, required: false },
    role:         { type: String, enum: ['member', 'admin'], default: 'member' },
    avatar:       { type: String, default: '' },
    subscription: { type: subscriptionSchema, default: () => ({}) },
    phone:                   { type: String, default: '' },
    googleId:                { type: String, default: null },
    authProvider:            { type: String, enum: ['local', 'google'], default: 'local' },
    resetPasswordToken:      { type: String, default: null },
    resetPasswordExpires:    { type: Date,   default: null },
    emailVerified:           { type: Boolean, default: false },
    emailOtp:                { type: String, default: null },
    emailOtpExpires:         { type: Date,   default: null },
  },
  { timestamps: true }
);

// Hash password before saving (skip for Google auth users without a password)
userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare plain password with hashed
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
