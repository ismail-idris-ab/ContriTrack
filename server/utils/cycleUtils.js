/**
 * Returns the Date after which a contribution is considered late.
 * dueDay 25, graceDays 3, month 4, year 2026 → Apr 28 2026 at 00:00:00
 */
function getPenaltyTriggerDate(year, month, dueDay, graceDays) {
  const d = new Date(year, month - 1, dueDay);
  d.setDate(d.getDate() + (graceDays || 0));
  return d;
}

/**
 * Returns true if submittedAt is past the grace window.
 */
function isLateSubmission(submittedAt, year, month, dueDay, graceDays) {
  return new Date(submittedAt) > getPenaltyTriggerDate(year, month, dueDay, graceDays);
}

module.exports = { getPenaltyTriggerDate, isLateSubmission };
