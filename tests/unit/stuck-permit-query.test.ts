import { PermitStatus } from "@prisma/client";
import { buildStuckPermitWhere } from "@/lib/jobs/stuck-permits";

describe("stuck permit query", () => {
  it("targets submitted and in-review permits with stale criteria", () => {
    const today = new Date("2026-01-10T00:00:00.000Z");
    const where = buildStuckPermitWhere("org_1", { today, staleContactDays: 5 });

    expect(where.job).toEqual({ orgId: "org_1" });
    expect(where.status).toEqual({ in: [PermitStatus.SUBMITTED, PermitStatus.IN_REVIEW] });
    expect(where.OR).toHaveLength(3);
  });
});
