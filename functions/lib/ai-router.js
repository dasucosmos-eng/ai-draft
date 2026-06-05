"use strict";
// Central AI router that selects the optimal model for each task
// Cost optimization strategy with automatic fallbacks
//
// PRICING (verified June 2025):
//   Gemini 2.5 Flash:    $0.30/1M input + $2.50/1M output (ai.google.dev/pricing)
//   Groq Llama 3.3 70B:  $0.59/1M input + $0.79/1M output (groq.com/pricing)
//   Sarvam-30B:          ₹2.5/1M input + ₹10/1M output (sarvam.ai/api-pricing)
//   Sarvam-M:            Free (new open-weight model, sarvam.ai)
//   Tesseract OCR:       Free (runs locally, no API cost)
//   Indian Khanoon:      ₹0.50/search (indiankanoon.org/api pricing)
//   Google Custom Search: $5.00/1000 queries = $0.005/query (developers.google.com/custom-search)
//     Searches eCourts, SC, India Code, AdvocateKhoj, Indian Kanoon, etc. in ONE call
//     Replaces unreliable web scraping with indexed API search
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
exports.routeChat = routeChat;
exports.routeDraft = routeDraft;
exports.routeDocumentAnalysis = routeDocumentAnalysis;
exports.routeIntake = routeIntake;
exports.routeResearch = routeResearch;
exports.routeTranslation = routeTranslation;
const gemini_1 = require("./gemini");
const groq_1 = require("./groq");
const sarvam_1 = require("./sarvam");
const khanoon_1 = require("./khanoon");
const ocr_1 = require("./ocr");
// --- Cost per 1M tokens (SOURCE: official pricing pages, verified June 2025) ---
// Input + Output split. Blended depends on task type (output-heavy vs input-heavy).
const COST_PER_MILLION_INPUT = {
    groq: 0.59, // groq.com/pricing — Llama 3.3 70B Versatile
    groq_output: 0.79, // groq.com/pricing — Llama 3.3 70B Versatile
    gemini_flash: 0.30, // ai.google.dev/pricing — Gemini 2.5 Flash
    gemini_flash_output: 2.50, // ai.google.dev/pricing — Gemini 2.5 Flash
    sarvam_30b: 0.03, // sarvam.ai/api-pricing — ₹2.5/1M input
    sarvam_30b_output: 0.12, // sarvam.ai/api-pricing — ₹10/1M output
    sarvam_m: 0, // sarvam.ai — Free open-weight model
    sarvam_m_output: 0, // sarvam.ai — Free open-weight model
    khanoon: 0, // per-search cost handled separately: ₹0.50/search
};
// Khanoon per-search cost (₹)
const KHANOON_COST_PER_SEARCH = 0.50;
// Google Custom Search per-query cost ($0.005/query). Free if API not available.
const GOOGLE_SEARCH_COST_PER_QUERY_USD = 0.005;
const GOOGLE_SEARCH_COST_PER_QUERY_INR = GOOGLE_SEARCH_COST_PER_QUERY_USD * 83.5;
// --- Indian language patterns ---
const INDIAN_LANGUAGE_PATTERNS = /[\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0A80-\u0AFF\u0D00-\u0D7F\u0980-\u09FF\u0A00-\u0A7F\u0600-\u06FF\u0B00-\u0B7F\u0C80-\u0CFF]/;
const INDIAN_LANGUAGE_KEYWORDS = [
    "telugu", "tamil", "hindi", "kannada", "malayalam", "bengali",
    "marathi", "urdu", "gujarati", "punjabi", "odia", "assamese",
    "हिंदी", "தமிழ்", "తెలుగు", "ಕನ್ನಡ", "മലയാളം", "বাংলা",
    "मराठी", "اردو", "ગુજરાતી", "ਪੰਜਾਬੀ", "ଓଡ଼ିଆ", "অসমীয়া",
];
// --- Helpers ---
/**
 * Check if text contains Indian language characters
 */
function containsIndianLanguage(text) {
    return INDIAN_LANGUAGE_PATTERNS.test(text) ||
        INDIAN_LANGUAGE_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));
}
/**
 * Estimate token count (rough: ~4 chars per token)
 */
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
/**
 * Estimate cost with separate input/output pricing
 */
