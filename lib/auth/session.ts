import { MembershipRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { hasBillingAccess } from "@/lib/auth/subscription";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

interface RequireOrgOptions {
  allowInactiveBilling?: boolean;
}

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requireOrgSession(options: RequireOrgOptions = {}) {
  const session = await requireUser();
  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      ...(session.user.orgId ? { orgId: session.user.orgId } : {})
    },
    include: {
      org: true
    },
    orderBy: { createdAt: "asc" }
  });

  const resolvedMembership =
    membership ??
    (await prisma.membership.findFirst({
      where: { userId: session.user.id },
      include: { org: true },
      orderBy: { createdAt: "asc" }
    }));

  if (!resolvedMembership) {
    redirect("/onboarding");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { orgId: resolvedMembership.orgId }
  });

  if (!options.allowInactiveBilling && !env.ENABLE_BILLING_BYPASS && !hasBillingAccess(subscription?.status)) {
    redirect("/pricing?billing=required");
  }

  return {
    session,
    membership: resolvedMembership,
    org: resolvedMembership.org,
    subscription
  };
}

export async function requireAdminOrgSession(options: RequireOrgOptions = {}) {
  const context = await requireOrgSession(options);
  if (context.membership.role !== MembershipRole.ADMIN) {
    throw new Error("Admin access required.");
  }
  return context;
}
