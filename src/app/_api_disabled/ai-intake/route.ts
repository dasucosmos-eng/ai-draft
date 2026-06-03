export const dynamic = "force-static";
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const description = formData.get("description") as string | null;
    const files = formData.getAll("files") as File[];

    if (!description?.trim() && (!files || files.length === 0)) {
      return NextResponse.json(
        { error: "Please provide a description or upload at least one document." },
        { status: 400 }
      );
    }

    // Read file contents and build context from uploaded documents
    const fileContexts: string[] = [];
    const imageParts: { type: "image_url"; image_url: { url: string } }[] = [];

    for (const file of files) {
      if (file instanceof File) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const ext = file.name.split('.').pop()?.toLowerCase();

          if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext || '')) {
            const base64 = buffer.toString('base64');
            const mimeType = file.type || `image/${ext}`;
            imageParts.push({
              type: "image_url" as const,
              image_url: { url: `data:${mimeType};base64,${base64}` },
            });
            fileContexts.push(`[UPLOADED IMAGE: ${file.name}]`);
          } else {
            const text = buffer.toString('utf-8');
            const printableRatio = text.split('').filter(c => {
              const code = c.charCodeAt(0);
              return code >= 32 || code === 10 || code === 13 || code === 9 || code > 127;
            }).length / text.length;

            if (printableRatio > 0.6) {
              const maxChars = 15000;
              const truncated = text.length > maxChars
                ? text.substring(0, maxChars) + '\n\n[... document truncated ...]'
                : text;
              fileContexts.push(
                `[UPLOADED DOCUMENT: ${file.name} (${(file.size / 1024).toFixed(0)}KB)]\n${truncated}`
              );
            } else {
              fileContexts.push(
                `[UPLOADED FILE: ${file.name} (${(file.size / 1024).toFixed(0)}KB) - Binary file]`
              );
            }
          }
        } catch (err) {
          console.error(`Error reading file ${file.name}:`, err);
          fileContexts.push(`[UPLOADED FILE: ${file.name} - Error reading content]`);
        }
      }
    }

    const documentContext = fileContexts.length > 0
      ? `\n\n--- UPLOADED DOCUMENTS ---\n${fileContexts.join('\n\n')}\n--- END UPLOADED DOCUMENTS ---`
      : "";

    const userPrompt = description?.trim()
      ? `CLIENT DESCRIPTION:\n${description.trim()}${documentContext}`
      : documentContext;

    const zai = await ZAI.create();

    const systemPrompt = `You are AI Draft, an intelligent legal intake assistant specializing in Indian law. You analyze client descriptions and uploaded legal documents to classify them into structured case data.

MULTILINGUAL CAPABILITY: You MUST understand and process documents in ANY language. This includes but is not limited to:
- Telugu (తెలుగు), Tamil (தமிழ்), Hindi (हिन्दी), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Bengali (বাংলা), Marathi (मराठी), Urdu (اردو)
- English, and any other Indian or international language
- Documents may contain mixed scripts (e.g., Telugu + English legal terms)
- Extract information regardless of the language used in the document
- Always respond with English field values (caseType, priority, jurisdiction etc.) but preserve original names in the "parties" and "facts" fields as they appear in the source document

IMPORTANT: When the user uploads documents (images, PDFs, text files), READ and ANALYZE the document content. Extract ALL relevant information including:
- Client details (names, addresses, contacts)
- Parties involved (plaintiffs, defendants, respondents, petitioners)
- Legal matter type and sub-type
- Relevant Indian legal sections and statutes
- Key dates, deadlines, limitation periods
- Facts and circumstances
- Relief sought
- Court/jurisdiction information
- Missing information that needs to be collected
- Language of the uploaded documents

Your response MUST be valid JSON (no markdown, no code fences) with this exact structure:

{
  "caseClassification": {
    "caseType": "<one of: Property Dispute, Cheque Bounce, Divorce, Consumer Complaint, Employment, Criminal Defense, Contract Review, Bail Application, Civil Suit, Injunction, Arbitration, Tax Matter, Corporate, Other>",
    "caseTypeIcon": "<icon: Building, Banknote, Heart, ShoppingCart, Briefcase, Shield, FileCheck, Unlock, Scale, MapPin, FileText, Calendar>",
    "priority": "<Low, Medium, High, Urgent>",
    "priorityColor": "green/amber/red",
    "jurisdiction": "<court or tribunal name>",
    "relevantSections": ["<section 1>", "<section 2>"]
  },
  "extractedInfo": {
    "parties": [{"role": "Plaintiff/Petitioner/Complainant/Defendant/Respondent/Accused", "name": "Name of party (keep original script)"}],
    "keyDates": [{"label": "Date description", "date": "Date or Not specified"}],
    "facts": ["Key fact 1", "Key fact 2"],
    "missingInfo": ["Missing info 1", "Missing info 2"],
    "documentLanguage": "<detected language of uploaded documents, e.g., Telugu, Hindi, English, Mixed>"
  },
  "suggestedDocuments": [{"name": "Document name", "type": "notice/petition/affidavit/contract/evidence/court_order/other"}],
  "nextSteps": [
    {"step": 1, "action": "Action description", "timeline": "Timeline"},
    {"step": 2, "action": "Action description", "timeline": "Timeline"}
  ]
}

Guidelines:
- Identify the most relevant Indian statutes (IPC, CrPC, CPC, NI Act, HMA, IDA, Consumer Protection Act, Transfer of Property Act, etc.)
- Criminal matters, bail applications, and injunctions are typically Urgent/High priority
- Suggest practical next steps in chronological order
- Determine the most appropriate court/jurisdiction
- Extract ALL possible information from uploaded documents in any language`;

    // Build messages - if we have images, use vision format
    const messages: { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (imageParts.length > 0) {
      // Mix text and images for vision model
      const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: "text", text: userPrompt },
        ...imageParts,
      ];
      messages.push({ role: "user", content: userContent });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const completion = await zai.chat.completions.create({ messages });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    let cleaned = raw.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let result: any;
    try {
      result = JSON.parse(cleaned);
    } catch {
      // If JSON parse fails, try to extract JSON from the text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("AI returned invalid JSON structure");
      }
    }

    const safeResult = {
      caseClassification: {
        caseType: result.caseClassification?.caseType || "Civil Suit",
        caseTypeIcon: result.caseClassification?.caseTypeIcon || "FileText",
        priority: result.caseClassification?.priority || "Medium",
        priorityColor: result.caseClassification?.priorityColor || "amber",
        jurisdiction: result.caseClassification?.jurisdiction || "To be determined",
        relevantSections: result.caseClassification?.relevantSections || [],
      },
      extractedInfo: {
        parties: result.extractedInfo?.parties || [],
        keyDates: result.extractedInfo?.keyDates || [],
        facts: result.extractedInfo?.facts || [],
        missingInfo: result.extractedInfo?.missingInfo || [],
        documentLanguage: result.extractedInfo?.documentLanguage || "English",
      },
      suggestedDocuments: result.suggestedDocuments || [],
      nextSteps: result.nextSteps || [],
    };

    return NextResponse.json({ data: safeResult });
  } catch (error) {
    console.error("AI Intake error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze the legal matter. Please try again.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
