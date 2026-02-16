import { ImportDedupeMode } from "@prisma/client";

export interface DedupeComparable {
  receiptId?: string | null;
  sku?: string | null;
  returnDate?: string | Date | null;
}

export type DedupeDecision = "CREATE" | "SKIP" | "UPDATE";

export function dedupeFingerprint(input: DedupeComparable) {
  const receipt = (input.receiptId ?? "").trim().toLowerCase();
  const sku = (input.sku ?? "").trim().toLowerCase();
  const returnDate = input.returnDate ? new Date(input.returnDate).toISOString().slice(0, 10) : "";
  return `${receipt}|${sku}|${returnDate}`;
}

export function chooseDedupeDecision(hasExisting: boolean, mode: ImportDedupeMode): DedupeDecision {
  if (!hasExisting) {
    return "CREATE";
  }
  return mode === ImportDedupeMode.UPDATE ? "UPDATE" : "SKIP";
}

export function normalizeReceiptId(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

export function parseIsoDate(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}
