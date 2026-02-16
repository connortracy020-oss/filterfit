import { redirect } from "next/navigation";
import { SubscriptionPlan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { orgSchema } from "@/lib/validation";

async function createOrgAction(formData: FormData) {
  "use server";

  const session = await requireUser();
  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone")
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(", ");
    redirect(`/onboarding?error=${encodeURIComponent(message)}`);
  }

  const existingMembership = await prisma.membership.findFirst({
    where: { userId: session.user.id }
  });

  if (existingMembership) {
    redirect("/onboarding");
  }

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      memberships: {
        create: {
          userId: session.user.id,
          role: "ADMIN"
        }
      },
      subscription: {
        create: {
          status: "incomplete",
          plan: SubscriptionPlan.STARTER,
          trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        }
      }
    }
  });

  logger.info("Organization created", { orgId: org.id, userId: session.user.id });
  redirect("/onboarding?success=Organization created");
}

export default async function OnboardingPage() {
  const session = await requireUser();

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: {
      org: true
    },
    orderBy: { createdAt: "asc" }
  });

  if (membership?.orgId) {
    const subscription = await prisma.subscription.findUnique({ where: { orgId: membership.orgId } });
    if (subscription && ["active", "trialing"].includes(subscription.status.toLowerCase())) {
      redirect("/app/dashboard");
    }

    return (
      <main className="mx-auto max-w-2xl px-6 py-14">
        <h1 className="text-3xl font-semibold">Finish your trial setup</h1>
        <p className="mt-2 text-muted-foreground">
          Organization: <span className="font-medium text-slate-900">{membership.org.name}</span>
        </p>

        <div className="mt-8 rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">Start subscription checkout</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your 3-day free trial starts immediately once checkout completes.
          </p>

          <form action="/api/stripe/checkout" method="post" className="mt-6 space-y-3">
            <input type="hidden" name="plan" value="STARTER" />
            <input type="hidden" name="interval" value="monthly" />
            <Button type="submit" className="w-full">
              Continue to Stripe Checkout
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      <h1 className="text-3xl font-semibold">Create your organization</h1>
      <p className="mt-2 text-muted-foreground">Set up your store profile, then start subscription checkout.</p>

      <form action={createOrgAction} className="mt-8 space-y-4 rounded-xl border bg-white p-6">
        <div>
          <Label htmlFor="name">Organization name</Label>
          <Input id="name" name="name" required placeholder="Downtown Hardware" />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" required defaultValue="America/New_York" />
        </div>
        <Button type="submit" className="w-full">
          Create organization
        </Button>
      </form>
    </main>
  );
}
