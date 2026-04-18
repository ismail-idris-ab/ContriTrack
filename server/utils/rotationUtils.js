/**
 * Returns members sorted by joinedAt ascending (join-order rotation).
 * Members with missing joinedAt are sorted to the end.
 */
function buildJoinOrderRotation(members) {
  return [...members].sort((a, b) => {
    const ta = a.joinedAt ? new Date(a.joinedAt).getTime() : Infinity;
    const tb = b.joinedAt ? new Date(b.joinedAt).getTime() : Infinity;
    return ta - tb;
  });
}

/**
 * Returns members in a randomly shuffled order (Fisher-Yates).
 */
function buildRandomRotation(members) {
  const arr = [...members];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Maps an ordered member array to payout slot objects.
 * startMonth: 1-12, the first month to assign.
 * Returns [{ userId, month, year, position }]
 */
function buildRotationSlots(orderedMembers, startMonth, startYear) {
  return orderedMembers.map((m, i) => {
    const totalMonths = startMonth - 1 + i;
    return {
      userId:   m.user._id || m.user,
      month:    (totalMonths % 12) + 1,
      year:     startYear + Math.floor(totalMonths / 12),
      position: i + 1,
    };
  });
}

module.exports = { buildJoinOrderRotation, buildRandomRotation, buildRotationSlots };
