"use strict";
// utils/minioClient.ts — MinIO service (temp file storage only)
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBucket = ensureBucket;
exports.uploadFile = uploadFile;
exports.getSignedUrl = getSignedUrl;
exports.deleteFile = deleteFile;
const Minio = __importStar(require("minio"));
const logger_1 = require("./logger");
const BUCKET = process.env.MINIO_BUCKET ?? "ocr-agent";
const EXPIRY = parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS ?? "3600", 10);
const client = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "",
    secretKey: process.env.MINIO_SECRET_KEY ?? "",
});
/** Ensure bucket exists — call once at startup */
async function ensureBucket() {
    const exists = await client.bucketExists(BUCKET);
    if (!exists) {
        await client.makeBucket(BUCKET, "us-east-1");
        logger_1.logger.info("MinIO bucket created", { bucket: BUCKET });
    }
}
/** Upload a file stream or buffer to MinIO */
async function uploadFile(objectName, data, mimeType, size) {
    const metaData = { "Content-Type": mimeType };
    if (typeof size === "number") {
        await client.putObject(BUCKET, objectName, data, size, metaData);
    }
    else if (Buffer.isBuffer(data)) {
        await client.putObject(BUCKET, objectName, data, data.length, metaData);
    }
    else {
        await client.putObject(BUCKET, objectName, data, metaData);
    }
    logger_1.logger.info("File uploaded to MinIO", { objectName });
}
/** Generate a pre-signed GET URL (temporary access) */
async function getSignedUrl(objectName) {
    const url = await client.presignedGetObject(BUCKET, objectName, EXPIRY);
    logger_1.logger.info("Signed URL generated", { objectName });
    return url;
}
/** Delete a file from MinIO */
async function deleteFile(objectName) {
    await client.removeObject(BUCKET, objectName);
    logger_1.logger.info("File deleted from MinIO", { objectName });
}
//# sourceMappingURL=minioClient.js.map