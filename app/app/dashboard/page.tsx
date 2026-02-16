import { CaseStatus } from "@prisma/client";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { openStatuses } from "@/lib/cases/status";
import { decimalToNumber } from "@/lib/format";
import { requireOrgSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { toCurrency } from "@/lib/utils";

function agingBucket(days: number) {
  if (days <= 7) return "0-7";
  if (days <= 14) return "8-14";
  if (days <= 30) return "15-30";
  return "30+";
}

export default async function DashboardPage() {
  const { org } = await requireOrgSession();

  const [expectedOpen, actualReceived, openCases, groupedVendors] = await Promise.all([
    prisma.case.aggregate({
      where: {
        orgId: org.id,
        status: { in: openStatuses() }
      },
      _sum: {
        expectedCredit: true
      }
    }),
    prisma.case.aggregate({
      where: {
        orgId: org.id,
        status: {
          in: [CaseStatus.CREDIT_RECEIVED, CaseStatus.CLOSED]
        }
      },
      _sum: {
        actualCredit: true
      }
    }),
    prisma.case.findMany({
      where: {
        orgId: org.id,
        status: { in: openStatuses() }
      },
      select: {
        id: true,
        createdAt: true,
        dueDate: true
      }
    }),
    prisma.case.groupBy({
      by: ["vendorId"],
      where: {
        orgId: org.id,
        status: { in: openStatuses() }
      },
      _sum: {
        expectedCredit: true
      },
      orderBy: {
        _sum: {
          expectedCredit: "desc"
        }
      },
      take: 5
    })
  ]);

  const vendorIds = groupedVendors.map((entry) => entry.vendorId);
  const vendors = vendorIds.length
    ? await prisma.vendor.findMany({
        where: {
          id: { in: vendorIds }
        },
        select: {
          id: true,
          name: true
        }
      })
    : [];

  const vendorNameMap = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));

  const aging = {
    "0-7": 0,
    "8-14": 0,
    "15-30": 0,
    "30+": 0
  };

  for (const item of openCases) {
    const days = Math.floor((Date.now() - item.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    aging[agingBucket(days)] += 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <Link href="/app/cases/new" className="text-sm font-medium text-primary hover:underline">
          Create case
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Expected Credit</CardTitle>
            <CardDescription>Open pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{toCurrency(decimalToNumber(expectedOpen._sum.expectedCredit))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Actual Credit</CardTitle>
            <CardDescription>Received</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{toCurrency(decimalToNumber(actualReceived._sum.actualCredit))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open Cases</CardTitle>
            <CardDescription>Needs action</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{openCases.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Over 30 days</CardTitle>
            <CardDescription>Old pipeline items</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{aging["30+"]}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aging Buckets</CardTitle>
            <CardDescription>Open case age distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>0-7 days: {aging["0-7"]}</p>
              <p>8-14 days: {aging["8-14"]}</p>
              <p>15-30 days: {aging["15-30"]}</p>
              <p>30+ days: {aging["30+"]}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Vendors by Pending $</CardTitle>
            <CardDescription>Highest pending recovery totals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {groupedVendors.length === 0 ? <p className="text-muted-foreground">No pending data yet.</p> : null}
              {groupedVendors.map((item) => (
                <p key={item.vendorId} className="flex items-center justify-between">
                  <span>{vendorNameMap.get(item.vendorId) ?? "Unknown vendor"}</span>
                  <span>{toCurrency(decimalToNumber(item._sum.expectedCredit))}</span>
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
