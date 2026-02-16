-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('ADMIN', 'STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('NEW', 'NEEDS_INFO', 'READY_TO_SUBMIT', 'SUBMITTED', 'APPROVED', 'DENIED', 'CREDIT_RECEIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('RECEIPT', 'PHOTO', 'INVOICE', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseEventType" AS ENUM ('CASE_CREATED', 'CASE_UPDATED', 'STATUS_CHANGED', 'EVIDENCE_UPLOADED', 'TEMPLATE_APPLIED', 'TEMPLATE_UPDATED', 'IMPORT_CREATED', 'IMPORT_COMPLETED', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'READY', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportDedupeMode" AS ENUM ('SKIP', 'UPDATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "portalUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "requiredFields" JSONB NOT NULL,
    "slaDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "templateId" TEXT,
    "assignedToUserId" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3),
    "returnDate" TIMESTAMP(3),
    "receiptId" TEXT,
    "sku" TEXT,
    "upc" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(10,2),
    "expectedCredit" DECIMAL(10,2),
    "actualCredit" DECIMAL(10,2),
    "customerReturnReason" TEXT,
    "internalNotes" TEXT,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseChecklistItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "fieldsNeeded" JSONB NOT NULL,
    "defaultDueDays" INTEGER,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceFile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "CaseEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "originalFilename" TEXT NOT NULL,
    "mapping" JSONB,
    "dedupeMode" "ImportDedupeMode" NOT NULL DEFAULT 'SKIP',
    "previewRows" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "parsed" JSONB,
    "linkedCaseId" TEXT,
    "action" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

-- CreateIndex
CREATE INDEX "Membership_orgId_role_idx" ON "Membership"("orgId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_orgId_key" ON "Membership"("userId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_orgId_key" ON "Subscription"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_status_plan_idx" ON "Subscription"("status", "plan");

-- CreateIndex
CREATE INDEX "Vendor_orgId_idx" ON "Vendor"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_orgId_name_key" ON "Vendor"("orgId", "name");

-- CreateIndex
CREATE INDEX "VendorTemplate_orgId_vendorId_idx" ON "VendorTemplate"("orgId", "vendorId");

-- CreateIndex
CREATE INDEX "cases_orgId_status_idx" ON "cases"("orgId", "status");

-- CreateIndex
CREATE INDEX "cases_orgId_dueDate_idx" ON "cases"("orgId", "dueDate");

-- CreateIndex
CREATE INDEX "cases_orgId_vendorId_idx" ON "cases"("orgId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "cases_orgId_receiptId_sku_returnDate_key" ON "cases"("orgId", "receiptId", "sku", "returnDate");

-- CreateIndex
CREATE INDEX "CaseChecklistItem_orgId_caseId_idx" ON "CaseChecklistItem"("orgId", "caseId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseChecklistItem_caseId_stepId_key" ON "CaseChecklistItem"("caseId", "stepId");

-- CreateIndex
CREATE INDEX "EvidenceFile_orgId_caseId_idx" ON "EvidenceFile"("orgId", "caseId");

-- CreateIndex
CREATE INDEX "CaseEvent_orgId_caseId_createdAt_idx" ON "CaseEvent"("orgId", "caseId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_orgId_status_createdAt_idx" ON "ImportJob"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportRow_importJobId_idx" ON "ImportRow"("importJobId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTemplate" ADD CONSTRAINT "VendorTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTemplate" ADD CONSTRAINT "VendorTemplate_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "VendorTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseChecklistItem" ADD CONSTRAINT "CaseChecklistItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseChecklistItem" ADD CONSTRAINT "CaseChecklistItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseChecklistItem" ADD CONSTRAINT "CaseChecklistItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_linkedCaseId_fkey" FOREIGN KEY ("linkedCaseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

