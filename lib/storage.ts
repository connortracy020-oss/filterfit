import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

export const storageConfigured = Boolean(
  env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_REGION
);

let client: S3Client | null = null;

function getClient() {
  if (!storageConfigured) {
    throw new Error("Storage is not configured.");
  }

  if (!client) {
    client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!
      }
    });
  }

  return client;
}

export function makeStorageKey(orgId: string, caseId: string, filename: string) {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${orgId}/${caseId}/${Date.now()}-${sanitized}`;
}

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: params.key,
    ContentType: params.contentType
  });
  return getSignedUrl(getClient(), command, { expiresIn: 900 });
}

export async function createPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key
  });
  return getSignedUrl(getClient(), command, { expiresIn: 900 });
}
