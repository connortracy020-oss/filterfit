"use server";

import { CaseEventType, CaseStatus, ImportJobStatus, MembershipRole, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { logCaseEvent } from "@/lib/audit";
import { canEditCase, seatLimitForPlan } from "@/lib/auth/subscription";
import { requireAdminOrgSession, requireOrgSession } from "@/lib/auth/session";
import { validateReadyToSubmit, canTransition } from "@/lib/cases/status";
import { parseCsvText, previewRows } from "@/lib/import/parser";
import { processImportJob } from "@/lib/import/service";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  addMemberSchema,
  createCaseSchema,
  importConfirmSchema,
  importMappingInputSchema,
  orgSchema,
  statusUpdateSchema,
  updateCaseSchema,
  vendorSchema
} from "@/lib/validation";
import { buildChecklistItems, computeDueDate, parseTemplateSteps, templateSchema } from "@/lib/vendors/template";

function toDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createCaseAction(formData: FormData) {
  const { membership, org, session } = await requireOrgSession();
  if (!canEditCase(membership.role)) {
    redirect("/app/cases?error=Insufficient permissions");
  }

  const parsed = createCaseSchema.safeParse({
    vendorId: formData.get("vendorId"),
    templateId: formData.get("templateId"),
    purchaseDate: formData.get("purchaseDate"),
    returnDate: formData.get("returnDate"),
    receiptId: formData.get("receiptId"),
    sku: formData.get("sku"),
    upc: formData.get("upc"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    serialNumber: formData.get("serialNumber"),
    qty: formData.get("qty"),
    unitCost: formData.get("unitCost"),
    expectedCredit: formData.get("expectedCredit"),
    customerReturnReason: formData.get("customerReturnReason"),
    internalNotes: formData.get("internalNotes")
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(", ");
    redirect(`/app/cases/new?error=${encodeURIComponent(message)}`);
  }

  const vendor = await prisma.vendor.findFirst({
    where: {
      id: parsed.data.vendorId,
      orgId: org.id
    }
  });

  if (!vendor) {
    redirect("/app/cases/new?error=Vendor not found");
  }

  let templateData:
    | {
        id: string;
        slaDays: number;
        requiredFields: string[];
        steps: ReturnType<typeof parseTemplateSteps>;
      }
    | null = null;

  if (parsed.data.templateId) {
    const template = await prisma.vendorTemplate.findFirst({
      where: {
        id: parsed.data.templateId,
        orgId: org.id,
        vendorId: vendor.id
      }
    });

    if (template) {
      const steps = parseTemplateSteps(template.steps);
      const requiredFields = Array.isArray(template.requiredFields)
        ? template.requiredFields.map(String)
        : [];

      templateData = {
        id: template.id,
        slaDays: template.slaDays,
        requiredFields,
        steps
      };
    }
  }

  const dueDate = templateData
    ? computeDueDate(
        {
          slaDays: templateData.slaDays,
          steps: templateData.steps
        },
        new Date()
      )
    : null;

  const created = await prisma.$transaction(async (tx) => {
    const newCase = await tx.case.create({
      data: {
        orgId: org.id,
        vendorId: vendor.id,
        templateId: templateData?.id,
        status: CaseStatus.NEW,
        dueDate,
        purchaseDate: toDate(parsed.data.purchaseDate),
        returnDate: toDate(parsed.data.returnDate),
        receiptId: parsed.data.receiptId,
        sku: parsed.data.sku,
        upc: parsed.data.upc,
        brand: parsed.data.brand,
        model: parsed.data.model,
        serialNumber: parsed.data.serialNumber,
        qty: parsed.data.qty,
        unitCost: parsed.data.unitCost,
        expectedCredit: parsed.data.expectedCredit,
        customerReturnReason: parsed.data.customerReturnReason,
        internalNotes: parsed.data.internalNotes
      }
    });

    if (templateData) {
      await tx.caseChecklistItem.createMany({
        data: buildChecklistItems(org.id, newCase.id, templateData.steps)
      });
    }

    await tx.caseEvent.create({
      data: {
        orgId: org.id,
        caseId: newCase.id,
        actorUserId: session.user.id,
        type: CaseEventType.CASE_CREATED,
        message: "Case created"
      }
    });

    return newCase;
  });

  redirect(`/app/cases/${created.id}?success=${encodeURIComponent("Case created")}`);
}

export async function updateCaseDetailsAction(formData: FormData) {
  const { membership, org, session } = await requireOrgSession();
  if (!canEditCase(membership.role)) {
    redirect("/app/cases?error=Insufficient permissions");
  }

  const parsed = updateCaseSchema.safeParse({
    caseId: formData.get("caseId"),
    vendorId: formData.get("vendorId"),
    templateId: formData.get("templateId"),
    purchaseDate: formData.get("purchaseDate"),
    returnDate: formData.get("returnDate"),
    receiptId: formData.get("receiptId"),
    sku: formData.get("sku"),
    upc: formData.get("upc"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    serialNumber: formData.get("serialNumber"),
    qty: formData.get("qty"),
    unitCost: formData.get("unitCost"),
    expectedCredit: formData.get("expectedCredit"),
    actualCredit: formData.get("actualCredit"),
    customerReturnReason: formData.get("customerReturnReason"),
    internalNotes: formData.get("internalNotes")
  });

  if (!parsed.success) {
    redirect(`/app/cases/${formData.get("caseId")}?error=Invalid case update`);
  }

  const existing = await prisma.case.findFirst({
    where: {
      id: parsed.data.caseId,
      orgId: org.id
    }
  });

  if (!existing) {
    redirect("/app/cases?error=Case not found");
  }

  await prisma.case.update({
    where: { id: parsed.data.caseId },
    data: {
      vendorId: parsed.data.vendorId,
      templateId: parsed.data.templateId,
      purchaseDate: toDate(parsed.data.purchaseDate),
      returnDate: toDate(parsed.data.returnDate),
      receiptId: parsed.data.receiptId,
      sku: parsed.data.sku,
      upc: parsed.data.upc,
      brand: parsed.data.brand,
      model: parsed.data.model,
      serialNumber: parsed.data.serialNumber,
      qty: parsed.data.qty,
      unitCost: parsed.data.unitCost,
      expectedCredit: parsed.data.expectedCredit,
      actualCredit: parsed.data.actualCredit,
      customerReturnReason: parsed.data.customerReturnReason,
      internalNotes: parsed.data.internalNotes
    }
  });

  await logCaseEvent({
    orgId: org.id,
    caseId: parsed.data.caseId,
    actorUserId: session.user.id,
    type: CaseEventType.CASE_UPDATED,
    message: "Case details updated"
  });

  redirect(`/app/cases/${parsed.data.caseId}?success=${encodeURIComponent("Case updated")}`);
}

export async function updateCaseStatusAction(formData: FormData) {
  const { membership, org, session } = await requireOrgSession();
  if (!canEditCase(membership.role)) {
    redirect("/app/cases?error=Insufficient permissions");
  }

  const parsed = statusUpdateSchema.safeParse({
    caseId: formData.get("caseId"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    redirect(`/app/cases/${formData.get("caseId")}?error=Invalid status update`);
  }

  const current = await prisma.case.findFirst({
    where: {
      id: parsed.data.caseId,
      orgId: org.id
    },
    include: {
      template: true,
      evidenceFiles: true,
      checklist: true
    }
  });

  if (!current) {
    redirect("/app/cases?error=Case not found");
  }

  if (!canTransition(current.status, parsed.data.status)) {
    redirect(`/app/cases/${current.id}?error=Invalid status transition`);
  }

  if (parsed.data.status === CaseStatus.READY_TO_SUBMIT) {
    const requiredFromTemplate = Array.isArray(current.template?.requiredFields)
      ? current.template?.requiredFields.map(String)
      : [];

    const requiredFromChecklist = current.checklist
      .filter((item) => item.required)
      .flatMap((item) => {
        if (!Array.isArray(item.fieldsNeeded)) {
          return [];
        }
        return item.fieldsNeeded.map(String);
      });

    const requiredFieldKeys = Array.from(new Set([...requiredFromTemplate, ...requiredFromChecklist]));

    const readiness = validateReadyToSubmit({
      requiredFieldKeys,
      caseData: {
        serialNumber: current.serialNumber,
        sku: current.sku,
        unitCost: current.unitCost,
        qty: current.qty,
        expectedCredit: current.expectedCredit,
        customerReturnReason: current.customerReturnReason
      },
      evidenceTypes: current.evidenceFiles.map((item) => item.type),
      requiredChecklistPending: current.checklist.filter((item) => item.required && !item.completedAt).length
    });

    if (!readiness.ok) {
      const reason = [
        readiness.missingFields.length > 0 ? `missing fields: ${readiness.missingFields.join(", ")}` : null,
        readiness.missingEvidence.length > 0 ? `missing evidence: ${readiness.missingEvidence.join(", ")}` : null,
        readiness.missingChecklistSteps > 0 ? `incomplete required checklist items: ${readiness.missingChecklistSteps}` : null
      ]
        .filter(Boolean)
        .join("; ");

      redirect(`/app/cases/${current.id}?error=${encodeURIComponent(`Cannot mark ready: ${reason}`)}`);
    }
  }

  await prisma.case.update({
    where: { id: current.id },
    data: { status: parsed.data.status }
  });

  await logCaseEvent({
    orgId: org.id,
    caseId: current.id,
    actorUserId: session.user.id,
    type: CaseEventType.STATUS_CHANGED,
    message: `Status changed to ${parsed.data.status}`,
    metadata: {
      from: current.status,
      to: parsed.data.status
    }
  });

  redirect(`/app/cases/${current.id}?success=${encodeURIComponent("Status updated")}`);
}

export async function toggleChecklistItemAction(formData: FormData) {
  const { membership, org, session } = await requireOrgSession();
  if (!canEditCase(membership.role)) {
    redirect("/app/cases?error=Insufficient permissions");
  }

  const itemId = String(formData.get("itemId") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  const completed = String(formData.get("completed") ?? "false") === "true";

  const item = await prisma.caseChecklistItem.findFirst({
    where: {
      id: itemId,
      caseId,
      orgId: org.id
    }
  });

  if (!item) {
    redirect(`/app/cases/${caseId}?error=Checklist item not found`);
  }

  await prisma.caseChecklistItem.update({
    where: { id: item.id },
    data: {
      completedAt: completed ? new Date() : null,
      completedByUserId: completed ? session.user.id : null
    }
  });

  await logCaseEvent({
    orgId: org.id,
    caseId,
    actorUserId: session.user.id,
    type: CaseEventType.CASE_UPDATED,
    message: `${completed ? "Completed" : "Reopened"} checklist step: ${item.title}`
  });

  redirect(`/app/cases/${caseId}?success=${encodeURIComponent("Checklist updated")}`);
}

export async function bulkCaseStatusUpdateAction(formData: FormData) {
  const { membership, org, session } = await requireOrgSession();
  if (!canEditCase(membership.role)) {
    redirect("/app/cases?error=Insufficient permissions");
  }

  const caseIds = formData
    .getAll("caseIds")
    .map(String)
    .filter(Boolean);
  const status = formData.get("status");

  if (!caseIds.length || !Object.values(CaseStatus).includes(status as CaseStatus)) {
    redirect("/app/cases?error=Select cases and a valid status");
  }

  await prisma.case.updateMany({
    where: {
      id: { in: caseIds },
      orgId: org.id
    },
    data: {
      status: status as CaseStatus
    }
  });

  const events = caseIds.map((caseId) =>
    prisma.caseEvent.create({
      data: {
        orgId: org.id,
        caseId,
        actorUserId: session.user.id,
        type: CaseEventType.STATUS_CHANGED,
        message: `Bulk status updated to ${status as string}`
      }
    })
  );
  await Promise.all(events);

  redirect(`/app/cases?success=${encodeURIComponent("Bulk update complete")}`);
}

export async function createVendorAction(formData: FormData) {
  const { org } = await requireAdminOrgSession();

  const parsed = vendorSchema.safeParse({
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail"),
    portalUrl: formData.get("portalUrl"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    redirect(`/app/vendors?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid vendor")}`);
  }

  await prisma.vendor.create({
    data: {
      orgId: org.id,
      name: parsed.data.name,
      contactEmail: parsed.data.contactEmail || null,
      portalUrl: parsed.data.portalUrl || null,
      notes: parsed.data.notes || null
    }
  });

  redirect(`/app/vendors?success=${encodeURIComponent("Vendor created")}`);
}

export async function saveVendorTemplateAction(formData: FormData) {
  const { org, session } = await requireAdminOrgSession();

  const vendorId = String(formData.get("vendorId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");

  const payload = {
    name: String(formData.get("name") ?? ""),
    slaDays: Number(formData.get("slaDays") ?? 14),
    requiredFields: JSON.parse(String(formData.get("requiredFields") ?? "[]")),
    steps: JSON.parse(String(formData.get("steps") ?? "[]"))
  };

  const parsed = templateSchema.safeParse(payload);
  if (!parsed.success) {
    redirect(`/app/vendors/${vendorId}?error=${encodeURIComponent("Invalid template payload")}`);
  }

  const vendor = await prisma.vendor.findFirst({
    where: {
      id: vendorId,
      orgId: org.id
    }
  });

  if (!vendor) {
    redirect("/app/vendors?error=Vendor not found");
  }

  if (templateId) {
    await prisma.vendorTemplate.update({
      where: { id: templateId },
      data: {
        name: parsed.data.name,
        slaDays: parsed.data.slaDays,
        requiredFields: parsed.data.requiredFields,
        steps: parsed.data.steps
      }
    });
  } else {
    await prisma.vendorTemplate.create({
      data: {
        orgId: org.id,
        vendorId,
        name: parsed.data.name,
        slaDays: parsed.data.slaDays,
        requiredFields: parsed.data.requiredFields,
        steps: parsed.data.steps
      }
    });
  }

  const affectedCases = await prisma.case.findMany({
    where: {
      orgId: org.id,
      vendorId,
      templateId: templateId || undefined
    },
    select: { id: true }
  });

  await Promise.all(
    affectedCases.map((entry) =>
      logCaseEvent({
        orgId: org.id,
        caseId: entry.id,
        actorUserId: session.user.id,
        type: CaseEventType.TEMPLATE_UPDATED,
        message: "Vendor template updated"
      })
    )
  );

  redirect(`/app/vendors/${vendorId}?success=${encodeURIComponent("Template saved")}`);
}

export async function updateOrganizationAction(formData: FormData) {
  const { org } = await requireAdminOrgSession();
  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone")
  });

  if (!parsed.success) {
    redirect(`/app/settings?error=${encodeURIComponent("Invalid organization settings")}`);
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      name: parsed.data.name,
      timezone: parsed.data.timezone
    }
  });

  redirect(`/app/settings?success=${encodeURIComponent("Organization settings updated")}`);
}

export async function addMemberAction(formData: FormData) {
  const { org, subscription } = await requireAdminOrgSession();

  const parsed = addMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    redirect(`/app/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid member")}`);
  }

  const currentCount = await prisma.membership.count({ where: { orgId: org.id } });
  const seatLimit = seatLimitForPlan(subscription?.plan);

  if (Number.isFinite(seatLimit) && currentCount >= seatLimit) {
    redirect(`/app/settings?error=${encodeURIComponent("Seat limit reached for current plan")}`);
  }

  const user = await prisma.user.upsert({
    where: { email: parsed.data.email.toLowerCase() },
    update: {},
    create: {
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.email.split("@")[0]
    }
  });

  const existing = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId: org.id
      }
    }
  });

  if (existing) {
    await prisma.membership.update({
      where: { id: existing.id },
      data: {
        role: parsed.data.role
      }
    });

    redirect(`/app/settings?success=${encodeURIComponent("Member role updated")}`);
  }

  await prisma.membership.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: parsed.data.role
    }
  });

  redirect(`/app/settings?success=${encodeURIComponent("Member added")}`);
}

