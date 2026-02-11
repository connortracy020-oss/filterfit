import { JobStatus } from "@prisma/client";

const transitions: Record<JobStatus, JobStatus[]> = {
  LEAD: [JobStatus.CONTRACTED, JobStatus.CANCELLED],
  CONTRACTED: [JobStatus.SITE_SURVEY, JobStatus.ON_HOLD, JobStatus.CANCELLED],
  SITE_SURVEY: [JobStatus.PERMIT_SUBMITTED, JobStatus.ON_HOLD, JobStatus.CANCELLED],
  PERMIT_SUBMITTED: [JobStatus.PERMIT_APPROVED, JobStatus.ON_HOLD, JobStatus.CANCELLED],
  PERMIT_APPROVED: [JobStatus.INSTALL_SCHEDULED, JobStatus.ON_HOLD, JobStatus.CANCELLED],
  INSTALL_SCHEDULED: [JobStatus.INSTALLED, JobStatus.ON_HOLD, JobStatus.CANCELLED],
  INSTALLED: [JobStatus.INSPECTION_SCHEDULED, JobStatus.ON_HOLD],
  INSPECTION_SCHEDULED: [JobStatus.PASSED, JobStatus.ON_HOLD],
  PASSED: [JobStatus.PTO_REQUESTED],
  PTO_REQUESTED: [JobStatus.PTO_GRANTED, JobStatus.ON_HOLD],
  PTO_GRANTED: [],
  ON_HOLD: [JobStatus.CONTRACTED, JobStatus.CANCELLED],
  CANCELLED: []
};

export function canTransitionJobStatus(current: JobStatus, next: JobStatus) {
  if (current === next) {
    return true;
  }
  return transitions[current].includes(next);
}

export function daysInStatus(updatedAt: Date, now = new Date()) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / msPerDay));
}
