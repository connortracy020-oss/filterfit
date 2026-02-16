import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/options";
import { hasBillingAccess } from "@/lib/auth/subscription";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

interface ApiOrgContextOptions {
  allowInactiveBilling?: boolean;
}

export async function getApiOrgContext(options: ApiOrgContextOptions = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      ...(session.user.orgId ? { orgId: session.user.orgId } : {})
    },
    include: {
      org: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const resolvedMembership =
    membership ??
    (await prisma.membership.findFirst({
      where: { userId: session.user.id },
      include: { org: true },
      orderBy: { createdAt: "asc" }
    }));

  if (!resolvedMembership) {
    return {
      response: NextResponse.json({ error: "No organization found" }, { status: 403 })
    };
  }

  const subscription = await prisma.subscription.findUnique({
    where: {
      orgId: resolvedMembership.orgId
    }
  });

  if (!options.allowInactiveBilling && !env.ENABLE_BILLING_BYPASS && !hasBillingAccess(subscription?.status)) {
    return {
      response: NextResponse.json({ error: "Inactive billing" }, { status: 402 })
    };
  }

  return {
    session,
    membership: resolvedMembership,
    org: resolvedMembership.org,
    subscription
  };
}
