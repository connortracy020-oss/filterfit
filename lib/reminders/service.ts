import { ReminderChannel, ReminderLogStatus, ReminderRelatedType, ReminderTriggerType, UserRole } from "@prisma/client";
import { addHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { buildReminderDedupeWhere } from "@/lib/reminders/dedupe";
import { sendEmail } from "@/lib/email";

interface ReminderCandidate {
  relatedType: ReminderRelatedType;
  relatedId: string;
  orgId: string;
  recipients: string[];
  title: string;
  body: string;
}

async function createLog(input: {
  orgId: string;
  relatedType: ReminderRelatedType;
  relatedId: string;
  channel: ReminderChannel;
  policyId: string;
  status: ReminderLogStatus;
  error?: string;
}) {
  await prisma.reminderLog.create({
    data: {
      orgId: input.orgId,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      channel: input.channel,
      policyId: input.policyId,
      status: input.status,
      error: input.error
    }
  });
}

async function isDuplicate(input: {
  orgId: string;
  relatedType: ReminderRelatedType;
  relatedId: string;
  channel: ReminderChannel;
  triggerType: ReminderTriggerType;
}) {
  const existing = await prisma.reminderLog.findFirst({
    where: buildReminderDedupeWhere({
      orgId: input.orgId,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      channel: input.channel,
      triggerType: input.triggerType
    })
  });

  return Boolean(existing);
}

async function coordinatorRecipients(orgId: string) {
  const users = await prisma.user.findMany({
    where: {
      orgId,
      role: { in: [UserRole.OWNER, UserRole.ADMIN, UserRole.COORDINATOR] }
    },
    select: {
      email: true
    }
  });

  return users.map((u) => u.email);
}

async function gatherCandidates(policyId: string, now: Date) {
  const policy = await prisma.reminderPolicy.findUnique({
    where: { id: policyId },
    include: { org: true }
  });

  if (!policy || !policy.enabled) {
    return [] as Array<{ candidate: ReminderCandidate; policy: typeof policy }>;
  }

  const deadline = addHours(now, policy.offsetHours);

  if (policy.triggerType === ReminderTriggerType.PERMIT_FOLLOWUP) {
    const permits = await prisma.permit.findMany({
      where: {
        job: { orgId: policy.orgId },
        nextFollowUpAt: {
          lte: deadline
        },
        status: {
          in: ["SUBMITTED", "IN_REVIEW"]
        }
      },
      include: { job: true }
    });

    const recipients = await coordinatorRecipients(policy.orgId);

    return permits.map((permit) => ({
      candidate: {
        relatedType: ReminderRelatedType.PERMIT,
        relatedId: permit.id,
        orgId: policy.orgId,
        recipients,
        title: `Permit follow-up due: ${permit.job.customerName}`,
        body: `${permit.jurisdictionName} follow-up is due for ${permit.job.siteAddress}.`
      },
      policy
    }));
  }

  if (policy.triggerType === ReminderTriggerType.INSPECTION_UPCOMING) {
    const inspections = await prisma.inspection.findMany({
      where: {
        job: { orgId: policy.orgId },
        status: "SCHEDULED",
        scheduledFor: {
          lte: deadline,
          gte: now
        }
      },
      include: { job: true }
    });

    const recipients = await coordinatorRecipients(policy.orgId);

    return inspections.map((inspection) => ({
      candidate: {
        relatedType: ReminderRelatedType.INSPECTION,
        relatedId: inspection.id,
        orgId: policy.orgId,
        recipients,
        title: `Inspection upcoming: ${inspection.job.customerName}`,
        body: `${inspection.type} inspection is scheduled for ${inspection.scheduledFor?.toISOString() ?? "TBD"}.`
      },
      policy
    }));
  }

  const tasks = await prisma.task.findMany({
    where: {
      job: { orgId: policy.orgId },
      status: "OPEN",
      dueAt: {
        lte: deadline,
        gte: now
      }
    },
    include: {
      assignedToUser: {
        select: { email: true }
      },
      job: true
    }
  });

  const coordinators = await coordinatorRecipients(policy.orgId);

  return tasks.map((task) => ({
    candidate: {
      relatedType: ReminderRelatedType.TASK,
      relatedId: task.id,
      orgId: policy.orgId,
      recipients: task.assignedToUser?.email ? [task.assignedToUser.email] : coordinators,
      title: `Task due soon: ${task.title}`,
      body: `${task.title} for ${task.job.customerName} is due ${task.dueAt?.toISOString() ?? "soon"}.`
    },
    policy
  }));
}

async function sendForChannel(channel: ReminderChannel, candidate: ReminderCandidate) {
  if (channel !== ReminderChannel.EMAIL) {
    return;
  }

  if (!candidate.recipients.length) {
    return;
  }

  await Promise.all(candidate.recipients.map((email) => sendEmail({ to: email, subject: candidate.title, text: candidate.body })));
}

export async function runReminderCycle(now = new Date()) {
  const policies = await prisma.reminderPolicy.findMany({
    where: { enabled: true }
  });

  for (const policy of policies) {
    const candidates = await gatherCandidates(policy.id, now);

    for (const { candidate } of candidates) {
      const duplicate = await isDuplicate({
        orgId: candidate.orgId,
        relatedType: candidate.relatedType,
        relatedId: candidate.relatedId,
        channel: policy.channel,
        triggerType: policy.triggerType
      });

      if (duplicate) {
        await createLog({
          orgId: candidate.orgId,
          relatedType: candidate.relatedType,
          relatedId: candidate.relatedId,
          channel: policy.channel,
          policyId: policy.id,
          status: ReminderLogStatus.SKIPPED,
          error: "Duplicate reminder within 24h window"
        });
        continue;
      }

      try {
        await sendForChannel(policy.channel, candidate);
        await createLog({
          orgId: candidate.orgId,
          relatedType: candidate.relatedType,
          relatedId: candidate.relatedId,
          channel: policy.channel,
          policyId: policy.id,
          status: ReminderLogStatus.SENT
        });
      } catch (error) {
        await createLog({
          orgId: candidate.orgId,
          relatedType: candidate.relatedType,
          relatedId: candidate.relatedId,
          channel: policy.channel,
          policyId: policy.id,
          status: ReminderLogStatus.FAILED,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }
}
