import { ImportDedupeMode } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  chooseDedupeDecision,
  dedupeFingerprint,
  normalizeReceiptId,
  parseIsoDate
} from "@/lib/import/dedupe";

describe("import dedupe", () => {
  it("normalizes fingerprint values for dedupe checks", () => {
    const key = dedupeFingerprint({
      receiptId: " R-1001 ",
      sku: " sku-1 ",
      returnDate: "2026-02-01"
    });

    expect(key).toBe("r-1001|sku-1|2026-02-01");
  });

  it("chooses skip or update when existing case is found", () => {
    expect(chooseDedupeDecision(true, ImportDedupeMode.SKIP)).toBe("SKIP");
    expect(chooseDedupeDecision(true, ImportDedupeMode.UPDATE)).toBe("UPDATE");
    expect(chooseDedupeDecision(false, ImportDedupeMode.SKIP)).toBe("CREATE");
  });

  it("normalizes receipt id and parses dates safely", () => {
    expect(normalizeReceiptId("  ")).toBeNull();
    expect(normalizeReceiptId("R-1")).toBe("R-1");

    expect(parseIsoDate("2026-02-02")?.toISOString()).toContain("2026-02-02");
    expect(parseIsoDate("invalid")).toBeNull();
  });
});
