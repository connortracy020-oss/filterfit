"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { createInvite } from "@/lib/auth/invite";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { inviteUserSchema, reminderPolicySchema, updateUserRoleSchema } from "@/lib/validation";

export async function inviteUserAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageUsers(session.user.role)) {
    throw new Error("Only admins can invite users.");
  }

  const parsed = inviteUserSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid invite request");
  }

  const invite = await createInvite({
    orgId: session.user.orgId,
    invitedBy: session.user.id,
    email: parsed.data.email,
    role: parsed.data.role
  });

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteLink = `${appUrl}/invite/${invite.token}`;

  await sendEmail({
    to: parsed.data.email,
    subject: "You're invited to SolarOps Lite",
    text: `You were invited to join SolarOps Lite as ${invite.role}. Accept invite: ${inviteLink}`
  });

  revalidatePath("/settings/users");
}

export async function updateUserRoleAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageUsers(session.user.role)) {
    throw new Error("Only admins can update roles.");
  }

  const parsed = updateUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid role update");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: parsed.data.userId,
      orgId: session.user.orgId
    }
  });

  if (!user) {
    throw new Error("User not found.");
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      role: parsed.data.role
    }
  });

  revalidatePath("/settings/users");
}

export async function updateReminderPolicyAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageUsers(session.user.role)) {
    throw new Error("Only admins can manage reminder policies.");
  }

  const id = String(formData.get("id") ?? "");

  const parsed = reminderPolicySchema.safeParse({
    name: formData.get("name"),
    channel: formData.get("channel"),
    triggerType: formData.get("triggerType"),
    offsetHours: formData.get("offsetHours"),
    enabled: formData.get("enabled") === "on"
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid reminder policy data");
  }

  if (id) {
    await prisma.reminderPolicy.updateMany({
      where: {
        id,
        orgId: session.user.orgId
      },
      data: parsed.data
    });
  } else {
    await prisma.reminderPolicy.create({
      data: {
        orgId: session.user.orgId,
        ...parsed.data
      }
    });
  }

  redirect("/settings/reminders");
}
