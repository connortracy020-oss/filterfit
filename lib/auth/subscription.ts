import { MembershipRole, SubscriptionPlan } from "@prisma/client";

const activeStatuses = new Set(["active", "trialing"]);

export function hasBillingAccess(status: string | null | undefined) {
  if (!status) {
    return false;
  }
  return activeStatuses.has(status.toLowerCase());
}

export function seatLimitForPlan(plan: SubscriptionPlan | null | undefined) {
  switch (plan) {
    case SubscriptionPlan.STARTER:
      return 3;
    case SubscriptionPlan.PRO:
      return 15;
    case SubscriptionPlan.BUSINESS:
      return Number.POSITIVE_INFINITY;
    default:
      return 0;
  }
}

export function canManageBilling(role: MembershipRole) {
  return role === MembershipRole.ADMIN;
}

export function canManageTemplates(role: MembershipRole) {
  return role === MembershipRole.ADMIN || role === MembershipRole.STAFF;
}

export function canEditCase(role: MembershipRole) {
  return role === MembershipRole.ADMIN || role === MembershipRole.STAFF;
}