export async function uploadImportCsvAction(formData: FormData) {
  const { membership, org, session } = await requireOrgSession();
  if (!canEditCase(membership.role)) {
    redirect("/app/import?error=Insufficient permissions");
  }

  const file = formData.get("csv");
  if (!(file instanceof File)) {
    redirect("/app/import?error=CSV file is required");
  }

  if (file.size > 20 * 1024 * 1024) {
    redirect("/app/import?error=CSV file exceeds 20MB limit");
  }

  const text = Buffer.from(await file.arrayBuffer()).toString("utf8");

  let rows: Record<string, string>[] = [];
  try {
    rows = parseCsvText(text);
  } catch (error) {
    logger.error("CSV parse failed", { error: error instanceof Error ? error.message : String(error) });
    redirect("/app/import?error=Unable to parse CSV. Confirm format and headers.");
  }

  if (!rows.length) {
    redirect("/app/import?error=CSV contains no rows");
  }

  const created = await prisma.importJob.create({
    data: {
      orgId: org.id,
      status: ImportJobStatus.PENDING,
      originalFilename: file.name,
      previewRows: previewRows(rows),
      createdByUserId: session.user.id,
      rows: {
        createMany: {
          data: rows.map((row) => ({
            raw: row as Prisma.JsonObject
          }))
        }
      }
    }
  });

  redirect(`/app/import?jobId=${created.id}&stage=mapping&success=${encodeURIComponent("CSV uploaded")}`);
}

