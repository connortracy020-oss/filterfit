import type { MembershipRole, SubscriptionPlan } from "@prisma/client";
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      orgId: string | null;
      role: MembershipRole | null;
      subscriptionStatus: string | null;
      plan: SubscriptionPlan | null;
    };
    orgId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId?: string;
    role?: MembershipRole;
    subscriptionStatus?: string;
    plan?: SubscriptionPlan;
  }
}
