import { NextResponse } from "next/server";
import { getApiOrgContext } from "@/lib/auth/api";
import { appBaseUrl, requireStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const context = await getApiOrgContext({ allowInactiveBilling: true });
  if ("response" in context) {
    return context.response;
  }

  if (!context.subscription?.stripeCustomerId) {
    const target = new URL("/pricing", request.url);
    target.searchParams.set("error", "No Stripe customer found for your organization");
    return NextResponse.redirect(target);
  }

  let stripe;
  try {
    stripe = requireStripe();
  } catch {
    const target = new URL("/pricing", request.url);
    target.searchParams.set("error", "Billing portal unavailable (Stripe not configured)");
    return NextResponse.redirect(target);
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: context.subscription.stripeCustomerId,
    return_url: `${appBaseUrl()}/app/settings`
  });

  return NextResponse.redirect(portalSession.url);
}
