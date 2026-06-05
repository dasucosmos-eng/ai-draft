// @ts-nocheck
import { parseLLMJSON } from "./parse-json";
import { aiFunctionSecrets } from "./secrets";
import * as admin from "firebase-admin";
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

import { https } from "firebase-functions/v2";
import { restrictedCors } from "./cors";
import { performLegalSearch, analyzeLegalData } from "./legal-search";
import { callSarvamChat, callSarvamStructured, callSarvamText } from "./sarvam-client";
import { callGroqChat, callGroqStructured, callGroqText, logUsage } from "./groq-client";
import { callGeminiText } from "./gemini-client";

const corsHandler = restrictedCors;

// ─── Tool-Specific System Prompts ───

const TOOL_PROMPTS: Record<string, string> = {
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

  // Aliases added for frontend compatibility
  "case-search": `You are an expert Indian legal researcher. Search for and analyze relevant case law, statutes, and legal precedents based on the query.

CRITICAL: You MUST cite specific cases from the case law provided.

## Relevant Case Law
For each case found:
1. Case name and citation
2. Court and year
3. Key holdings relevant to the query
4. How it applies to the user's situation

## Statutory Provisions
List all relevant sections and acts.

## Legal Analysis
Provide a thorough analysis of how the law applies.

## Suggested Arguments
Based on the case law, suggest the strongest arguments.

Use proper Indian legal formatting. Be thorough.`,

  "legal-analysis": `You are an expert Indian litigation lawyer specializing in comprehensive legal analysis. Analyze the legal issue AND the real case law provided.

CRITICAL: Cite specific cases from the case law provided.

## Issue Identification
Identify all legal issues (questions of law, questions of fact, mixed).

## Legal Analysis
For each issue:
1. Applicable statutory provisions
2. Relevant case law from the provided citations
3. How courts have interpreted similar cases

## Strengths and Weaknesses
Assess the legal position objectively.

## Recommended Approach
Suggest the best legal strategy.

Use proper Indian legal formatting. Be specific with provisions and case citations.`,

  "argument-analyzer": `You are an expert Indian litigation lawyer specializing in analyzing legal arguments. Analyze the arguments provided AND the real case law.

CRITICAL: Cite specific cases from the case law provided.

## Argument Breakdown
Analyze each argument for:
1. Legal merit
2. Factual basis
3. Precedent support

## Strengths
Identify the strongest points with case law backing.

## Weaknesses
Identify vulnerabilities the opposing side could exploit.

## Counter-Arguments
For each weakness, provide a rebuttal supported by case law.

## Recommended Improvements
Suggest how to strengthen the arguments.

Use proper Indian legal formatting. Be thorough.`,

  "defense-builder": `You are an expert Indian criminal defense lawyer. Build a comprehensive defense strategy based on the prosecution's case AND the real case law provided.

CRITICAL: Cite specific cases from the case law provided.

## Defense Theory
State the core defense theory clearly.

## Element-wise Rebuttal
For each element the prosecution must prove:
1. What prosecution alleges
2. Defense rebuttal with evidence
3. Case law support for the defense position

## Procedural Defenses
Any procedural irregularities (Section 167/169 CrPC, Section 313 CrPC, etc.)

## Pre-trial Motions
Bail, discharge under Section 227/239 CrPC, etc.

## Key Precedents for Defense
List the strongest defense-supporting cases.

## Cross-Examination Strategy
Key witnesses to cross-examine and suggested questions.

Use proper Indian legal formatting. Be specific with IPC/BNSS sections.`,
};

// ─── Alias mapping for frontend compatibility ───
const TOOL_TYPE_ALIASES: Record<string, string> = {
  "case-search": "argument-builder",
  "legal-analysis": "argument-builder",
  "argument-analyzer": "argument-builder",
  "defense-builder": "argument-builder",
  "strategy": "strategy-simulator",
};

// ─── Extract legal search terms from user input ───

