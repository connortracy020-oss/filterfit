"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { registerOrgSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { ReminderChannel, ReminderTriggerType, UserRole } from "@prisma/client";

export async function registerOrgAction(formData: FormData) {
  const parsed = registerOrgSchema.safeParse({
    orgName: formData.get("orgName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.orgName
    }
  });

  await prisma.user.create({
    data: {
      orgId: org.id,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  await prisma.reminderPolicy.createMany({
    data: [
      {
        orgId: org.id,
        name: "Permit Follow-up",
        channel: ReminderChannel.EMAIL,
        triggerType: ReminderTriggerType.PERMIT_FOLLOWUP,
        offsetHours: 0,
        enabled: true
      },
      {
        orgId: org.id,
        name: "Inspection Upcoming",
        channel: ReminderChannel.EMAIL,
        triggerType: ReminderTriggerType.INSPECTION_UPCOMING,
        offsetHours: 24,
        enabled: true
      },
      {
        orgId: org.id,
        name: "Task Due Soon",
        channel: ReminderChannel.EMAIL,
        triggerType: ReminderTriggerType.TASK_DUE,
        offsetHours: 24,
        enabled: true
      }
    ]
  });

  redirect("/auth/login?registered=1");
}
