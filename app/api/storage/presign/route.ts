import { NextResponse } from "next/server";
import { getApiOrgContext } from "@/lib/auth/api";
import { makeStorageKey, createPresignedUploadUrl, storageConfigured } from "@/lib/storage";
import { evidencePresignSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const context = await getApiOrgContext();
  if ("response" in context) {
    return context.response;
  }

  const body = await request.json();
  const parsed = evidencePresignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }

  const record = await prisma.case.findFirst({
    where: {
      id: parsed.data.caseId,
      orgId: context.org.id
    },
    select: {
      id: true
    }
  });

  if (!record) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const key = makeStorageKey(context.org.id, parsed.data.caseId, parsed.data.filename);

  if (!storageConfigured) {
    return NextResponse.json({
      uploadUrl: `${new URL(request.url).origin}/api/storage/mock?key=${encodeURIComponent(key)}`,
      key
    });
  }

  const uploadUrl = await createPresignedUploadUrl({
    key,
    contentType: parsed.data.mimeType
  });

  return NextResponse.json({ uploadUrl, key });
}
