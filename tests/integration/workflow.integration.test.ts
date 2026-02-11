import bcrypt from "bcryptjs";
import { InspectionOutcome, InspectionStatus, InspectionType, JobStatus, PermitStatus, UserRole } from "@prisma/client";
import { createInspection, createJob, createPermit } from "@/lib/jobs/service";
import { prisma } from "@/lib/prisma";

const describeIfDb = process.env.RUN_INTEGRATION_TESTS === "true" ? describe : describe.skip;

describeIfDb("workflow integration", () => {
  let orgId: string;
  let actorUserId: string;

  beforeAll(async () => {
    await prisma.reminderLog.deleteMany();
    await prisma.task.deleteMany();
    await prisma.inspection.deleteMany();
    await prisma.permit.deleteMany();
    await prisma.job.deleteMany();
    await prisma.inviteToken.deleteMany();
    await prisma.reminderPolicy.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    const org = await prisma.organization.create({ data: { name: "Test Org" } });
    orgId = org.id;

    const user = await prisma.user.create({
      data: {
        orgId,
        name: "Test Coordinator",
        email: "integration-coord@solarops.local",
        passwordHash: await bcrypt.hash("Password123!", 10),
        role: UserRole.COORDINATOR
      }
    });

    actorUserId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a job + permit + inspection and auto-creates correction task on fail", async () => {
    const job = await createJob({
      orgId,
      customerName: "Integration Customer",
      siteAddress: "101 Test Ave",
      city: "Portland",
      county: "Multnomah",
      state: "OR",
      zip: "97201",
      status: JobStatus.PERMIT_SUBMITTED
    });

    const permit = await createPermit({
      orgId,
      actorUserId,
      input: {
        jobId: job.id,
        jurisdictionName: "City of Portland",
        status: PermitStatus.SUBMITTED,
        submittedAt: new Date(),
        nextFollowUpAt: new Date()
      }
    });

    expect(permit.jobId).toBe(job.id);

    const inspection = await createInspection({
      orgId,
      actorUserId,
      input: {
        jobId: job.id,
        type: InspectionType.FINAL_ELECTRICAL,
        status: InspectionStatus.COMPLETED,
        outcome: InspectionOutcome.FAIL,
        completedAt: new Date()
      }
    });

    expect(inspection.status).toBe(InspectionStatus.RESCHEDULE_NEEDED);

    const correctionTask = await prisma.task.findFirst({
      where: {
        jobId: job.id,
        title: "Resolve inspection corrections"
      }
    });

    expect(correctionTask).not.toBeNull();
  });
});
