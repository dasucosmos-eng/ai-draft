// z-ai-server.ts — Shared server-side z.ai client for Next.js API routes
// Uses the z-ai-web-dev-sdk for authentication (reads from .z-ai-config)

import ZAI from "z-ai-web-dev-sdk";

// ─── SDK Singleton ──────────────────────────────────────────────────────────

let _zai: InstanceType<typeof ZAI> | null = null;

async function getZAI(): Promise<InstanceType<typeof ZAI>> {
  if (!_zai) {
    _zai = await ZAI.create();
  }
  return _zai;
}

// ─── CORS helpers ─────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://aidraft.bond",
];

export function setCorsHeaders(
  response: Response,
  origin?: string | null
): void {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  response.headers.set("Access-Control-Allow-Origin", allowed);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set("Access-Control-Max-Age", "86400");
}

export function corsResponse(
  body: unknown,
  status = 200,
  origin?: string | null
): Response {
  const res = Response.json(body, { status });
  setCorsHeaders(res, origin);
  return res;
}

export function handleOptions(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    const res = new Response(null, { status: 204 });
    setCorsHeaders(res, request.headers.get("Origin"));
    return res;
  }
  return null;
}

// ─── stripMarkdown ────────────────────────────────────────────────────────────

export function stripMarkdown(text: string): string {
  if (!text) return text;
  return text
    .replace(/```[\s\S]*?```/g, (match) =>
      match.replace(/```\w*\n?/g, "").trim()
    )
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^#{1,6}\s+(.+)$/gm, (_, t) => t.toUpperCase())
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

// ─── z.ai Chat (text) ────────────────────────────────────────────────────────

interface ChatMessage {
  role: string;
  content: string;
}

export async function zaiChat(messages: ChatMessage[]): Promise<string> {
  const zai = await getZAI();
  const result = await zai.chat.completions.create({
    messages: messages.map((m) => ({ role: m.role as any, content: m.content })),
    thinking: { type: "disabled" },
  });
  return (result as any).choices?.[0]?.message?.content || "";
}

// ─── z.ai Chat (vision) ──────────────────────────────────────────────────────

interface VisionContentPart {
  type: string;
  text?: string;
  image_url?: { url: string };
}

interface VisionMessage {
  role: string;
  content: string | VisionContentPart[];
}

export async function zaiChatVision(
  messages: VisionMessage[]
): Promise<string> {
  const zai = await getZAI();
  const sdkMessages = messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role as any, content: m.content };
    }
    const parts = m.content
      .map((p) => {
        if (p.type === "text" && p.text) {
          return { type: "text", text: p.text };
        }
        if (p.type === "image_url" && p.image_url?.url) {
          return { type: "image_url", image_url: p.image_url };
        }
        return null;
      })
      .filter(Boolean);
    return { role: m.role as any, content: parts };
  });

  const result = await zai.chat.completions.createVision({
    messages: sdkMessages,
    thinking: { type: "disabled" },
  });
  return (result as any).choices?.[0]?.message?.content || "";
}

// ─── JSON extraction helpers ──────────────────────────────────────────────────

// ─── Web Search (via z.ai functions.invoke) ──────────────────────────────────

interface SearchResultItem {
  url: string
  name: string
  snippet: string
  host_name: string
  rank: number
  date: string
  favicon: string
}

export async function webSearch(query: string, num = 8): Promise<SearchResultItem[]> {
  const zai = await getZAI();
  const result = await (zai as any).functions.invoke("web_search", { query, num });
  if (Array.isArray(result)) return result as SearchResultItem[];
  if (result?.data && Array.isArray(result.data)) return result.data as SearchResultItem[];
  return [];
}

export function extractJSON(
  raw: string
): Record<string, unknown> | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    /* fall through */
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      try {
        const fixed = jsonMatch[0]
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]");
        return JSON.parse(fixed) as Record<string, unknown>;
      } catch {
        /* fall through */
      }
    }
  }

  return null;
}
