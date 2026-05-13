export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export const MONTHS_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

/**
 * Returns a human label for a contribution, handling both old and new data.
 * Old data: has month/year but no periodLabel → "April 2026"
 * New data: has periodLabel → use it directly
 */
export function formatPeriodLabel(contribution) {
  if (contribution?.periodLabel) return contribution.periodLabel;
  if (contribution?.month && contribution?.year) {
    return `${MONTHS[contribution.month - 1]} ${contribution.year}`;
  }
  return '—';
}

const MS_PER_DAY = 86400000;

/**
 * Compute the current period for a group on the client side.
 * Returns { periodStart, periodEnd, periodLabel, periodType }
 * Mirrors server-side cycleUtils.getCurrentPeriod logic.
 *
 * @param {object} group - group object from API
 * @param {Date}   [date] - defaults to now
 */
export function getClientPeriod(group, date) {
  const freq = group?.contributionFrequency || 'monthly';
  const d    = date ? new Date(date) : new Date();

  const utcYear  = d.getUTCFullYear();
  const utcMonth = d.getUTCMonth();
  const utcDay   = d.getUTCDate();

  let periodStart, periodEnd;

  if (freq === 'weekly' || freq === 'biweekly') {
    const anchor   = new Date(group.startDate);
    const anchorMs = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const nowMs    = Date.UTC(utcYear, utcMonth, utcDay);
    const spanDays = freq === 'weekly' ? 7 : 14;
    const n        = Math.max(0, Math.floor((nowMs - anchorMs) / (spanDays * MS_PER_DAY)));
    const startMs  = anchorMs + n * spanDays * MS_PER_DAY;
    const endMs    = startMs + (spanDays - 1) * MS_PER_DAY;
    periodStart    = new Date(startMs);
    periodEnd      = new Date(endMs);

  } else if (freq === 'yearly') {
    periodStart = new Date(Date.UTC(utcYear, 0, 1));
    periodEnd   = new Date(Date.UTC(utcYear, 11, 31));

  } else {
    // monthly
    periodStart = new Date(Date.UTC(utcYear, utcMonth, 1));
    const lastDay = new Date(Date.UTC(utcYear, utcMonth + 1, 0)).getUTCDate();
    periodEnd   = new Date(Date.UTC(utcYear, utcMonth, lastDay));
  }

  const periodLabel = _clientPeriodLabel(group, freq, periodStart, periodEnd);
  return { periodStart, periodEnd, periodLabel, periodType: freq };
}

/**
 * Navigate to previous period for a given group.
 * Returns new { periodStart, periodEnd, periodLabel, periodType }.
 */
export function getPrevPeriod(group, currentPeriodStart) {
  const freq  = group?.contributionFrequency || 'monthly';
  const start = new Date(currentPeriodStart);

  let prevDate;
  if (freq === 'weekly')        prevDate = new Date(start.getTime() - 7  * MS_PER_DAY);
  else if (freq === 'biweekly') prevDate = new Date(start.getTime() - 14 * MS_PER_DAY);
  else if (freq === 'yearly') {
    prevDate = new Date(Date.UTC(start.getUTCFullYear() - 1, 0, 1));
  } else {
    const y = start.getUTCFullYear();
    const m = start.getUTCMonth();
    prevDate = m === 0
      ? new Date(Date.UTC(y - 1, 11, 1))
      : new Date(Date.UTC(y, m - 1, 1));
  }
  return getClientPeriod(group, prevDate);
}

/**
 * Navigate to next period.
 */
export function getNextPeriod(group, currentPeriodEnd) {
  const freq = group?.contributionFrequency || 'monthly';
  const end  = new Date(currentPeriodEnd);

  let nextDate;
  if (freq === 'weekly')        nextDate = new Date(end.getTime() + MS_PER_DAY);
  else if (freq === 'biweekly') nextDate = new Date(end.getTime() + MS_PER_DAY);
  else if (freq === 'yearly') {
    nextDate = new Date(Date.UTC(end.getUTCFullYear() + 1, 0, 1));
  } else {
    const y = end.getUTCFullYear();
    const m = end.getUTCMonth();
    nextDate = m === 11
      ? new Date(Date.UTC(y + 1, 0, 1))
      : new Date(Date.UTC(y, m + 1, 1));
  }
  return getClientPeriod(group, nextDate);
}

function _clientPeriodLabel(group, freq, periodStart, periodEnd) {
  const year = periodStart.getUTCFullYear();
  if (freq === 'weekly') {
    const anchor   = new Date(group.startDate);
    const anchorMs = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
    const startMs  = Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate());
    const weekNum  = Math.floor((startMs - anchorMs) / (7 * MS_PER_DAY)) + 1;
    return `Week ${weekNum}, ${year}`;
  }
  if (freq === 'biweekly') {
    const sm = MONTHS_SHORT[periodStart.getUTCMonth()];
    const em = MONTHS_SHORT[periodEnd.getUTCMonth()];
    const ey = periodEnd.getUTCFullYear();
    if (sm === em && year === ey) return `${sm} ${periodStart.getUTCDate()}–${periodEnd.getUTCDate()}, ${year}`;
    return `${sm} ${periodStart.getUTCDate()} – ${em} ${periodEnd.getUTCDate()}, ${ey}`;
  }
  if (freq === 'yearly') return `Year ${year}`;
  return `${MONTHS[periodStart.getUTCMonth()]} ${year}`;
}
