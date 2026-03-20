"use strict";
// functions/upload/index.ts — POST /upload
// Uses busboy directly to handle Firebase emulator's body pre-parsing
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const busboy_1 = __importDefault(require("busboy"));
const uuid_1 = require("uuid");
const minioClient_1 = require("../utils/minioClient");
const postgresClient_1 = require("../utils/postgresClient");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
router.post("/", async (req, res) => {
    const busboy = (0, busboy_1.default)({
        headers: req.headers,
        limits: { fileSize: MAX_FILE_SIZE },
    });
    const uploadPromises = [];
    let userId = "";
    let fileUploaded = false;
    let fileError = "";
    let fileName = "";
    let isAborted = false;
    const job_id = (0, uuid_1.v4)();
    busboy.on("file", (_fieldname, stream, info) => {
        if (isAborted) {
            stream.resume();
            return;
        }
        const { filename, mimeType } = info;
        fileName = filename;
        stream.on("limit", () => {
            fileError = "File exceeds 20MB limit";
            isAborted = true;
            stream.resume();
        });
        if (!ALLOWED_MIME.includes(mimeType)) {
            fileError = `Invalid file type: ${mimeType}`;
            isAborted = true;
            stream.resume(); // Drain it to prevent hanging
            // Short-circuit processing entirely
            if ("unpipe" in req)
                req.unpipe(busboy);
            busboy.removeAllListeners();
            req.resume(); // drain the rest of the request
            if (!res.headersSent) {
                res.status(400).json({ error: fileError });
            }
            return;
        }
        fileUploaded = true;
        const ext = filename.split(".").pop() ?? "bin";
        const objectName = `uploads/${job_id}/file.${ext}`;
        // Pipe directly to MinIO, creating a Promise to await during 'finish'
        const uploadTask = (0, minioClient_1.uploadFile)(objectName, stream, mimeType).catch(err => {
            logger_1.logger.error("MinIO upload stream error", { err: err instanceof Error ? err.message : String(err) });
            throw new Error("File upload failed during streaming");
        });
        uploadPromises.push(uploadTask);
    });
    busboy.on("field", (fieldname, val) => {
        if (isAborted)
            return;
        if (fieldname === "user_id") {
            userId = val;
        }
    });
    busboy.on("finish", async () => {
        if (res.headersSent || isAborted)
            return;
        let objectName = "";
        try {
            // Create objectName early for cleanup in catch block
            const ext = fileName.split(".").pop() ?? "bin";
            objectName = `uploads/${job_id}/file.${ext}`;
            // 1. Wait for all file upload promises to complete to ensure field and file processing is completely settled
            await Promise.all(uploadPromises);
            // 2. Perform validations after MinIO upload and form parsing
            if (fileError) {
                throw new Error(fileError);
            }
            if (!fileUploaded || !fileName) {
                throw new Error("No file uploaded");
            }
            if (!userId || userId.trim() === "") {
                throw new Error("user_id is required");
            }
            // 3. Create job record in PostgreSQL (metadata only)
            await (0, postgresClient_1.createJob)(job_id);
            logger_1.logger.info("Upload complete", { job_id });
            // Contract: { job_id, status: "uploaded" }
            res.status(200).json({ job_id, status: "uploaded" });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "File upload failed";
            logger_1.logger.error("Upload handler error", { message });
            // Cleanup MinIO file if it was uploaded but validation or database creation failed
            if (objectName && fileUploaded) {
                try {
                    await (0, minioClient_1.deleteFile)(objectName);
                }
                catch (delErr) {
                    logger_1.logger.error("Failed to cleanup orphaned MinIO object", { objectName });
                }
            }
            if (!res.headersSent) {
                const status = message.includes("user_id") || message.includes("uploaded") || message.includes("limit") || message.includes("type") ? 400 : 500;
                res.status(status).json({ error: message });
            }
        }
    });
    busboy.on("error", (err) => {
        if (isAborted)
            return;
        logger_1.logger.error("Busboy error", { message: err.message });
        if (!res.headersSent) {
            res.status(500).json({ error: "File upload failed" });
        }
    });
    // Firebase Functions emulator puts the raw body on req.rawBody
    if (req.rawBody) {
        busboy.end(req.rawBody);
    }
    else {
        req.pipe(busboy);
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map