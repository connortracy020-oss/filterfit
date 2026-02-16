import { CaseStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getApiOrgContext } from "@/lib/auth/api";
import { decimalToNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: string | number | null | undefined) {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (normalized.includes(",") || normalized.includes('"') || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export async function GET(request: Request) {
  const context = await getApiOrgContext();
  if ("response" in context) {
    return context.response;
  }

  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const vendorId = url.searchParams.get("vendorId");
  const status = url.searchParams.get("status");

  const rows = await prisma.case.findMany({
    where: {
      orgId: context.org.id,
      ...(vendorId ? { vendorId } : {}),
      ...(status && Object.values(CaseStatus).includes(status as CaseStatus)
        ? { status: status as CaseStatus }
        : {}),
      ...(start || end
        ? {
            createdAt: {
              ...(start ? { gte: new Date(start) } : {}),
              ...(end ? { lte: new Date(end) } : {})
            }
          }
        : {})
    },
    include: {
      vendor: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const lines = [
    [
      "caseId",
      "vendor",
      "status",
      "receiptId",
      "sku",
      "qty",
      "unitCost",
      "expectedCredit",
      "actualCredit",
      "dueDate",
      "createdAt"
    ].join(",")
  ];

  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.vendor.name,
        row.status,
        row.receiptId,
        row.sku,
        row.qty,
        decimalToNumber(row.unitCost),
        decimalToNumber(row.expectedCredit),
        decimalToNumber(row.actualCredit),
        row.dueDate?.toISOString() ?? "",
        row.createdAt.toISOString()
      ]
        .map((value) => escapeCsv(value))
        .join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=cases-report.csv"
    }
  });
}
