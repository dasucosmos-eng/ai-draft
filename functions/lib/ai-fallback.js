"use strict";
// ai-fallback.ts — Unified AI provider fallback chain
// Provides Sarvam → Groq → Gemini fallback for all cloud functions
// Eliminates repeated try/catch patterns across 8+ function files
//
// Usage:
//   import { callAIWithFallback, callAITextWithFallback } from "./ai-fallback";
//
//   // For structured JSON responses (intake, extraction, drafting, etc.)
//   const data = await callAIWithFallback(systemPrompt, userPrompt, jsonStructure);
//
//   // For free-text responses (chat, litigation analysis, etc.)
//   const text = await callAITextWithFallback(systemPrompt, userPrompt);
Object.defineProperty(exports, "__esModule", { value: true });
exports.callAIWithFallback = callAIWithFallback;
exports.callAITextWithFallback = callAITextWithFallback;
const sarvam_client_1 = require("./sarvam-client");
const groq_client_1 = require("./groq-client");
const gemini_client_1 = require("./gemini-client");
// ─── JSON Parsing Helper ──────────────────────────────────────────
function parseJsonFromText(text) {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    // Try direct parse first
    try {
        return JSON.parse(cleaned);
    }
    catch {
        // Extract JSON object from surrounding text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            }
            catch {
                // Try array
                const arrMatch = cleaned.match(/\[[\s\S]*\]/);
                if (arrMatch) {
                    return JSON.parse(arrMatch[0]);
                }
            }
        }
        throw new Error("Could not parse JSON from AI response");
    }
}
/**
 * Call an AI provider with automatic fallback chain:
 * Sarvam (primary, cheapest) → Groq (fallback, fast) → Gemini (final fallback, reliable)
 *
 * Returns structured JSON data parsed from the AI response.
 * Includes retry with exponential backoff for rate limit / quota errors.
 */
async function callAIWithFallback(systemPrompt, userPrompt, jsonStructureHint, options) {
    const temperature = options?.temperature ?? 0.3;
    const sarvamModel = options?.sarvamModel ?? "sarvam-30b";
    const maxTokens = options?.maxTokens ?? 4000;
    const functionName = options?.function_name ?? "unknown";
    const maxRetries = 2;
    function isRetryableError(errMsg) {
        return errMsg.includes("403") || errMsg.includes("429") ||
            errMsg.includes("rate_limit") || errMsg.includes("quota") ||
            errMsg.includes("timeout") || errMsg.includes("ECONNRESET") ||
            errMsg.includes("Lightning");
    }
    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
    let lastError = null;
    // Provider 1: Sarvam AI (cheapest for Indian languages)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const data = await (0, sarvam_client_1.callSarvamStructured)(systemPrompt, userPrompt, jsonStructureHint, temperature, sarvamModel, maxTokens);
            (0, groq_client_1.logUsage)(functionName, undefined, maxTokens);
            console.log(`[${functionName}] Success via provider: sarvam`);
            return { data, provider: "sarvam" };
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.error(`[${functionName}] Sarvam failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`);
            if (isRetryableError(lastError.message) && attempt < maxRetries) {
                await sleep(Math.pow(2, attempt) * 1000);
                continue;
            }
            break;
        }
    }
    // Provider 2: Groq (fast, cheap for English)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const data = await (0, groq_client_1.callGroqStructured)(systemPrompt, userPrompt, jsonStructureHint, temperature);
            (0, groq_client_1.logUsage)(functionName, undefined, maxTokens);
            console.log(`[${functionName}] Success via provider: groq`);
            return { data, provider: "groq" };
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.error(`[${functionName}] Groq failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`);
            if (isRetryableError(lastError.message) && attempt < maxRetries) {
                await sleep(Math.pow(2, attempt) * 1000);
                continue;
            }
            break;
        }
    }
    // Provider 3: Gemini (reliable fallback)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const geminiPrompt = `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON matching this structure:\n${jsonStructureHint}`;
            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, temperature);
            const data = parseJsonFromText(geminiResponse);
            (0, groq_client_1.logUsage)(functionName, undefined, maxTokens);
            console.log(`[${functionName}] Success via provider: gemini`);
            return { data, provider: "gemini" };
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.error(`[${functionName}] Gemini failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`);
            if (isRetryableError(lastError.message) && attempt < maxRetries) {
                await sleep(Math.pow(2, attempt) * 1000);
                continue;
            }
        }
    }
    // All providers failed
    throw new Error(`All AI providers failed. Last error: ${lastError?.message || "Unknown error"}. Please try again in a few minutes.`);
}
// ─── Free-Text Response (Sarvam → Groq → Gemini) ──────────────────
/**
 * Call an AI provider with automatic fallback for free-text responses:
 * Sarvam (primary) → Groq (fallback) → Gemini (final fallback)
 */
async function callAITextWithFallback(systemPrompt, userPrompt, options) {
    const temperature = options?.temperature ?? 0.6;
    const functionName = options?.function_name ?? "unknown";
    let lastError = null;
    // Provider 1: Sarvam
    try {
        const text = await (0, sarvam_client_1.callSarvamText)(systemPrompt, userPrompt, temperature);
        (0, groq_client_1.logUsage)(functionName, undefined, 4000);
        console.log(`[${functionName}] Success via provider: sarvam`);
        return { text, provider: "sarvam" };
    }
    catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[${functionName}] Sarvam failed: ${lastError.message}`);
    }
    // Provider 2: Groq
    try {
        const text = await (0, groq_client_1.callGroqText)(systemPrompt, userPrompt, temperature);
        (0, groq_client_1.logUsage)(functionName, undefined, 4000);
        console.log(`[${functionName}] Success via provider: groq`);
        return { text, provider: "groq" };
    }
    catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[${functionName}] Groq failed: ${lastError.message}`);
    }
    // Provider 3: Gemini
    try {
        const text = await (0, gemini_client_1.callGeminiText)(systemPrompt, userPrompt, temperature);
        (0, groq_client_1.logUsage)(functionName, undefined, 4000);
        console.log(`[${functionName}] Success via provider: gemini`);
        return { text, provider: "gemini" };
    }
    catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[${functionName}] Gemini failed: ${lastError.message}`);
    }
    throw new Error(`All AI providers failed. Last error: ${lastError?.message || "Unknown error"}`);
}
