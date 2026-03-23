// utils/minioClient.ts — MinIO service (temp file storage only)

import * as Minio from "minio";
import { logger } from "./logger";

const BUCKET = process.env.MINIO_BUCKET ?? "ocr-agent";
const EXPIRY = parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS ?? "3600", 10);

// ── Lazy singleton client ──────────────────────────────────────

let _client: Minio.Client | null = null;

function getClient(): Minio.Client {
  if (_client) return _client;

  _client = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "",
    secretKey: process.env.MINIO_SECRET_KEY ?? "",
  });

  return _client;
}

// ── Bucket Setup ───────────────────────────────────────────────

/** Ensure bucket exists — call once at startup */
export async function ensureBucket(): Promise<void> {
  const client = getClient();
  const exists = await client.bucketExists(BUCKET);
  if (!exists) {
    await client.makeBucket(BUCKET, "us-east-1");
    logger.info("MinIO bucket created", { bucket: BUCKET });
  } else {
    logger.info("MinIO bucket verified", { bucket: BUCKET });
  }
}

// ── File Operations ────────────────────────────────────────────

/** Upload a file stream or buffer to MinIO */
export async function uploadFile(
  objectName: string,
  data: Buffer | NodeJS.ReadableStream,
  mimeType: string,
  size?: number
): Promise<void> {
  const client = getClient();
  const metaData = { "Content-Type": mimeType };

  if (typeof size === "number") {
    await client.putObject(BUCKET, objectName, data as any, size, metaData);
  } else if (Buffer.isBuffer(data)) {
    await client.putObject(BUCKET, objectName, data, data.length, metaData);
  } else {
    await client.putObject(BUCKET, objectName, data as any, metaData);
  }

  logger.info("File uploaded to MinIO", { objectName });
}

/** Generate a pre-signed GET URL (temporary access) */
export async function getSignedUrl(objectName: string): Promise<string> {
  const client = getClient();
  // Verify object exists before generating URL
  await client.statObject(BUCKET, objectName);
  const url = await client.presignedGetObject(BUCKET, objectName, EXPIRY);
  logger.info("Signed URL generated", { objectName });
  return url;
}

/** Delete a file from MinIO */
export async function deleteFile(objectName: string): Promise<void> {
  const client = getClient();
  await client.removeObject(BUCKET, objectName);
  logger.info("File deleted from MinIO", { objectName });
}