function estimateCostDetailed(modelInput, modelOutput, inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1_000_000) * (COST_PER_MILLION_INPUT[modelInput] ?? 0.5);
    const outputCost = (outputTokens / 1_000_000) * (COST_PER_MILLION_INPUT[modelOutput] ?? 0.5);
    return inputCost + outputCost;
}
/**
 * Log model selection for cost tracking
 */
function logModelSelection(task, model, reason) {
    console.log(`[AI Router] Task: ${task} → Model: ${model} | Reason: ${reason}`);
}
// --- Route Functions ---
/**
 * Route a chat request to the optimal model.
 * Indian language → Sarvam-M (free), Simple → Groq, Complex → Gemini.
 */
async function routeChat(messages, options) {
    const inputTokens = estimateTokens(messages.map((m) => m.content).join(" "));
    // Check for Indian language content
    const allText = messages.map((m) => m.content).join(" ");
    const isIndian = containsIndianLanguage(allText) || options?.language;
    if (isIndian) {
        logModelSelection("chat", "sarvam-105b", "Indian language detected — using Sarvam-30B");
        try {
            const response = await (0, sarvam_1.sarvamChat)(messages, options?.language);
            return {
                response,
                model: "sarvam-105b",
                cost: 0, // Free model
            };
        }
        catch (sarvamError) {
            console.warn("[AI Router] Sarvam chat failed, falling back to Groq:", sarvamError);
            // Fall through to Groq
        }
    }
    // Check task complexity — route to Groq for simple tasks (cheaper than Gemini for balanced I/O)
    const isComplex = allText.length > 3000 ||
        /analyze|research|draft|legal opinion|precedent|strategy/i.test(allText);
    if (!isComplex) {
        logModelSelection("chat", "groq", "Simple chat task (fast, cheaper for balanced I/O)");
        try {
            const response = await (0, groq_1.groqChat)(messages, {
                temperature: options?.temperature,
            });
            return {
                response,
                model: "groq",
                cost: estimateCostDetailed("groq", "groq_output", inputTokens, estimateTokens(response)),
            };
        }
        catch (groqError) {
            console.warn("[AI Router] Groq chat failed, falling back to Gemini:", groqError);
            // Fall through to Gemini
        }
    }
    // Default: Gemini for complex queries or as fallback
    logModelSelection("chat", "gemini", isComplex ? "Complex legal query (better reasoning)" : "Fallback from failed provider");
    const response = await (0, gemini_1.geminiChat)(messages);
    return {
        response,
        model: "gemini-flash",
        cost: estimateCostDetailed("gemini_flash", "gemini_flash_output", inputTokens, estimateTokens(response)),
    };
}
/**
 * Route a document drafting request.
 * Drafting is output-heavy (long documents). Uses Gemini for best quality.
 */
async function routeDraft(messages) {
    const inputTokens = estimateTokens(messages.map((m) => m.content).join(" "));
    logModelSelection("draft", "gemini", "Document drafting — best for long-form output");
    try {
        const response = await (0, gemini_1.geminiChat)(messages);
        return {
            response,
            model: "gemini-flash",
            cost: estimateCostDetailed("gemini_flash", "gemini_flash_output", inputTokens, estimateTokens(response)),
        };
    }
    catch (geminiError) {
        console.warn("[AI Router] Gemini draft failed, falling back to Groq:", geminiError);
        const response = await (0, groq_1.groqChat)(messages, { temperature: 0.5 });
        return {
            response,
            model: "groq",
            cost: estimateCostDetailed("groq", "groq_output", inputTokens, estimateTokens(response)),
        };
    }
}
/**
 * Route a document analysis request.
 * Input-heavy (document text). Uses Tesseract for OCR extraction first, then AI for analysis.
 * Tesseract extracts text for FREE, reducing the tokens sent to AI models.
 */
