import { promises as fs } from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

interface MagicLinkParams {
  email: string;
  url: string;
}

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function getTransport() {
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS
          }
        : undefined
  });
}

async function persistDevMagicLink(email: string, url: string) {
  if (env.NODE_ENV === "production") {
    return;
  }

  try {
    const targetDir = path.join(process.cwd(), ".tmp", "magic-links");
    await fs.mkdir(targetDir, { recursive: true });
    const fileName = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    await fs.writeFile(path.join(targetDir, `${fileName}.txt`), url, "utf8");
  } catch (error) {
    logger.warn("Unable to persist local magic link", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function sendMagicLinkEmail({ email, url }: MagicLinkParams) {
  const subject = "Sign in to VendorCredit Radar";
  const html = `<p>Use this secure sign-in link:</p><p><a href=\"${url}\">Sign in to VendorCredit Radar</a></p><p>This link expires in 24 hours.</p>`;

  await persistDevMagicLink(email, url);

  if (resendClient) {
    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject,
      html
    });
    return;
  }

  const transport = getTransport();
  if (transport) {
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject,
      html,
      text: `Sign in to VendorCredit Radar: ${url}`
    });
    return;
  }

  logger.info("Magic link email (dev fallback)", { email, url });
}
