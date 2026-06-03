"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiAiDraft = void 0;
// @ts-nocheck
const secrets_1 = require("./secrets");
// ai-draft — Firebase Cloud Function
// Generates legal documents using Sarvam → Groq → Gemini fallback
// Returns: { success, data: { title, content, keyPoints, warnings } }
const v2_1 = require("firebase-functions/v2");
const cors_1 = require("./cors");
const utils_1 = require("./utils");
const sarvam_client_1 = require("./sarvam-client");
const groq_client_1 = require("./groq-client");
const gemini_client_1 = require("./gemini-client");
const corsHandler = cors_1.restrictedCors;
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
- Follow the specific state High Court rules where relevant`;
const JSON_STRUCTURE = `{
  "title": "Short title of the document (e.g., 'Plaint for Specific Performance', 'Rental Agreement')",
  "content": "Full document text in PLAIN TEXT format (NO markdown). Use proper legal formatting: ALL CAPS for headings, numbered sections like 1., 2., 3., sub-sections like (a), (b), (c), and proper paragraph breaks. The document must be court-ready and clean without any markdown syntax like **, ##, or #.",
  "keyPoints": ["Key legal point 1", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer 1", "Important warning 2"]
}`;
exports.apiAiDraft = v2_1.https.onRequest({
    timeoutSeconds: 180,
    region: "us-central1", secrets: secrets_1.aiFunctionSecrets,
}, async (req, res) => {
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
            let data;
            try {
                data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, JSON_STRUCTURE, 0.3, "sarvam-105b");
            }
            catch (sarvamErr) {
                console.error("[ai-draft] Sarvam failed, falling back to Groq:", sarvamErr?.message);
                try {
                    data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, JSON_STRUCTURE, 0.3);
                }
                catch (groqErr) {
                    console.error("[ai-draft] Groq failed, falling back to Gemini:", groqErr?.message);
                    const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${JSON_STRUCTURE}`;
                    const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
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
            (0, groq_client_1.logUsage)("ai-draft", undefined, 3000);
            // Strip any markdown that AI might still produce
            data = (0, utils_1.stripMarkdownFromData)(data);
            res.json({
                success: true,
                data: data,
            });
        }
        catch (error) {
            console.error("[ai-draft] Error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to draft document",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });
});
