// utils/minioClient.ts — Final Cloud S3 service

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

  let endpoint = process.env.MINIO_ENDPOINT ?? "localhost";
  // Clean up endpoint: remove protocol if user added it, then ensure our protocol is used
  endpoint = endpoint.replace(/^https?:\/\//, "");
  
  const useSSL = process.env.MINIO_USE_SSL === "true";
  const protocol = useSSL ? "https://" : "http://";
  const finalEndpoint = `${protocol}${endpoint}`;

  logger.info("Connecting to S3", { endpoint: finalEndpoint, bucket: BUCKET });

  _client = new S3Client({
    endpoint: finalEndpoint,
    region: "us-east-1", // Standard default for most S3-compatible endpoints
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
    },
    forcePathStyle: true, // Absolutely required for Supabase/MinIO
  });

  return _client;
}

// ── Bucket Setup ───────────────────────────────────────────────

/** Ensure bucket exists */
export async function ensureBucket(): Promise<void> {
  const client = getClient();
  try {
    await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    logger.info("S3 bucket verified", { bucket: BUCKET });
  } catch (err: any) {
    logger.warn("S3 bucket auto-check failed, attempting creation...", { error: err.message });
    try {
      await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
      logger.info("S3 bucket created", { bucket: BUCKET });
    } catch (createErr: any) {
      logger.error("S3 bucket creation failed", { error: createErr.message });
      throw createErr;
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
export async function checkStorageHealth(): Promise<string | true> {
  try {
    const client = getClient();
    // A simple HEAD bucket check
    await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch (err: any) {
    const msg = err.message || (err.name ? `${err.name}: ${err.$metadata?.httpStatusCode || ""}` : String(err));
    return msg;
  }
}