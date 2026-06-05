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
exports.apiAiDocument = void 0;
// @ts-nocheck
const secrets_1 = require("./secrets");
const admin = __importStar(require("firebase-admin"));
// ai-document — Firebase Cloud Function
// Analyzes legal documents using Sarvam → Groq → Gemini fallback
// Returns: { summary, keyClauses, riskPoints, missingElements, deadlines, parties, suggestedActions, documentLanguage }
const v2_1 = require("firebase-functions/v2");
const cors_1 = require("./cors");
const sarvam_client_1 = require("./sarvam-client");
const groq_client_1 = require("./groq-client");
const gemini_client_1 = require("./gemini-client");
const corsHandler = cors_1.restrictedCors;
const SYSTEM_PROMPT = `You are an expert Indian legal document analyst. You review legal documents and provide comprehensive analysis including risks, missing elements, and actionable suggestions.

Your analysis covers:
- Document summary and purpose identification
- Key clauses and their legal implications
- Risk identification (unfavorable clauses, ambiguities, compliance issues)
- Missing elements that should be included
- Important deadlines and time limitations
- Party identification and roles
- Suggested actions for the advocate

You understand Indian legal documents including contracts, pleadings, court orders, affidavits, notices, agreements, and legal correspondence.`;
const JSON_STRUCTURE = `{
  "summary": "A concise 3-5 sentence summary of what the document is about and its purpose",
  "keyClauses": ["Important clause description 1", "Important clause description 2"],
  "riskPoints": ["Risk description 1", "Risk description 2"],
  "missingElements": ["Missing element 1", "Missing element 2"],
  "deadlines": ["Deadline description 1"],
  "parties": [{"role": "Role in document", "name": "Party name"}],
  "suggestedActions": ["Actionable suggestion 1", "Actionable suggestion 2"],
  "documentLanguage": "English/Hindi/etc"
}`;
exports.apiAiDocument = v2_1.https.onRequest({
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
            const { documentContent } = req.body;
            if (!documentContent) {
                res.status(400).json({ error: "Document content is required" });
                return;
            }
            const userPrompt = `Analyze the following legal document thoroughly:\n\n---\n${documentContent}\n---\n\nProvide a comprehensive legal analysis covering all aspects mentioned in your instructions.`;
            let data;
            try {
                data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, JSON_STRUCTURE, 0.3, "sarvam-105b");
            }
            catch (sarvamErr) {
                console.error("[ai-document] Sarvam failed, falling back to Groq:", sarvamErr?.message);
                try {
                    data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, JSON_STRUCTURE, 0.3);
                }
                catch (groqErr) {
                    console.error("[ai-document] Groq failed, falling back to Gemini:", groqErr?.message);
                    const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${JSON_STRUCTURE}`;
                    const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                    const cleaned = geminiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                    data = jsonMatch ? JSON.parse(jsonMatch[0]) : {
                        summary: geminiResponse.substring(0, 500),
                        keyClauses: [], riskPoints: [], missingElements: [],
                        deadlines: [], parties: [], suggestedActions: [], documentLanguage: "English",
                    };
                }
            }
            (0, groq_client_1.logUsage)("ai-document", undefined, 3500);
            res.json(data);
        }
        catch (error) {
            console.error("[ai-document] Error:", error);
            res.status(500).json({
                error: "Failed to analyze document",
            });
        }
    });
});
