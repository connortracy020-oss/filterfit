import { JobStatus } from "@prisma/client";
import { canTransitionJobStatus, daysInStatus } from "@/lib/jobs/status";

describe("job status transitions", () => {
  it("allows valid transitions", () => {
    expect(canTransitionJobStatus(JobStatus.LEAD, JobStatus.CONTRACTED)).toBe(true);
    expect(canTransitionJobStatus(JobStatus.PERMIT_SUBMITTED, JobStatus.PERMIT_APPROVED)).toBe(true);
    expect(canTransitionJobStatus(JobStatus.PTO_REQUESTED, JobStatus.PTO_GRANTED)).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransitionJobStatus(JobStatus.LEAD, JobStatus.PTO_GRANTED)).toBe(false);
    expect(canTransitionJobStatus(JobStatus.CANCELLED, JobStatus.CONTRACTED)).toBe(false);
  });

  it("computes days in status", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");
    const updatedAt = new Date("2026-01-07T12:00:00.000Z");
    expect(daysInStatus(updatedAt, now)).toBe(2);
  });
});
