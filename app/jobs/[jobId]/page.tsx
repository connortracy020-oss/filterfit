import { InspectionOutcome, InspectionStatus, InspectionType, JobStatus, PermitStatus, TaskStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createInspectionAction,
  createPermitAction,
  createTaskAction,
  quickContactPermitAction,
  quickFollowUpPermitAction,
  toggleTaskAction,
  updateInspectionAction,
  updateJobAction,
  updatePermitAction
} from "@/app/jobs/actions";
import { canEditJobDetails } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function dateValue(value?: Date | null) {
  if (!value) {
    return "";
  }
  return value.toISOString().slice(0, 10);
}

function datetimeValue(value?: Date | null) {
  if (!value) {
    return "";
  }
  return value.toISOString().slice(0, 16);
}

const jobStatuses = Object.values(JobStatus) as JobStatus[];
const permitStatuses = Object.values(PermitStatus) as PermitStatus[];
const inspectionTypes = Object.values(InspectionType) as InspectionType[];
const inspectionStatuses = Object.values(InspectionStatus) as InspectionStatus[];
const inspectionOutcomes = Object.values(InspectionOutcome) as InspectionOutcome[];

export default async function JobDetailPage({ params }: { params: { jobId: string } }) {
  const session = await requireSession();

  const job = await prisma.job.findFirst({
    where: {
      id: params.jobId,
      orgId: session.user.orgId
    },
    include: {
      permits: {
        orderBy: {
          createdAt: "desc"
        }
      },
      inspections: {
        orderBy: {
          createdAt: "desc"
        }
      },
      tasks: {
        orderBy: {
          createdAt: "desc"
        },
        include: {
          assignedToUser: true
        }
      },
      activityLogs: {
        orderBy: {
          createdAt: "desc"
        },
        take: 30,
        include: {
          actor: true
        }
      }
    }
  });

  if (!job) {
    notFound();
  }

  const canEdit = canEditJobDetails(session.user.role);
  const users = await prisma.user.findMany({
    where: { orgId: session.user.orgId },
    select: { id: true, name: true }
  });
  const reminderPolicies = await prisma.reminderPolicy.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { name: "asc" }
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{job.customerName}</h2>
            <p className="text-sm text-muted-foreground">
              {job.siteAddress}, {job.city}, {job.state} {job.zip}
            </p>
          </div>
          <StatusPill status={job.status} />
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ["Overview", "#overview"],
            ["Permits", "#permits"],
            ["Inspections", "#inspections"],
            ["Tasks", "#tasks"],
            ["Activity", "#activity"]
          ].map(([label, href]) => (
            <a key={href} href={href} className="rounded-md border bg-white px-3 py-2 hover:bg-slate-100">
              {label}
            </a>
          ))}
        </div>

        <Card id="overview">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Job status, dates, and notes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateJobAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="jobId" value={job.id} />
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={job.status}
                  disabled={!canEdit}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {jobStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTargetDate">Target start date</Label>
                <Input id="startTargetDate" name="startTargetDate" type="date" defaultValue={dateValue(job.startTargetDate)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installDate">Install date</Label>
                <Input id="installDate" name="installDate" type="date" defaultValue={dateValue(job.installDate)} disabled={!canEdit} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utility">Utility</Label>
                <Input id="utility" value={job.utility ?? "-"} readOnly disabled />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={job.notes ?? ""} disabled={!canEdit} />
              </div>
              {canEdit ? (
                <div className="md:col-span-2">
                  <Button type="submit">Save overview</Button>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card id="permits">
          <CardHeader>
            <CardTitle>Permits</CardTitle>
            <CardDescription>Track contacts and follow-up dates to avoid delays.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {job.permits.length === 0 ? <p className="text-sm text-muted-foreground">No permits recorded.</p> : null}
            {job.permits.map((permit) => {
              const stale = permit.submittedAt && !permit.lastContactAt && (Date.now() - permit.submittedAt.getTime()) / (1000 * 60 * 60 * 24) > 7;

              return (
                <div key={permit.id} className="rounded-md border p-4">
                  <form action={updatePermitAction} className="grid gap-3 md:grid-cols-3">
                    <input type="hidden" name="permitId" value={permit.id} />
                    <input type="hidden" name="jobId" value={job.id} />
                    <div className="space-y-2 md:col-span-2">
                      <Label>Jurisdiction</Label>
                      <Input name="jurisdictionName" defaultValue={permit.jurisdictionName} disabled={!canEdit} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select name="status" defaultValue={permit.status} disabled={!canEdit} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {permitStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Permit #</Label>
                      <Input name="permitNumber" defaultValue={permit.permitNumber ?? ""} disabled={!canEdit} />
                    </div>
                    <div className="space-y-2">
                      <Label>Submitted</Label>
                      <Input name="submittedAt" type="date" defaultValue={dateValue(permit.submittedAt)} disabled={!canEdit} />
                    </div>
                    <div className="space-y-2">
                      <Label>Next follow-up</Label>
                      <Input name="nextFollowUpAt" type="date" defaultValue={dateValue(permit.nextFollowUpAt)} disabled={!canEdit} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last contact</Label>
                      <Input name="lastContactAt" type="date" defaultValue={dateValue(permit.lastContactAt)} disabled={!canEdit} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Contact email</Label>
                      <Input name="contactEmail" type="email" defaultValue={permit.contactEmail ?? ""} disabled={!canEdit} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact phone</Label>
                      <Input name="contactPhone" defaultValue={permit.contactPhone ?? ""} disabled={!canEdit} />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label>Notes</Label>
                      <Textarea name="notes" defaultValue={permit.notes ?? ""} disabled={!canEdit} />
                    </div>
                    <div className="md:col-span-3 flex flex-wrap items-center gap-2">
                      <StatusPill status={permit.status} />
                      <span className="text-sm text-muted-foreground">Follow-up: {formatDate(permit.nextFollowUpAt)}</span>
                      {stale ? <span className="text-xs text-red-600">Stale permit: no contact for 7+ days after submit.</span> : null}
                    </div>
                    {canEdit ? (
                      <div className="md:col-span-3 flex flex-wrap gap-2">
                        <Button size="sm" type="submit">
                          Save permit
                        </Button>
                      </div>
                    ) : null}
                  </form>
                  {canEdit ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={quickContactPermitAction}>
                        <input type="hidden" name="permitId" value={permit.id} />
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Mark contacted today
                        </Button>
                      </form>
                      <form action={quickFollowUpPermitAction}>
                        <input type="hidden" name="permitId" value={permit.id} />
                        <input type="hidden" name="jobId" value={job.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Set follow-up in 3 business days
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {canEdit ? (
              <div className="rounded-md border border-dashed p-4">
                <h4 className="mb-2 text-sm font-semibold">Add permit</h4>
                <form action={createPermitAction} className="grid gap-3 md:grid-cols-3">
                  <input type="hidden" name="jobId" value={job.id} />
                  <div className="space-y-2 md:col-span-2">
                    <Label>Jurisdiction</Label>
                    <Input name="jurisdictionName" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select name="status" defaultValue={PermitStatus.NOT_STARTED} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {permitStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Permit #</Label>
                    <Input name="permitNumber" />
                  </div>
                  <div className="space-y-2">
                    <Label>Submitted</Label>
                    <Input name="submittedAt" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Next follow-up</Label>
                    <Input name="nextFollowUpAt" type="date" />
                  </div>
                  <div className="md:col-span-3">
                    <Button size="sm" type="submit">
                      Add permit
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card id="inspections">
          <CardHeader>
            <CardTitle>Inspections</CardTitle>
            <CardDescription>Schedule and track outcomes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {job.inspections.length === 0 ? <p className="text-sm text-muted-foreground">No inspections recorded.</p> : null}
            {job.inspections.map((inspection) => (
              <div key={inspection.id} className="rounded-md border p-4">
                <form action={updateInspectionAction} className="grid gap-3 md:grid-cols-3">
                  <input type="hidden" name="inspectionId" value={inspection.id} />
                  <input type="hidden" name="jobId" value={job.id} />
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select name="type" defaultValue={inspection.type} disabled={!canEdit} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {inspectionTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select name="status" defaultValue={inspection.status} disabled={!canEdit} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {inspectionStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Outcome</Label>
                    <select name="outcome" defaultValue={inspection.outcome} disabled={!canEdit} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {inspectionOutcomes.map((outcome) => (
                        <option key={outcome} value={outcome}>
                          {outcome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Scheduled for</Label>
                    <Input name="scheduledFor" type="datetime-local" defaultValue={datetimeValue(inspection.scheduledFor)} disabled={!canEdit} />
                  </div>
                  <div className="space-y-2">
                    <Label>Completed at</Label>
                    <Input name="completedAt" type="datetime-local" defaultValue={datetimeValue(inspection.completedAt)} disabled={!canEdit} />
                  </div>
                  <div className="space-y-2">
                    <Label>Inspector</Label>
                    <Input name="inspectorName" defaultValue={inspection.inspectorName ?? ""} disabled={!canEdit} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Jurisdiction phone</Label>
                    <Input name="jurisdictionPhone" defaultValue={inspection.jurisdictionPhone ?? ""} disabled={!canEdit} />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label>Notes</Label>
                    <Textarea name="notes" defaultValue={inspection.notes ?? ""} disabled={!canEdit} />
                  </div>
                  <div className="md:col-span-3 flex items-center gap-2">
                    <StatusPill status={inspection.status} />
                    <span className="text-sm text-muted-foreground">Scheduled: {formatDateTime(inspection.scheduledFor)}</span>
                  </div>
                  {canEdit ? (
                    <div className="md:col-span-3">
                      <Button type="submit" size="sm">
                        Save inspection
                      </Button>
                    </div>
                  ) : null}
                </form>
              </div>
            ))}

            {canEdit ? (
              <div className="rounded-md border border-dashed p-4">
                <h4 className="mb-2 text-sm font-semibold">Add inspection</h4>
                <form action={createInspectionAction} className="grid gap-3 md:grid-cols-3">
                  <input type="hidden" name="jobId" value={job.id} />
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select name="type" defaultValue={InspectionType.FINAL_ELECTRICAL} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {inspectionTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select name="status" defaultValue={InspectionStatus.NOT_SCHEDULED} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {inspectionStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Outcome</Label>
                    <select name="outcome" defaultValue={InspectionOutcome.NA} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {inspectionOutcomes.map((outcome) => (
                        <option key={outcome} value={outcome}>
                          {outcome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Scheduled for</Label>
                    <Input name="scheduledFor" type="datetime-local" />
                  </div>
                  <div className="md:col-span-3">
                    <Button size="sm" type="submit">
                      Add inspection
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card id="tasks">
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Internal checklist and reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.tasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : null}
            {job.tasks.map((task) => (
              <div key={task.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {formatDateTime(task.dueAt)} {task.assignedToUser ? `• ${task.assignedToUser.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={task.status} />
                    {canEdit ? (
                      <form action={toggleTaskAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="status" value={task.status === TaskStatus.OPEN ? TaskStatus.DONE : TaskStatus.OPEN} />
                        <Button size="sm" variant="outline" type="submit">
                          Mark {task.status === TaskStatus.OPEN ? "Done" : "Open"}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}

            {canEdit ? (
              <div className="rounded-md border border-dashed p-4">
                <h4 className="mb-2 text-sm font-semibold">Add task</h4>
                <form action={createTaskAction} className="grid gap-3 md:grid-cols-3">
                  <input type="hidden" name="jobId" value={job.id} />
                  <div className="space-y-2 md:col-span-2">
                    <Label>Title</Label>
                    <Input name="title" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Due at</Label>
                    <Input name="dueAt" type="datetime-local" />
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned to</Label>
                    <select name="assignedToUserId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reminder policy</Label>
                    <select name="reminderPolicyId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">None</option>
                      {reminderPolicies.map((policy) => (
                        <option key={policy.id} value={policy.id}>
                          {policy.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <Button size="sm" type="submit">
                      Add task
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card id="activity">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Audit trail of workflow changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.activityLogs.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
            {job.activityLogs.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {entry.actor?.name ?? "System"} • {entry.entityType}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
