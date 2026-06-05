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
const admin = __importStar(require("firebase-admin"));
// ai-draft — Firebase Cloud Function
// Generates legal documents using Sarvam (primary) → Groq → Gemini fallback
// Returns: { success, data: { title, content, keyPoints, warnings } }
const v2_1 = require("firebase-functions/v2");
const cors_1 = require("./cors");
const utils_1 = require("./utils");
const corsHandler = cors_1.restrictedCors;
const SYSTEM_PROMPT = `You are a senior Indian legal document drafter with 20+ years of practice experience. You draft precise, court-ready legal documents that adhere to Indian legal standards, procedural codes, and judicial precedents.

DRAFTING QUALITY STANDARDS:
1. Structure every document with proper cause title, pleadings body, and formal ending
2. Cite specific statutory provisions (e.g., Section 9 of the Hindu Marriage Act, Order 7 Rule 1 CPC, Section 138 of the Negotiable Instruments Act)
3. Use established legal terminology — not colloquial language
4. For pleadings: include concise statement of facts, cause of action, jurisdictional grounds, and specific relief sought under the Code of Civil Procedure / relevant statute
5. For contracts/agreements: include recitals, definitions, operative clauses, breach/remedy clauses, arbitration/severability/force majeure provisions, and execution clause
6. For notices: follow the format prescribed under Section 80 CPC where applicable — include demand, timeline, consequence of non-compliance
7. For affidavits: include proper verification clause, deponent details, and oath
8. Always include court fee particulars and stamp duty references where applicable
9. Reference relevant landmark judgments to strengthen legal positions (e.g., "as held in Mafatlal Industries Ltd. v. Gujarat Industrial Development Corporation")
10. Draft each paragraph to advance the legal argument — every sentence must serve a purpose
11. Include proper prayer/clause section with specific, quantified relief
12. Add verification and vakalatnama format where appropriate for court filings

CRITICAL TEXT CASING RULES:
- Body text MUST be in normal sentence case (NOT all caps, NOT all uppercase)
- Only specific HEADING WORDS may be in ALL CAPS: IN THE HIGH COURT OF..., COMPLAINT, PLAINT, WRITTEN STATEMENT, PETITION, AFFIDAVIT, VERIFICATION, VAKALATNAMA, PRAYER, CAUSE TITLE
- Section headings within the body should use Title Case, NOT ALL CAPS
- Names of parties, courts, and legal terms should use normal capitalization
- The document body must read naturally in mixed case like any professional legal document
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
    // Provider order: Sarvam first (free, Indian AI), then Groq, then Gemini
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
                console.error(`[ai-draft] ${provider.name} failed (attempt ${attempt}): [${err?.constructor?.name}] ${errMsg.substring(0, 300)}`);
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
    region: "us-central1",
    secrets: secrets_1.aiFunctionSecrets,
    memory: "512MiB",
    minInstances: 1,
}, async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        const authToken = (req.headers.authorization || "").replace("Bearer ", "") || req.body?.token;
        if (!authToken) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }
        let uid;
        try {
            const decoded = await admin.auth().verifyIdToken(authToken);
            uid = decoded.uid;
        }
        catch {
            res.status(401).json({ error: "Invalid or expired token" });
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
            // Handle case where details is an object (not a string)
            if (resolvedDetails && typeof resolvedDetails === 'object') {
                const objEntries = Object.entries(resolvedDetails)
                    .filter(([, v]) => v !== undefined && v !== null && v !== '')
                    .map(([k, v]) => {
                    const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                    const val = Array.isArray(v) ? v.join(', ') : String(v);
                    return `${label}: ${val}`;
                });
                resolvedDetails = objEntries.length > 0 ? objEntries.join('\n') : '';
            }
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
