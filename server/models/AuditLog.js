const mongoose = require('mongoose');
const { Schema } = mongoose;

const auditLogSchema = new Schema({
  action:       { type: String, required: true },
  adminId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  groupId:      { type: Schema.Types.ObjectId, ref: 'Group',  default: null },
  entityType:   { type: String, default: null },
  entityId:     { type: Schema.Types.ObjectId, default: null },
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User',   default: null },
  meta:         { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, versionKey: false });

auditLogSchema.index({ groupId: 1, createdAt: -1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
