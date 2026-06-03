// @ts-nocheck
// groq-client.ts — Direct Groq API client
// Uses REST API at https://api.groq.com/openai/v1/chat/completions
// API key from GROQ_API_KEY environment variable

import { groqChat } from "./groq";

console.log("[groq-client] INIT — using direct Groq API");

// ─── Rate limit error handler ─
function handleGroqError(err: unknown): never {
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

export async function callGroqStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  jsonStructureHint: string,
  temperature: number = 0.3
): Promise<T> {
  try {
    const fullPrompt = `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON matching this structure:\n${jsonStructureHint}`;
    const response = await groqChat([
      { role: "system", content: fullPrompt },
      { role: "user", content: userPrompt },
    ], { temperature });

    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    handleGroqError(err);
  }
}

// ─── Core: free-form text response ───────────────────────────

export async function callGroqText(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.6
): Promise<string> {
  try {
    return groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { temperature });
  } catch (err) {
    handleGroqError(err);
  }
}

// ─── Core: multi-turn chat ──────────────────────────────────

export async function callGroqChat(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  temperature: number = 0.6
): Promise<string> {
  try {
    return groqChat(messages, { temperature });
  } catch (err) {
    handleGroqError(err);
  }
}

// ─── Usage logging ─────────────────────────────────────────────

export function logUsage(module: string, provider: string | undefined, tokens: number): void {
  console.log(`[usage] module=${module} provider=groq tokens=${tokens}`);
}
