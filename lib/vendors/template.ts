import { addDays } from "date-fns";
import { z } from "zod";

export const templateStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  required: z.boolean().default(true),
  fieldsNeeded: z.array(z.string()).default([]),
  defaultDueDays: z.number().int().nonnegative().optional()
});

export const templateSchema = z.object({
  name: z.string().min(2),
  slaDays: z.number().int().positive().max(365),
  requiredFields: z.array(z.string()).default([]),
  steps: z.array(templateStepSchema).min(1)
});

export type TemplateStep = z.infer<typeof templateStepSchema>;
export type TemplatePayload = z.infer<typeof templateSchema>;

export function parseTemplateSteps(raw: unknown) {
  return z.array(templateStepSchema).parse(raw);
}

export function computeDueDate(template: Pick<TemplatePayload, "slaDays" | "steps">, baseDate = new Date()) {
  const stepDueDays = template.steps
    .map((step) => step.defaultDueDays ?? 0)
    .filter((value) => Number.isFinite(value));
  const maxDays = Math.max(template.slaDays, ...stepDueDays, 0);
  return addDays(baseDate, maxDays);
}

export function buildChecklistItems(
  orgId: string,
  caseId: string,
  steps: TemplateStep[]
) {
  return steps.map((step) => ({
    orgId,
    caseId,
    stepId: step.id,
    title: step.title,
    description: step.description,
    required: step.required,
    fieldsNeeded: step.fieldsNeeded,
    defaultDueDays: step.defaultDueDays
  }));
}

export function collectRequiredFields(template: Pick<TemplatePayload, "requiredFields" | "steps">) {
  const required = new Set(template.requiredFields);
  for (const step of template.steps) {
    if (!step.required) {
      continue;
    }
    for (const field of step.fieldsNeeded) {
      required.add(field);
    }
  }
  return Array.from(required);
}
