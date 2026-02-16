import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { getApiOrgContext } from "@/lib/auth/api";
import { createPresignedDownloadUrl, storageConfigured } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { toDateLabel } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const context = await getApiOrgContext();
  if ("response" in context) {
    return context.response;
  }

  const item = await prisma.case.findFirst({
    where: {
      id: params.id,
      orgId: context.org.id
    },
    include: {
      vendor: true,
      template: true,
      checklist: true,
      evidenceFiles: true
    }
  });

  if (!item) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let cursorY = 760;
  const drawLine = (text: string, options?: { bold?: boolean; size?: number }) => {
    page.drawText(text, {
      x: 40,
      y: cursorY,
      size: options?.size ?? 11,
      font: options?.bold ? bold : font,
      color: rgb(0.1, 0.1, 0.1)
    });
    cursorY -= (options?.size ?? 11) + 6;
  };

  drawLine("VendorCredit Radar - Claim Packet", { bold: true, size: 16 });
  drawLine(`${context.org.name} | Case ${item.id}`);
  drawLine(`Created ${toDateLabel(item.createdAt)}`);
  cursorY -= 8;

  drawLine("Summary", { bold: true });
  drawLine(`Vendor: ${item.vendor.name}`);
  drawLine(`Status: ${item.status}`);
  drawLine(`Expected credit: ${item.expectedCredit ?? "-"}`);
  drawLine(`Actual credit: ${item.actualCredit ?? "-"}`);
  drawLine(`Due date: ${toDateLabel(item.dueDate)}`);

  cursorY -= 8;
  drawLine("Checklist", { bold: true });
  for (const step of item.checklist) {
    drawLine(`- [${step.completedAt ? "x" : " "}] ${step.title}`);
    if (cursorY < 90) {
      break;
    }
  }

  cursorY -= 8;
  drawLine("Evidence", { bold: true });
  for (const evidence of item.evidenceFiles.slice(0, 10)) {
    drawLine(`- ${evidence.filename}`);
    const link = storageConfigured ? await createPresignedDownloadUrl(evidence.url) : `stored-key://${evidence.url}`;
    drawLine(`  ${link}`);
    if (cursorY < 90) {
      break;
    }
  }

  cursorY -= 8;
  drawLine("Notes", { bold: true });
  drawLine(item.internalNotes ?? "No internal notes.");

  const bytes = await doc.save();
  const body = Buffer.from(bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=claim-packet-${item.id}.pdf`
    }
  });
}
