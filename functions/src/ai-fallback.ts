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

import { callSarvamStructured, callSarvamText } from "./sarvam-client";
import { callGroqStructured, callGroqText, logUsage } from "./groq-client";
import { callGeminiText } from "./gemini-client";

// ─── JSON Parsing Helper ──────────────────────────────────────────

function parseJsonFromText(text: string): any {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Extract JSON object from surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
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

// ─── Structured JSON Response (Sarvam → Groq → Gemini) ────────────

export interface FallbackOptions {
  temperature?: number;
  sarvamModel?: "sarvam-30b" | "sarvam-105b";
  maxTokens?: number;
  function_name?: string;
}

/**
 * Call an AI provider with automatic fallback chain:
 * Sarvam (primary, cheapest) → Groq (fallback, fast) → Gemini (final fallback, reliable)
 *
 * Returns structured JSON data parsed from the AI response.
 */
export async function callAIWithFallback<T>(
  systemPrompt: string,
  userPrompt: string,
  jsonStructureHint: string,
  options?: FallbackOptions
): Promise<{ data: T; provider: string }> {
  const temperature = options?.temperature ?? 0.3;
  const sarvamModel = options?.sarvamModel ?? "sarvam-30b";
  const maxTokens = options?.maxTokens ?? 4000;
  const functionName = options?.function_name ?? "unknown";

  let lastError: Error | null = null;

  // Provider 1: Sarvam AI (cheapest for Indian languages)
  try {
    const data = await callSarvamStructured<T>(
      systemPrompt,
      userPrompt,
      jsonStructureHint,
      temperature,
      sarvamModel,
      maxTokens
    );
    logUsage(functionName, undefined, maxTokens);
    console.log(`[${functionName}] Success via provider: sarvam`);
    return { data, provider: "sarvam" };
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    console.error(`[${functionName}] Sarvam failed: ${lastError.message}`);
  }

  // Provider 2: Groq (fast, cheap for English)
  try {
    const data = await callGroqStructured<T>(
      systemPrompt,
      userPrompt,
      jsonStructureHint,
      temperature
    );
    logUsage(functionName, undefined, maxTokens);
    console.log(`[${functionName}] Success via provider: groq`);
    return { data, provider: "groq" };
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    console.error(`[${functionName}] Groq failed: ${lastError.message}`);
  }

  // Provider 3: Gemini (reliable fallback)
  try {
    const geminiPrompt = `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON matching this structure:\n${jsonStructureHint}`;
    const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, temperature);
    const data = parseJsonFromText(geminiResponse) as T;
    logUsage(functionName, undefined, maxTokens);
    console.log(`[${functionName}] Success via provider: gemini`);
    return { data, provider: "gemini" };
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    console.error(`[${functionName}] Gemini failed: ${lastError.message}`);
  }

  // All providers failed
  throw new Error(
    `All AI providers failed. Last error: ${lastError?.message || "Unknown error"}`
  );
}

// ─── Free-Text Response (Sarvam → Groq → Gemini) ──────────────────

/**
 * Call an AI provider with automatic fallback for free-text responses:
 * Sarvam (primary) → Groq (fallback) → Gemini (final fallback)
 */
export async function callAITextWithFallback(
  systemPrompt: string,
  userPrompt: string,
  options?: FallbackOptions
): Promise<{ text: string; provider: string }> {
  const temperature = options?.temperature ?? 0.6;
  const functionName = options?.function_name ?? "unknown";

  let lastError: Error | null = null;

  // Provider 1: Sarvam
  try {
    const text = await callSarvamText(systemPrompt, userPrompt, temperature);
    logUsage(functionName, undefined, 4000);
    console.log(`[${functionName}] Success via provider: sarvam`);
    return { text, provider: "sarvam" };
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    console.error(`[${functionName}] Sarvam failed: ${lastError.message}`);
  }

  // Provider 2: Groq
  try {
    const text = await callGroqText(systemPrompt, userPrompt, temperature);
    logUsage(functionName, undefined, 4000);
    console.log(`[${functionName}] Success via provider: groq`);
    return { text, provider: "groq" };
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    console.error(`[${functionName}] Groq failed: ${lastError.message}`);
  }

  // Provider 3: Gemini
  try {
    const text = await callGeminiText(systemPrompt, userPrompt, temperature);
    logUsage(functionName, undefined, 4000);
    console.log(`[${functionName}] Success via provider: gemini`);
    return { text, provider: "gemini" };
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    console.error(`[${functionName}] Gemini failed: ${lastError.message}`);
  }

  throw new Error(
    `All AI providers failed. Last error: ${lastError?.message || "Unknown error"}`
  );
}
