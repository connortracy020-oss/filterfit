import { InspectionOutcome, InspectionStatus, InspectionType, JobStatus, PermitStatus, ReminderChannel, ReminderTriggerType, TaskStatus, UserRole } from "@prisma/client";
import { z } from "zod";

export const registerOrgSchema = z.object({
  orgName: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(UserRole)
});

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(128)
});

export const updateUserRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.nativeEnum(UserRole)
});

export const jobSchema = z.object({
  customerName: z.string().min(1).max(140),
  siteAddress: z.string().min(1).max(200),
  city: z.string().min(1).max(120),
  county: z.string().min(1).max(120),
  state: z.string().min(2).max(2),
  zip: z.string().min(5).max(10),
  utility: z.string().max(120).optional().or(z.literal("")),
  systemSizeKw: z.coerce.number().positive().optional(),
  status: z.nativeEnum(JobStatus),
  startTargetDate: z.coerce.date().optional(),
  installDate: z.coerce.date().optional(),
  notes: z.string().max(4000).optional().or(z.literal(""))
});

export const permitSchema = z.object({
  jobId: z.string().cuid(),
  jurisdictionName: z.string().min(1).max(140),
  permitNumber: z.string().max(120).optional().or(z.literal("")),
  submittedAt: z.coerce.date().optional(),
  approvedAt: z.coerce.date().optional(),
  status: z.nativeEnum(PermitStatus),
  lastContactAt: z.coerce.date().optional(),
  nextFollowUpAt: z.coerce.date().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(4000).optional().or(z.literal(""))
});

export const inspectionSchema = z.object({
  jobId: z.string().cuid(),
  type: z.nativeEnum(InspectionType),
  scheduledFor: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  outcome: z.nativeEnum(InspectionOutcome).default(InspectionOutcome.NA),
  status: z.nativeEnum(InspectionStatus),
  inspectorName: z.string().max(120).optional().or(z.literal("")),
  jurisdictionPhone: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(4000).optional().or(z.literal(""))
});

export const taskSchema = z.object({
  jobId: z.string().cuid(),
  title: z.string().min(1).max(200),
  dueAt: z.coerce.date().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.OPEN),
  assignedToUserId: z.string().cuid().optional(),
  reminderPolicyId: z.string().cuid().optional()
});

export const reminderPolicySchema = z.object({
  name: z.string().min(2).max(120),
  channel: z.nativeEnum(ReminderChannel),
  triggerType: z.nativeEnum(ReminderTriggerType),
  offsetHours: z.coerce.number().int().min(0).max(336),
  enabled: z.boolean().default(true)
});
