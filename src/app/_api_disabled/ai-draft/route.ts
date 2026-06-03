export const dynamic = "force-static";
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { stripMarkdown } from "@/lib/utils";

const VALID_DOCUMENT_TYPES = [
  "legal_notice",
  "affidavit",
  "petition",
  "injunction",
  "agreement",
  "complaint",
  "bail_application",
  "reply",
  "memorandum",
  // Also accept human-readable labels from the frontend
  "Legal Notice",
  "Affidavit",
  "Petition / Plaint",
  "Injunction Application",
  "Agreement / Deed",
  "Complaint",
  "Bail Application",
  "Reply / Written Statement",
  "Memorandum of Appeal",
] as const;

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  legal_notice: "Legal Notice",
  affidavit: "Affidavit",
  petition: "Petition / Plaint",
  injunction: "Injunction Application",
  agreement: "Agreement / Deed",
  complaint: "Complaint",
  bail_application: "Bail Application",
  reply: "Reply / Written Statement",
  memorandum: "Memorandum of Appeal",
};

// Reverse lookup: label -> snake_case key
const LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => [v, k])
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseType, documentType, details, caseContext } = body;

    if (!caseType || typeof caseType !== "string") {
      return NextResponse.json(
        { error: "A 'caseType' string is required (e.g. 'property', 'criminal', 'consumer')." },
        { status: 400 }
      );
    }

    if (!documentType || typeof documentType !== "string") {
      return NextResponse.json(
        { error: "A 'documentType' string is required (e.g. 'Legal Notice', 'petition', 'bail_application')." },
        { status: 400 }
      );
    }

    // Accept both snake_case keys and human-readable labels
    const normalizedType = LABEL_TO_KEY[documentType] || documentType;
    if (!VALID_DOCUMENT_TYPES.includes(normalizedType as any) && !VALID_DOCUMENT_TYPES.includes(documentType as any)) {
      return NextResponse.json(
        {
          error: `Invalid documentType '${documentType}'. Must be one of: ${Object.values(DOCUMENT_TYPE_LABELS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!details || typeof details !== "string") {
      return NextResponse.json(
        { error: "A 'details' string with the facts and requirements is required." },
        { status: 400 }
      );
    }

    // Resolve the label for the AI prompt
    const label = DOCUMENT_TYPE_LABELS[normalizedType] || LABEL_TO_KEY[documentType] || documentType;
    const contextBlock = caseContext
      ? `\n\nADDITIONAL CASE CONTEXT:\n${caseContext}`
      : "";

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are AI Draft, an expert legal document drafter for Indian law. You generate complete, professional, ready-to-file legal documents.

MULTILINGUAL CAPABILITY: If the case details are provided in Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Urdu, or any other language, you MUST understand them fully. However, always generate the legal document in formal English as required by Indian courts, unless the user explicitly asks for the document in another language. Preserve original names, addresses, and quotes in their original script.

Case Type: ${caseType}
Document Type: ${label}

Your response MUST be valid JSON (no markdown, no code fences) with the following exact structure:

{
  "title": "<full document title>",
  "content": "<THE FULL DOCUMENT TEXT in formal legal English>",
  "keyPoints": ["<key point 1>", "<key point 2>", "<key point 3>"],
  "warnings": ["<warning or disclaimer>"]
}

CRITICAL FORMATTING RULES:
- Do NOT use markdown formatting of any kind in the content field
- Do NOT use ** or __ for bold, * or _ for italic, # for headings, - for bullets, > for blockquotes
- Write in clean plain text only — use ALL CAPS for headings, numbered paragraphs (1., 2., 3.)
- This document will be printed and filed in court

Guidelines:
- Generate a complete, well-structured document that an Indian lawyer could review and file
- Use appropriate Indian legal formatting conventions
- Include relevant legal sections and statutory references
- Use formal Hindi-English terminology common in Indian courts (e.g. "Most respectfully showeth", "It is, therefore, most respectfully prayed")
- Include proper verification clause and signature block
- For notices: use proper notice format with cause title and registered post reference
- For petitions: use proper plaint/petition format with cause title and parties
- For affidavits: use sworn affidavit format with proper verification
- For bail applications: include Section 437/438/439 CrPC references as appropriate${contextBlock}`,
        },
        {
          role: "user",
          content: `Please draft a ${label} for a ${caseType} case with the following details:\n\n${details}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    let cleaned = raw.trim();
    // Strip markdown code fences
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let result: any;
    try {
      result = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON object from the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch {
          // Last resort: fix common JSON issues (trailing commas, unescaped quotes in content)
          let fixed = jsonMatch[0]
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          result = JSON.parse(fixed);
        }
      } else {
        // If AI returned plain text instead of JSON, wrap it
        result = {
          title: `${label} — ${caseType}`,
          content: stripMarkdown(cleaned),
          keyPoints: ["Document generated — please review the content"],
          warnings: ["AI returned non-structured output. Content may need formatting review."],
        };
      }
    }

    if (result.content) result.content = stripMarkdown(result.content);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("AI Draft error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate the legal document. Please try again.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
