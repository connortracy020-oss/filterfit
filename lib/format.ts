import { CaseStatus } from "@prisma/client";

export function formatCaseStatus(status: CaseStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(" ");
}

export function decimalToNumber(value: { toNumber?: () => number } | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value) || 0;
}
