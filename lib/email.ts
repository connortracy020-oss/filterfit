import nodemailer from "nodemailer";
import { env } from "@/lib/env";

interface EmailInput {
  to: string;
  subject: string;
  text: string;
}

function createTransport() {
  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: Number(env.SMTP_PORT) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
  }

  return nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true
  });
}

const transport = createTransport();

export async function sendEmail(input: EmailInput) {
  const from = env.SMTP_FROM ?? "solarops-lite@localhost";
  const info = await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text
  });

  if (!env.SMTP_HOST) {
    const preview = (info as unknown as { message?: string | Buffer }).message;
    const raw = Buffer.isBuffer(preview) ? preview.toString("utf8") : preview ?? `messageId=${info.messageId}`;
    // Local fallback if SMTP is not configured.
    // eslint-disable-next-line no-console
    console.log(`\n[SolarOps Email Preview]\n${raw}\n`);
  }

  return info;
}
