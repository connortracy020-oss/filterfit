import bcrypt from "bcryptjs";
import {
  ActivityEntityType,
  InspectionOutcome,
  InspectionStatus,
  InspectionType,
  JobStatus,
  PermitStatus,
  ReminderChannel,
  ReminderTriggerType,
  TaskStatus,
  UserRole
} from "@prisma/client";
import { addDays, addHours, startOfDay } from "date-fns";
import { prisma } from "../lib/prisma";

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.reminderLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.permit.deleteMany();
  await prisma.job.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.reminderPolicy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: "SunPeak Solar"
    }
  });

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const [admin, coordinator, crew, viewer] = await Promise.all([
    prisma.user.create({
      data: {
        orgId: org.id,
        name: "Avery Admin",
        email: "admin@solarops.local",
        passwordHash,
        role: UserRole.ADMIN
      }
    }),
    prisma.user.create({
      data: {
        orgId: org.id,
        name: "Casey Coordinator",
        email: "coord@solarops.local",
        passwordHash,
        role: UserRole.COORDINATOR
      }
    }),
    prisma.user.create({
      data: {
        orgId: org.id,
        name: "Chris Crew",
        email: "crew@solarops.local",
        passwordHash,
        role: UserRole.CREW
      }
    }),
    prisma.user.create({
      data: {
        orgId: org.id,
        name: "Vince Viewer",
        email: "viewer@solarops.local",
        passwordHash,
        role: UserRole.VIEWER
      }
    })
  ]);

  const reminderPolicies = await prisma.reminderPolicy.createManyAndReturn({
    data: [
      {
        orgId: org.id,
        name: "Permit Follow-up",
        channel: ReminderChannel.EMAIL,
        triggerType: ReminderTriggerType.PERMIT_FOLLOWUP,
        offsetHours: 0,
        enabled: true
      },
      {
        orgId: org.id,
        name: "Inspection 24h Reminder",
        channel: ReminderChannel.EMAIL,
        triggerType: ReminderTriggerType.INSPECTION_UPCOMING,
        offsetHours: 24,
        enabled: true
      },
      {
        orgId: org.id,
        name: "Task 24h Reminder",
        channel: ReminderChannel.EMAIL,
        triggerType: ReminderTriggerType.TASK_DUE,
        offsetHours: 24,
        enabled: true
      }
    ]
  });

  const policyByTrigger = Object.fromEntries(reminderPolicies.map((policy) => [policy.triggerType, policy]));

  const statuses: JobStatus[] = [
    JobStatus.LEAD,
    JobStatus.CONTRACTED,
    JobStatus.SITE_SURVEY,
    JobStatus.PERMIT_SUBMITTED,
    JobStatus.PERMIT_APPROVED,
    JobStatus.INSTALL_SCHEDULED,
    JobStatus.INSTALLED,
    JobStatus.INSPECTION_SCHEDULED,
    JobStatus.PASSED,
    JobStatus.PTO_REQUESTED,
    JobStatus.ON_HOLD,
    JobStatus.CANCELLED
  ];

  const jobs = [];

  for (let i = 0; i < 12; i++) {
    const status = statuses[i];
    const job = await prisma.job.create({
      data: {
        orgId: org.id,
        customerName: `Customer ${i + 1}`,
        siteAddress: `${1200 + i} Solar Ridge Ave`,
        city: i % 2 === 0 ? "Portland" : "Vancouver",
        county: i % 2 === 0 ? "Multnomah" : "Clark",
        state: i % 2 === 0 ? "OR" : "WA",
        zip: i % 2 === 0 ? "97201" : "98660",
        utility: i % 2 === 0 ? "PGE" : "Clark Public Utilities",
        systemSizeKw: (5 + i * 0.5).toFixed(2),
        status,
        startTargetDate: addDays(new Date(), i - 3),
        installDate: status === JobStatus.INSTALLED || status === JobStatus.INSPECTION_SCHEDULED || status === JobStatus.PASSED || status === JobStatus.PTO_REQUESTED ? addDays(new Date(), -2 - i) : null,
        notes: "Seeded demo job"
      }
    });
    jobs.push(job);
  }

  // Stuck permits
  await prisma.permit.create({
    data: {
      jobId: jobs[3].id,
      jurisdictionName: "City of Vancouver",
      permitNumber: "VAN-1001",
      submittedAt: addDays(new Date(), -15),
      status: PermitStatus.IN_REVIEW,
      lastContactAt: addDays(new Date(), -9),
      nextFollowUpAt: addDays(new Date(), -1),
      contactEmail: "permits@city.example",
      notes: "Waiting on plan review"
    }
  });

  await prisma.permit.create({
    data: {
      jobId: jobs[4].id,
      jurisdictionName: "City of Portland",
      permitNumber: "PDX-1002",
      submittedAt: addDays(new Date(), -10),
      status: PermitStatus.SUBMITTED,
      lastContactAt: null,
      nextFollowUpAt: addDays(new Date(), -2),
      notes: "No response yet"
    }
  });

  await prisma.permit.create({
    data: {
      jobId: jobs[10].id,
      jurisdictionName: "Clark County",
      permitNumber: "CLK-2211",
      submittedAt: addDays(new Date(), -20),
      status: PermitStatus.SUBMITTED,
      lastContactAt: addDays(new Date(), -12),
      nextFollowUpAt: addDays(new Date(), -1),
      notes: "Revision requested pending response"
    }
  });

  // Non-stuck permit
  await prisma.permit.create({
    data: {
      jobId: jobs[6].id,
      jurisdictionName: "City of Gresham",
      permitNumber: "GRS-3321",
      submittedAt: addDays(new Date(), -4),
      status: PermitStatus.APPROVED,
      approvedAt: addDays(new Date(), -1),
      lastContactAt: addDays(new Date(), -1)
    }
  });

  const weekBase = startOfDay(new Date());

  // 3 inspections scheduled this week
  await prisma.inspection.createMany({
    data: [
      {
        jobId: jobs[6].id,
        type: InspectionType.FINAL_ELECTRICAL,
        scheduledFor: addHours(weekBase, 30),
        status: InspectionStatus.SCHEDULED,
        outcome: InspectionOutcome.NA,
        inspectorName: "Inspector Lane"
      },
      {
        jobId: jobs[7].id,
        type: InspectionType.BUILDING,
        scheduledFor: addHours(weekBase, 52),
        status: InspectionStatus.SCHEDULED,
        outcome: InspectionOutcome.NA,
        inspectorName: "Inspector Patel"
      },
      {
        jobId: jobs[8].id,
        type: InspectionType.UTILITY_METER,
        scheduledFor: addHours(weekBase, 75),
        status: InspectionStatus.SCHEDULED,
        outcome: InspectionOutcome.NA,
        inspectorName: "Inspector Cruz"
      }
    ]
  });

  await prisma.task.createMany({
    data: [
      {
        jobId: jobs[3].id,
        title: "Call permit desk",
        dueAt: addHours(new Date(), 6),
        status: TaskStatus.OPEN,
        assignedToUserId: coordinator.id,
        reminderPolicyId: policyByTrigger.TASK_DUE?.id
      },
      {
        jobId: jobs[6].id,
        title: "Confirm crew availability",
        dueAt: addHours(new Date(), 20),
        status: TaskStatus.OPEN,
        assignedToUserId: crew.id,
        reminderPolicyId: policyByTrigger.TASK_DUE?.id
      },
      {
        jobId: jobs[9].id,
        title: "Submit PTO packet",
        dueAt: addHours(new Date(), 22),
        status: TaskStatus.OPEN,
        assignedToUserId: admin.id,
        reminderPolicyId: policyByTrigger.TASK_DUE?.id
      }
    ]
  });

  // Basic activity history
  await prisma.activityLog.createMany({
    data: [
      {
        orgId: org.id,
        actorUserId: coordinator.id,
        jobId: jobs[3].id,
        entityType: ActivityEntityType.JOB,
        entityId: jobs[3].id,
        action: "job.status.updated",
        diff: { before: "SITE_SURVEY", after: "PERMIT_SUBMITTED" }
      },
      {
        orgId: org.id,
        actorUserId: coordinator.id,
        jobId: jobs[7].id,
        entityType: ActivityEntityType.INSPECTION,
        entityId: jobs[7].id,
        action: "inspection.created",
        diff: { type: "BUILDING" }
      }
    ]
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete");
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
