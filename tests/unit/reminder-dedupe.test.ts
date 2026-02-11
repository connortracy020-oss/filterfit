import { ReminderChannel, ReminderRelatedType, ReminderTriggerType } from "@prisma/client";
import { buildReminderDedupeWhere, dedupeWindowStart } from "@/lib/reminders/dedupe";

describe("reminder dedupe", () => {
  it("builds 24h dedupe filter", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");
    const where = buildReminderDedupeWhere({
      orgId: "org_123",
      relatedType: ReminderRelatedType.PERMIT,
      relatedId: "permit_123",
      channel: ReminderChannel.EMAIL,
      triggerType: ReminderTriggerType.PERMIT_FOLLOWUP,
      now
    });

    expect(where.orgId).toBe("org_123");
    expect(where.relatedType).toBe(ReminderRelatedType.PERMIT);
    expect(where.channel).toBe(ReminderChannel.EMAIL);
    expect(where.sentAt.gte).toEqual(dedupeWindowStart(now));
  });
});