async function routeDocumentAnalysis(content, files) {
    let extractedContent = content;
    let ocrApplied = false;
    // Step 1: If image files provided, extract text with Tesseract FIRST (FREE)
    if (files && files.length > 0) {
        const ocrResults = [];
        for (const file of files) {
            if (file.mimeType.startsWith("image/")) {
                try {
                    const text = await (0, ocr_1.extractTextFromBuffer)(file.buffer);
                    if (text.trim()) {
                        ocrResults.push(`[OCR extracted from ${file.filename}]:\n${text}`);
                        ocrApplied = true;
                    }
                }
                catch (ocrError) {
                    console.warn(`[AI Router] OCR failed for ${file.filename}:`, ocrError);
                }
            }
        }
        if (ocrResults.length > 0) {
            // Use OCR text instead of raw image — saves AI token costs
            extractedContent = ocrResults.join("\n\n") + (content ? `\n\n[Additional user notes]:\n${content}` : "");
            logModelSelection("document-analysis", "tesseract+ai", `OCR extracted text from ${ocrResults.length} file(s) — reducing AI token load`);
        }
    }
    const inputTokens = estimateTokens(extractedContent);
    const isIndian = containsIndianLanguage(extractedContent);
    let detectedLanguage;
    if (isIndian) {
        try {
            const langResult = await (0, sarvam_1.detectLanguage)(extractedContent);
            detectedLanguage = langResult.language !== "unknown" ? langResult.language : undefined;
        }
        catch {
            // continue without detected language
        }
    }
    const messages = [
        {
            role: "system",
            content: `You are an expert legal document analyzer for Indian law.${detectedLanguage ? ` The document is in ${detectedLanguage}.` : ""}

Analyze the given document and provide a structured JSON response:

{
  "summary": "Concise professional summary of the document (2-3 paragraphs, in English)",
  "keyClauses": ["Key legal clause/provision 1", "Key legal clause/provision 2"],
  "riskPoints": ["Risk point or red flag 1", "Risk point 2"],
  "missingElements": ["Missing element 1", "Missing element 2"],
  "deadlines": ["Deadline or time-sensitive date 1", "Deadline 2"],
  "parties": [{"role": "Role description", "name": "Party name (preserve original script)"}],
  "suggestedActions": ["Recommended action 1", "Recommended action 2"],
  "documentLanguage": "${detectedLanguage || "Auto-detected"}"
}

Respond ONLY with valid JSON, no markdown or explanation.`,
        },
        { role: "user", content: `Analyze this legal document:\n\n${extractedContent}` },
    ];
    // Document analysis is input-heavy. Groq is cheaper for input ($0.59 vs $0.30)
    // but Gemini is much more expensive for output ($2.50 vs $0.79).
    // Since analysis output is small (~500 tokens), use Groq as primary (cheaper total).
    // Gemini only for complex/Indian language docs where reasoning matters more.
    const useGemini = isIndian && detectedLanguage;
    if (useGemini) {
        logModelSelection("document-analysis", "gemini", `Indian language: ${detectedLanguage}`);
        try {
            const response = await (0, gemini_1.geminiChat)(messages);
            const ocrCost = ocrApplied ? 0 : 0; // Tesseract is free
            return {
                response,
                model: "gemini-flash",
                cost: ocrCost + estimateCostDetailed("gemini_flash", "gemini_flash_output", inputTokens, estimateTokens(response)),
            };
        }
        catch (error) {
            console.warn("[AI Router] Gemini document analysis failed, falling back to Groq:", error);
        }
    }
    logModelSelection("document-analysis", "groq", "Document analysis — input-heavy, Groq cheaper ($0.59 in vs $0.30 in but $0.79 out vs $2.50 out)");
    try {
        const response = await (0, groq_1.groqChat)(messages, { temperature: 0.3 });
        return {
            response,
            model: "groq",
            cost: estimateCostDetailed("groq", "groq_output", inputTokens, estimateTokens(response)),
        };
    }
    catch (error) {
        console.warn("[AI Router] Groq document analysis failed, falling back to Gemini:", error);
        const response = await (0, gemini_1.geminiChat)(messages);
        return {
            response,
            model: "gemini-flash",
            cost: estimateCostDetailed("gemini_flash", "gemini_flash_output", inputTokens, estimateTokens(response)),
        };
    }
}
/**
 * Route an intake classification request.
 * Fast classification → Groq, with Tesseract OCR extraction → FREE.
 */
