-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'COORDINATOR', 'CREW', 'VIEWER');
CREATE TYPE "JobStatus" AS ENUM ('LEAD', 'CONTRACTED', 'SITE_SURVEY', 'PERMIT_SUBMITTED', 'PERMIT_APPROVED', 'INSTALL_SCHEDULED', 'INSTALLED', 'INSPECTION_SCHEDULED', 'PASSED', 'PTO_REQUESTED', 'PTO_GRANTED', 'ON_HOLD', 'CANCELLED');
CREATE TYPE "PermitStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REVISION_REQUIRED');
CREATE TYPE "InspectionType" AS ENUM ('ROUGH_ELECTRICAL', 'FINAL_ELECTRICAL', 'BUILDING', 'UTILITY_METER', 'OTHER');
CREATE TYPE "InspectionOutcome" AS ENUM ('PASS', 'FAIL', 'PARTIAL', 'NA');
CREATE TYPE "InspectionStatus" AS ENUM ('NOT_SCHEDULED', 'SCHEDULED', 'COMPLETED', 'RESCHEDULE_NEEDED');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE');
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP');
CREATE TYPE "ReminderTriggerType" AS ENUM ('PERMIT_FOLLOWUP', 'INSPECTION_UPCOMING', 'TASK_DUE');
CREATE TYPE "ReminderRelatedType" AS ENUM ('PERMIT', 'INSPECTION', 'TASK');
CREATE TYPE "ReminderLogStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "ActivityEntityType" AS ENUM ('JOB', 'PERMIT', 'INSPECTION', 'TASK', 'USER', 'REMINDER_POLICY');

-- CreateTable
CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "siteAddress" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "county" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "zip" TEXT NOT NULL,
  "utility" TEXT,
  "systemSizeKw" DECIMAL(10,2),
  "status" "JobStatus" NOT NULL,
  "startTargetDate" TIMESTAMP(3),
  "installDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permit" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "jurisdictionName" TEXT NOT NULL,
  "permitNumber" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "status" "PermitStatus" NOT NULL,
  "lastContactAt" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Inspection" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "type" "InspectionType" NOT NULL,
  "scheduledFor" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "outcome" "InspectionOutcome" NOT NULL DEFAULT 'NA',
  "status" "InspectionStatus" NOT NULL,
  "inspectorName" TEXT,
  "jurisdictionPhone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "assignedToUserId" TEXT,
  "reminderPolicyId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderPolicy" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" "ReminderChannel" NOT NULL,
  "triggerType" "ReminderTriggerType" NOT NULL,
  "offsetHours" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReminderPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderLog" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "relatedType" "ReminderRelatedType" NOT NULL,
  "relatedId" TEXT NOT NULL,
  "channel" "ReminderChannel" NOT NULL,
  "policyId" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "ReminderLogStatus" NOT NULL,
  "error" TEXT,
  CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "jobId" TEXT,
  "entityType" "ActivityEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "diff" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InviteToken" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "token" TEXT NOT NULL,
  "invitedBy" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "ReminderPolicy_orgId_name_key" ON "ReminderPolicy"("orgId", "name");
CREATE UNIQUE INDEX "InviteToken_token_key" ON "InviteToken"("token");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");
CREATE INDEX "User_orgId_role_idx" ON "User"("orgId", "role");
CREATE INDEX "Job_orgId_status_idx" ON "Job"("orgId", "status");
CREATE INDEX "Job_orgId_updatedAt_idx" ON "Job"("orgId", "updatedAt");
CREATE INDEX "Permit_status_nextFollowUpAt_idx" ON "Permit"("status", "nextFollowUpAt");
CREATE INDEX "Permit_jobId_idx" ON "Permit"("jobId");
CREATE INDEX "Inspection_jobId_status_idx" ON "Inspection"("jobId", "status");
CREATE INDEX "Inspection_scheduledFor_idx" ON "Inspection"("scheduledFor");
CREATE INDEX "Task_jobId_status_idx" ON "Task"("jobId", "status");
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");
CREATE INDEX "ReminderPolicy_orgId_triggerType_enabled_idx" ON "ReminderPolicy"("orgId", "triggerType", "enabled");
CREATE INDEX "ReminderLog_orgId_relatedType_relatedId_sentAt_idx" ON "ReminderLog"("orgId", "relatedType", "relatedId", "sentAt");
CREATE INDEX "ReminderLog_policyId_idx" ON "ReminderLog"("policyId");
CREATE INDEX "ActivityLog_orgId_createdAt_idx" ON "ActivityLog"("orgId", "createdAt");
CREATE INDEX "ActivityLog_entityType_entityId_createdAt_idx" ON "ActivityLog"("entityType", "entityId", "createdAt");
CREATE INDEX "InviteToken_orgId_email_idx" ON "InviteToken"("orgId", "email");

-- Foreign Keys
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_reminderPolicyId_fkey" FOREIGN KEY ("reminderPolicyId") REFERENCES "ReminderPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReminderPolicy" ADD CONSTRAINT "ReminderPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ReminderPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
