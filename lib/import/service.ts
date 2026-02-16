import { CaseEventType, CaseStatus, ImportDedupeMode, ImportJobStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { chooseDedupeDecision, normalizeReceiptId, parseIsoDate } from "@/lib/import/dedupe";
import { mapCsvRow, type CsvRow, type ImportMapping } from "@/lib/import/parser";
import { logCaseEvent } from "@/lib/audit";

export async function processImportJob(jobId: string) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: { rows: true }
  });

  if (!job) {
    throw new Error("Import job not found");
  }

  if (!job.mapping) {
    throw new Error("Import job has no mapping");
  }

  const mapping = job.mapping as unknown as ImportMapping;

  await prisma.importJob.update({
    where: { id: job.id },
    data: { status: ImportJobStatus.PROCESSING, error: null }
  });

  const dedupeMode = job.dedupeMode ?? ImportDedupeMode.SKIP;

  for (const row of job.rows) {
    const parsed = mapCsvRow(row.raw as unknown as CsvRow, mapping);
    const receiptId = normalizeReceiptId(parsed.receiptId);
    const returnDate = parseIsoDate(parsed.returnDate);

    let vendorId: string | null = null;
    if (parsed.vendorName) {
      const vendor = await prisma.vendor.upsert({
        where: {
          orgId_name: {
            orgId: job.orgId,
            name: parsed.vendorName
          }
        },
        update: {},
        create: {
          orgId: job.orgId,
          name: parsed.vendorName
        }
      });
      vendorId = vendor.id;
    }

    if (!vendorId) {
      const defaultVendor = await prisma.vendor.findFirst({
        where: { orgId: job.orgId },
        orderBy: { createdAt: "asc" }
      });
      vendorId = defaultVendor?.id ?? null;
    }

    if (!vendorId) {
      await prisma.importRow.update({
        where: { id: row.id },
        data: { action: "SKIPPED", error: "No vendor found for import row", parsed: parsed as Prisma.JsonObject }
      });
      continue;
    }

    const existing = receiptId
      ? await prisma.case.findFirst({
          where: {
            orgId: job.orgId,
            receiptId,
            sku: parsed.sku,
            returnDate
          }
        })
      : null;

    const decision = chooseDedupeDecision(Boolean(existing), dedupeMode);

    if (decision === "SKIP") {
      await prisma.importRow.update({
        where: { id: row.id },
        data: {
          parsed: parsed as Prisma.JsonObject,
          action: "SKIPPED",
          linkedCaseId: existing?.id ?? null,
          error: null
        }
      });
      continue;
    }

    if (decision === "UPDATE" && existing) {
      const updated = await prisma.case.update({
        where: { id: existing.id },
        data: {
          customerReturnReason: parsed.customerReturnReason,
          unitCost: parsed.unitCost,
          qty: Math.max(1, Math.round(parsed.qty)),
          expectedCredit: parsed.expectedCredit,
          serialNumber: parsed.serialNumber,
          brand: parsed.brand,
          returnDate,
          status: CaseStatus.NEEDS_INFO
        }
      });

      await prisma.importRow.update({
        where: { id: row.id },
        data: {
          parsed: parsed as Prisma.JsonObject,
          action: "UPDATED",
          linkedCaseId: updated.id,
          error: null
        }
      });

      await logCaseEvent({
        orgId: updated.orgId,
        caseId: updated.id,
        actorUserId: job.createdByUserId,
        type: CaseEventType.CASE_UPDATED,
        message: "Case updated from import"
      });
      continue;
    }

    const created = await prisma.case.create({
      data: {
        orgId: job.orgId,
        vendorId,
        status: CaseStatus.NEW,
        sku: parsed.sku,
        receiptId,
        returnDate,
        customerReturnReason: parsed.customerReturnReason,
        unitCost: parsed.unitCost,
        qty: Math.max(1, Math.round(parsed.qty)),
        expectedCredit: parsed.expectedCredit,
        serialNumber: parsed.serialNumber,
        brand: parsed.brand
      }
    });

    await prisma.importRow.update({
      where: { id: row.id },
      data: {
        parsed: parsed as Prisma.JsonObject,
        action: "CREATED",
        linkedCaseId: created.id,
        error: null
      }
    });

    await logCaseEvent({
      orgId: created.orgId,
      caseId: created.id,
      actorUserId: job.createdByUserId,
      type: CaseEventType.IMPORT_CREATED,
      message: "Case created from CSV import"
    });
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: ImportJobStatus.COMPLETED,
      completedAt: new Date(),
      error: null
    }
  });
}
