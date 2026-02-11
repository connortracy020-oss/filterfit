"use server";

import { InspectionOutcome, InspectionStatus, InspectionType, JobStatus, PermitStatus, TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditJobDetails } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import {
  createInspection,
  createJob,
  createPermit,
  createTask,
  quickMarkPermitContactedToday,
  quickSetPermitFollowUp3BusinessDays,
  updateInspection,
  updateJobStatus,
  updatePermit,
  updateTask
} from "@/lib/jobs/service";
import { prisma } from "@/lib/prisma";
import { inspectionSchema, jobSchema, permitSchema, taskSchema } from "@/lib/validation";

function emptyToUndefined<T extends string | null>(value: T) {
  if (value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export async function createJobAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditJobDetails(session.user.role)) {
    throw new Error("You do not have permission to create jobs.");
  }

  const parsed = jobSchema.safeParse({
    customerName: formData.get("customerName"),
    siteAddress: formData.get("siteAddress"),
    city: formData.get("city"),
    county: formData.get("county"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    utility: emptyToUndefined((formData.get("utility") as string | null) ?? null),
    systemSizeKw: emptyToUndefined((formData.get("systemSizeKw") as string | null) ?? null),
    status: formData.get("status") ?? JobStatus.LEAD,
    startTargetDate: emptyToUndefined((formData.get("startTargetDate") as string | null) ?? null),
    installDate: emptyToUndefined((formData.get("installDate") as string | null) ?? null),
    notes: emptyToUndefined((formData.get("notes") as string | null) ?? null)
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid job data");
  }

  const job = await createJob({
    orgId: session.user.orgId,
    customerName: parsed.data.customerName,
    siteAddress: parsed.data.siteAddress,
    city: parsed.data.city,
    county: parsed.data.county,
    state: parsed.data.state,
    zip: parsed.data.zip,
    utility: parsed.data.utility,
    systemSizeKw: parsed.data.systemSizeKw,
    status: parsed.data.status,
    startTargetDate: parsed.data.startTargetDate,
    installDate: parsed.data.installDate,
    notes: parsed.data.notes
  });

  redirect(`/jobs/${job.id}`);
}

export async function updateJobAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditJobDetails(session.user.role)) {
    throw new Error("You do not have permission to update jobs.");
  }

  const jobId = String(formData.get("jobId") ?? "");
  const status = formData.get("status") as JobStatus;

  await updateJobStatus({
    orgId: session.user.orgId,
    actorUserId: session.user.id,
    jobId,
    nextStatus: status
  });

  await prisma.job.updateMany({
    where: { id: jobId, orgId: session.user.orgId },
    data: {
      notes: emptyToUndefined((formData.get("notes") as string | null) ?? null),
      startTargetDate: emptyToUndefined((formData.get("startTargetDate") as string | null) ?? null)
        ? new Date(String(formData.get("startTargetDate")))
        : null,
      installDate: emptyToUndefined((formData.get("installDate") as string | null) ?? null)
        ? new Date(String(formData.get("installDate")))
        : null
    }
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
}

export async function createPermitAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditJobDetails(session.user.role)) {
    throw new Error("You do not have permission to manage permits.");
  }

  const parsed = permitSchema.safeParse({
    jobId: formData.get("jobId"),
    jurisdictionName: formData.get("jurisdictionName"),
    permitNumber: emptyToUndefined((formData.get("permitNumber") as string | null) ?? null),
    submittedAt: emptyToUndefined((formData.get("submittedAt") as string | null) ?? null),
    approvedAt: emptyToUndefined((formData.get("approvedAt") as string | null) ?? null),
    status: formData.get("status") ?? PermitStatus.NOT_STARTED,
    lastContactAt: emptyToUndefined((formData.get("lastContactAt") as string | null) ?? null),
    nextFollowUpAt: emptyToUndefined((formData.get("nextFollowUpAt") as string | null) ?? null),
    contactEmail: emptyToUndefined((formData.get("contactEmail") as string | null) ?? null),
    contactPhone: emptyToUndefined((formData.get("contactPhone") as string | null) ?? null),
    notes: emptyToUndefined((formData.get("notes") as string | null) ?? null)
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid permit data");
  }

  await createPermit({
    orgId: session.user.orgId,
    actorUserId: session.user.id,
    input: parsed.data
  });

  revalidatePath(`/jobs/${parsed.data.jobId}`);
  revalidatePath("/dashboard");
}

export async function updatePermitAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditJobDetails(session.user.role)) {
    throw new Error("You do not have permission to manage permits.");
  }

  const permitId = String(formData.get("permitId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");

  await updatePermit({
    orgId: session.user.orgId,
    actorUserId: session.user.id,
    permitId,
    input: {
      jurisdictionName: emptyToUndefined((formData.get("jurisdictionName") as string | null) ?? null),
      permitNumber: emptyToUndefined((formData.get("permitNumber") as string | null) ?? null) ?? null,
      submittedAt: emptyToUndefined((formData.get("submittedAt") as string | null) ?? null)
        ? new Date(String(formData.get("submittedAt")))
        : null,
      approvedAt: emptyToUndefined((formData.get("approvedAt") as string | null) ?? null)
        ? new Date(String(formData.get("approvedAt")))
        : null,
      status: (formData.get("status") as PermitStatus) ?? PermitStatus.NOT_STARTED,
      lastContactAt: emptyToUndefined((formData.get("lastContactAt") as string | null) ?? null)
        ? new Date(String(formData.get("lastContactAt")))
        : null,
      nextFollowUpAt: emptyToUndefined((formData.get("nextFollowUpAt") as string | null) ?? null)
        ? new Date(String(formData.get("nextFollowUpAt")))
        : null,
      contactEmail: emptyToUndefined((formData.get("contactEmail") as string | null) ?? null) ?? null,
      contactPhone: emptyToUndefined((formData.get("contactPhone") as string | null) ?? null) ?? null,
      notes: emptyToUndefined((formData.get("notes") as string | null) ?? null) ?? null
    }
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
}

export async function quickContactPermitAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditJobDetails(session.user.role)) {
    throw new Error("You do not have permission to manage permits.");
  }

  const permitId = String(formData.get("permitId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");

  await quickMarkPermitContactedToday({ orgId: session.user.orgId, actorUserId: session.user.id, permitId });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
}

export async function quickFollowUpPermitAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditJobDetails(session.user.role)) {
    throw new Error("You do not have permission to manage permits.");
  }

  const permitId = String(formData.get("permitId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");

  await quickSetPermitFollowUp3BusinessDays({ orgId: session.user.orgId, actorUserId: session.user.id, permitId });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
}

