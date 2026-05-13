/**
 * OLD API — kept for backward compatibility.
 * Returns the UTC Date after which a contribution is considered late.
 */
function getPenaltyTriggerDate(year, month, dueDay, graceDays) {
  return new Date(Date.UTC(year, month - 1, dueDay + 1 + (graceDays || 0)));
}

/**
 * OLD API — kept for backward compatibility.
 */
function isLateSubmission(submittedAt, year, month, dueDay, graceDays) {
  return new Date(submittedAt) > getPenaltyTriggerDate(year, month, dueDay, graceDays);
}

// ─── New period-aware API ──────────────────────────────────────────────────────

const MS_PER_DAY = 86400000;

/**
 * Compute the period object that contains `date` for the given group.
 * Returns { periodStart, periodEnd, periodLabel, dueDate, periodType }.
 * All dates are UTC midnight.
 *
 * @param {object} group  - Mongoose group document (needs contributionFrequency, startDate,
 *                          dueDayOfWeek, dueDayOfMonth, dueMonth, dueDay, graceDays)
 * @param {Date}   [date] - defaults to now
 */
function getCurrentPeriod(group, date) {
  return getPeriodForDate(group, date || new Date());
}

/**
 * Same as getCurrentPeriod but with an explicit date.
 */
function getPeriodForDate(group, date) {
  const freq = group.contributionFrequency || 'monthly';
  const d = new Date(date);
  // Work in UTC
  const utcYear  = d.getUTCFullYear();
  const utcMonth = d.getUTCMonth(); // 0-based
  const utcDay   = d.getUTCDate();

  let periodStart, periodEnd, dueDate;

  if (freq === 'weekly' || freq === 'biweekly') {
    const anchor = new Date(group.startDate);
    // Normalise anchor to UTC midnight
    const anchorMs = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const nowMs    = Date.UTC(utcYear, utcMonth, utcDay);
    const spanDays = freq === 'weekly' ? 7 : 14;
    const n        = Math.floor((nowMs - anchorMs) / (spanDays * MS_PER_DAY));
    const startMs  = anchorMs + n * spanDays * MS_PER_DAY;
    const endMs    = startMs + (spanDays - 1) * MS_PER_DAY;
    periodStart = new Date(startMs);
    periodEnd   = new Date(endMs);

    // dueDate: the dueDayOfWeek within this period + graceDays
    // dueDayOfWeek 0=Sun…6=Sat
    const startDow = periodStart.getUTCDay();
    const targetDow = group.dueDayOfWeek ?? 5; // default Friday
    let dayOffset = targetDow - startDow;
    if (dayOffset < 0) dayOffset += 7;
    // If dayOffset >= spanDays, pin to last day of period
    if (dayOffset >= spanDays) dayOffset = spanDays - 1;
    const dueDateMs = startMs + dayOffset * MS_PER_DAY;
    const graceDays = group.graceDays ?? 3;
    dueDate = new Date(dueDateMs + (graceDays + 1) * MS_PER_DAY);

  } else if (freq === 'yearly') {
    periodStart = new Date(Date.UTC(utcYear, 0, 1));
    periodEnd   = new Date(Date.UTC(utcYear, 11, 31));
    const dm    = group.dueMonth     ?? 12;
    const dd    = group.dueDayOfMonth ?? 25;
    const graceDays = group.graceDays ?? 3;
    dueDate = new Date(Date.UTC(utcYear, dm - 1, dd + 1 + graceDays));

  } else {
    // monthly (default)
    periodStart = new Date(Date.UTC(utcYear, utcMonth, 1));
    const lastDay = new Date(Date.UTC(utcYear, utcMonth + 1, 0)).getUTCDate();
    periodEnd   = new Date(Date.UTC(utcYear, utcMonth, lastDay));
    const dd    = group.dueDayOfMonth ?? group.dueDay ?? 25;
    const graceDays = group.graceDays ?? 3;
    dueDate = new Date(Date.UTC(utcYear, utcMonth, dd + 1 + graceDays));
  }

  const periodLabel = generatePeriodLabel(group, { periodStart, periodEnd, periodType: freq });
  return { periodStart, periodEnd, periodLabel, dueDate, periodType: freq };
}

/**
 * Returns whether submittedAt is past the grace window for this period.
 * New overload: accepts (submittedAt, group, period).
 */
function isLateSubmissionForPeriod(submittedAt, group, period) {
  const { dueDate } = period;
  return new Date(submittedAt) > dueDate;
}

/**
 * Returns a human-readable label for a period.
 * weekly:   "Week 3, 2026"
 * biweekly: "Jan 1–14, 2026"
 * monthly:  "April 2026"
 * yearly:   "Year 2026"
 */
function generatePeriodLabel(group, period) {
  const freq  = period.periodType || group.contributionFrequency || 'monthly';
  const start = new Date(period.periodStart);
  const end   = new Date(period.periodEnd);
  const year  = start.getUTCFullYear();

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (freq === 'weekly') {
    // Week number based on group startDate
    const anchor  = new Date(group.startDate);
    const anchorMs = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const startMs  = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const weekNum  = Math.floor((startMs - anchorMs) / (7 * MS_PER_DAY)) + 1;
    return `Week ${weekNum}, ${year}`;
  }

  if (freq === 'biweekly') {
    const sm = MONTHS_SHORT[start.getUTCMonth()];
    const em = MONTHS_SHORT[end.getUTCMonth()];
    const ey = end.getUTCFullYear();
    if (sm === em && year === ey) {
      return `${sm} ${start.getUTCDate()}–${end.getUTCDate()}, ${year}`;
    }
    return `${sm} ${start.getUTCDate()} – ${em} ${end.getUTCDate()}, ${ey}`;
  }

  if (freq === 'yearly') {
    return `Year ${year}`;
  }

  // monthly
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${MONTHS[start.getUTCMonth()]} ${year}`;
}

module.exports = {
  // OLD API — do not remove
  getPenaltyTriggerDate,
  isLateSubmission,
  // NEW API
  getCurrentPeriod,
  getPeriodForDate,
  isLateSubmissionForPeriod,
  generatePeriodLabel,
};
