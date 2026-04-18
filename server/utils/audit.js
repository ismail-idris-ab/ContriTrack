const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit log entry. Never blocks a route response.
 * @param {object} data - { action, adminId, groupId?, entityType?, entityId?, targetUserId?, meta? }
 */
function logAudit(data) {
  AuditLog.create(data).catch(err => console.error('[audit]', err.message));
}

module.exports = { logAudit };