async function routeIntake(description, files) {
    const inputTokens = estimateTokens(description);
    let ocrText;
    // Extract text from uploaded files using Tesseract (free, local)
    if (files && files.length > 0) {
        const ocrResults = [];
        for (const file of files) {
            if (file.mimeType.startsWith("image/")) {
                try {
                    const text = await (0, ocr_1.extractTextFromBuffer)(file.buffer);
                    if (text.trim()) {
                        ocrResults.push(`[OCR from ${file.filename}]:\n${text}`);
                    }
                }
                catch (ocrError) {
                    console.warn(`[AI Router] OCR failed for ${file.filename}:`, ocrError);
                }
            }
        }
        if (ocrResults.length > 0) {
            ocrText = ocrResults.join("\n\n");
        }
    }
    // Use Groq for fast, cheap classification
    logModelSelection("intake", "groq", "Fast classification task — Groq (fastest inference)");
    const documentContext = ocrText
        ? `\n\n--- EXTRACTED DOCUMENT TEXT (OCR — Tesseract, FREE) ---\n${ocrText}\n--- END EXTRACTED TEXT ---`
        : "";
    const messages = [
        {
            role: "system",
            content: `You are AI Draft, an intelligent legal intake assistant for Indian law.

MULTILINGUAL CAPABILITY: You MUST understand and process documents in ANY language including Telugu, Tamil, Hindi, Kannada, Malayalam, Bengali, Marathi, Urdu, and English. Extract info regardless of language.

IMPORTANT: READ and ANALYZE uploaded documents. Extract ALL relevant information.

Your response MUST be valid JSON with this exact structure:

{
  "caseClassification": {
    "caseType": "<Property Dispute, Cheque Bounce, Divorce, Consumer Complaint, Employment, Criminal Defense, Contract Review, Bail Application, Civil Suit, Injunction, Arbitration, Tax Matter, Corporate, or Other>",
    "caseTypeIcon": "<Building, Banknote, Heart, ShoppingCart, Briefcase, Shield, FileCheck, Unlock, Scale, MapPin, FileText, or Calendar>",
    "priority": "<Low, Medium, High, or Urgent>",
    "priorityColor": "green/amber/red",
    "jurisdiction": "<court or tribunal name>",
    "relevantSections": ["<section 1>", "<section 2>"]
  },
  "extractedInfo": {
    "parties": [{"role": "Plaintiff/Petitioner/Complainant/Defendant/Respondent/Accused", "name": "Name (keep original script)"}],
    "keyDates": [{"label": "Date description", "date": "Date or Not specified"}],
    "facts": ["Key fact 1", "Key fact 2"],
    "missingInfo": ["Missing info 1"],
    "documentLanguage": "<detected language>"
  },
  "suggestedDocuments": [{"name": "Document name", "type": "notice/petition/affidavit/contract/evidence/court_order/other"}],
  "nextSteps": [
    {"step": 1, "action": "Action description", "timeline": "Timeline"},
    {"step": 2, "action": "Action description", "timeline": "Timeline"}
  ]
}

Guidelines:
- Identify relevant Indian statutes (IPC, CrPC, CPC, NI Act, HMA, IDA, etc.)
- Criminal matters and injunctions are typically Urgent/High priority
- Suggest practical next steps in chronological order`,
        },
        {
            role: "user",
            content: `CLIENT DESCRIPTION:\n${description}${documentContext}`,
        },
    ];
    try {
        const response = await (0, groq_1.groqChat)(messages, { temperature: 0.3 });
        return {
            response,
            model: "groq",
            cost: estimateCostDetailed("groq", "groq_output", inputTokens, estimateTokens(response)),
            ocrText,
        };
    }
    catch (groqError) {
        console.warn("[AI Router] Groq intake failed, falling back to Gemini:", groqError);
        const response = await (0, gemini_1.geminiChat)(messages);
        return {
            response,
            model: "gemini-flash",
            cost: estimateCostDetailed("gemini_flash", "gemini_flash_output", inputTokens, estimateTokens(response)),
            ocrText,
        };
    }
}
/**
 * Route a legal research request.
 * Uses Gemini for AI analysis + Indian Khanoon for real case data (₹0.50/search).
 */
