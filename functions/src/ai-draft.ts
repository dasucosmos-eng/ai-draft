// @ts-nocheck
import { aiFunctionSecrets } from "./secrets";
// ai-draft — Firebase Cloud Function
// Generates legal documents using Sarvam → Groq → Gemini fallback
// Returns: { success, data: { title, content, keyPoints, warnings } }

import { https } from "firebase-functions/v2";
import { restrictedCors } from "./cors";
import { stripMarkdownFromData } from "./utils";
import { callSarvamStructured } from "./sarvam-client";
import { callGroqStructured, logUsage } from "./groq-client";
import { callGeminiText } from "./gemini-client";

const corsHandler = restrictedCors;

const SYSTEM_PROMPT = `You are an expert Indian legal document drafter integrated into AI Draft platform. You draft precise, court-ready legal documents following Indian legal standards.

Document drafting rules:
- Use proper legal format with appropriate headings, sections, and clauses
- Include relevant section numbers and statutory references
- Follow standard Indian legal document conventions (pleadings, contracts, notices, etc.)
- Include all essential elements: parties, facts, cause of action, relief sought, verification
- Use precise legal terminology
- Include prayer/clause section at the end
- Add verification and vakalatnama where appropriate
- Include court fee details where applicable
- Follow the specific state High Court rules where relevant

CRITICAL TEXT CASING RULES:
- Body text MUST be in normal sentence case (NOT all caps, NOT all uppercase)
- Only specific HEADING WORDS may be in ALL CAPS: IN THE HIGH COURT OF..., COMPLAINT, PLAINT, WRITTEN STATEMENT, PETITION, AFFIDAVIT, VERIFICATION, VAKALATNAMA, PRAYER, CAUSE TITLE
- Section headings within the body (like "Facts of the Case", "Grounds for Bail") should use Title Case, NOT ALL CAPS
- Names of parties, courts, and legal terms should use normal capitalization (e.g., "Supreme Court of India", not "SUPREME COURT OF INDIA")
- The document body paragraphs must read naturally in mixed case like any professional legal document
- DO NOT write the entire document or body paragraphs in uppercase/block letters`;

const JSON_STRUCTURE = `{
  "title": "Short title of the document (e.g., 'Plaint for Specific Performance', 'Rental Agreement')",
  "content": "Full document text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level document title headings like IN THE HIGH COURT OF..., COMPLAINT, PLAINT, PETITION, WRIT PETITION, AFFIDAVIT, VERIFICATION, VAKALATNAMA, and PRAYER. Section sub-headings should be in Title Case (e.g., 'Facts of the Case', 'Grounds for Relief'). Use numbered sections like 1., 2., 3., sub-sections like (a), (b), (c), and proper paragraph breaks. The document must be court-ready and clean without any markdown syntax like **, ##, or #.",
  "keyPoints": ["Key legal point 1", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer 1", "Important warning 2"]
}`;

export const apiAiDraft = https.onRequest(
  {
    timeoutSeconds: 180,
    region: "us-central1", secrets: aiFunctionSecrets,
  },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }
      try {
        const { caseType, documentType, details, caseContext } = req.body;
        if (!documentType || !details) {
          res.status(400).json({
            error: "documentType and details are required.",
          });
          return;
        }

        // Derive caseType from documentType if not provided
        const resolvedCaseType = caseType || documentType;

        let userPrompt = `Draft a legal document with the following details:

**Case Type:** ${resolvedCaseType}
**Document Type:** ${documentType}

**Case/Transaction Details:**
${details}`;

        if (caseContext) {
          userPrompt += `\n\n**Additional Context:**\n${caseContext}`;
        }

        userPrompt += `\n\nDraft a complete, court-ready document. Include all standard clauses, recitals, and formatting. The document should be ready for filing or execution with minimal editing.`;

        let data: {
          title: string;
          content: string;
          keyPoints: string[];
          warnings: string[];
        };
        try {
          data = await callSarvamStructured<{
            title: string;
            content: string;
            keyPoints: string[];
            warnings: string[];
          }>(SYSTEM_PROMPT, userPrompt, JSON_STRUCTURE, 0.3, "sarvam-105b");
        } catch (sarvamErr) {
          console.error("[ai-draft] Sarvam failed, falling back to Groq:", sarvamErr?.message);
          try {
            data = await callGroqStructured<{
              title: string;
              content: string;
              keyPoints: string[];
              warnings: string[];
            }>(SYSTEM_PROMPT, userPrompt, JSON_STRUCTURE, 0.3);
          } catch (groqErr) {
            console.error("[ai-draft] Groq failed, falling back to Gemini:", groqErr?.message);
            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${JSON_STRUCTURE}`;
            const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
            const cleaned = geminiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            data = jsonMatch ? JSON.parse(jsonMatch[0]) : {
              title: "Legal Document",
              content: geminiResponse,
              keyPoints: [],
              warnings: ["AI-generated document — please review before filing."],
            };
          }
        }

        logUsage("ai-draft", undefined, 3000);

        // Strip any markdown that AI might still produce
        data = stripMarkdownFromData(data);

        res.json({
          success: true,
          data: data,
        });
      } catch (error) {
        console.error("[ai-draft] Error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to draft document",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
);
