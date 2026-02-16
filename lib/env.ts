import { z } from "zod";

const booleanFlag = z
  .enum(["true", "false", "1", "0", "yes", "no"])
  .optional()
  .transform((value) => {
    if (!value) {
      return false;
    }
    return ["true", "1", "yes"].includes(value.toLowerCase());
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16).default("replace-with-strong-secret"),
  APP_URL: z.string().url().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(3).default("VendorCredit Radar <noreply@vendorcreditradar.local>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_STARTER_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_STARTER_ANNUAL_PRICE_ID: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_ANNUAL_PRICE_ID: z.string().optional(),
  STRIPE_BUSINESS_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_BUSINESS_ANNUAL_PRICE_ID: z.string().optional(),

  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: booleanFlag,

  REDIS_URL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  ENABLE_BILLING_BYPASS: booleanFlag,
  ALLOW_DEV_CREDENTIALS: booleanFlag,
  TEST_USER_EMAIL: z.string().optional(),
  TEST_USER_PASSWORD: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issue = parsed.error.issues
    .map((entry) => `${entry.path.join(".") || "env"}: ${entry.message}`)
    .join("; ");
  throw new Error(`Invalid environment variables: ${issue}`);
}

export const env = parsed.data;
