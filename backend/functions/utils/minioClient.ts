// utils/minioClient.ts — Standard S3 service with path-aware endpoint

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

  let endpointFromEnv = process.env.MINIO_ENDPOINT ?? "";
  
  // Use HTTPS by default for all cloud services unless explicitly disabled
  const protocol = process.env.MINIO_USE_SSL === "false" ? "http://" : "https://";
  
  // Assemble the final endpoint carefully: 
  // If the user provided a full path (like /storage/v1/s3), ensure it starts with protocol.
  let finalEndpoint = endpointFromEnv;
  if (!finalEndpoint.startsWith("http")) {
    finalEndpoint = `${protocol}${finalEndpoint}`;
  }

  logger.info("Initializing S3 client", { endpoint: finalEndpoint, bucket: BUCKET });

  _client = new S3Client({
    endpoint: finalEndpoint,
    region: "ap-northeast-1", // Match your project region (was 'us-east-1' in some defaults)
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
    },
    forcePathStyle: true, // Crucial for Supabase and Minio
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

/** Generate a pre-signed GET URL */
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
    await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch (err: any) {
    // Reveal technical code or message for diagnostics
    const msg = err.message || (err.name ? `${err.name}: ${err.$metadata?.httpStatusCode || ""}` : String(err));
    return msg;
  }
}