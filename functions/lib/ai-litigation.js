"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiAiLitigation = void 0;
const secrets_1 = require("./secrets");
// ai-litigation — Firebase Cloud Function
// AI-powered litigation tools with REAL legal citations from Indian Kanoon + web search
// Each tool (Argument Builder, Injunction Generator, etc.) performs legal search AND generates AI analysis
// Returns: { response, citations, sources, suggestions, _meta }
//
// Pipeline:
//   1. Extract legal keywords from user input
//   2. Search Indian Kanoon + Google CSE for relevant case law
//   3. Generate tool-specific AI response with case law context
//   4. Return response + structured citations from REAL cases
const v2_1 = require("firebase-functions/v2");
const cors_1 = require("./cors");
const legal_search_1 = require("./legal-search");
const sarvam_client_1 = require("./sarvam-client");
const groq_client_1 = require("./groq-client");
const gemini_client_1 = require("./gemini-client");
const corsHandler = cors_1.restrictedCors;
// ─── Tool-Specific System Prompts ───
const TOOL_PROMPTS = {
    "argument-builder": `You are an expert Indian litigation lawyer specializing in building comprehensive legal arguments. Based on the case details AND the real case law provided, generate a comprehensive argument structure.

CRITICAL: You MUST cite specific cases from the case law provided. Use the format "In [Case Name], the [Court] held that..." for each citation.

## Main Arguments (4-5)
For EACH argument:
1. State the legal principle clearly
2. Cite a relevant statutory provision (section number, act name)
3. Support with at least ONE real case from the provided case law
4. Explain how it applies to this case

## Counter-Arguments (3-4)
Anticipate opposing counsel's arguments with rebuttals supported by case law.

## Weakness Analysis
Identify potential weaknesses and mitigation strategies.

## Suggested Precedents
List the MOST relevant precedents from the provided case law with full citations.

## Oral Argument Structure
Opening → Main Body (ordered by strength) → Conclusion.

Use proper legal text formatting. Be specific with Indian legal provisions.`,
    "injunction-generator": `You are an expert Indian civil litigation lawyer specializing in injunctions and interim relief. Based on the relief type, grounds, AND the real case law provided, generate a complete legal document.

CRITICAL: You MUST cite specific cases from the case law provided.

## Type of Relief
Identify the correct legal remedy (Order 39 Rules 1 & 2 CPC, Specific Relief Act, etc.)

## Draft Application
Draft a complete application with proper format:
- Cause title
- Parties
- Grounds (each supported by case law)
- Prayer clause

## Key Legal Provisions
Cite ALL relevant statutory provisions.

## Supporting Precedents
List 3-4 precedents from the provided case law that support this relief.

## Filing Checklist
Specific to this type of injunction.

Use proper Indian legal formatting. Include prayer clause.`,
    "hearing-prep": `You are an expert Indian trial lawyer. Prepare a comprehensive hearing preparation document based on the case information AND real case law provided.

CRITICAL: Cite specific cases from the provided case law.

## Case Timeline
Key dates and procedural history.

## Previous Orders Summary
Summary of important previous orders.

## Key Issues for This Hearing
Identify specific issues with supporting case law.

## Contradictions in Opponent's Case
Highlight contradictions with legal backing.

## Judge Notes
Tips based on judge's tendencies and relevant precedents.

## Suggested Speaking Points
Ordered list with case law citations.

## Anticipated Questions & Answers
With legal support for each answer.

## Required Documents
Complete checklist.

Use Indian legal context. Cite cases throughout.`,
    "cross-examination": `You are an expert Indian criminal/civil litigation lawyer specializing in cross-examination. Analyze the witness statement using the Indian Evidence Act AND the provided case law.

CRITICAL: Cite specific cases from the case law provided that support your cross-examination strategy.

## Statement Analysis
Break down the statement into key claims.

## Contradictions Found
Identify contradictions with legal references.

## Trap Questions (8-10)
Sharp questions designed to expose contradictions. Each should reference a section of the Indian Evidence Act (Sections 136-165).

## Leading Questions
Questions suggesting answers to undermine credibility.

## Document References
Questions linking to specific documents.

## Probative Questions
To establish the truth. Support with relevant case law on admissibility and burden of proof.

Format with suggested answers and legal significance. Use Evidence Act provisions.`,
    "courtroom-notes": `You are an expert Indian legal assistant. Convert the raw hearing notes into a structured summary. Where relevant, reference legal principles from the provided case law.

## Hearing Summary
Clear, organized summary of what transpired.

## Key Observations
Important statements by judge, opposing counsel, witnesses.

## Orders / Directions
Any orders passed or directions given.

## Action Items
Tasks to complete before next hearing.

## Client Update
Draft a client-friendly summary.

## Next Steps
Recommended actions and deadlines.`,
    "strategy-simulator": `You are an expert Indian litigation strategist. Analyze the case and opponent's strategy with REAL case law backing.

CRITICAL: Cite specific cases from the provided case law.

You MUST start your response with "CASE_STRENGTH: XX" where XX is 20-95 representing overall case strength.

## Counter Arguments (4-5)
Each supported by case law.

## Interim Relief Chances
Assessment with case law support.

## Anticipated Objections
With rebuttals based on precedents.

## Risk Assessment
Top 3-4 risks with mitigation from case law.

## Strategic Recommendations
5 concrete recommendations with legal backing.

## Strength Analysis
- Legal Merit: (percentage)
- Evidence Strength: (percentage)
- Precedent Support: (percentage)
- Procedural Advantage: (percentage)

Use Indian legal context. Be specific.`,
};
// ─── Extract legal search terms from user input ───
function extractSearchTerms(toolType, input) {
    const parts = [];
    switch (toolType) {
        case "argument-builder": {
            if (input.caseDetails)
                parts.push(input.caseDetails);
            if (input.petition)
                parts.push(input.petition);
            break;
        }
        case "injunction-generator": {
            if (input.caseType)
                parts.push(input.caseType);
            if (input.grounds)
                parts.push(input.grounds);
            break;
        }
        case "hearing-prep": {
            if (input.caseInfo)
                parts.push(input.caseInfo);
            break;
        }
        case "cross-examination": {
            if (input.statement)
                parts.push(input.statement);
            break;
        }
        case "courtroom-notes": {
            if (input.notes)
                parts.push(input.notes);
            break;
        }
        case "strategy-simulator": {
            if (input.caseDetails)
                parts.push(input.caseDetails);
            if (input.opponentStrategy)
                parts.push(input.opponentStrategy);
            break;
        }
    }
    const combined = parts.join(" ").trim();
    if (!combined)
        return "";
    // Extract key legal terms for search (max ~200 chars for search query)
    // Remove common filler words
    const legalTerms = combined
        .replace(/\b(the|a|an|is|are|was|were|of|in|to|for|and|or|but|with|that|this|it|on|at|by|from|as|be|has|have|had|not|will|would|could|should|may|can|shall|do|did|does)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    // Take first 200 chars as search query
    return legalTerms.substring(0, 200);
}
// ─── Format case law context for AI prompt ───
function formatCaseLawContext(searchData, analysisData) {
    const parts = [];
    if (analysisData.results && analysisData.results.length > 0) {
        parts.push("=== RELEVANT CASE LAW (from verified sources) ===\n");
        for (const caseResult of analysisData.results.slice(0, 5)) {
            parts.push(`**${caseResult.title}**`);
            if (caseResult.citation)
                parts.push(`Citation: ${caseResult.citation}`);
            if (caseResult.court)
                parts.push(`Court: ${caseResult.court}`);
            if (caseResult.year)
                parts.push(`Year: ${caseResult.year}`);
            parts.push(`Key Holdings:`);
            for (const holding of (caseResult.keyHoldings || []).slice(0, 4)) {
                parts.push(`  - ${holding}`);
            }
            if (caseResult.summary) {
                parts.push(`Summary: ${caseResult.summary.substring(0, 300)}`);
            }
            if (caseResult.rawJudgmentExcerpt) {
                parts.push(`Judgment Excerpt: "${caseResult.rawJudgmentExcerpt.substring(0, 500)}"`);
            }
            if (caseResult.source)
                parts.push(`Source: ${caseResult.source}`);
            parts.push("");
        }
    }
    if (analysisData.suggestedArguments && analysisData.suggestedArguments.length > 0) {
        parts.push("=== SUGGESTED ARGUMENTS FROM CASE LAW ===");
        for (let i = 0; i < Math.min(analysisData.suggestedArguments.length, 5); i++) {
            parts.push(`${i + 1}. ${analysisData.suggestedArguments[i]}`);
        }
        parts.push("");
    }
    return parts.join("\n");
}
// ─── Main Cloud Function ───
exports.apiAiLitigation = v2_1.https.onRequest({
    timeoutSeconds: 180, // Research + AI generation can take time
    region: "us-central1", secrets: secrets_1.aiFunctionSecrets,
}, async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        try {
            const { toolType, caseDetails, petition, grounds, caseInfo, statement, notes, opponentStrategy, caseType } = req.body;
            if (!toolType || !TOOL_PROMPTS[toolType]) {
                res.status(400).json({
                    error: "Valid toolType is required",
                    validTools: Object.keys(TOOL_PROMPTS),
                });
                return;
            }
            const input = { caseDetails, petition, grounds, caseInfo, statement, notes, opponentStrategy, caseType };
            const searchQuery = extractSearchTerms(toolType, input);
            console.log(`[ai-litigation] Tool: ${toolType} | Search: "${searchQuery?.substring(0, 80)}..."`);
            // ─── STEP 1: Legal Search ───
            let searchData = null;
            let analysisData = null;
            let caseLawContext = "";
            const dataSources = [];
            if (searchQuery && searchQuery.length > 10) {
                try {
                    const searchStart = Date.now();
                    searchData = await (0, legal_search_1.performLegalSearch)(searchQuery);
                    const searchTime = Date.now() - searchStart;
                    if (searchData.hasRealData) {
                        dataSources.push(...searchData.dataSources);
                        // Analyze the found cases
                        const analysisStart = Date.now();
                        analysisData = await (0, legal_search_1.analyzeLegalData)(searchData);
                        const analysisTime = Date.now() - analysisStart;
                        caseLawContext = formatCaseLawContext(searchData, analysisData);
                        console.log(`[ai-litigation] Research completed: search=${searchTime}ms analysis=${analysisTime}ms, ${analysisData.results?.length || 0} cases found, sources: [${dataSources.join(", ")}]`);
                    }
                    else {
                        console.log(`[ai-litigation] No real data found for query: "${searchQuery?.substring(0, 50)}"`);
                    }
                }
                catch (searchErr) {
                    console.error("[ai-litigation] Legal search failed, proceeding without citations:", searchErr);
                }
            }
            // ─── STEP 2: Generate AI Response ───
            // Build the user message with case law context
            let userMessage = "";
            switch (toolType) {
                case "argument-builder":
                    userMessage = `Case Details:\n${caseDetails || ""}\n${petition ? `\nPetition/Reply/FIR Content:\n${petition}` : ""}`;
                    break;
                case "injunction-generator":
                    userMessage = `Type of Relief: ${caseType || ""}\nGrounds: ${grounds || ""}`;
                    break;
                case "hearing-prep":
                    userMessage = `Case Information:\n${caseInfo || ""}`;
                    break;
                case "cross-examination":
                    userMessage = `Witness Statement:\n${statement || ""}`;
                    break;
                case "courtroom-notes":
                    userMessage = `Raw Hearing Notes:\n${notes || ""}`;
                    break;
                case "strategy-simulator":
                    userMessage = `Case Details:\n${caseDetails || ""}\n\nOpponent's Strategy:\n${opponentStrategy || "Not specified"}`;
                    break;
            }
            if (caseLawContext) {
                userMessage += `\n\n---\n\nRELEVANT CASE LAW (use these as citations in your response):\n\n${caseLawContext}`;
            }
            const systemPrompt = TOOL_PROMPTS[toolType];
            let responseText;
            try {
                responseText = await (0, sarvam_client_1.callSarvamText)(systemPrompt, userMessage, 0.5, "sarvam-30b");
            }
            catch (sarvamErr) {
                console.error("[ai-litigation] Sarvam failed, falling back to Groq:", sarvamErr?.message);
                try {
                    responseText = await (0, groq_client_1.callGroqText)(systemPrompt, userMessage, 0.5);
                }
                catch (groqErr) {
                    console.error("[ai-litigation] Groq failed, falling back to Gemini:", groqErr?.message);
                    responseText = await (0, gemini_client_1.callGeminiText)(systemPrompt, userMessage, 0.5);
                }
            }
            // ─── STEP 3: Build Citations from Found Cases ───
            const citations = (analysisData?.results || []).map((r) => ({
                title: r.title,
                court: r.court,
                year: r.year,
                citation: r.citation,
                summary: r.summary,
                keyHoldings: r.keyHoldings || [],
                relevance: r.relevance,
                source: r.source,
                sourceExcerpts: r.sourceExcerpts,
            }));
            const sources = dataSources.length > 0 ? dataSources : (caseLawContext ? ["AI Knowledge (no live cases found)"] : []);
            // Extract CASE_STRENGTH for strategy simulator
            let caseStrength = null;
            if (toolType === "strategy-simulator") {
                const strengthMatch = responseText.match(/CASE_STRENGTH:\s*(\d+)/);
                if (strengthMatch) {
                    caseStrength = Math.min(95, Math.max(20, parseInt(strengthMatch[1], 10)));
                    responseText = responseText.replace(/CASE_STRENGTH:\s*\d+\n?/, "").trim();
                }
            }
            (0, groq_client_1.logUsage)("ai-litigation", undefined, 3000);
            console.log(`[ai-litigation] Success: tool=${toolType}, citations=${citations.length}, sources=[${sources.join(",")}]`);
            res.json({
                success: true,
                response: responseText,
                citations,
                sources,
                caseStrength,
                suggestedArguments: analysisData?.suggestedArguments || [],
                relatedPrecedents: analysisData?.relatedPrecedents || [],
                _meta: {
                    tool: toolType,
                    searchQuery: searchQuery?.substring(0, 100),
                    dataSources: sources,
                    citationsCount: citations.length,
                    searchPerformed: !!searchQuery && searchQuery.length > 10,
                },
            });
        }
        catch (error) {
            console.error("[ai-litigation] Error:", error?.message, error?.stack);
            res.status(500).json({
                success: false,
                error: "Failed to process litigation request. Please try again.",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });
});
