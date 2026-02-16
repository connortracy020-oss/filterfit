import { PrismaAdapter } from "@auth/prisma-adapter";
import type { MembershipRole, SubscriptionPlan } from "@prisma/client";
import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { env } from "@/lib/env";
import { sendMagicLinkEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

async function hydrateOrgContext(userId: string, preferredOrgId?: string | null) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      ...(preferredOrgId ? { orgId: preferredOrgId } : {})
    },
    orderBy: { createdAt: "asc" }
  });

  const resolvedMembership =
    membership ??
    (await prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" }
    }));

  if (!resolvedMembership) {
    return {
      orgId: undefined,
      role: undefined,
      subscriptionStatus: undefined,
      plan: undefined
    };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { orgId: resolvedMembership.orgId },
    select: { status: true, plan: true }
  });

  return {
    orgId: resolvedMembership.orgId,
    role: resolvedMembership.role,
    subscriptionStatus: subscription?.status,
    plan: subscription?.plan
  };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
    error: "/auth/error"
  },
  providers: [
    EmailProvider({
      from: env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendMagicLinkEmail({ email: identifier, url });
      }
    }),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: false
          })
        ]
      : [])
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }
      return true;
    },
    async jwt({ token, trigger, session }) {
      if (!token.sub) {
        return token;
      }

      const preferredOrgId = trigger === "update" ? (session?.orgId as string | undefined) : (token.orgId as string | undefined);
      const context = await hydrateOrgContext(token.sub, preferredOrgId);

      token.orgId = context.orgId;
      token.role = context.role as MembershipRole | undefined;
      token.subscriptionStatus = context.subscriptionStatus;
      token.plan = context.plan as SubscriptionPlan | undefined;
      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      session.user.id = token.sub ?? "";
      session.user.orgId = (token.orgId as string | undefined) ?? null;
      session.user.role = (token.role as MembershipRole | undefined) ?? null;
      session.user.subscriptionStatus = (token.subscriptionStatus as string | undefined) ?? null;
      session.user.plan = (token.plan as SubscriptionPlan | undefined) ?? null;
      return session;
    }
  },
  events: {
    async signIn({ user }) {
      logger.info("User signed in", { userId: user.id, email: user.email });
    }
  }
};
