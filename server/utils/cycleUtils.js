/**
 * Returns the UTC Date after which a contribution is considered late.
 * The full dueDay is always considered on-time; grace days are extra days after it.
 * Example: dueDay=25, graceDays=3, month=4, year=2026
 *   → trigger is UTC midnight Apr 29 2026 (Apr 25 + 1 + 3 days)
 *   → submissions on Apr 25, 26, 27, 28 are on-time; Apr 29+ are late
 */
function getPenaltyTriggerDate(year, month, dueDay, graceDays) {
  // +1 includes the full due day as on-time; graceDays adds additional buffer
  return new Date(Date.UTC(year, month - 1, dueDay + 1 + (graceDays || 0)));
}

/**
 * Returns true if submittedAt is past the grace window.
 * @param {Date|string} submittedAt - Submission timestamp
 * @param {number} year - Contribution year
 * @param {number} month - Contribution month (1–12)
 * @param {number} dueDay - Day of month contributions are due (1–28)
 * @param {number} graceDays - Extra days after dueDay before penalty applies (0–7)
 * @returns {boolean}
 */
function isLateSubmission(submittedAt, year, month, dueDay, graceDays) {
  return new Date(submittedAt) > getPenaltyTriggerDate(year, month, dueDay, graceDays);
}

module.exports = { getPenaltyTriggerDate, isLateSubmission };
