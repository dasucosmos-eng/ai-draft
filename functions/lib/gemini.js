"use strict";
// @ts-nocheck
// gemini.ts — Google Gemini API client using @google/genai SDK
// Uses the official SDK instead of raw HTTP for better reliability
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiChat = geminiChat;
const { GoogleGenAI } = require("@google/genai");
// Model options in order of preference
const GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
];
let _ai = null;
let _lastModel = null;
function getAI() {
    const key = process.env.GEMINI_API_KEY;
    if (!key)
        throw new Error("GEMINI_API_KEY not configured");
    if (!_ai) {
        _ai = new GoogleGenAI({ apiKey: key });
    }
    return _ai;
}
async function geminiChat(messages) {
    const ai = getAI();
    let systemInstruction = "";
    const contents = [];
    for (const m of messages) {
        if (m.role === "system") {
            systemInstruction = m.content;
        }
        else {
            contents.push({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
            });
        }
    }
    // Try models in order of preference
    let lastError = null;
    for (const model of GEMINI_MODELS) {
        try {
            const config = {};
            if (systemInstruction) {
                config.systemInstruction = systemInstruction;
            }
            const response = await ai.models.generateContent({
                model,
                contents,
                config,
            });
            const text = response.text;
            if (text) {
                _lastModel = model;
                return text;
            }
            // Empty response — try next model
            console.warn(`[gemini] Model ${model} returned empty response, trying next...`);
        }
        catch (err) {
            lastError = err;
            const errMsg = err?.message || String(err);
            // If the error is about model not found or quota, try next model
            if (errMsg.includes("not found") ||
                errMsg.includes("does not exist") ||
                errMsg.includes("quota") ||
                errMsg.includes("RESOURCE_EXHAUSTED") ||
                errMsg.includes("429")) {
                console.warn(`[gemini] Model ${model} failed: ${errMsg.substring(0, 100)}, trying next...`);
                continue;
            }
            // For other errors (auth, etc.), don't retry other models — they'll likely fail too
            throw new Error(`Gemini API error (${model}): ${errMsg.substring(0, 200)}`);
        }
    }
    throw lastError || new Error("All Gemini models failed. Please check your API key.");
}
