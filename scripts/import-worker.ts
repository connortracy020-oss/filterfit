import "dotenv/config";
import { ImportJobStatus } from "@prisma/client";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { processImportJob } from "../lib/import/service";

const intervalMs = Number(process.env.IMPORT_WORKER_INTERVAL_MS ?? 60_000);

async function tick() {
  const jobs = await prisma.importJob.findMany({
    where: {
      status: ImportJobStatus.READY
    },
    orderBy: {
      createdAt: "asc"
    },
    take: 5
  });

  for (const job of jobs) {
    try {
      await processImportJob(job.id);
      logger.info("Import job processed", { jobId: job.id });
    } catch (error) {
      logger.error("Import worker failed on job", {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error)
      });
      await prisma.importJob.update({
        where: {
          id: job.id
        },
        data: {
          status: ImportJobStatus.FAILED,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}

async function run() {
  logger.info("Import worker started", { intervalMs });
  await tick();

  setInterval(() => {
    void tick();
  }, intervalMs);
}

void run();
