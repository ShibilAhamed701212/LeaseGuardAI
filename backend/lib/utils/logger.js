"use strict";
// utils/logger.ts — structured non-sensitive logger
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
function log(level, message, context) {
    const entry = {
        level,
        message,
        context,
        timestamp: new Date().toISOString(),
    };
    // Never log file content, OCR text, or user data
    const safe = JSON.stringify(entry);
    if (level === "error") {
        console.error(safe);
    }
    else if (level === "warn") {
        console.warn(safe);
    }
    else {
        console.log(safe);
    }
}
exports.logger = {
    info: (msg, ctx) => log("info", msg, ctx),
    warn: (msg, ctx) => log("warn", msg, ctx),
    error: (msg, ctx) => log("error", msg, ctx),
    debug: (msg, ctx) => log("debug", msg, ctx),
};
//# sourceMappingURL=logger.js.map