import { UserRole } from "@prisma/client";

export const ADMIN_ROLES: UserRole[] = [UserRole.OWNER, UserRole.ADMIN];
export const COORDINATOR_ROLES: UserRole[] = [UserRole.OWNER, UserRole.ADMIN, UserRole.COORDINATOR];

export function canManageUsers(role: UserRole) {
  return ADMIN_ROLES.includes(role);
}

export function canManageJobs(role: UserRole) {
  return COORDINATOR_ROLES.includes(role);
}

export function canEditJobDetails(role: UserRole) {
  return COORDINATOR_ROLES.includes(role);
}

export function canView(role: UserRole) {
  return [UserRole.OWNER, UserRole.ADMIN, UserRole.COORDINATOR, UserRole.CREW, UserRole.VIEWER].includes(role);
}