function extractSearchTerms(toolType: string, input: Record<string, any>): string {
  const parts: string[] = [];

  // Universal fallback: accept input.query from frontend
  if (input.query) parts.push(input.query);

  switch (toolType) {
    case "argument-builder":
    case "argument-analyzer":
    case "defense-builder":
    case "case-search":
    case "legal-analysis": {
      if (input.caseDetails) parts.push(input.caseDetails);
      if (input.petition) parts.push(input.petition);
      if (input.prosecutionCase) parts.push(input.prosecutionCase);
      if (input.facts) parts.push(input.facts);
      if (input.grounds) parts.push(input.grounds);
      break;
    }
    case "injunction-generator": {
      if (input.caseType) parts.push(input.caseType);
      if (input.grounds) parts.push(input.grounds);
      break;
    }
    case "hearing-prep": {
      if (input.caseInfo) parts.push(input.caseInfo);
      break;
    }
    case "cross-examination": {
      if (input.statement) parts.push(input.statement);
      break;
    }
    case "courtroom-notes": {
      if (input.notes) parts.push(input.notes);
      break;
    }
    case "strategy-simulator":
    case "strategy": {
      if (input.caseDetails) parts.push(input.caseDetails);
      if (input.opponentStrategy) parts.push(input.opponentStrategy);
      break;
    }
  }

  const combined = parts.join(" ").trim();
  if (!combined) return "";

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

function formatCaseLawContext(searchData: any, analysisData: any): string {
  const parts: string[] = [];

  if (analysisData.results && analysisData.results.length > 0) {
    parts.push("=== RELEVANT CASE LAW (from verified sources) ===\n");
    for (const caseResult of analysisData.results.slice(0, 5)) {
      parts.push(`**${caseResult.title}**`);
      if (caseResult.citation) parts.push(`Citation: ${caseResult.citation}`);
      if (caseResult.court) parts.push(`Court: ${caseResult.court}`);
      if (caseResult.year) parts.push(`Year: ${caseResult.year}`);
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
      if (caseResult.source) parts.push(`Source: ${caseResult.source}`);
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

export const apiAiLitigation = https.onRequest(
  {
    timeoutSeconds: 180, // Research + AI generation can take time
    region: "us-central1", secrets: aiFunctionSecrets,
  },
  async (req, res) => {
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
      let uid: string;
      try {
        const decoded = await admin.auth().verifyIdToken(authToken);
        uid = decoded.uid;
      } catch {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }
      try {
        // Accept both toolType and task (frontend DraftingView sends 'task')
        const { toolType: rawToolType, task, caseDetails, petition, grounds, caseInfo, statement, notes, opponentStrategy, caseType, input: nestedInput, query, prosecutionCase, facts, sectionsCharged, firNumber, accusedName, courtName } = req.body;

        const toolType = rawToolType || task || "";
        if (!toolType) {
          res.status(400).json({
            error: "Valid toolType or task is required",
            validTools: Object.keys(TOOL_PROMPTS),
          });
          return;
        }

        // Resolve aliases
        const resolvedToolType = TOOL_PROMPTS[toolType] ? toolType : (TOOL_TYPE_ALIASES[toolType] || null);
        const effectiveToolType = resolvedToolType || toolType;

        if (!TOOL_PROMPTS[effectiveToolType]) {
          res.status(400).json({
            error: `Unknown toolType: "${toolType}"`,
            validTools: Object.keys(TOOL_PROMPTS),
          });
          return;
        }

        // Merge all input fields — accept both flat and nested input structures
        const input: Record<string, any> = {
          caseDetails, petition, grounds, caseInfo, statement, notes, opponentStrategy, caseType,
          query, prosecutionCase, facts, sectionsCharged, firNumber, accusedName, courtName,
          ...(nestedInput || {}), // Unwrap nested input object from aiLitigation() calls
        };
        const searchQuery = extractSearchTerms(effectiveToolType, input);

        console.log(`[ai-litigation] Tool: ${toolType} | Search: "${searchQuery?.substring(0, 80)}..."`);

        // ─── STEP 1: Legal Search ───
        let searchData: any = null;
        let analysisData: any = null;
        let caseLawContext = "";
        const dataSources: string[] = [];

        if (searchQuery && searchQuery.length > 10) {
          try {
            const searchStart = Date.now();
            searchData = await performLegalSearch(searchQuery);
            const searchTime = Date.now() - searchStart;

            if (searchData.hasRealData) {
              dataSources.push(...searchData.dataSources);

              // Analyze the found cases
              const analysisStart = Date.now();
              analysisData = await analyzeLegalData(searchData);
              const analysisTime = Date.now() - analysisStart;

              caseLawContext = formatCaseLawContext(searchData, analysisData);
              console.log(`[ai-litigation] Research completed: search=${searchTime}ms analysis=${analysisTime}ms, ${analysisData.results?.length || 0} cases found, sources: [${dataSources.join(", ")}]`);
            } else {
              console.log(`[ai-litigation] No real data found for query: "${searchQuery?.substring(0, 50)}"`);
            }
          } catch (searchErr) {
            console.error("[ai-litigation] Legal search failed, proceeding without citations:", searchErr);
          }
        }

        // ─── STEP 2: Generate AI Response ───
        // Build the user message with case law context
        let userMessage = "";

        switch (effectiveToolType) {
          case "argument-builder":
            userMessage = `Case Details:\n${caseDetails || prosecutionCase || query || ""}\n${petition ? `\nPetition/Reply/FIR Content:\n${petition}` : ""}\n${facts ? `\nDefense Facts:\n${facts}` : ""}\n${grounds ? `\nLegal Grounds:\n${grounds}` : ""}\n${sectionsCharged ? `\nSections Charged: ${sectionsCharged}` : ""}\n${accusedName ? `\nAccused: ${accusedName}` : ""}\n${firNumber ? `\nFIR: ${firNumber}` : ""}\n${courtName ? `\nCourt: ${courtName}` : ""}`;
            break;
          case "injunction-generator":
            userMessage = `Type of Relief: ${caseType || ""}\nGrounds: ${grounds || ""}`;
            break;
          case "hearing-prep":
            userMessage = `Case Information:\n${caseInfo || query || ""}`;
            break;
          case "cross-examination":
            userMessage = `Witness Statement:\n${statement || query || ""}`;
            break;
          case "courtroom-notes":
            userMessage = `Raw Hearing Notes:\n${notes || query || ""}`;
            break;
          case "strategy-simulator":
            userMessage = `Case Details:\n${caseDetails || query || ""}\n\nOpponent's Strategy:\n${opponentStrategy || "Not specified"}`;
            break;
        }

        if (caseLawContext) {
          userMessage += `\n\n---\n\nRELEVANT CASE LAW (use these as citations in your response):\n\n${caseLawContext}`;
        }

        const systemPrompt = TOOL_PROMPTS[effectiveToolType];

        let responseText: string;
        try {
          responseText = await callSarvamText(systemPrompt, userMessage, 0.5, "sarvam-105b");
        } catch (sarvamErr) {
          console.error("[ai-litigation] Sarvam failed, falling back to Groq:", sarvamErr?.message);
          try {
            responseText = await callGroqText(systemPrompt, userMessage, 0.5);
          } catch (groqErr) {
            console.error("[ai-litigation] Groq failed, falling back to Gemini:", groqErr?.message);
            responseText = await callGeminiText(systemPrompt, userMessage, 0.5);
          }
        }

        // ─── STEP 3: Build Citations from Found Cases ───
        const citations = (analysisData?.results || []).map((r: any) => ({
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
        let caseStrength: number | null = null;
        if (effectiveToolType === "strategy-simulator") {
          const strengthMatch = responseText.match(/CASE_STRENGTH:\s*(\d+)/);
          if (strengthMatch) {
            caseStrength = Math.min(95, Math.max(20, parseInt(strengthMatch[1], 10)));
            responseText = responseText.replace(/CASE_STRENGTH:\s*\d+\n?/, "").trim();
          }
        }

        logUsage("ai-litigation", uid, 3000);

        console.log(`[ai-litigation] Success: tool=${effectiveToolType} (requested: ${toolType}), citations=${citations.length}, sources=[${sources.join(",")}]`);

        res.json({
          success: true,
          response: responseText,
          citations,
          sources,
          caseStrength,
          suggestedArguments: analysisData?.suggestedArguments || [],
          relatedPrecedents: analysisData?.relatedPrecedents || [],
          _meta: {
            tool: effectiveToolType,
            searchQuery: searchQuery?.substring(0, 100),
            dataSources: sources,
            citationsCount: citations.length,
            searchPerformed: !!searchQuery && searchQuery.length > 10,
          },
        });
      } catch (error: any) {
        console.error("[ai-litigation] Error:", error?.message, error?.stack);
        res.status(500).json({
          success: false,
          error: "Failed to process litigation request. Please try again.",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
);
