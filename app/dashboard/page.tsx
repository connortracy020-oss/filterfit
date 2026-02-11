import Link from "next/link";
import { endOfWeek, startOfDay, startOfWeek } from "date-fns";
import { JobStatus } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { daysInStatus } from "@/lib/jobs/status";
import { queryStuckPermits } from "@/lib/jobs/service";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";

const jobStatuses = Object.values(JobStatus) as JobStatus[];

interface DashboardSearchParams {
  status?: string;
  city?: string;
  from?: string;
  to?: string;
  q?: string;
  sort?: string;
}

export default async function DashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  const session = await requireSession();

  const where = {
    orgId: session.user.orgId,
    ...(searchParams.status ? { status: searchParams.status as JobStatus } : {}),
    ...(searchParams.city ? { city: { contains: searchParams.city, mode: "insensitive" as const } } : {}),
    ...(searchParams.q
      ? {
          OR: [
            { customerName: { contains: searchParams.q, mode: "insensitive" as const } },
            { siteAddress: { contains: searchParams.q, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(searchParams.from || searchParams.to
      ? {
          updatedAt: {
            ...(searchParams.from ? { gte: startOfDay(new Date(searchParams.from)) } : {}),
            ...(searchParams.to ? { lte: startOfDay(new Date(searchParams.to)) } : {})
          }
        }
      : {})
  };

  const jobs = await prisma.job.findMany({
    where,
    orderBy:
      searchParams.sort === "updated_asc"
        ? { updatedAt: "asc" }
        : searchParams.sort === "days_stuck"
          ? { updatedAt: "asc" }
          : { updatedAt: "desc" },
    take: 60
  });

  const now = new Date();
  const stuckPermits = await queryStuckPermits(session.user.orgId, now, 5);
  const inspectionsThisWeek = await prisma.inspection.findMany({
    where: {
      job: { orgId: session.user.orgId },
      scheduledFor: {
        gte: startOfWeek(now),
        lte: endOfWeek(now)
      }
    },
    include: { job: true },
    orderBy: {
      scheduledFor: "asc"
    }
  });
  const jobsNeedingInspection = await prisma.job.findMany({
    where: {
      orgId: session.user.orgId,
      status: JobStatus.INSTALLED,
      inspections: {
        none: {
          status: "SCHEDULED"
        }
      }
    }
  });
  const ptoPending = await prisma.job.findMany({
    where: {
      orgId: session.user.orgId,
      status: JobStatus.PTO_REQUESTED
    }
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Track permit and inspection bottlenecks.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>{stuckPermits.length}</CardTitle>
              <CardDescription>Stuck permits</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Follow-up due or stale contact.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{inspectionsThisWeek.length}</CardTitle>
              <CardDescription>Inspections this week</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Scheduled within current week.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{jobsNeedingInspection.length}</CardTitle>
              <CardDescription>Needs inspection scheduled</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Installed jobs missing scheduled inspection.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{ptoPending.length}</CardTitle>
              <CardDescription>PTO pending</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Waiting utility permission to operate.</CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-6">
              <div className="md:col-span-2">
                <Label htmlFor="q">Search customer/address</Label>
                <Input id="q" name="q" defaultValue={searchParams.q} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" defaultValue={searchParams.status} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">All</option>
                  {jobStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={searchParams.city} />
              </div>
              <div>
                <Label htmlFor="from">Updated from</Label>
                <Input id="from" name="from" type="date" defaultValue={searchParams.from} />
              </div>
              <div>
                <Label htmlFor="to">Updated to</Label>
                <Input id="to" name="to" type="date" defaultValue={searchParams.to} />
              </div>
              <div>
                <Label htmlFor="sort">Sort</Label>
                <select id="sort" name="sort" defaultValue={searchParams.sort ?? "updated_desc"} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="updated_desc">Last updated (newest)</option>
                  <option value="updated_asc">Last updated (oldest)</option>
                  <option value="days_stuck">Days stuck</option>
                </select>
              </div>
              <div className="md:col-span-6">
                <button type="submit" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                  Apply filters
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job pipeline</CardTitle>
            <CardDescription>Sorted by {searchParams.sort === "days_stuck" ? "days stuck" : "last updated"}.</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? <p className="text-sm text-muted-foreground">No jobs found. Create your first job.</p> : null}
            {jobs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days in status</TableHead>
                    <TableHead>Last updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Link href={`/jobs/${job.id}`} className="font-medium text-primary">
                          {job.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>{job.siteAddress}</TableCell>
                      <TableCell>
                        <StatusPill status={job.status} />
                      </TableCell>
                      <TableCell>{daysInStatus(job.updatedAt)}</TableCell>
                      <TableCell>{formatDateTime(job.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stuck permits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stuckPermits.slice(0, 8).map((permit) => {
                const staleDays = permit.submittedAt
                  ? Math.floor((now.getTime() - permit.submittedAt.getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                const stale = staleDays > 7 && !permit.lastContactAt;
                return (
                  <div key={permit.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <Link href={`/jobs/${permit.jobId}`} className="font-medium text-primary">
                        {permit.job.customerName}
                      </Link>
                      <StatusPill status={permit.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{permit.jurisdictionName}</p>
                    <p className="text-sm">Follow-up: {formatDate(permit.nextFollowUpAt)}</p>
                    {stale ? <p className="text-xs text-red-600">Stale permit: &gt; 7 days without contact.</p> : null}
                  </div>
                );
              })}
              {stuckPermits.length === 0 ? <p className="text-sm text-muted-foreground">No stuck permits right now.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspections this week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inspectionsThisWeek.slice(0, 8).map((inspection) => (
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
              {inspectionsThisWeek.length === 0 ? <p className="text-sm text-muted-foreground">No inspections scheduled this week.</p> : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
