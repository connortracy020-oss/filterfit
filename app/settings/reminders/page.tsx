import Link from "next/link";
import { ReminderChannel, ReminderTriggerType } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canManageUsers } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateReminderPolicyAction } from "@/app/settings/actions";

const channels = Object.values(ReminderChannel) as ReminderChannel[];
const triggerTypes = Object.values(ReminderTriggerType) as ReminderTriggerType[];
export const dynamic = "force-dynamic";

export default async function ReminderSettingsPage() {
  const session = await requireSession();
  const policies = await prisma.reminderPolicy.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: "asc" }
  });

  const canManage = canManageUsers(session.user.role);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Reminder Policies</h2>
            <p className="text-sm text-muted-foreground">Email reminders run every 10 minutes via worker/cron.</p>
          </div>
          <Link className="text-sm text-primary" href="/settings/users">
            Back to users
          </Link>
        </div>

        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Create policy</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateReminderPolicyAction} className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channel">Channel</Label>
                  <select id="channel" name="channel" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {channels.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="triggerType">Trigger</Label>
                  <select id="triggerType" name="triggerType" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {triggerTypes.map((trigger) => (
                      <option key={trigger} value={trigger}>
                        {trigger}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offsetHours">Offset hours</Label>
                  <Input id="offsetHours" name="offsetHours" type="number" min={0} max={336} defaultValue={24} required />
                </div>
                <label className="flex items-center gap-2 text-sm md:col-span-5">
                  <input defaultChecked name="enabled" type="checkbox" />
                  Enabled
                </label>
                <div>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4">
          {policies.map((policy) => (
            <Card key={policy.id}>
              <CardHeader>
                <CardTitle>{policy.name}</CardTitle>
                <CardDescription>
                  {policy.triggerType} via {policy.channel}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateReminderPolicyAction} className="grid gap-3 md:grid-cols-4">
                  <input type="hidden" name="id" value={policy.id} />
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input name="name" defaultValue={policy.name} disabled={!canManage} />
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <select
                      name="channel"
                      defaultValue={policy.channel}
                      disabled={!canManage}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {channels.map((channel) => (
                        <option key={channel} value={channel}>
                          {channel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Trigger</Label>
                    <select
                      name="triggerType"
                      defaultValue={policy.triggerType}
                      disabled={!canManage}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {triggerTypes.map((trigger) => (
                        <option key={trigger} value={trigger}>
                          {trigger}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Offset (hours)</Label>
                    <Input type="number" name="offsetHours" defaultValue={policy.offsetHours} disabled={!canManage} />
                  </div>
                  <label className="flex items-center gap-2 text-sm md:col-span-4">
                    <input name="enabled" type="checkbox" defaultChecked={policy.enabled} disabled={!canManage} />
                    Enabled
                  </label>
                  {canManage ? (
                    <div>
                      <Button size="sm" type="submit">
                        Update
                      </Button>
                    </div>
                  ) : null}
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
