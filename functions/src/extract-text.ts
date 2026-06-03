// extract-text.ts — Document text extraction endpoint
// Uses Tesseract OCR for images, plain text for txt/csv/md, basic parsing for others
// Ensures uploaded documents always have viewable content

import { https } from "firebase-functions/v2";
import cors from "cors";
import { extractTextFromBuffer } from "./ocr";

const corsHandler = cors({ origin: true });

export const apiExtractText = https.onRequest(
  { timeoutSeconds: 60, secrets: [] },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      try {
        const contentType = req.headers["content-type"] || "";
        if (!contentType.includes("multipart/form-data")) {
          res.status(400).json({ error: "Multipart form-data required" });
          return;
        }

        // Parse boundary
        const boundary = contentType.split("boundary=")[1];
        if (!boundary) {
          res.status(400).json({ error: "Missing boundary" });
          return;
        }

        // Read full body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks).toString("latin1");
        const parts = rawBody.split(`--${boundary}`);

        interface ExtractedFile {
          filename: string;
          text: string;
          chars: number;
        }

        const results: ExtractedFile[] = [];

        for (const part of parts) {
          if (part.startsWith("--") || !part.trim()) continue;

          const headerEnd = part.indexOf("\r\n\r\n");
          if (headerEnd === -1) continue;

          const header = part.substring(0, headerEnd);
          const body = part.substring(headerEnd + 4).replace(/\r\n$/, "");

          const filenameMatch = header.match(/filename="([^"]+)"/);
          if (!filenameMatch) continue;

          const filename = filenameMatch[1];
          const ext = filename.split(".").pop()?.toLowerCase() || "";
          const fileBuffer = Buffer.from(body, "binary");

          let text = "";

          if (["txt", "md", "csv", "json", "xml", "html", "htm"].includes(ext)) {
            // Text-based files: read directly
            text = fileBuffer.toString("utf-8");
          } else if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "tif"].includes(ext)) {
            // Image files: use OCR
            console.log(`[ExtractText] OCR processing image: ${filename} (${(fileBuffer.length / 1024).toFixed(1)}KB)`);
            try {
              text = await extractTextFromBuffer(fileBuffer);
            } catch (ocrErr) {
              console.error(`[ExtractText] OCR failed for ${filename}:`, ocrErr);
              text = `[OCR extraction failed for ${filename}]`;
            }
          } else if (ext === "pdf") {
            // PDF: basic text extraction (catches printable text streams)
            const textContent = fileBuffer.toString("utf-8");
            // Extract text between stream markers
            const btMatches = textContent.match(/BT\s+[\s\S]*?ET/g);
            if (btMatches && btMatches.length > 0) {
              text = btMatches.map((m) => m.replace(/^BT\s+/, "").replace(/\s+ET$/, "")).join("\n");
            } else {
              // Fallback: extract all printable text sequences
              const printableSequences = textContent.match(/[\x20-\x7E\xA0-\uFFFF]{10,}/g);
              if (printableSequences && printableSequences.length > 0) {
                text = printableSequences.join("\n");
              } else {
                text = `[PDF: ${filename} - Could not extract text. Please view the original file.]`;
              }
            }
          } else if (["doc", "docx"].includes(ext)) {
            // DOCX: extract text from XML content
            const textContent = fileBuffer.toString("utf-8");
            // DOCX is a ZIP containing word/document.xml
            // For raw DOC, try to extract printable text
            const printableSequences = textContent.match(/[\x20-\x7E\xA0-\uFFFF]{8,}/g);
            if (printableSequences && printableSequences.length > 0) {
              text = printableSequences.join("\n");
            } else {
              text = `[DOCX: ${filename} - Could not extract text. Server-side DOCX parsing coming soon.]`;
            }
          } else {
            // Other formats: attempt printable text extraction
            const textContent = fileBuffer.toString("utf-8");
            const printableSequences = textContent.match(/[\x20-\x7E\xA0-\uFFFF]{8,}/g);
            if (printableSequences && printableSequences.length > 10) {
              text = printableSequences.join("\n");
            } else {
              text = `[Unsupported: ${filename} - Text extraction not available for this format]`;
            }
          }

          if (text.length > 0) {
            results.push({
              filename,
              text: text.substring(0, 20000), // Cap at 20K chars
              chars: text.length,
            });
          }
        }

        if (results.length === 0) {
          res.json({ text: "", chars: 0, message: "No extractable text found in uploaded files" });
          return;
        }

        // Return combined results
        const combinedText = results.map((r) => r.text).join("\n\n---\n\n");
        res.json({
          text: combinedText.substring(0, 20000),
          chars: combinedText.length,
          files: results.map((r) => ({ filename: r.filename, chars: r.chars })),
        });
      } catch (error) {
        console.error("Extract Text error:", error);
        res.status(500).json({
          error: "Text extraction failed",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
);
