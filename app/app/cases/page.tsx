import { CaseStatus } from "@prisma/client";
import Link from "next/link";
import { bulkCaseStatusUpdateAction } from "@/app/app/actions";
import { CaseStatusPill } from "@/components/case-status-pill";
import { Button } from "@/components/ui/button";
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
import { toCurrency, toDateLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/format";

export default async function CasesPage({
  searchParams
}: {
  searchParams: { status?: string; vendorId?: string; q?: string };
}) {
  const { org } = await requireOrgSession();

  const status = Object.values(CaseStatus).includes(searchParams.status as CaseStatus)
    ? (searchParams.status as CaseStatus)
    : undefined;
  const vendorId = searchParams.vendorId || undefined;
  const q = searchParams.q?.trim();

  const [vendors, cases] = await Promise.all([
    prisma.vendor.findMany({
      where: { orgId: org.id },
      orderBy: { name: "asc" }
    }),
    prisma.case.findMany({
      where: {
        orgId: org.id,
        ...(status ? { status } : {}),
        ...(vendorId ? { vendorId } : {}),
        ...(q
          ? {
              OR: [
                { sku: { contains: q, mode: "insensitive" } },
                { receiptId: { contains: q, mode: "insensitive" } },
                { brand: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        vendor: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Cases</h1>
        <Button asChild>
          <Link href="/app/cases/new">New case</Link>
        </Button>
      </div>

      <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-4">
        <Input name="q" placeholder="Search SKU / receipt / brand" defaultValue={searchParams.q ?? ""} />
        <select
          name="vendorId"
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue={vendorId ?? ""}
        >
          <option value="">All vendors</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue={status ?? ""}
        >
          <option value="">All statuses</option>
          {Object.values(CaseStatus).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>

      <form action={bulkCaseStatusUpdateAction} className="rounded-lg border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <select name="status" className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            {Object.values(CaseStatus).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Bulk update selected
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Select</TableHead>
              <TableHead>Case</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No cases found.
                </TableCell>
              </TableRow>
            ) : null}
            {cases.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <input type="checkbox" name="caseIds" value={item.id} />
                </TableCell>
                <TableCell>
                  <Link className="font-medium text-primary hover:underline" href={`/app/cases/${item.id}`}>
                    {item.receiptId ?? item.id.slice(0, 8)}
                  </Link>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku ?? "-"}</p>
                </TableCell>
                <TableCell>{item.vendor.name}</TableCell>
                <TableCell>
                  <CaseStatusPill status={item.status} />
                </TableCell>
                <TableCell>{toCurrency(decimalToNumber(item.expectedCredit))}</TableCell>
                <TableCell>{toDateLabel(item.dueDate)}</TableCell>
                <TableCell>{toDateLabel(item.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </form>
    </div>
  );
}
