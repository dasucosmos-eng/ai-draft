export const dynamic = "force-static";
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { stripMarkdown } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, caseContext, systemPrompt: customSystemPrompt } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "A non-empty 'message' string is required." },
        { status: 400 }
      );
    }

    // Validate history if provided
    let validHistory: { role: string; content: string }[] = [];
    if (Array.isArray(history)) {
      validHistory = history.filter(
        (msg: { role: string; content: string }) =>
          msg &&
          typeof msg.role === "string" &&
          typeof msg.content === "string" &&
          ["system", "user", "assistant"].includes(msg.role)
      );
    }

    const contextBlock = caseContext
      ? `\n\nACTIVE CASE CONTEXT:\n${caseContext}\n\nUse this case context when relevant to the user's question.`
      : "";

    const zai = await ZAI.create();

    // Use custom system prompt if provided (from litigation view), otherwise use default
    const systemPrompt = customSystemPrompt || `You are AI Draft, an intelligent legal assistant for Indian legal professionals. You help with:
- Case analysis and strategy
- Document drafting and review
- Legal research and precedent finding
- Hearing preparation
- Workflow automation and task management
- Deadline tracking and compliance

MULTILINGUAL CAPABILITY: You understand and respond in ANY language the user writes in. This includes Telugu, Tamil, Hindi, Kannada, Malayalam, Bengali, Marathi, Urdu, English, and all other languages. If the user writes in Telugu, respond in Telugu. If they write in English, respond in English. Auto-detect and match the user's language.

Guidelines:
- Be concise, professional, and actionable
- Reference specific Indian statutes, sections, and case law when relevant
- Do NOT use markdown formatting — write in clean plain text
- Use numbered points like (1), (2), (3) for lists
- Provide practical, step-by-step guidance
- When discussing legal matters, always include appropriate disclaimers${contextBlock}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...validHistory.map((msg) => ({
        role: (msg.role as "user" | "assistant") as const,
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await zai.chat.completions.create({ messages });

    const assistantMessage = stripMarkdown(completion.choices?.[0]?.message?.content ?? "");

    // Extract suggestions from the response for UI quick-actions
    const suggestions: string[] = [];
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes("draft") ||
      lowerMessage.includes("notice") ||
      lowerMessage.includes("petition") ||
      lowerMessage.includes("affidavit")
    ) {
      suggestions.push("Generate this document using AI Draft");
      suggestions.push("Review similar precedents");
    }
    if (
      lowerMessage.includes("case") ||
      lowerMessage.includes("hearing") ||
      lowerMessage.includes("court")
    ) {
      suggestions.push("Prepare hearing notes");
      suggestions.push("Check related deadlines");
    }
    if (
      lowerMessage.includes("research") ||
      lowerMessage.includes("precedent") ||
      lowerMessage.includes("judgment")
    ) {
      suggestions.push("Search for similar case laws");
    }
    if (lowerMessage.includes("timeline") || lowerMessage.includes("deadline")) {
      suggestions.push("View full case timeline");
    }
    if (suggestions.length === 0) {
      suggestions.push("Draft a related document");
      suggestions.push("Research relevant case law");
      suggestions.push("Check case deadlines");
    }

    return NextResponse.json({
      success: true,
      response: assistantMessage,
      suggestions: suggestions.slice(0, 4),
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process your message. Please try again.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
