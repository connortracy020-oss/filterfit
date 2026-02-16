import { CaseEventType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface CaseAuditInput {
  orgId: string;
  caseId: string;
  actorUserId?: string | null;
  type: CaseEventType;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

export async function logCaseEvent(input: CaseAuditInput) {
  await prisma.caseEvent.create({
    data: {
      orgId: input.orgId,
      caseId: input.caseId,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      message: input.message,
      metadata: input.metadata
    }
  });
}