async function routeResearch(query, filters) {
    const inputTokens = estimateTokens(query);
    // Fetch real case data from Indian Khanoon in parallel (₹0.50/search)
    let khanoonResults = undefined;
    let khanoonCost = 0;
    const khanoonPromise = (async () => {
        try {
            const results = await (0, khanoon_1.searchCaseLaw)(query, {
                court: filters?.court,
                year: filters?.year,
                caseType: filters?.caseType,
                limit: 5,
            });
            if (results.length > 0) {
                khanoonResults = results;
                khanoonCost = KHANOON_COST_PER_SEARCH; // ₹0.50 per search
                logModelSelection("research-khanoon", "indian-khanoon", `${results.length} case results found (₹${KHANOON_COST_PER_SEARCH})`);
            }
        }
        catch (khanoonError) {
            console.warn("[AI Router] Indian Khanoon search failed:", khanoonError);
        }
    })();
    // Use Gemini for deep legal analysis
    logModelSelection("research", "gemini", "Complex legal research (best reasoning)");
    const filterContext = [
        filters?.court && filters.court !== "all" ? `Court filter: ${filters.court}` : "",
        filters?.year && filters.year !== "all" ? `Year filter: ${filters.year}` : "",
        filters?.caseType && filters.caseType !== "all" ? `Case type: ${filters.caseType}` : "",
    ].filter(Boolean).join(". ");
    const messages = [
        {
            role: "system",
            content: `You are an expert Indian legal research assistant specializing in Indian jurisprudence, constitutional law, and statutory interpretation.

MULTILINGUAL CAPABILITY: You understand queries in ANY language. If the query is in a regional language, understand it fully but always respond with English field values.

CORE PRINCIPLES:
- ACCURACY OVER QUANTITY: It is FAR better to return 3 verified, well-analyzed cases than 7 uncertain ones. Quality is paramount.
- VERIFIABLE CITATIONS: Every citation MUST follow the standard Indian legal citation format: Party v. Party, Court Name (Year) Volume Reporter PageNumber. Example: "Kesavananda Bharati v. State of Kerala, Supreme Court of India (1973) 4 SCC 225".
- DO NOT fabricate case names, citations, page numbers, or judgments. If you are uncertain about any detail, prefix it with "[Unverified]" rather than fabricating.
- When a case has been overruled, doubted, or distinguished by a subsequent judgment, you MUST note this.

FOR EACH RESULT IN THE "results" ARRAY, PROVIDE:
1. "title" — Full case name in Party v. Defendant format
2. "court" — Full court name (e.g., "Supreme Court of India", "High Court of Delhi", "National Consumer Disputes Redressal Commission")
3. "year" — Year of judgment as YYYY
4. "summary" — Comprehensive 4-6 sentence summary covering: (a) material facts, (b) legal issue(s) before the court, (c) ratio decidendi / key legal reasoning, (d) final disposition
5. "keyHoldings" — Array of 3-5 specific legal propositions extracted from the ratio decidendi. Each should be a standalone legal principle.
6. "relevance" — Number 0-100 indicating how directly relevant this case is to the query
7. "relevanceExplanation" — String explaining WHY this case is relevant (1-2 sentences)
8. "citation" — Full standard Indian citation: Party v. Party, Court (Year) Volume Reporter Page
9. "source" — Source attribution: e.g., "Supreme Court of India", "Indian Kanoon", "Supreme Court Reports (SCR)", "All India Reporter (AIR)"
10. "sourceUrl" — Known URL (e.g., "https://indiankanoon.org/doc/123456/") or "" if unavailable
11. "strengths" — Array of 1-3 specific strengths of this precedent for the user's query (why it supports their position)
12. "weaknesses" — Array of 1-3 specific weaknesses or distinguishing factors (why opposing counsel might distinguish it)

RESPONSE FORMAT — Return ONLY this JSON structure, no markdown:
{
  "results": [
    {
      "title": "Full case name",
      "court": "Full court name",
      "year": "YYYY",
      "summary": "Detailed 4-6 sentence summary",
      "keyHoldings": ["Legal proposition 1", "Legal proposition 2", "Legal proposition 3"],
      "relevance": 95,
      "relevanceExplanation": "This case directly addresses...",
      "citation": "Party v. Party, Court (Year) Vol Reporter Page",
      "source": "Source attribution",
      "sourceUrl": "https://... or empty string",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1"]
    }
  ],
  "suggestedArguments": [
    {"argument": "Detailed legal argument", "supportingCase": "Case citation"},
    {"argument": "Second argument", "supportingCase": "Case citation"}
  ],
  "relatedPrecedents": [
    {"title": "Case title", "year": "YYYY", "citation": "Full citation", "court": "Court name", "relevanceNote": "Why related"}
  ]
}

INDIAN LEGAL CONTEXT RULES:
- Reference specific Indian constitutional articles (e.g., Article 14, 21, 19(1)(g)) and statutory provisions (IPC sec, CrPC sec, CPC Order, Evidence Act sec, NI Act sec, HMA sec, etc.)
- Clearly distinguish Supreme Court precedents (binding on all courts) from High Court precedents (binding within jurisdiction) and subordinate court decisions (persuasive only)
- Note the hierarchy: Supreme Court > High Court > District Court > Tribunals
- Flag if a cited precedent has been overruled (e.g., note "Overruled by: Case Name (Year)") or doubted in subsequent judgments
- For landmark constitutional cases, reference the applicable doctrine (basic structure, due process, epistolary jurisdiction, etc.)
- Provide 3-5 HIGHLY RELEVANT results with full analysis rather than many shallow results.

${filterContext ? `USER-APPLIED FILTERS: ${filterContext}. Prioritize results matching these filters, but include other relevant results if matching results are scarce.` : "No filters applied. Provide the most relevant results across all courts and years."}

Respond ONLY with valid JSON. No markdown code fences. No explanatory text outside the JSON.`,
        },
        { role: "user", content: query },
    ];
    try {
        const response = await (0, gemini_1.geminiChat)(messages);
        await khanoonPromise; // Ensure Khanoon search completes
        return {
            response,
            model: "gemini-flash",
            cost: estimateCostDetailed("gemini_flash", "gemini_flash_output", inputTokens, estimateTokens(response)) + khanoonCost,
            khanoonResults,
        };
    }
    catch (error) {
        console.error("[AI Router] Gemini research failed:", error);
        throw error;
    }
}
/**
 * Route a translation request.
 * Indian language → Sarvam (₹5/1M or free with Sarvam-M), fallback to Gemini.
 */
