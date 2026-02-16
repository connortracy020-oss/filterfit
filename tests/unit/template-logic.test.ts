import { describe, expect, it } from "vitest";
import {
  buildChecklistItems,
  collectRequiredFields,
  computeDueDate,
  parseTemplateSteps
} from "@/lib/vendors/template";

describe("vendor template logic", () => {
  it("computes due date using max between sla and step defaults", () => {
    const base = new Date("2026-02-01T00:00:00.000Z");
    const due = computeDueDate(
      {
        slaDays: 10,
        steps: [
          {
            id: "a",
            title: "A",
            required: true,
            fieldsNeeded: [],
            defaultDueDays: 3
          },
          {
            id: "b",
            title: "B",
            required: true,
            fieldsNeeded: [],
            defaultDueDays: 14
          }
        ]
      },
      base
    );

    expect(due.toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });

  it("collects required fields from template and required steps", () => {
    const fields = collectRequiredFields({
      requiredFields: ["serialNumber", "receipt"],
      steps: [
        {
          id: "a",
          title: "Collect photo",
          required: true,
          fieldsNeeded: ["photo"],
          description: "",
          defaultDueDays: 1
        },
        {
          id: "b",
          title: "Optional note",
          required: false,
          fieldsNeeded: ["ignoredField"],
          description: "",
          defaultDueDays: 1
        }
      ]
    });

    expect(fields).toEqual(expect.arrayContaining(["serialNumber", "receipt", "photo"]));
    expect(fields).not.toContain("ignoredField");
  });

  it("builds checklist item records for persistence", () => {
    const steps = parseTemplateSteps([
      {
        id: "step-1",
        title: "Attach receipt",
        required: true,
        fieldsNeeded: ["receipt"],
        description: "",
        defaultDueDays: 2
      }
    ]);

    const checklist = buildChecklistItems("org-1", "case-1", steps);

    expect(checklist).toHaveLength(1);
    expect(checklist[0]).toMatchObject({
      orgId: "org-1",
      caseId: "case-1",
      stepId: "step-1",
      title: "Attach receipt",
      required: true
    });
  });
});
