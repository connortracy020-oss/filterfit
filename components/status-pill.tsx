import { Badge } from "@/components/ui/badge";

const warningSet = new Set(["SUBMITTED", "IN_REVIEW", "RESCHEDULE_NEEDED", "ON_HOLD", "PTO_REQUESTED"]);
const successSet = new Set(["APPROVED", "PASSED", "PTO_GRANTED", "DONE", "COMPLETED", "SCHEDULED"]);
const dangerSet = new Set(["FAIL", "REJECTED", "REVISION_REQUIRED", "CANCELLED"]);

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  if (warningSet.has(normalized)) {
    variant = "secondary";
  } else if (successSet.has(normalized)) {
    variant = "default";
  } else if (dangerSet.has(normalized)) {
    variant = "destructive";
  }

  return <Badge variant={variant}>{normalized.split("_").join(" ")}</Badge>;
}
