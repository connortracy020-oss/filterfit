import { PermitStatus, Prisma } from "@prisma/client";
import { subDays } from "date-fns";

interface StuckPermitFilterInput {
  today?: Date;
  staleContactDays?: number;
}

export function buildStuckPermitWhere(orgId: string, input: StuckPermitFilterInput = {}): Prisma.PermitWhereInput {
  const today = input.today ?? new Date();
  const staleContactDays = input.staleContactDays ?? 5;
  const staleContactCutoff = subDays(today, staleContactDays);

  return {
    job: {
      orgId
    },
    status: {
      in: [PermitStatus.SUBMITTED, PermitStatus.IN_REVIEW]
    },
    OR: [
      {
        nextFollowUpAt: {
          lte: today
        }
      },
      {
        lastContactAt: {
          lt: staleContactCutoff
        }
      },
      {
        AND: [
          { submittedAt: { lte: subDays(today, 7) } },
          { lastContactAt: null }
        ]
      }
    ]
  };
}
