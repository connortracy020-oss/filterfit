import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { planFromPriceId, requireStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

async function upsertSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription,
  overrides?: {
    customerId?: string | null;
    orgId?: string | null;
  }
) {
  const customerId = overrides?.customerId ?? (typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : null);

  const metadataOrgId = stripeSubscription.metadata.orgId || overrides?.orgId || null;

  let orgId = metadataOrgId;
  if (!orgId && customerId) {
    const existing = await prisma.subscription.findUnique({
      where: {
        stripeCustomerId: customerId
      },
      select: {
        orgId: true
      }
    });
    orgId = existing?.orgId ?? null;
  }

  if (!orgId) {
    logger.warn("Webhook subscription update skipped: orgId missing", { subscriptionId: stripeSubscription.id });
    return;
  }

  const priceId = stripeSubscription.items.data[0]?.price.id;
  const periodEnd = stripeSubscription.items.data[0]?.current_period_end ?? null;
  const plan = planFromPriceId(priceId) ?? SubscriptionPlan.STARTER;

  await prisma.subscription.upsert({
    where: {
      orgId
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      plan,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      trialEndsAt: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
    },
    create: {
      orgId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      plan,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      trialEndsAt: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
    }
  });
}

async function markInvoiceStatus(customerId: string, status: string) {
  await prisma.subscription.updateMany({
    where: {
      stripeCustomerId: customerId
    },
    data: {
      status
    }
  });
}

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
  }

  let stripe;
  try {
    stripe = requireStripe();
  } catch {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    logger.error("Stripe webhook signature verification failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const alreadyProcessed = await prisma.stripeEvent.findUnique({
    where: {
      id: event.id
    }
  });

  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.subscription) {
          break;
        }
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscriptionFromStripe(subscription, {
          customerId: typeof session.customer === "string" ? session.customer : null,
          orgId: session.metadata?.orgId ?? null
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscriptionFromStripe(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (typeof invoice.customer === "string") {
          await markInvoiceStatus(invoice.customer, "active");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (typeof invoice.customer === "string") {
          await markInvoiceStatus(invoice.customer, "past_due");
        }
        break;
      }

      default:
        break;
    }

    await prisma.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type
      }
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
