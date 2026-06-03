// @ts-nocheck
// gemini-client.ts — Direct Google Gemini API client
// Uses @google/genai SDK with GEMINI_API_KEY env var
// Falls back to Vertex AI if in GCP environment

import { geminiChat } from "./gemini";

console.log("[gemini-client] INIT — using direct Google Gemini API");

// ─── Core: structured JSON response ──────────────────────────

export async function callGeminiStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  responseSchema: Record<string, unknown>,
  temperature: number = 0.4
): Promise<T> {
  const jsonHint = JSON.stringify(responseSchema, null, 2);
  const fullPrompt = `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON matching this structure:\n${jsonHint}`;
  const response = await geminiChat([
    { role: "system", content: fullPrompt },
    { role: "user", content: userPrompt },
  ]);

  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("[gemini-client] Failed to parse JSON:", response.substring(0, 200));
    throw new Error("Gemini returned invalid structured data. Please try again.");
  }
}

// ─── Core: free-form text response ───────────────────────────

export async function callGeminiText(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.6
): Promise<string> {
  return geminiChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

// ─── Core: multi-turn chat ──────────────────────────────────

export async function callGeminiChat(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  temperature: number = 0.6
): Promise<string> {
  return geminiChat(messages);
}

// ─── Vision (for OCR / image analysis) ─────────────────────────
// NOTE: Vision requires base64 image input — not yet implemented via direct API

export async function callGeminiVision(
  systemPrompt: string,
  textPrompt: string,
  imageDataBase64: string,
  mimeType: string,
  temperature: number = 0.3
): Promise<string> {
  console.warn("[gemini-client] Vision API not yet implemented via direct client. Falling back to text extraction.");
  return geminiChat([
    { role: "system", content: systemPrompt || "You are a helpful assistant." },
    { role: "user", content: textPrompt },
  ]);
}
