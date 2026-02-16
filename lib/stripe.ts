import { SubscriptionPlan } from "@prisma/client";
import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover"
    })
  : null;

export function requireStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return stripe;
}

export type BillingInterval = "monthly" | "annual";

export function getPriceId(plan: SubscriptionPlan, interval: BillingInterval) {
  if (plan === SubscriptionPlan.STARTER && interval === "monthly") {
    return env.STRIPE_STARTER_MONTHLY_PRICE_ID;
  }
  if (plan === SubscriptionPlan.STARTER && interval === "annual") {
    return env.STRIPE_STARTER_ANNUAL_PRICE_ID;
  }
  if (plan === SubscriptionPlan.PRO && interval === "monthly") {
    return env.STRIPE_PRO_MONTHLY_PRICE_ID;
  }
  if (plan === SubscriptionPlan.PRO && interval === "annual") {
    return env.STRIPE_PRO_ANNUAL_PRICE_ID;
  }
  if (plan === SubscriptionPlan.BUSINESS && interval === "monthly") {
    return env.STRIPE_BUSINESS_MONTHLY_PRICE_ID;
  }
  if (plan === SubscriptionPlan.BUSINESS && interval === "annual") {
    return env.STRIPE_BUSINESS_ANNUAL_PRICE_ID;
  }
  return undefined;
}

export function planFromPriceId(priceId: string | null | undefined): SubscriptionPlan | null {
  if (!priceId) {
    return null;
  }

  const map: Record<string, SubscriptionPlan> = {
    ...(env.STRIPE_STARTER_MONTHLY_PRICE_ID ? { [env.STRIPE_STARTER_MONTHLY_PRICE_ID]: SubscriptionPlan.STARTER } : {}),
    ...(env.STRIPE_STARTER_ANNUAL_PRICE_ID ? { [env.STRIPE_STARTER_ANNUAL_PRICE_ID]: SubscriptionPlan.STARTER } : {}),
    ...(env.STRIPE_PRO_MONTHLY_PRICE_ID ? { [env.STRIPE_PRO_MONTHLY_PRICE_ID]: SubscriptionPlan.PRO } : {}),
    ...(env.STRIPE_PRO_ANNUAL_PRICE_ID ? { [env.STRIPE_PRO_ANNUAL_PRICE_ID]: SubscriptionPlan.PRO } : {}),
    ...(env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ? { [env.STRIPE_BUSINESS_MONTHLY_PRICE_ID]: SubscriptionPlan.BUSINESS } : {}),
    ...(env.STRIPE_BUSINESS_ANNUAL_PRICE_ID ? { [env.STRIPE_BUSINESS_ANNUAL_PRICE_ID]: SubscriptionPlan.BUSINESS } : {})
  };

  return map[priceId] ?? null;
}

export function appBaseUrl() {
  return env.APP_URL ?? env.NEXTAUTH_URL ?? "http://localhost:3000";
}
