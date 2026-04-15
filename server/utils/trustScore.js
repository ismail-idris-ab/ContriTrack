/**
 * Trust Score Calculator
 *
 * Computes a 0–100 score for a member within a group based on:
 *   - Verified contributions (positive — each counts)
 *   - Consecutive months paid in a row (streak bonus)
 *   - Pending / rejected contributions (minor deductions)
 *   - Unpaid months (negative)
 *   - Active penalties  (negative)
 *
 * Returned object:
 *   { score, grade, verifiedCount, consecutiveStreak, penaltyCount, totalMonths }
 */

const Contribution = require('../models/Contribution');
const Penalty      = require('../models/Penalty');

const GRADES = [
  { min: 90, grade: 'A+', label: 'Excellent',   color: '#4ade80' },
  { min: 80, grade: 'A',  label: 'Very Good',   color: '#86efac' },
  { min: 70, grade: 'B',  label: 'Good',        color: '#a3e635' },
  { min: 60, grade: 'C',  label: 'Fair',        color: '#facc15' },
  { min: 50, grade: 'D',  label: 'Below Average', color: '#fb923c' },
  { min:  0, grade: 'F',  label: 'Poor',        color: '#f87171' },
];

function getGrade(score) {
  return GRADES.find(g => score >= g.min) || GRADES[GRADES.length - 1];
}

/**
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} groupId
 * @param {number} [lookbackMonths=12]  How many months of history to consider
 */
async function calculateTrustScore(userId, groupId, lookbackMonths = 12) {
  const now    = new Date();
  const months = [];

  // Build array of the last N month/year pairs (most recent first)
  for (let i = 0; i < lookbackMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }

  // Fetch contributions & penalties in parallel
  const [contributions, penalties] = await Promise.all([
    Contribution.find({ user: userId, group: groupId }).select('month year status'),
    Penalty.find({ user: userId, group: groupId, status: 'pending' }).select('amount'),
  ]);

  // Build a map: "YYYY-MM" → status
  const contribByKey = {};
  contributions.forEach(c => {
    contribByKey[`${c.year}-${c.month}`] = c.status;
  });

  // Score computation
  const totalMonths = months.length;
  let verifiedCount  = 0;
  let pendingCount   = 0;
  let rejectedCount  = 0;
  let unpaidCount    = 0;
  let streak         = 0;
  let streakBroken   = false;

  for (const { month, year } of months) {
    const key    = `${year}-${month}`;
    const status = contribByKey[key];

    if (status === 'verified') {
      verifiedCount++;
      if (!streakBroken) streak++;
    } else if (status === 'pending') {
      pendingCount++;
      streakBroken = true;
    } else if (status === 'rejected') {
      rejectedCount++;
      streakBroken = true;
    } else {
      // No contribution at all — only penalise past months, not current month
      const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
      if (!isCurrentMonth) {
        unpaidCount++;
        streakBroken = true;
      }
    }
  }

  const penaltyCount = penalties.length;

  // Raw score formula
  // Base: (verifiedCount / totalMonths) * 70 — up to 70 pts for payment rate
  const paymentRate  = totalMonths > 0 ? verifiedCount / totalMonths : 0;
  let raw = paymentRate * 70;

  // Streak bonus: up to 20 pts
  const streakBonus = Math.min(streak / totalMonths, 1) * 20;
  raw += streakBonus;

  // Deductions
  raw -= pendingCount   * 1;   // minor — they did submit
  raw -= rejectedCount  * 3;   // bad — rejected proof
  raw -= unpaidCount    * 2;   // missed month
  raw -= penaltyCount   * 5;   // active penalty

  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const gradeInfo = getGrade(score);

  return {
    score,
    grade:             gradeInfo.grade,
    gradeLabel:        gradeInfo.label,
    gradeColor:        gradeInfo.color,
    verifiedCount,
    pendingCount,
    rejectedCount,
    unpaidCount,
    consecutiveStreak: streak,
    penaltyCount,
    totalMonths,
  };
}

module.exports = { calculateTrustScore, getGrade, GRADES };
