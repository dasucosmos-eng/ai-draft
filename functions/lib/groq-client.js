"use strict";
// @ts-nocheck
// groq-client.ts — Direct Groq API client
// Uses REST API at https://api.groq.com/openai/v1/chat/completions
// API key from GROQ_API_KEY environment variable
Object.defineProperty(exports, "__esModule", { value: true });
exports.callGroqStructured = callGroqStructured;
exports.callGroqText = callGroqText;
exports.callGroqChat = callGroqChat;
exports.logUsage = logUsage;
const groq_1 = require("./groq");
console.log("[groq-client] INIT — using direct Groq API");
// ─── Rate limit error handler ─
function handleGroqError(err) {
    const errMsg = String(err);
    if (errMsg.includes("rate_limit") || errMsg.includes("Rate limit") || errMsg.includes("429")) {
        throw new Error("AI rate limit reached. Please try again in a moment.");
    }
    if (errMsg.includes("context_length") || errMsg.includes("token limit")) {
        throw new Error("Your input is too long for the AI to process. Please shorten your query or document and try again.");
    }
    if (errMsg.includes("authentication") || errMsg.includes("invalid")) {
        throw new Error("AI service authentication error. Please try again later.");
    }
    throw new Error("AI service error. Please try again in a moment.");
}
// ─── Core: structured JSON response ──────────────────────────
async function callGroqStructured(systemPrompt, userPrompt, jsonStructureHint, temperature = 0.3) {
    try {
        const fullPrompt = `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON matching this structure:\n${jsonStructureHint}`;
        const response = await (0, groq_1.groqChat)([
            { role: "system", content: fullPrompt },
            { role: "user", content: userPrompt },
        ], { temperature });
        const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    }
    catch (err) {
        handleGroqError(err);
    }
}
// ─── Core: free-form text response ───────────────────────────
async function callGroqText(systemPrompt, userPrompt, temperature = 0.6) {
    try {
        return (0, groq_1.groqChat)([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ], { temperature });
    }
    catch (err) {
        handleGroqError(err);
    }
}
// ─── Core: multi-turn chat ──────────────────────────────────
async function callGroqChat(systemPrompt, messages, temperature = 0.6) {
    try {
        return (0, groq_1.groqChat)(messages, { temperature });
    }
    catch (err) {
        handleGroqError(err);
    }
}
// ─── Usage logging ─────────────────────────────────────────────
function logUsage(module, provider, tokens) {
    console.log(`[usage] module=${module} provider=groq tokens=${tokens}`);
}
