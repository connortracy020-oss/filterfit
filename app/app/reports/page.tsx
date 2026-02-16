import { CaseStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { requireOrgSession } from "@/lib/auth/session";
import { decimalToNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { toCurrency, toDateLabel } from "@/lib/utils";

export default async function ReportsPage({
  searchParams
}: {
  searchParams: { start?: string; end?: string; vendorId?: string; status?: string };
}) {
  const { org } = await requireOrgSession();

  const start = searchParams.start ? new Date(searchParams.start) : null;
  const end = searchParams.end ? new Date(searchParams.end) : null;
  const status = Object.values(CaseStatus).includes(searchParams.status as CaseStatus)
    ? (searchParams.status as CaseStatus)
    : undefined;

  const where = {
    orgId: org.id,
    ...(status ? { status } : {}),
    ...(searchParams.vendorId ? { vendorId: searchParams.vendorId } : {}),
    ...(start || end
      ? {
          createdAt: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lte: end } : {})
          }
        }
      : {})
  };

  const [vendors, cases, totals] = await Promise.all([
    prisma.vendor.findMany({
      where: { orgId: org.id },
      orderBy: { name: "asc" }
    }),
    prisma.case.findMany({
      where,
      include: {
        vendor: true
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.case.aggregate({
      where,
      _sum: {
        expectedCredit: true,
        actualCredit: true
      }
    })
  ]);

  const exportParams = new URLSearchParams();
  if (searchParams.start) exportParams.set("start", searchParams.start);
  if (searchParams.end) exportParams.set("end", searchParams.end);
  if (searchParams.vendorId) exportParams.set("vendorId", searchParams.vendorId);
  if (searchParams.status) exportParams.set("status", searchParams.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Reports</h1>
        <Button asChild variant="outline">
          <a href={`/api/reports/cases.csv?${exportParams.toString()}`}>Export CSV</a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5">
            <Input type="date" name="start" defaultValue={searchParams.start ?? ""} />
            <Input type="date" name="end" defaultValue={searchParams.end ?? ""} />
            <select name="vendorId" defaultValue={searchParams.vendorId ?? ""} className="h-10 rounded-md border border-input px-3 text-sm">
              <option value="">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={searchParams.status ?? ""} className="h-10 rounded-md border border-input px-3 text-sm">
              <option value="">All statuses</option>
              {Object.values(CaseStatus).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expected credit</CardTitle>
          </CardHeader>
          <CardContent>{toCurrency(decimalToNumber(totals._sum.expectedCredit))}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actual credit</CardTitle>
          </CardHeader>
          <CardContent>{toCurrency(decimalToNumber(totals._sum.actualCredit))}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No rows for current filters.
                  </TableCell>
                </TableRow>
              ) : null}
              {cases.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.receiptId ?? item.id.slice(0, 8)}</TableCell>
                  <TableCell>{item.vendor.name}</TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell>{toCurrency(decimalToNumber(item.expectedCredit))}</TableCell>
                  <TableCell>{toCurrency(decimalToNumber(item.actualCredit))}</TableCell>
                  <TableCell>{toDateLabel(item.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
