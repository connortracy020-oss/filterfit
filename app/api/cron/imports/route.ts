import { ImportJobStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { processImportJob } from "@/lib/import/service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return unauthorized();
  }

  const jobs = await prisma.importJob.findMany({
    where: {
      status: ImportJobStatus.READY
    },
    orderBy: {
      createdAt: "asc"
    },
    take: 20
  });

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await processImportJob(job.id);
      processed += 1;
    } catch (error) {
      failed += 1;
      logger.error("Failed to process import job", {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error)
      });
      await prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: ImportJobStatus.FAILED,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  return NextResponse.json({ processed, failed, queued: jobs.length });
}
