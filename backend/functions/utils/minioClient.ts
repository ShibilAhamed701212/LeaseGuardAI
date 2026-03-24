// utils/minioClient.ts — Cloud S3 service (Replacing Minio with AWS SDK)

import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadBucketCommand, 
  CreateBucketCommand,
  HeadObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl as s3GetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger";

const BUCKET = process.env.MINIO_BUCKET ?? "ocr-agent";
const EXPIRY = parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS ?? "3600", 10);

// ── Lazy singleton client ──────────────────────────────────────

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  const endpoint = process.env.MINIO_ENDPOINT;
  const useSSL = process.env.MINIO_USE_SSL === "true";
  const protocol = useSSL ? "https://" : "http://";
  
  // Format endpoint for AWS SDK: must start with https://
  const finalEndpoint = endpoint?.startsWith("http") ? endpoint : `${protocol}${endpoint}`;

  _client = new S3Client({
    endpoint: finalEndpoint,
    region: "ap-northeast-1", // Match your Supabase region
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
    },
    forcePathStyle: true, // Crucial for Supabase/MinIO
  });

  return _client;
}

// ── Bucket Setup ───────────────────────────────────────────────

/** Ensure bucket exists — only call once if needed */
export async function ensureBucket(): Promise<void> {
  const client = getClient();
  try {
    await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    logger.info("S3 bucket verified", { bucket: BUCKET });
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
      logger.info("S3 bucket created", { bucket: BUCKET });
    } else {
      logger.error("S3 bucket check failed", { error: err.message });
      throw err;
    }
  }
}

// ── File Operations ────────────────────────────────────────────

/** Upload a file stream or buffer to S3 */
export async function uploadFile(
  objectName: string,
  data: Buffer | NodeJS.ReadableStream | any,
  mimeType: string,
  _size?: number
): Promise<void> {
  const client = getClient();
  
  // Convert stream to Buffer if necessary for S3 SDK or pass directly if it's a stream
  // For Supabase/S3, direct streaming from Busboy works if you provide Body as the stream.
  
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectName,
    Body: data,
    ContentType: mimeType,
  });

  await client.send(command);
  logger.info("File uploaded to S3", { objectName });
}

/** Generate a pre-signed GET URL (temporary access) */
export async function getSignedUrl(objectName: string): Promise<string> {
  const client = getClient();
  
  // Verify object exists before generating URL
  await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: objectName }));
  
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: objectName,
  });

  const url = await s3GetSignedUrl(client, command, { expiresIn: EXPIRY });
  logger.info("Signed S3 URL generated", { objectName });
  return url;
}

/** Delete a file from S3 */
export async function deleteFile(objectName: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: objectName }));
  logger.info("File deleted from S3", { objectName });
}

/** Check S3 health */
export async function checkStorageHealth(): Promise<boolean> {
  try {
    const client = getClient();
    await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch (err) {
    logger.error("Storage health check failed", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}