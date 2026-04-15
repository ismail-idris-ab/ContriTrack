const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'contribution_verified',
        'contribution_rejected',
        'contribution_pending',
        'penalty_issued',
        'penalty_waived',
        'payout_scheduled',
        'payout_paid',
        'member_joined',
        'group_update',
        'reminder',
        'system',
      ],
      required: true,
    },
    title:   { type: String, required: true, maxlength: 200 },
    body:    { type: String, default: '', maxlength: 800 },
    link:    { type: String, default: '' },    // client-side route, e.g. "/reports"
    read:    { type: Boolean, default: false, index: true },
    group:   { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    // Extra data for the client (e.g. month, year, amount)
    meta:    { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound index for fast "get my unread notifications" queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
