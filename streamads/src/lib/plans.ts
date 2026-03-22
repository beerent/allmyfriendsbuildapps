export const PLANS = {
  free: {
    name: 'Free',
    maxProfiles: 1,
    maxCardsPerProfile: 3,
  },
  pro: {
    name: 'Pro',
    price: '$5/mo',
    maxProfiles: Infinity,
    maxCardsPerProfile: Infinity,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanLimits(_plan: string) {
  // Everyone gets pro features for now
  return PLANS.pro;
}
