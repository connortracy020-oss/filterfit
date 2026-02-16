"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Step = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  fieldsNeeded: string[];
  defaultDueDays?: number;
};

interface TemplateEditorProps {
  action: (formData: FormData) => void;
  vendorId: string;
  templateId?: string;
  initialName?: string;
  initialSlaDays?: number;
  initialRequiredFields?: string[];
  initialSteps?: Step[];
}

function createEmptyStep(index: number): Step {
  return {
    id: `step-${Date.now()}-${index}`,
    title: "",
    description: "",
    required: true,
    fieldsNeeded: [],
    defaultDueDays: 0
  };
}

export function TemplateEditor({
  action,
  vendorId,
  templateId,
  initialName = "Default template",
  initialSlaDays = 14,
  initialRequiredFields = [],
  initialSteps = [
    {
      id: "collect-docs",
      title: "Collect evidence",
      description: "Gather receipt and defect photos",
      required: true,
      fieldsNeeded: ["receipt", "photo"],
      defaultDueDays: 2
    }
  ]
}: TemplateEditorProps) {
  const [name, setName] = useState(initialName);
  const [slaDays, setSlaDays] = useState(initialSlaDays);
  const [requiredFields, setRequiredFields] = useState(initialRequiredFields.join(", "));
  const [steps, setSteps] = useState<Step[]>(initialSteps);

  const serializedSteps = useMemo(() => JSON.stringify(steps), [steps]);
  const serializedRequiredFields = useMemo(
    () =>
      JSON.stringify(
        requiredFields
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      ),
    [requiredFields]
  );

  return (
    <form action={action} className="space-y-4 rounded-xl border bg-white p-6">
      <input type="hidden" name="vendorId" value={vendorId} />
      <input type="hidden" name="templateId" value={templateId ?? ""} />
      <input type="hidden" name="steps" value={serializedSteps} />
      <input type="hidden" name="requiredFields" value={serializedRequiredFields} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Template name</Label>
          <Input id="name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="slaDays">SLA days</Label>
          <Input
            id="slaDays"
            name="slaDays"
            type="number"
            min={1}
            value={slaDays}
            onChange={(event) => setSlaDays(Number(event.target.value) || 1)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="requiredFields">Required fields (comma separated)</Label>
        <Input
          id="requiredFields"
          value={requiredFields}
          onChange={(event) => setRequiredFields(event.target.value)}
          placeholder="serialNumber, receipt, photo"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Checklist steps</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSteps((current) => [...current, createEmptyStep(current.length)]);
            }}
          >
            Add step
          </Button>
        </div>

        {steps.map((step, index) => (
          <div key={step.id} className="rounded-lg border p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={step.title}
                placeholder="Step title"
                onChange={(event) => {
                  setSteps((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index
                        ? {
                            ...entry,
                            title: event.target.value
                          }
                        : entry
                    )
                  );
                }}
              />
              <Input
                value={step.defaultDueDays ?? 0}
                type="number"
                min={0}
                placeholder="Default due days"
                onChange={(event) => {
                  setSteps((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index
                        ? {
                            ...entry,
                            defaultDueDays: Number(event.target.value) || 0
                          }
                        : entry
                    )
                  );
                }}
              />
            </div>
            <Textarea
              className="mt-3"
              value={step.description}
              placeholder="Description"
              onChange={(event) => {
                setSteps((current) =>
                  current.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          ...entry,
                          description: event.target.value
                        }
                      : entry
                  )
                );
              }}
            />
            <Input
              className="mt-3"
              value={step.fieldsNeeded.join(", ")}
              placeholder="fieldsNeeded: serialNumber, photo, receipt"
              onChange={(event) => {
                const parsedFields = event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean);

                setSteps((current) =>
                  current.map((entry, entryIndex) =>
                    entryIndex === index
                      ? {
                          ...entry,
                          fieldsNeeded: parsedFields
                        }
                      : entry
                  )
                );
              }}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={step.required}
                  onChange={(event) => {
                    setSteps((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index
                          ? {
                              ...entry,
                              required: event.target.checked
                            }
                          : entry
                      )
                    );
                  }}
                />
                Required
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (index === 0) {
                    return;
                  }
                  setSteps((current) => {
                    const copy = [...current];
                    const [removed] = copy.splice(index, 1);
                    copy.splice(index - 1, 0, removed);
                    return copy;
                  });
                }}
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (index === steps.length - 1) {
                    return;
                  }
                  setSteps((current) => {
                    const copy = [...current];
                    const [removed] = copy.splice(index, 1);
                    copy.splice(index + 1, 0, removed);
                    return copy;
                  });
                }}
              >
                Move down
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setSteps((current) => current.filter((_, entryIndex) => entryIndex !== index));
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="submit">Save template</Button>
    </form>
  );
}