async function routeTranslation(text, targetLang) {
    const inputTokens = estimateTokens(text);
    // Check if it's an Indian language target
    const indianTargetLangs = [
        "hindi", "tamil", "telugu", "kannada", "malayalam", "bengali",
        "marathi", "urdu", "gujarati", "punjabi", "odia", "assamese",
    ];
    if (indianTargetLangs.includes(targetLang.toLowerCase())) {
        logModelSelection("translation", "sarvam-105b", `Translating to ${targetLang} (Sarvam-30B)`);
        try {
            const { translate } = await Promise.resolve().then(() => __importStar(require("./sarvam")));
            // Detect source language from content
            const { detectLanguage: sarvamDetect } = await Promise.resolve().then(() => __importStar(require("./sarvam")));
            let sourceLang = "english";
            try {
                const detected = await sarvamDetect(text);
                if (detected.language && detected.language !== "unknown") {
                    sourceLang = detected.language;
                }
            }
            catch {
                // Keep default English
            }
            const response = await translate(text, sourceLang, targetLang);
            return {
                response,
                model: "sarvam-105b",
                cost: 0, // Sarvam-30B is free
            };
        }
        catch (sarvamError) {
            console.warn("[AI Router] Sarvam translation failed, falling back to Gemini:", sarvamError);
            // Fall through to Gemini
        }
    }
    // Fallback: Gemini for non-Indian or if Sarvam fails
    logModelSelection("translation", "gemini", "Fallback translation or non-Indian language");
    const messages = [
        {
            role: "system",
            content: `You are a professional legal translator. Translate the given text to ${targetLang}.
Preserve all legal terminology and formatting. If translating from an Indian language, preserve
names and proper nouns in their original script. Respond ONLY with the translated text.`,
        },
        { role: "user", content: text },
    ];
    const response = await (0, gemini_1.geminiChat)(messages);
    return {
        response,
        model: "gemini-flash",
        cost: estimateCostDetailed("gemini_flash", "gemini_flash_output", inputTokens, estimateTokens(response)),
    };
}
