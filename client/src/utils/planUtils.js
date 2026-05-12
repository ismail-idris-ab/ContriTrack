export const PLAN_LEVEL = { free: 0, pro: 1, coordinator: 2 };

export function getPlanLevel(user) {
  const sub = user?.subscription;
  if (!sub || sub.plan === 'free') return 0;
  if (sub.status === 'expired' || sub.status === 'cancelled') return 0;
  if (sub.status === 'trialing' && sub.trialEndsAt && new Date() > new Date(sub.trialEndsAt)) return 0;
  if (sub.currentPeriodEnd && new Date() > new Date(sub.currentPeriodEnd)) return 0;
  return PLAN_LEVEL[sub.plan] ?? 0;
}

export function canAccess(user, requires) {
  return getPlanLevel(user) >= (PLAN_LEVEL[requires] ?? 0);
}
