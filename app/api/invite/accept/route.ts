import { NextResponse } from "next/server";
import { acceptInvite } from "@/lib/auth/invite";
import { acceptInviteSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = acceptInviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    await acceptInvite(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to accept invite" }, { status: 400 });
  }
}
