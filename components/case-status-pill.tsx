import { CaseStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatCaseStatus } from "@/lib/format";

const variantMap: Record<CaseStatus, "default" | "secondary" | "outline" | "destructive"> = {
  NEW: "outline",
  NEEDS_INFO: "destructive",
  READY_TO_SUBMIT: "secondary",
  SUBMITTED: "default",
  APPROVED: "secondary",
  DENIED: "destructive",
  CREDIT_RECEIVED: "default",
  CLOSED: "outline"
};

export function CaseStatusPill({ status }: { status: CaseStatus }) {
  return <Badge variant={variantMap[status]}>{formatCaseStatus(status)}</Badge>;
}
