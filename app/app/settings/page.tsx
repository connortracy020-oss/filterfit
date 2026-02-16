import { MembershipRole } from "@prisma/client";
import { addMemberAction, updateOrganizationAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireOrgSession } from "@/lib/auth/session";
import { seatLimitForPlan } from "@/lib/auth/subscription";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const { org, membership, subscription } = await requireOrgSession({ allowInactiveBilling: true });

  const members = await prisma.membership.findMany({
    where: {
      orgId: org.id
    },
    include: {
      user: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const seatLimit = seatLimitForPlan(subscription?.plan);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Status: {subscription?.status ?? "incomplete"}</p>
          <p>Plan: {subscription?.plan ?? "STARTER"}</p>
          <p>
            Seats: {members.length}/{Number.isFinite(seatLimit) ? seatLimit : "Unlimited"}
          </p>
          <div className="flex flex-wrap gap-2">
            <form action="/api/stripe/portal" method="post">
              <Button type="submit" variant="outline">
                Open Billing Portal
              </Button>
            </form>
            <Button asChild>
              <a href="/pricing">Change Plan</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          {membership.role === MembershipRole.ADMIN ? (
            <form action={updateOrganizationAction} className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={org.name} required />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" name="timezone" defaultValue={org.timezone} required />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Save organization</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Only admins can update organization settings.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {members.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{entry.user.name ?? entry.user.email}</p>
                <p className="text-muted-foreground">
                  {entry.user.email} · {entry.role}
                </p>
              </div>
            ))}
          </div>

          {membership.role === MembershipRole.ADMIN ? (
            <form action={addMemberAction} className="grid gap-3 md:grid-cols-3">
              <Input name="email" type="email" placeholder="new.user@store.com" required />
              <select name="role" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={MembershipRole.STAFF}>
                {Object.values(MembershipRole).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <Button type="submit">Add member</Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
