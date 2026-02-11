import { ActivityEntityType, InspectionOutcome, InspectionStatus, JobStatus, PermitStatus, TaskStatus, type Prisma } from "@prisma/client";
import { addHours, addBusinessDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/audit";
import { buildStuckPermitWhere } from "@/lib/jobs/stuck-permits";
import { canTransitionJobStatus } from "@/lib/jobs/status";

export async function createJob(input: Prisma.JobUncheckedCreateInput) {
  return prisma.job.create({
    data: input
  });
}

export async function updateJobStatus(params: {
  orgId: string;
  actorUserId: string;
  jobId: string;
  nextStatus: JobStatus;
}) {
  const existing = await prisma.job.findFirst({
    where: { id: params.jobId, orgId: params.orgId }
  });

  if (!existing) {
    throw new Error("Job not found");
  }

  if (!canTransitionJobStatus(existing.status, params.nextStatus)) {
    throw new Error("Invalid status transition");
  }

  const updated = await prisma.job.update({
    where: { id: existing.id },
    data: { status: params.nextStatus }
  });

  await recordActivity({
    orgId: params.orgId,
    actorUserId: params.actorUserId,
    jobId: updated.id,
    entityType: ActivityEntityType.JOB,
    entityId: updated.id,
    action: "job.status.updated",
    diff: {
      before: existing.status,
      after: updated.status
    }
  });

  return updated;
}

export async function createPermit(params: {
  orgId: string;
  actorUserId: string;
  input: {
    jobId: string;
    jurisdictionName: string;
    permitNumber?: string;
    submittedAt?: Date;
    approvedAt?: Date;
    status: PermitStatus;
    lastContactAt?: Date;
    nextFollowUpAt?: Date;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
  };
}) {
  const job = await prisma.job.findFirst({ where: { id: params.input.jobId, orgId: params.orgId } });
  if (!job) {
    throw new Error("Job not found");
  }

  const permit = await prisma.permit.create({
    data: {
      jobId: params.input.jobId,
      jurisdictionName: params.input.jurisdictionName,
      permitNumber: params.input.permitNumber,
      submittedAt: params.input.submittedAt,
      approvedAt: params.input.approvedAt,
      status: params.input.status,
      lastContactAt: params.input.lastContactAt,
      nextFollowUpAt: params.input.nextFollowUpAt,
      contactEmail: params.input.contactEmail,
      contactPhone: params.input.contactPhone,
      notes: params.input.notes
    }
  });

  await recordActivity({
    orgId: params.orgId,
    actorUserId: params.actorUserId,
    jobId: job.id,
    entityType: ActivityEntityType.PERMIT,
    entityId: permit.id,
    action: "permit.created",
    diff: params.input
  });

  return permit;
}

export async function updatePermit(params: {
  orgId: string;
  actorUserId: string;
  permitId: string;
  input: Partial<{
    jurisdictionName: string;
    permitNumber: string | null;
    submittedAt: Date | null;
    approvedAt: Date | null;
    status: PermitStatus;
    lastContactAt: Date | null;
    nextFollowUpAt: Date | null;
    contactEmail: string | null;
    contactPhone: string | null;
    notes: string | null;
  }>;
}) {
  const permit = await prisma.permit.findFirst({
    where: { id: params.permitId, job: { orgId: params.orgId } },
    include: { job: true }
  });

  if (!permit) {
    throw new Error("Permit not found");
  }

  const updated = await prisma.permit.update({
    where: { id: permit.id },
    data: params.input
  });

  await recordActivity({
    orgId: params.orgId,
    actorUserId: params.actorUserId,
    jobId: permit.jobId,
    entityType: ActivityEntityType.PERMIT,
    entityId: permit.id,
    action: "permit.updated",
    diff: {
      before: permit,
      after: updated
    }
  });

  return updated;
}

export async function quickMarkPermitContactedToday(params: { orgId: string; actorUserId: string; permitId: string }) {
  const today = startOfDay(new Date());
  return updatePermit({
    orgId: params.orgId,
    actorUserId: params.actorUserId,
    permitId: params.permitId,
    input: {
      lastContactAt: today
    }
  });
}

export async function quickSetPermitFollowUp3BusinessDays(params: { orgId: string; actorUserId: string; permitId: string }) {
  const followUp = addBusinessDays(startOfDay(new Date()), 3);
  return updatePermit({
    orgId: params.orgId,
    actorUserId: params.actorUserId,
    permitId: params.permitId,
    input: {
      nextFollowUpAt: followUp
    }
  });
}

export async function createInspection(params: {
  orgId: string;
  actorUserId: string;
  input: {
    jobId: string;
    type: Prisma.InspectionCreateInput["type"];
    scheduledFor?: Date;
    completedAt?: Date;
    outcome?: InspectionOutcome;
    status: InspectionStatus;
    inspectorName?: string;
    jurisdictionPhone?: string;
    notes?: string;
  };
}) {
  const job = await prisma.job.findFirst({ where: { id: params.input.jobId, orgId: params.orgId } });
  if (!job) {
    throw new Error("Job not found");
  }

  const inspection = await prisma.inspection.create({
    data: {
      ...params.input,
      outcome: params.input.outcome ?? InspectionOutcome.NA
    }
  });

  await recordActivity({
    orgId: params.orgId,
    actorUserId: params.actorUserId,
    jobId: job.id,
    entityType: ActivityEntityType.INSPECTION,
    entityId: inspection.id,
    action: "inspection.created",
    diff: params.input
  });

  if (inspection.outcome === InspectionOutcome.FAIL) {
    await prisma.inspection.update({
      where: { id: inspection.id },
      data: {
        status: InspectionStatus.RESCHEDULE_NEEDED
      }
    });

    await prisma.task.create({
      data: {
        jobId: job.id,
        title: "Resolve inspection corrections",
        dueAt: addHours(new Date(), 48),
        status: TaskStatus.OPEN
      }
    });
  }

  return prisma.inspection.findUniqueOrThrow({ where: { id: inspection.id } });
}

export async function updateInspection(params: {
  orgId: string;
  actorUserId: string;
  inspectionId: string;
  input: Partial<{
    type: Prisma.InspectionCreateInput["type"];
    scheduledFor: Date | null;
    completedAt: Date | null;
    outcome: InspectionOutcome;
    status: InspectionStatus;
    inspectorName: string | null;
    jurisdictionPhone: string | null;
    notes: string | null;
  }>;
}) {
  const existing = await prisma.inspection.findFirst({
    where: { id: params.inspectionId, job: { orgId: params.orgId } },
    include: { job: true }
  });

  if (!existing) {
    throw new Error("Inspection not found");
  }

  const nextStatus =
    params.input.outcome === InspectionOutcome.FAIL
      ? InspectionStatus.RESCHEDULE_NEEDED
      : params.input.status ?? existing.status;

  const updated = await prisma.inspection.update({
    where: { id: existing.id },
    data: {
      ...params.input,
      status: nextStatus
    }
  });

  await recordActivity({
    orgId: params.orgId,
    actorUserId: params.actorUserId,
    jobId: existing.jobId,
    entityType: ActivityEntityType.INSPECTION,
    entityId: existing.id,
    action: "inspection.updated",
    diff: {
      before: existing,
      after: updated
    }
  });

  if (params.input.outcome === InspectionOutcome.FAIL) {
    await prisma.task.create({
      data: {
        jobId: existing.jobId,
        title: "Resolve inspection corrections",
        dueAt: addHours(new Date(), 48),
        status: TaskStatus.OPEN
      }
    });
  }

  return updated;
}

export async function createTask(params: {
  orgId: string;
  actorUserId: string;
  input: {
    jobId: string;
    title: string;
    dueAt?: Date;
    status?: TaskStatus;
    assignedToUserId?: string;
    reminderPolicyId?: string;
  };
}) {
  const job = await prisma.job.findFirst({ where: { id: params.input.jobId, orgId: params.orgId } });
  if (!job) {
    throw new Error("Job not found");
  }

  return prisma.task.create({
    data: {
      ...params.input,
      status: params.input.status ?? TaskStatus.OPEN
    }
  });
}

export async function updateTask(params: {
  orgId: string;
  taskId: string;
  input: Partial<{
    title: string;
    dueAt: Date | null;
    status: TaskStatus;
    assignedToUserId: string | null;
    reminderPolicyId: string | null;
  }>;
}) {
  const existing = await prisma.task.findFirst({
    where: {
      id: params.taskId,
      job: { orgId: params.orgId }
    }
  });

  if (!existing) {
    throw new Error("Task not found");
  }

  return prisma.task.update({
    where: { id: existing.id },
    data: params.input
  });
}

export async function queryStuckPermits(orgId: string, today = new Date(), staleContactDays = 5) {
  return prisma.permit.findMany({
    where: buildStuckPermitWhere(orgId, { today, staleContactDays }),
    include: {
      job: true
    },
    orderBy: {
      nextFollowUpAt: "asc"
    }
  });
}
