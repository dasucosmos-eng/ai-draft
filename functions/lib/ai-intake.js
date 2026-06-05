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
exports.apiAiIntake = void 0;
// @ts-nocheck
const secrets_1 = require("./secrets");
const admin = __importStar(require("firebase-admin"));
// ai-intake — Firebase Cloud Function
// Client intake analysis: classifies cases, extracts info, suggests documents
// Uses Sarvam AI (primary) → Groq (fallback) → Gemini (final fallback)
// Returns: { data: { caseClassification, extractedInfo, suggestedDocuments, nextSteps } }
const v2_1 = require("firebase-functions/v2");
const cors_1 = require("./cors");
const sarvam_client_1 = require("./sarvam-client");
const groq_client_1 = require("./groq-client");
const gemini_client_1 = require("./gemini-client");
const corsHandler = cors_1.restrictedCors;
const SYSTEM_PROMPT = `You are an expert Indian legal intake analyst. When given a client's case description or uploaded documents, you MUST extract EVERY piece of information mentioned:

1. Classify the case type and identify ALL applicable laws and sections
2. Extract ALL parties with full details (name, phone, email, address, role)
3. Extract client details, opposing parties, victims (for criminal cases)
4. Extract advocate names for both sides if mentioned
5. Extract case identifiers (FIR number, CRR number, court case number)
6. Extract ALL dates mentioned (incident, filing, hearing, etc.)
7. Extract police station, court name, judge name
8. Extract facts in detail
9. Identify ALL missing information needed
10. Suggest relevant documents to file/draft based on case type
11. Recommend next steps with specific timelines under Indian law

You have deep knowledge of:
- Indian legal practice areas and their classification
- Applicable statutes: IPC/BNS, CrPC/BNSS, CPC, NI Act, Evidence Act, Hindu Marriage Act, etc.
- Limitation periods under the Limitation Act, 1963
- Standard documents needed for different case types
- Procedural requirements under Indian law
- Indian legal terminology and court hierarchy

IMPORTANT: Extract phone numbers, emails, addresses, FIR numbers, section numbers EXACTLY as they appear in the document. Do NOT fabricate or guess values - if something is not mentioned, omit it.`;
const JSON_STRUCTURE = `{
  "caseClassification": {
    "caseType": "Primary case type (e.g., 'Property Dispute', 'Criminal - FIR', 'Matrimonial - Divorce', 'Cheque Bounce', 'Consumer Complaint')",
    "caseTypeIcon": "Icon name from: property, criminal, family, civil, corporate, labour, tax, consumer, constitutional, ip, banking, environment",
    "subType": "Sub-type (e.g., 'Bail Application', 'Recovery Suit', 'Mutual Consent Divorce')",
    "priority": "URGENT or HIGH or MEDIUM or LOW",
    "priorityColor": "red or orange or yellow or green",
    "jurisdiction": "Appropriate court/tribunal (e.g., 'District Court, Bangalore', 'High Court of Karnataka')",
    "courtName": "Specific court name if mentioned (e.g., 'City Civil Court, Bangalore')",
    "relevantSections": ["Section 138 NI Act", "Section 420 IPC", "Section 498A IPC"]
  },
  "extractedInfo": {
    "parties": [
      {
        "role": "Petitioner/Plaintiff/Complainant/Applicant/Client",
        "name": "Full name",
        "phone": "Phone number if mentioned",
        "email": "Email if mentioned",
        "address": "Address if mentioned"
      }
    ],
    "opposingParties": [
      {
        "role": "Respondent/Defendant/Accused/Opposing Party",
        "name": "Full name",
        "phone": "Phone number if mentioned",
        "email": "Email if mentioned",
        "address": "Address if mentioned",
        "advocate": "Opposing advocate name if mentioned"
      }
    ],
    "victims": ["Victim name 1", "Victim name 2"],
    "advocate": {
      "clientAdvocate": "Client's advocate name if mentioned",
      "opposingAdvocate": "Opposing advocate name if mentioned"
    },
    "caseDetails": {
      "firNumber": "FIR number if criminal case",
      "policeStation": "Police station name if mentioned",
      "crrNumber": "CRR/Court case registration number",
      "filingDate": "DD/MM/YYYY or ISO date",
      "nextHearingDate": "DD/MM/YYYY or ISO date if mentioned",
      "causeOfAction": "Brief description of cause of action",
      "reliefSought": "What relief the client seeks",
      "facts": ["Fact 1", "Fact 2", "Fact 3"],
      "judgeName": "Judge name if mentioned",
      "underSections": ["IPC Section 420", "Section 138 NI Act"]
    },
    "keyDates": [{"label": "Date type", "date": "DD/MM/YYYY"}],
    "missingInfo": ["Missing info 1", "Missing info 2"],
    "documentLanguage": "English/Hindi/Telugu/etc"
  },
  "suggestedDocuments": [
    {"name": "Document name", "type": "plaint/written_statement/petition/affidavit/agreement/notice/application/appeal/bail/memo/other"}
  ],
  "nextSteps": [
    {"step": 1, "action": "Specific action", "timeline": "When to do it"}
  ]
}`;
// ─── Helper: parse JSON from AI text response (Gemini fallback returns text, not structured) ───
function parseJsonFromText(text) {
    // Try to extract JSON from markdown code fences
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;
    try {
        return JSON.parse(jsonStr.trim());
    }
    catch {
        // Try to find JSON object in the text
        const objMatch = text.match(/\{[\s\S]*\}/);
        if (objMatch) {
            return JSON.parse(objMatch[0]);
        }
        throw new Error("Could not parse JSON from AI response");
    }
}
exports.apiAiIntake = v2_1.https.onRequest({
    timeoutSeconds: 180,
    region: "us-central1", secrets: secrets_1.aiFunctionSecrets,
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
            // SAFETY: Handle large bodies that may exceed default body-parser limit
            let body = req.body;
            if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
                try {
                    const raw = req.rawBody;
                    if (raw && typeof raw === 'string')
                        body = JSON.parse(raw);
                    else if (Buffer.isBuffer(raw))
                        body = JSON.parse(raw.toString('utf8'));
                }
                catch { /* use existing body */ }
                if (!body || typeof body !== 'object')
                    body = {};
                req.body = body;
            }
            const { description, filesContent = '' } = req.body;
            // Accept description with at least 3 chars, or any uploaded file content
            if (!description?.trim() && !filesContent) {
                res.status(400).json({ error: "Please provide a case description or upload documents." });
                return;
            }
            let userPrompt = "";
            if (description) {
                userPrompt += `Client's Case Description:\n${description}\n\n`;
            }
            if (filesContent && filesContent.length > 0) {
                userPrompt += `Uploaded Document Contents:\n`;
                if (typeof filesContent === 'string') {
                    // Frontend sends a joined string, not an array
                    userPrompt += `\n---\n${filesContent}\n---\n`;
                }
                else {
                    for (const file of filesContent) {
                        userPrompt += `\n---\n${typeof file === "string" ? file : JSON.stringify(file)}\n---\n`;
                    }
                }
            }
            userPrompt += `\nAnalyze this intake thoroughly. Classify the case, extract all information, identify what's missing, suggest documents, and recommend next steps with specific timelines.`;
            let data;
            let usedProvider = "none";
            // Provider 1: Sarvam AI (cheapest for Indian languages)
            try {
                data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, JSON_STRUCTURE, 0.3, "sarvam-30b");
                usedProvider = "sarvam";
            }
            catch (sarvamErr) {
                console.error("[ai-intake] Sarvam failed, falling back to Groq:", sarvamErr instanceof Error ? sarvamErr.message : sarvamErr);
                // Provider 2: Groq (fast, cheap for English)
                try {
                    data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, JSON_STRUCTURE, 0.3);
                    usedProvider = "groq";
                }
                catch (groqErr) {
                    console.error("[ai-intake] Groq failed, falling back to Gemini:", groqErr instanceof Error ? groqErr.message : groqErr);
                    // Provider 3: Gemini (reliable fallback)
                    const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON matching this structure:\n${JSON_STRUCTURE}`;
                    const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                    data = parseJsonFromText(geminiResponse);
                    usedProvider = "gemini";
                }
            }
            (0, groq_client_1.logUsage)("ai-intake", undefined, 4000);
            console.log(`[ai-intake] Success via provider: ${usedProvider}`);
            res.json({ data, _provider: usedProvider });
        }
        catch (error) {
            console.error("[ai-intake] All providers failed:", error);
            res.status(500).json({
                error: "AI analysis failed. Please try again in a moment.",
            });
        }
    });
});
