import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { getApiOrgContext } from "@/lib/auth/api";
import { appBaseUrl, getPriceId, requireStripe } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

function fallbackCheckoutRedirect(url: URL, message: string) {
  const target = new URL("/pricing", url.origin);
  target.searchParams.set("success", message);
  return NextResponse.redirect(target);
}

export async function POST(request: Request) {
  const context = await getApiOrgContext({ allowInactiveBilling: true });
  if ("response" in context) {
    return context.response;
  }

  const formData = await request.formData();
  const parsed = checkoutSchema.safeParse({
    plan: formData.get("plan") ?? SubscriptionPlan.STARTER,
    interval: formData.get("interval") ?? "monthly"
  });

  if (!parsed.success) {
    const target = new URL("/pricing", request.url);
    target.searchParams.set("error", "Invalid checkout request");
    return NextResponse.redirect(target);
  }

  let stripe;
  try {
    stripe = requireStripe();
  } catch {
    return fallbackCheckoutRedirect(new URL(request.url), "Checkout placeholder (Stripe not configured)");
  }

  const priceId = getPriceId(parsed.data.plan, parsed.data.interval);
  if (!priceId) {
    return fallbackCheckoutRedirect(new URL(request.url), "Checkout placeholder (price IDs missing)");
  }

  let subscription = context.subscription;

  let customerId = subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: context.session.user.email,
      name: context.org.name,
      metadata: {
        orgId: context.org.id
      }
    });
    customerId = customer.id;
  }

  subscription = await prisma.subscription.upsert({
    where: {
      orgId: context.org.id
    },
    update: {
      stripeCustomerId: customerId,
      plan: parsed.data.plan
    },
    create: {
      orgId: context.org.id,
      stripeCustomerId: customerId,
      plan: parsed.data.plan,
      status: "incomplete"
    }
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    allow_promotion_codes: true,
    success_url: `${appBaseUrl()}/app/settings?success=${encodeURIComponent("Checkout completed")}`,
    cancel_url: `${appBaseUrl()}/pricing?error=${encodeURIComponent("Checkout canceled")}`,
    subscription_data: {
      trial_period_days: 3,
      metadata: {
        orgId: context.org.id,
        plan: parsed.data.plan
      }
    },
    metadata: {
      orgId: context.org.id,
      plan: parsed.data.plan,
      interval: parsed.data.interval,
      localSubscriptionId: subscription.id
    }
  });

  if (!session.url) {
    const target = new URL("/pricing", request.url);
    target.searchParams.set("error", "Unable to start checkout session");
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(session.url);
}
