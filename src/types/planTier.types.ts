// Canonical plan tier identifiers — must match the public pricing page
// (src/app/(marketing)/landing/data.tsx PricingTier.id) and workspaces.plan_tier.
export const PLAN_TIERS = ['spark', 'rise', 'surge', 'infinity', 'dynasty'] as const;

export type PlanTier = typeof PLAN_TIERS[number];

export const PAID_PLAN_TIERS: PlanTier[] = ['rise', 'surge', 'infinity', 'dynasty'];

export function isPlanTier(value: unknown): value is PlanTier {
 return typeof value === 'string' && (PLAN_TIERS as readonly string[]).includes(value);
}
