import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "vendorcredit-radar",
    timestamp: new Date().toISOString()
  });
}