export async function createInspectionAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditJobDetails(session.user.role)) {
    throw new Error("You do not have permission to manage inspections.");
  }

  const parsed = inspectionSchema.safeParse({
    jobId: formData.get("jobId"),
    type: formData.get("type"),
    scheduledFor: emptyToUndefined((formData.get("scheduledFor") as string | null) ?? null),
    completedAt: emptyToUndefined((formData.get("completedAt") as string | null) ?? null),
    outcome: (formData.get("outcome") as InspectionOutcome) ?? InspectionOutcome.NA,
    status: (formData.get("status") as InspectionStatus) ?? InspectionStatus.NOT_SCHEDULED,
    inspectorName: emptyToUndefined((formData.get("inspectorName") as string | null) ?? null),
    jurisdictionPhone: emptyToUndefined((formData.get("jurisdictionPhone") as string | null) ?? null),
    notes: emptyToUndefined((formData.get("notes") as string | null) ?? null)
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid inspection data");
  }

  await createInspection({
    orgId: session.user.orgId,
    actorUserId: session.user.id,
    input: parsed.data
  });

  revalidatePath(`/jobs/${parsed.data.jobId}`);
  revalidatePath("/dashboard");
}

export async function updateInspectionAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditJobDetails(session.user.role)) {
    throw new Error("You do not have permission to manage inspections.");
  }

  const inspectionId = String(formData.get("inspectionId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");

  await updateInspection({
    orgId: session.user.orgId,
    actorUserId: session.user.id,
    inspectionId,
    input: {
      type: formData.get("type") as InspectionType,
      scheduledFor: emptyToUndefined((formData.get("scheduledFor") as string | null) ?? null)
        ? new Date(String(formData.get("scheduledFor")))
        : null,
      completedAt: emptyToUndefined((formData.get("completedAt") as string | null) ?? null)
        ? new Date(String(formData.get("completedAt")))
        : null,
      outcome: (formData.get("outcome") as InspectionOutcome) ?? InspectionOutcome.NA,
      status: (formData.get("status") as InspectionStatus) ?? InspectionStatus.NOT_SCHEDULED,
      inspectorName: emptyToUndefined((formData.get("inspectorName") as string | null) ?? null) ?? null,
      jurisdictionPhone: emptyToUndefined((formData.get("jurisdictionPhone") as string | null) ?? null) ?? null,
      notes: emptyToUndefined((formData.get("notes") as string | null) ?? null) ?? null
    }
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
}

export async function createTaskAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditJobDetails(session.user.role)) {
    throw new Error("You do not have permission to manage tasks.");
  }

  const parsed = taskSchema.safeParse({
    jobId: formData.get("jobId"),
    title: formData.get("title"),
    dueAt: emptyToUndefined((formData.get("dueAt") as string | null) ?? null),
    status: TaskStatus.OPEN,
    assignedToUserId: emptyToUndefined((formData.get("assignedToUserId") as string | null) ?? null),
    reminderPolicyId: emptyToUndefined((formData.get("reminderPolicyId") as string | null) ?? null)
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid task data");
  }

  await createTask({
    orgId: session.user.orgId,
    actorUserId: session.user.id,
    input: parsed.data
  });

  revalidatePath(`/jobs/${parsed.data.jobId}`);
}

export async function toggleTaskAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditJobDetails(session.user.role)) {
    throw new Error("You do not have permission to manage tasks.");
  }

  const taskId = String(formData.get("taskId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");
  const nextStatus = formData.get("status") === TaskStatus.DONE ? TaskStatus.DONE : TaskStatus.OPEN;

  await updateTask({
    orgId: session.user.orgId,
    taskId,
    input: {
      status: nextStatus
    }
  });

  revalidatePath(`/jobs/${jobId}`);
}
