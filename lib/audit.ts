import { ActivityEntityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface AuditParams {
  orgId: string;
  actorUserId?: string;
  jobId?: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  diff: Prisma.InputJsonValue;
}

export async function recordActivity(params: AuditParams) {
  await prisma.activityLog.create({
    data: {
      orgId: params.orgId,
      actorUserId: params.actorUserId,
      jobId: params.jobId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      diff: params.diff
    }
  });
}
