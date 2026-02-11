import { ReminderChannel, ReminderRelatedType, ReminderTriggerType } from "@prisma/client";
import { subHours } from "date-fns";

export interface DedupInput {
  orgId: string;
  relatedType: ReminderRelatedType;
  relatedId: string;
  channel: ReminderChannel;
  triggerType: ReminderTriggerType;
  now?: Date;
}

export function dedupeWindowStart(now = new Date()) {
  return subHours(now, 24);
}

export function buildReminderDedupeWhere(input: DedupInput) {
  return {
    orgId: input.orgId,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    channel: input.channel,
    policy: {
      triggerType: input.triggerType
    },
    sentAt: {
      gte: dedupeWindowStart(input.now)
    }
  };
}
