import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function createInvite(params: {
  orgId: string;
  invitedBy: string;
  email: string;
  role: UserRole;
}) {
  const token = randomBytes(24).toString("hex");

  return prisma.inviteToken.create({
    data: {
      orgId: params.orgId,
      invitedBy: params.invitedBy,
      email: params.email.toLowerCase(),
      role: params.role,
      token,
      expiresAt: addDays(new Date(), 7)
    }
  });
}

export async function acceptInvite(params: {
  token: string;
  name: string;
  password: string;
}) {
  const invite = await prisma.inviteToken.findUnique({
    where: { token: params.token }
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new Error("This invite link is invalid or expired.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    throw new Error("User already exists for this email.");
  }

  const passwordHash = await bcrypt.hash(params.password, 10);

  const user = await prisma.user.create({
    data: {
      orgId: invite.orgId,
      email: invite.email,
      name: params.name,
      passwordHash,
      role: invite.role
    }
  });

  await prisma.inviteToken.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() }
  });

  return user;
}
