import { CaseEventType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getApiOrgContext } from "@/lib/auth/api";
import { logCaseEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { evidenceCompleteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const context = await getApiOrgContext();
  if ("response" in context) {
    return context.response;
  }

  const parsed = evidenceCompleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid evidence payload" }, { status: 400 });
  }

  const caseRecord = await prisma.case.findFirst({
    where: {
      id: parsed.data.caseId,
      orgId: context.org.id
    },
    select: {
      id: true
    }
  });

  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const evidence = await prisma.evidenceFile.create({
    data: {
      orgId: context.org.id,
      caseId: parsed.data.caseId,
      type: parsed.data.type,
      filename: parsed.data.filename,
      url: parsed.data.key,
      mimeType: parsed.data.mimeType,
      size: parsed.data.size,
      uploadedByUserId: context.session.user.id
    }
  });

  await logCaseEvent({
    orgId: context.org.id,
    caseId: parsed.data.caseId,
    actorUserId: context.session.user.id,
    type: CaseEventType.EVIDENCE_UPLOADED,
    message: `Evidence uploaded: ${parsed.data.filename}`
  });

  return NextResponse.json({ id: evidence.id });
}
