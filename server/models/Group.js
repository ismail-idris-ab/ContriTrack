const mongoose = require('mongoose');
const crypto = require('crypto');

const memberSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role:     { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: true, trim: true, maxlength: 100,
    },
    description: {
      type: String, default: '', maxlength: 500,
    },
    contributionAmount: {
      type: Number, default: 0, min: 0,
    },
    currency: {
      type: String, default: 'NGN',
    },
    inviteCode: {
      type: String, unique: true,
    },
    members: [memberSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,
    },
    isActive: {
      type: Boolean, default: true,
    },
  },
  { timestamps: true }
);

// Auto-generate a unique 8-char invite code before first save
groupSchema.pre('save', async function (next) {
  if (this.inviteCode) return next();
  let code;
  let exists = true;
  while (exists) {
    code = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F9C1B2"
    exists = await mongoose.model('Group').findOne({ inviteCode: code });
  }
  this.inviteCode = code;
  next();
});

// Index for fast invite-code lookups
groupSchema.index({ inviteCode: 1 });
groupSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Group', groupSchema);
