"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
  "warnings": ["Important warning or disclaimer 1", "Important warning or disclaimer 2"]
}`;
// ─── Unified AI call with retry and fallback ──────────────────────────
async function callAIWithRetry(systemPrompt, userPrompt, maxRetries = 2) {
    // Dynamic imports to avoid circular deps
    const { callSarvamStructured } = await Promise.resolve().then(() => __importStar(require("./sarvam-client")));
    const { callGroqStructured } = await Promise.resolve().then(() => __importStar(require("./groq-client")));
    const { callGeminiText } = await Promise.resolve().then(() => __importStar(require("./gemini-client")));
    const providers = [
        { name: "Sarvam", fn: () => callSarvamStructured(systemPrompt, userPrompt, JSON_STRUCTURE, 0.3, "sarvam-105b") },
        { name: "Groq", fn: () => callGroqStructured(systemPrompt, userPrompt, JSON_STRUCTURE, 0.3) },
        { name: "Gemini", fn: async () => {
                const geminiPrompt = `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON:\n${JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                const cleaned = geminiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                return jsonMatch ? JSON.parse(jsonMatch[0]) : {
                    title: "Legal Document",
                    content: geminiResponse,
                    keyPoints: [],
                    warnings: ["AI-generated document — please review before filing."],
                };
            } },
    ];
    for (const provider of providers) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[ai-draft] Trying ${provider.name} (attempt ${attempt}/${maxRetries})`);
                const data = await provider.fn();
                console.log(`[ai-draft] Success via ${provider.name}`);
                return data;
            }
            catch (err) {
                const errMsg = err?.message || String(err);
                const isRetryable = errMsg.includes("403") || errMsg.includes("429") ||
                    errMsg.includes("rate_limit") || errMsg.includes("quota") ||
                    errMsg.includes("timeout") || errMsg.includes("ECONNRESET");
                console.error(`[ai-draft] ${provider.name} failed (attempt ${attempt}): ${errMsg.substring(0, 200)}`);
                if (isRetryable && attempt < maxRetries) {
                    // Exponential backoff: 2s, 4s
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`[ai-draft] Retrying ${provider.name} in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                break; // Move to next provider
            }
        }
    }
    throw new Error("All AI providers are currently unavailable. Please try again in a few minutes.");
}
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
            const { caseType, documentType, details, caseContext, extractedText, task, ...fields } = req.body;
            // Accept either documentType or task
            const docType = documentType || task || '';
            if (!docType) {
                res.status(400).json({ error: "documentType or task is required." });
                return;
            }
            // Derive caseType from documentType if not provided
            const resolvedCaseType = caseType || docType;
            // Build details from individual fields if `details` not provided
            let resolvedDetails = details || '';
            if (!resolvedDetails && Object.keys(fields).length > 0) {
                const fieldEntries = Object.entries(fields)
                    .filter(([k, v]) => v && typeof v === 'string' && v.trim())
                    .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: ${v}`);
                if (fieldEntries.length > 0) {
                    resolvedDetails = fieldEntries.join('\n');
                }
            }
            if (!resolvedDetails && extractedText) {
                resolvedDetails = extractedText.substring(0, 5000);
            }
            if (!resolvedDetails) {
                res.status(400).json({ error: "Provide document details (details, form fields, or extractedText)." });
                return;
            }
            let userPrompt = `Draft a legal document with the following details:

**Case Type:** ${resolvedCaseType}
**Document Type:** ${docType}

**Case/Transaction Details:**
${resolvedDetails}`;
            if (extractedText && extractedText !== resolvedDetails) {
                userPrompt += `\n\n**Original Document Text:**\n${extractedText.substring(0, 5000)}`;
            }
            if (caseContext) {
                userPrompt += `\n\n**Additional Context:**\n${caseContext}`;
            }
            userPrompt += `\n\nDraft a complete, court-ready document. Include all standard clauses, recitals, and formatting. The document should be ready for filing or execution with minimal editing.`;
            const data = await callAIWithRetry(SYSTEM_PROMPT, userPrompt);
            // Strip any markdown that AI might still produce
            const cleanData = (0, utils_1.stripMarkdownFromData)(data);
            res.json({
                success: true,
                data: cleanData,
                content: cleanData.content || '',
                responseText: cleanData.content || '',
                draft: cleanData.content || '',
                title: cleanData.title || '',
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
