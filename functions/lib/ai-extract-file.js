"use strict";
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
exports.apiExtractFile = void 0;
// @ts-nocheck
const secrets_1 = require("./secrets");
const admin = __importStar(require("firebase-admin"));
// ai-extract-file — Firebase Cloud Function
// Extracts text content from uploaded files (PDFs, DOCX, TXT)
// NO Gemini Vision — uses pdf-parse for PDFs, mammoth for DOCX
// Images are handled client-side via Tesseract.js (see src/lib/document-parser.ts)
//
// Cost: ₹0 per extraction (no AI API calls)
// v2.0: Gemini Vision fully removed
// v2.0: Gemini Vision fully removed — images via client-side Tesseract.js
const v2_1 = require("firebase-functions/v2");
const cors_1 = require("./cors");
const corsHandler = cors_1.restrictedCors;
// ─── PDF extraction ─────────────────────────────────────────────
async function extractPdfText(base64Data) {
    try {
        const { PDFParse } = require("pdf-parse");
        const raw = Buffer.from(base64Data, "base64");
        const pdf = new PDFParse(new Uint8Array(raw));
        await pdf.load();
        const result = await pdf.getText();
        await pdf.destroy();
        // v2.4.5 getText() returns { pages, text, total }
        const text = (result && (result.text || result)) || "";
        return typeof text === "string" ? text : JSON.stringify(text);
    }
    catch (err) {
        console.error("[extract-pdf] Error:", err);
        throw new Error("Failed to extract PDF content");
    }
}
// ─── DOCX extraction ────────────────────────────────────────────
async function extractDocxText(base64Data) {
    try {
        const mammoth = require("mammoth");
        const buffer = Buffer.from(base64Data, "base64");
        const result = await mammoth.extractRawText({ buffer });
        return result.value || "";
    }
    catch (err) {
        console.error("[extract-docx] Error:", err);
        throw new Error("Failed to extract DOCX content");
    }
}
// ─── Image text extraction (NO Gemini — Tesseract.js handles client-side) ──
// This server-side image handler is a fallback for when Tesseract.js fails
// It returns a message telling the user that the image couldn't be processed
async function extractImageTextFallback(_base64Data, fileName) {
    // No Gemini Vision — images should be processed client-side via Tesseract.js
    // This fallback returns a placeholder if somehow an image reaches the server
    console.log(`[extract-file] Image ${fileName} reached server. Client-side OCR should handle images.`);
    return `[Image: ${fileName} — text could not be extracted automatically. Please use client-side OCR (Tesseract.js) or re-upload a text-based document.]`;
}
// ─── Main handler ───────────────────────────────────────────────
exports.apiExtractFile = v2_1.https.onRequest({
    timeoutSeconds: 60,
    region: "us-central1", secrets: secrets_1.aiFunctionSecrets,
}, async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        const authToken = (req.headers.authorization || "").replace("Bearer ", "") || req.body?.token;
        if (!authToken) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }
        let uid;
        try {
            const decoded = await admin.auth().verifyIdToken(authToken);
            uid = decoded.uid;
        }
        catch {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }
        try {
            const { fileData, fileName, mimeType } = req.body;
            if (!fileData || !mimeType) {
                res.status(400).json({ error: "fileData and mimeType are required" });
                return;
            }
            // Strip data URL prefix if present
            const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
            const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";
            let content = "";
            console.log(`[extract-file] Extracting: ${fileName || "unknown"} (${mimeType})`);
            // Route by mime type / extension — NO Gemini calls
            if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext)) {
                // Images should be handled client-side by Tesseract.js
                // This is a server-side fallback that returns a warning
                content = await extractImageTextFallback(cleanBase64, fileName || "image");
            }
            else if (mimeType === "application/pdf" || ext === "pdf") {
                content = await extractPdfText(cleanBase64);
                // If pdf-parse returns empty, note it
                if (!content.trim()) {
                    console.log("[extract-file] PDF text was empty — may be a scanned document");
                    content = `[PDF: ${fileName || "unknown"} — text could not be extracted. This may be a scanned image PDF. Please upload the text version or use OCR.]`;
                }
            }
            else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                ext === "docx") {
                content = await extractDocxText(cleanBase64);
            }
            else if (mimeType === "text/plain" || mimeType === "text/markdown" || mimeType === "text/csv" || ext === "txt" || ext === "md" || ext === "csv") {
                content = Buffer.from(cleanBase64, "base64").toString("utf-8");
            }
            else if (ext === "doc") {
                // Old .doc format — no Gemini fallback, suggest conversion
                content = `[Old Word document (.doc): ${fileName || "unknown"} — please convert to .docx or PDF for reliable text extraction.]`;
            }
            else {
                // Unknown type — try text decoding
                try {
                    content = Buffer.from(cleanBase64, "base64").toString("utf-8");
                    if ((content.match(/\ufffd/g) || []).length > content.length * 0.1) {
                        content = `[Unsupported file format: ${fileName || "unknown"} — please upload as PDF, DOCX, TXT, or image.]`;
                    }
                }
                catch {
                    content = `[Unsupported file format: ${fileName || "unknown"}]`;
                }
            }
            if (!content || content.trim().length < 5) {
                res.status(422).json({
                    success: false,
                    error: "Could not extract meaningful content from the file",
                    content: "",
                });
                return;
            }
            // Truncate very large extractions to prevent token overflow
            const MAX_LENGTH = 25000;
            if (content.length > MAX_LENGTH) {
                content = content.substring(0, MAX_LENGTH) + "\n\n[Content truncated at " + MAX_LENGTH + " characters]";
            }
            console.log(`[extract-file] Extracted ${content.length} chars from ${fileName || "file"}`);
            res.json({
                success: true,
                content,
                fileName: fileName || "unknown",
                mimeType,
                charCount: content.length,
            });
        }
        catch (error) {
            console.error("[extract-file] Error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to extract file content",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });
});
