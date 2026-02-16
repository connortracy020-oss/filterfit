import { CaseStatus, EvidenceType, ImportDedupeMode, MembershipRole, SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

const numericString = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

const nullableString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null);

export const orgSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(2).max(100)
});

export const vendorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  portalUrl: z.string().trim().url().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal(""))
});

export const createCaseSchema = z.object({
  vendorId: z.string().min(1),
  templateId: nullableString,
  purchaseDate: nullableString,
  returnDate: nullableString,
  receiptId: nullableString,
  sku: nullableString,
  upc: nullableString,
  brand: nullableString,
  model: nullableString,
  serialNumber: nullableString,
  qty: z.coerce.number().int().min(1).default(1),
  unitCost: numericString,
  expectedCredit: numericString,
  customerReturnReason: nullableString,
  internalNotes: nullableString
});

export const updateCaseSchema = createCaseSchema.extend({
  caseId: z.string().min(1),
  status: z.nativeEnum(CaseStatus).optional(),
  actualCredit: numericString
});

export const statusUpdateSchema = z.object({
  caseId: z.string().min(1),
  status: z.nativeEnum(CaseStatus)
});

export const checklistUpdateSchema = z.object({
  caseId: z.string().min(1),
  itemId: z.string().min(1),
  completed: z.coerce.boolean()
});

export const evidencePresignSchema = z.object({
  caseId: z.string().min(1),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().positive().max(20 * 1024 * 1024),
  type: z.nativeEnum(EvidenceType)
});

export const evidenceCompleteSchema = evidencePresignSchema.extend({
  key: z.string().min(1)
});

export const addMemberSchema = z.object({
  email: z.string().trim().email(),
  role: z.nativeEnum(MembershipRole)
});

export const checkoutSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
  interval: z.enum(["monthly", "annual"])
});

export const importMappingInputSchema = z.object({
  importJobId: z.string().min(1),
  dedupeMode: z.nativeEnum(ImportDedupeMode),
  sku: z.string().optional(),
  description: z.string().optional(),
  returnReason: z.string().optional(),
  unitCost: z.string().optional(),
  qty: z.string().optional(),
  vendor: z.string().optional(),
  brand: z.string().optional(),
  returnDate: z.string().optional(),
  receiptId: z.string().optional(),
  serialNumber: z.string().optional(),
  expectedCredit: z.string().optional()
});

export const importConfirmSchema = z.object({
  importJobId: z.string().min(1)
});