export async function saveImportMappingAction(formData: FormData) {
  const { membership, org } = await requireOrgSession();
  if (!canEditCase(membership.role)) {
    redirect("/app/import?error=Insufficient permissions");
  }

  const parsed = importMappingInputSchema.safeParse({
    importJobId: formData.get("importJobId"),
    dedupeMode: formData.get("dedupeMode"),
    sku: formData.get("sku"),
    description: formData.get("description"),
    returnReason: formData.get("returnReason"),
    unitCost: formData.get("unitCost"),
    qty: formData.get("qty"),
    vendor: formData.get("vendor"),
    brand: formData.get("brand"),
    returnDate: formData.get("returnDate"),
    receiptId: formData.get("receiptId"),
    serialNumber: formData.get("serialNumber"),
    expectedCredit: formData.get("expectedCredit")
  });

  if (!parsed.success) {
    redirect("/app/import?error=Invalid mapping");
  }

  const job = await prisma.importJob.findFirst({
    where: {
      id: parsed.data.importJobId,
      orgId: org.id
    }
  });

  if (!job) {
    redirect("/app/import?error=Import job not found");
  }

  await prisma.importJob.update({
    where: { id: parsed.data.importJobId },
    data: {
      dedupeMode: parsed.data.dedupeMode,
      status: ImportJobStatus.READY,
      mapping: {
        sku: parsed.data.sku,
        description: parsed.data.description,
        returnReason: parsed.data.returnReason,
        unitCost: parsed.data.unitCost,
        qty: parsed.data.qty,
        vendor: parsed.data.vendor,
        brand: parsed.data.brand,
        returnDate: parsed.data.returnDate,
        receiptId: parsed.data.receiptId,
        serialNumber: parsed.data.serialNumber,
        expectedCredit: parsed.data.expectedCredit
      }
    }
  });

  redirect(`/app/import?jobId=${parsed.data.importJobId}&stage=confirm&success=${encodeURIComponent("Mapping saved")}`);
}

