// Groq API client for fast, cheap LLM inference
// Uses REST API (no SDK needed)
// Model: llama-3.3-70b-versatile (fast + good quality)

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

interface GroqMessage {
  role: string;
  content: string;
}

interface GroqOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export async function groqChat(
  messages: GroqMessage[],
  options?: GroqOptions
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  const model = options?.model || DEFAULT_MODEL;

  // Separate system instruction from messages
  let systemInstruction = "";
  const formattedMessages: GroqMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = msg.content;
    } else {
      formattedMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages: formattedMessages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4096,
    top_p: options?.topP ?? 1,
  };

  // Add system instruction as a system message (Groq supports it natively)
  if (systemInstruction) {
    body.messages = [
      { role: "system", content: systemInstruction },
      ...formattedMessages,
    ];
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Groq API error (${response.status}): ${errorText}`);
    throw new Error(`Groq API request failed with status ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const firstChoice = choices?.[0] as Record<string, unknown> | undefined;
  const message = firstChoice?.message as Record<string, unknown> | undefined;
  const content = (message?.content as string) || "";
  if (!content) {
    throw new Error("Groq API returned empty response");
  }

  return content;
}

// Health check for Groq provider
export async function groqHealthCheck(): Promise<boolean> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return false;

    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
