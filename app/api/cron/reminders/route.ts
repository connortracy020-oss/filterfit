import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runReminderCycle } from "@/lib/reminders/service";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await runReminderCycle();
  return NextResponse.json({ ok: true });
}
