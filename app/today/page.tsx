import Link from "next/link";
import { endOfDay, startOfDay } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function TodayPage() {
  const session = await requireSession();
  const now = new Date();

  const followupsDue = await prisma.permit.findMany({
    where: {
      job: { orgId: session.user.orgId },
      nextFollowUpAt: { lte: endOfDay(now) },
      status: { in: ["SUBMITTED", "IN_REVIEW"] }
    },
    include: { job: true },
    orderBy: { nextFollowUpAt: "asc" }
  });

  const inspectionsToday = await prisma.inspection.findMany({
    where: {
      job: { orgId: session.user.orgId },
      scheduledFor: {
        gte: startOfDay(now),
        lte: endOfDay(now)
      }
    },
    include: { job: true },
    orderBy: { scheduledFor: "asc" }
  });

  const tasksDueSoon = await prisma.task.findMany({
    where: {
      job: { orgId: session.user.orgId },
      status: "OPEN",
      dueAt: {
        lte: endOfDay(now)
      }
    },
    include: {
      job: true,
      assignedToUser: true
    },
    orderBy: { dueAt: "asc" }
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Today</h2>
          <p className="text-sm text-muted-foreground">Follow-ups due, inspections happening, and open tasks.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Permit follow-ups due</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {followupsDue.length === 0 ? <p className="text-sm text-muted-foreground">Nothing due today.</p> : null}
              {followupsDue.map((permit) => (
                <div key={permit.id} className="rounded-md border p-3">
                  <Link href={`/jobs/${permit.jobId}`} className="font-medium text-primary">
                    {permit.job.customerName}
                  </Link>
                  <p className="text-sm">{permit.jurisdictionName}</p>
                  <p className="text-xs text-muted-foreground">Follow-up at {formatDateTime(permit.nextFollowUpAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspections today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inspectionsToday.length === 0 ? <p className="text-sm text-muted-foreground">No inspections today.</p> : null}
              {inspectionsToday.map((inspection) => (
                <div key={inspection.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/jobs/${inspection.jobId}`} className="font-medium text-primary">
                      {inspection.job.customerName}
                    </Link>
                    <StatusPill status={inspection.status} />
                  </div>
                  <p className="text-sm">{inspection.type.split("_").join(" ")}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(inspection.scheduledFor)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks due</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasksDueSoon.length === 0 ? <p className="text-sm text-muted-foreground">No due tasks today.</p> : null}
              {tasksDueSoon.map((task) => (
                <div key={task.id} className="rounded-md border p-3">
                  <Link href={`/jobs/${task.jobId}`} className="font-medium text-primary">
                    {task.job.customerName}
                  </Link>
                  <p className="text-sm">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Due: {formatDateTime(task.dueAt)} {task.assignedToUser ? `• ${task.assignedToUser.name}` : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
