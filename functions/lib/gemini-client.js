"use strict";
// @ts-nocheck
// gemini-client.ts — Direct Google Gemini API client
// Uses @google/genai SDK with GEMINI_API_KEY env var
// Falls back to Vertex AI if in GCP environment
Object.defineProperty(exports, "__esModule", { value: true });
exports.callGeminiStructured = callGeminiStructured;
exports.callGeminiText = callGeminiText;
exports.callGeminiChat = callGeminiChat;
exports.callGeminiVision = callGeminiVision;
const gemini_1 = require("./gemini");
console.log("[gemini-client] INIT — using direct Google Gemini API");
// ─── Core: structured JSON response ──────────────────────────
async function callGeminiStructured(systemPrompt, userPrompt, responseSchema, temperature = 0.4) {
    const jsonHint = JSON.stringify(responseSchema, null, 2);
    const fullPrompt = `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON matching this structure:\n${jsonHint}`;
    const response = await (0, gemini_1.geminiChat)([
        { role: "system", content: fullPrompt },
        { role: "user", content: userPrompt },
    ]);
    try {
        const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    }
    catch (e) {
        console.error("[gemini-client] Failed to parse JSON:", response.substring(0, 200));
        throw new Error("Gemini returned invalid structured data. Please try again.");
    }
}
// ─── Core: free-form text response ───────────────────────────
async function callGeminiText(systemPrompt, userPrompt, temperature = 0.6) {
    return (0, gemini_1.geminiChat)([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ]);
}
// ─── Core: multi-turn chat ──────────────────────────────────
async function callGeminiChat(systemPrompt, messages, temperature = 0.6) {
    return (0, gemini_1.geminiChat)(messages);
}
// ─── Vision (for OCR / image analysis) ─────────────────────────
// NOTE: Vision requires base64 image input — not yet implemented via direct API
async function callGeminiVision(systemPrompt, textPrompt, imageDataBase64, mimeType, temperature = 0.3) {
    console.warn("[gemini-client] Vision API not yet implemented via direct client. Falling back to text extraction.");
    return (0, gemini_1.geminiChat)([
        { role: "system", content: systemPrompt || "You are a helpful assistant." },
        { role: "user", content: textPrompt },
    ]);
}
