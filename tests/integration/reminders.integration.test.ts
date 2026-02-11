import bcrypt from "bcryptjs";
import { JobStatus, PermitStatus, ReminderChannel, ReminderLogStatus, ReminderTriggerType, UserRole } from "@prisma/client";
import { addHours } from "date-fns";
import { runReminderCycle } from "@/lib/reminders/service";
import { prisma } from "@/lib/prisma";

const describeIfDb = process.env.RUN_INTEGRATION_TESTS === "true" ? describe : describe.skip;

describeIfDb("reminder worker integration", () => {
  let orgId: string;
  let permitId: string;

  beforeAll(async () => {
    await prisma.reminderLog.deleteMany();
    await prisma.task.deleteMany();
    await prisma.inspection.deleteMany();
    await prisma.permit.deleteMany();
    await prisma.job.deleteMany();
    await prisma.reminderPolicy.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    const org = await prisma.organization.create({ data: { name: "Reminder Org" } });
    orgId = org.id;

    await prisma.user.create({
      data: {
        orgId,
        name: "Coord",
        email: "coord-reminders@solarops.local",
        passwordHash: await bcrypt.hash("Password123!", 10),
        role: UserRole.COORDINATOR
      }
    });

    await prisma.reminderPolicy.create({
      data: {
        orgId,
        name: "Permit follow-up",
        channel: ReminderChannel.EMAIL,
        triggerType: ReminderTriggerType.PERMIT_FOLLOWUP,
        offsetHours: 0,
        enabled: true
      }
    });

    const job = await prisma.job.create({
      data: {
        orgId,
        customerName: "Reminder Job",
        siteAddress: "55 Alert St",
        city: "Seattle",
        county: "King",
        state: "WA",
        zip: "98101",
        status: JobStatus.PERMIT_SUBMITTED
      }
    });

    const permit = await prisma.permit.create({
      data: {
        jobId: job.id,
        jurisdictionName: "City of Seattle",
        status: PermitStatus.SUBMITTED,
        submittedAt: addHours(new Date(), -48),
        nextFollowUpAt: addHours(new Date(), -1)
      }
    });

    permitId = permit.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates reminder logs", async () => {
    await runReminderCycle(new Date());

    const logs = await prisma.reminderLog.findMany({
      where: {
        orgId,
        relatedId: permitId
      }
    });

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.status).toBe(ReminderLogStatus.SENT);
  });
});
