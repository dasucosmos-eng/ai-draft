// @ts-nocheck
// sarvam-client.ts — Direct Sarvam AI client
// Uses REST API at https://api.sarvam.ai/
// API key from SARVAM_API_KEY environment variable

import { sarvamChat, translate, detectLanguage } from "./sarvam";

console.log("[sarvam-client] INIT — using direct Sarvam AI API");

// ─── Core: structured JSON response ──────────────────────────

export async function callSarvamStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  jsonStructureHint: string,
  temperature: number = 0.3,
  model: string = "sarvam-105b",
  maxTokens: number = 4096
): Promise<T> {
  const fullPrompt = `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON matching this structure:\n${jsonStructureHint}`;
  const response = await sarvamChat([
    { role: "system", content: fullPrompt },
    { role: "user", content: userPrompt },
  ], undefined, model, temperature, maxTokens);

  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("[sarvam-client] Failed to parse JSON:", response.substring(0, 200));
    throw new Error("Sarvam returned invalid structured data. Please try again.");
  }
}

// ─── Core: free-form text response ───────────────────────────

export async function callSarvamText(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.6,
  model: string = "sarvam-105b"
): Promise<string> {
  return sarvamChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], undefined, model, temperature);
}

// ─── Core: multi-turn chat ──────────────────────────────────

export async function callSarvamChat(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  temperature: number = 0.6,
  model: string = "sarvam-105b"
): Promise<string> {
  return sarvamChat(
    [{ role: "system", content: systemPrompt }, ...messages],
    undefined,
    model
  );
}

// ─── Translation ──────────────────────────────────────────────

export { translate, detectLanguage };
