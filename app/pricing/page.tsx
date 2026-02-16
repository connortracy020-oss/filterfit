import Link from "next/link";
import { SubscriptionPlan } from "@prisma/client";
import { getServerSession } from "next-auth";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth/options";

const plans = [
  {
    plan: SubscriptionPlan.STARTER,
    name: "Starter",
    monthly: "$49",
    annual: "$39",
    seats: "Up to 3 users"
  },
  {
    plan: SubscriptionPlan.PRO,
    name: "Pro",
    monthly: "$129",
    annual: "$109",
    seats: "Up to 15 users"
  },
  {
    plan: SubscriptionPlan.BUSINESS,
    name: "Business",
    monthly: "$299",
    annual: "$249",
    seats: "Unlimited users"
  }
];

function BillingForm({ plan, interval }: { plan: SubscriptionPlan; interval: "monthly" | "annual" }) {
  return (
    <form action="/api/stripe/checkout" method="post" className="w-full">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="interval" value={interval} />
      <Button type="submit" className="w-full" variant={interval === "annual" ? "default" : "outline"}>
        {interval === "annual" ? "Choose annual" : "Choose monthly"}
      </Button>
    </form>
  );
}

export default async function PricingPage({ searchParams }: { searchParams: { billing?: string } }) {
  const session = await getServerSession(authOptions);
  const billingRequired = searchParams.billing === "required";

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-14">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          VendorCredit Radar
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/faq">FAQ</Link>
          </Button>
          <Button asChild>
            <Link href={session?.user ? "/app/dashboard" : "/signup"}>{session?.user ? "Back to app" : "Start trial"}</Link>
          </Button>
        </div>
      </header>

      <section className="mt-12">
        <h1 className="text-4xl font-bold">Simple pricing with a 3-day free trial</h1>
        <p className="mt-3 text-muted-foreground">Only trialing and active subscriptions can access the application.</p>
        {billingRequired ? (
          <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Your organization subscription is inactive. Choose a plan below or open billing portal from settings.
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.plan} className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{plan.seats}</p>
            <p className="mt-4 text-sm text-muted-foreground">Monthly: {plan.monthly}/mo</p>
            <p className="text-sm text-muted-foreground">Annual: {plan.annual}/mo billed yearly</p>

            {session?.user?.id && session.user.orgId ? (
              <div className="mt-5 space-y-2">
                <BillingForm plan={plan.plan} interval="annual" />
                <BillingForm plan={plan.plan} interval="monthly" />
              </div>
            ) : (
              <Button className="mt-6 w-full" asChild>
                <Link href="/signup">Start 3-day trial</Link>
              </Button>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
