"use strict";
// @ts-nocheck
// sarvam-client.ts — Direct Sarvam AI client
// Uses REST API at https://api.sarvam.ai/
// API key from SARVAM_API_KEY environment variable
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = exports.translate = void 0;
exports.callSarvamStructured = callSarvamStructured;
exports.callSarvamText = callSarvamText;
exports.callSarvamChat = callSarvamChat;
const sarvam_1 = require("./sarvam");
Object.defineProperty(exports, "translate", { enumerable: true, get: function () { return sarvam_1.translate; } });
Object.defineProperty(exports, "detectLanguage", { enumerable: true, get: function () { return sarvam_1.detectLanguage; } });
console.log("[sarvam-client] INIT — using direct Sarvam AI API");
// ─── Core: structured JSON response ──────────────────────────
async function callSarvamStructured(systemPrompt, userPrompt, jsonStructureHint, temperature = 0.3, model = "sarvam-30b", maxTokens = 4000) {
    const fullPrompt = `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON matching this structure:\n${jsonStructureHint}`;
    const response = await (0, sarvam_1.sarvamChat)([
        { role: "system", content: fullPrompt },
        { role: "user", content: userPrompt },
    ], { temperature });
    try {
        const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    }
    catch (e) {
        console.error("[sarvam-client] Failed to parse JSON:", response.substring(0, 200));
        throw new Error("Sarvam returned invalid structured data. Please try again.");
    }
}
// ─── Core: free-form text response ───────────────────────────
async function callSarvamText(systemPrompt, userPrompt, temperature = 0.6, model = "sarvam-30b") {
    return (0, sarvam_1.sarvamChat)([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ], { temperature });
}
// ─── Core: multi-turn chat ──────────────────────────────────
async function callSarvamChat(systemPrompt, messages, temperature = 0.6, model = "sarvam-30b") {
    return (0, sarvam_1.sarvamChat)(messages, { temperature });
}