export async function confirmImportAction(formData: FormData) {
  const { membership, org } = await requireOrgSession();
  if (!canEditCase(membership.role)) {
    redirect("/app/import?error=Insufficient permissions");
  }

  const parsed = importConfirmSchema.safeParse({
    importJobId: formData.get("importJobId")
  });

  if (!parsed.success) {
    redirect("/app/import?error=Invalid import request");
  }

  const job = await prisma.importJob.findFirst({
    where: {
      id: parsed.data.importJobId,
      orgId: org.id
    }
  });

  if (!job) {
    redirect("/app/import?error=Import job not found");
  }

  try {
    await processImportJob(job.id);
  } catch (error) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.FAILED,
        error: error instanceof Error ? error.message : String(error)
      }
    });

    redirect(`/app/import?jobId=${job.id}&error=${encodeURIComponent("Import failed")}`);
  }

  redirect(`/app/import?jobId=${job.id}&success=${encodeURIComponent("Import completed")}`);
}

export async function updateTemplateChecklistCompletionAction(
  caseId: string,
  itemId: string,
  completed: boolean
) {
  const formData = new FormData();
  formData.set("caseId", caseId);
  formData.set("itemId", itemId);
  formData.set("completed", String(completed));
  return toggleChecklistItemAction(formData);
}

export async function updateMemberRoleAction(userId: string, role: MembershipRole) {
  const { org } = await requireAdminOrgSession();
  await prisma.membership.updateMany({
    where: {
      orgId: org.id,
      userId
    },
    data: {
      role
    }
  });
  redirect(`/app/settings?success=${encodeURIComponent("Member updated")}`);
}
