// @ts-nocheck
import { parseLLMJSON } from "./parse-json";
import { aiFunctionSecrets } from "./secrets";
import * as admin from "firebase-admin";
// ai-civil — Firebase Cloud Function
// AI-powered Civil Original Side drafting module for AI Draft legal platform
// Generates Plaints, Written Statements, Injunction IAs, Written Arguments,
// parses Issues Framed orders, and extracts structured facts from narratives
// Returns: { success, data: {...} } or { success: false, error: "..." }

import { https } from "firebase-functions/v2";
import { restrictedCors } from "./cors";
import { stripMarkdownFromData } from "./utils";
import { callSarvamStructured } from "./sarvam-client";
import { callGroqStructured, logUsage } from "./groq-client";
import { callGeminiText } from "./gemini-client";

const corsHandler = restrictedCors;

// ─── System Prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Indian civil litigation drafter integrated into AI Draft platform. You specialize in drafting original side pleadings under the Code of Civil Procedure, 1908 (CPC).

Key legal areas:
- Order 1-10 CPC: Frames of suit, parties, plaint procedure
- Order 6: Pleadings (plaint, written statement)
- Order 7: Plaint rules, valuation, court fee
- Order 8: Written Statement, set-off, counter-claim
- Order 14: Issues framing
- Order 39: Temporary Injunctions (prima facie case, balance of convenience, irreparable loss)
- Specific Relief Act: Specific performance, injunction, declaration
- Transfer of Property Act: Property disputes, mortgage, sale
- Indian Contract Act: Breach, damages, specific performance

Document drafting rules:
- Plaint: Cause title, jurisdiction paragraphs, facts in concise numbered paragraphs, cause of action, valuation & court fee, reliefs sought, verification
- Written Statement: Para-wise reply to each plaint paragraph (admit/deny/partly admit/require proof), preliminary objections, additional pleas, set-off/counter-claim if applicable, verification
- Injunction IA: Prima facie case, balance of convenience, irreparable loss test under Order 39 Rules 1 & 2 CPC, affidavit supporting facts
- Written Arguments: Issue-wise analysis with facts + law, reference to pleadings and evidence, citation of relevant legal provisions
- Include section numbers and statutory references
- Follow standard format for the relevant court (district court, high court)`;

// ─── JSON Structure Definitions per Task ────────────────────────────────────────

const PLAINT_JSON_STRUCTURE = `{
  "title": "Short title of the plaint (e.g., 'Plaint for Recovery of Money', 'Plaint for Specific Performance of Agreement to Sell')",
  "content": "Full plaint text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like IN THE HIGH COURT OF..., PLAINT, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title, jurisdiction, parties description, concise numbered paragraphs of facts, cause of action, valuation and court fee, reliefs sought clause (lettered a, b, c...), verification, and signature block. Make it court-ready.",
  "keyPoints": ["Key legal point 1", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

const WS_JSON_STRUCTURE = `{
  "title": "Title of the Written Statement (e.g., 'Written Statement on behalf of Defendant')",
  "content": "Complete written statement text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like IN THE HIGH COURT OF..., WRITTEN STATEMENT, VERIFICATION. Section sub-headings use Title Case. Include: cause title, preliminary objections, para-wise replies, additional pleas, set-off/counter-claim if applicable, verification, and signature block",
  "paraReplies": [
    {
      "paraNumber": 1,
      "plainText": "The exact text of the plaint paragraph being replied to",
      "stance": "admit|deny|partly_admit|require_proof",
      "replyDraft": "The drafted reply to this specific paragraph with legal reasoning"
    }
  ],
  "preliminarySubmissions": ["Preliminary objection or submission 1", "Preliminary objection or submission 2"]
}`;

const INJUNCTION_IA_JSON_STRUCTURE = `{
  "title": "Title of the Interlocutory Application (e.g., 'IA for Temporary Injunction under Order 39 Rules 1 & 2 CPC')",
  "content": "Full IA text in PLAIN TEXT format (NO markdown, NO ** or ##). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings. Section sub-headings use Title Case. Include: cause title, grounds (prima facie case, balance of convenience, irreparable loss), prayer clause, verification, and signature block",
  "affidavitContent": "Supporting affidavit content in markdown: jurat, deponent details, paragraphs of facts supporting urgency and irreparable injury, verification"
}`;

const WRITTEN_ARGUMENTS_JSON_STRUCTURE = `{
  "title": "Title of Written Arguments (e.g., 'Written Arguments on behalf of Plaintiff')",
  "content": "Complete written arguments text in PLAIN TEXT format (NO markdown, NO ** or ##). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Section headings use Title Case. Include: introduction, issue-wise arguments, conclusion, and prayer",
  "issueArguments": [
    {
      "issueNumber": 1,
      "heading": "Short heading for this issue argument",
      "factsFor": ["Fact supporting this side 1", "Fact supporting this side 2"],
      "factsAgainst": ["Adverse fact to address 1", "Adverse fact to address 2"],
      "legalProvisions": ["Relevant Section/Act 1", "Relevant Section/Act 2"],
      "argumentDraft": "Detailed argument draft for this issue combining facts, evidence, and legal provisions"
    }
  ],
  "conclusion": "Concluding paragraph summarizing the arguments and the relief sought"
}`;

const PARSE_ISSUES_JSON_STRUCTURE = `{
  "issues": [
    {
      "issueNumber": 1,
      "issueText": "Full text of the issue as framed by the court",
      "type": "question_of_law|question_of_fact|mixed"
    }
  ]
}`;

const EXTRACT_FACTS_JSON_STRUCTURE = `{
  "parties": [
    {
      "name": "Full name of the person/entity",
      "address": "Address if mentioned",
      "role": "plaintiff|defendant|witness|other"
    }
  ],
  "dates": [
    {
      "date": "Date string as mentioned",
      "event": "Description of what happened on this date"
    }
  ],
  "amounts": [
    {
      "amount": "Amount mentioned (e.g., '5,00,000' or 'Rs. 5 Lakhs')",
      "context": "What this amount relates to (e.g., 'suit value', 'consideration', 'damages claimed')"
    }
  ],
  "properties": [
    {
      "description": "Description of property mentioned"
    }
  ],
  "keyFacts": ["Key factual statement 1", "Key factual statement 2", "Key factual statement 3"],
  "missingInfo": ["Critical missing information 1 that would be needed for a plaint", "Critical missing information 2"]
}`;

// ─── Task: generatePlaint ──────────────────────────────────────────────────────

function buildPlaintPrompt(matterFacts: any, valuation?: any, courtFormat?: string): string {
  const parties = matterFacts.parties || [];
  const plaintiffs = parties.filter((p: any) => p.role === "plaintiff");
  const defendants = parties.filter((p: any) => p.role === "defendant");

  let prompt = `Draft a complete, court-ready Plaint for an original civil suit.

## Suit Details
- **Suit Type:** ${matterFacts.suitType || "RECOVERY"}
- **Jurisdiction:** ${matterFacts.jurisdiction || "Not specified"}
- **Court:** ${matterFacts.courtName || "Not specified"}
- **Cause of Action Date:** ${matterFacts.causeOfActionDate || "Not specified"}
`;

  if (courtFormat) {
    prompt += `- **Court Format/Style:** ${courtFormat}\n`;
  }

  prompt += `
## Parties

### Plaintiffs
${plaintiffs.map((p: any, i: number) => `${i + 1}. **${p.name}**, ${p.address || "Address not specified"}${p.counsel ? ` (Advocate: ${p.counsel})` : ""}`).join("\n") || "Not specified"}

### Defendants
${defendants.map((p: any, i: number) => `${i + 1}. **${p.name}**, ${p.address || "Address not specified"}${p.counsel ? ` (Advocate: ${p.counsel})` : ""}`).join("\n") || "Not specified"}
`;

  if (matterFacts.properties && matterFacts.properties.length > 0) {
    prompt += `\n## Properties\n`;
    matterFacts.properties.forEach((prop: any, i: number) => {
      prompt += `${i + 1}. ${prop.description}${prop.surveyNumber ? `, Survey No. ${prop.surveyNumber}` : ""}${prop.address ? `, ${prop.address}` : ""}\n`;
    });
  }

  if (matterFacts.contracts && matterFacts.contracts.length > 0) {
    prompt += `\n## Contracts/Agreements\n`;
    matterFacts.contracts.forEach((c: any, i: number) => {
      prompt += `${i + 1}. **Date:** ${c.date} | **Amount:** ${c.amount} | **Terms:** ${c.terms || "Not specified"} | **Breach:** ${c.breach || "Not specified"}\n`;
    });
  }

  prompt += `\n## Chronology of Events\n`;
  if (matterFacts.events && matterFacts.events.length > 0) {
    matterFacts.events.forEach((e: any, i: number) => {
      prompt += `${i + 1}. **${e.date || "Date unspecified"}:** ${e.description}\n`;
    });
  } else {
    prompt += `No events provided — draft from the available facts above.\n`;
  }

  if (matterFacts.payments && matterFacts.payments.length > 0) {
    prompt += `\n## Payments\n`;
    matterFacts.payments.forEach((p: any, i: number) => {
      prompt += `${i + 1}. **${p.date || "Date unspecified"}:** ${p.amount} — ${p.purpose || "Not specified"}\n`;
    });
  }

  prompt += `\n## Reliefs Sought
${(matterFacts.reliefs || []).map((r: string, i: number) => `${String.fromCharCode(97 + i)}) ${r}`).join("\n") || "Not specified"}
`;

  if (valuation) {
    prompt += `\n## Valuation & Court Fee
- **Suit Value:** ${valuation.suitValue || "Not specified"}
- **Court Fee Paid:** ${valuation.courtFeePaid || "Not specified"}
`;
  }

  prompt += `
Draft the complete Plaint following Order 6 & Order 7 CPC. Include:
1. Cause title with court name, suit number, parties
2. Jurisdiction paragraphs (pecuniary, territorial, subject-matter under Section 15-20 CPC)
3. Concise numbered paragraphs of material facts
4. Cause of action with date under Order 7 Rule 7
5. Valuation and court fee
6. Reliefs sought (lettered a, b, c...)
7. Verification and signature block

Ensure proper statutory references and legal terminology throughout.`;

  return prompt;
}

// ─── Task: generateWS ──────────────────────────────────────────────────────────

function buildWSPrompt(
  plaintText: string,
  defendantName: string,
  defendantCounsel?: string,
  additionalPleas?: string[],
  setOffCounterClaim?: { amount: string; basis: string }
): string {
  let prompt = `Draft a complete, court-ready Written Statement on behalf of the Defendant.

## Defendant Details
- **Defendant Name:** ${defendantName}
${defendantCounsel ? `- **Advocate:** ${defendantCounsel}` : ""}

## Plaint to be Replied To
Below is the full text of the Plaint. You must read each paragraph and respond para-wise:

---
${plaintText}
---

## Instructions
1. Identify EVERY numbered paragraph in the Plaint
2. For each paragraph, determine the stance: admit, deny, partly_admit, or require_proof
3. Draft a substantive reply for each paragraph with legal reasoning
`;

  if (additionalPleas && additionalPleas.length > 0) {
    prompt += `\n## Additional Pleas to Include
${additionalPleas.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}
`;
  }

  if (setOffCounterClaim) {
    prompt += `\n## Set-Off / Counter-Claim
- **Amount:** ${setOffCounterClaim.amount}
- **Basis:** ${setOffCounterClaim.basis}
Include a proper set-off/counter-claim section under Order 8 Rule 6 CPC.
`;
  }

  prompt += `
Draft the complete Written Statement following Order 8 CPC. Include:
1. Cause title
2. Preliminary submissions/objections (limitation, jurisdiction, maintainability, non-joinder, etc.)
3. Para-wise replies to each plaint paragraph with stance (admit/deny/partly_admit/require_proof)
4. Additional pleas if any
5. Set-off / counter-claim if applicable
6. Verification and signature block

Be specific and legally precise in each reply. Reference relevant legal provisions.`;

  return prompt;
}

// ─── Task: generateInjunctionIA ────────────────────────────────────────────────

function buildInjunctionIAPrompt(
  matterFacts: any,
  injunctionType: string,
  propertyDetails?: { description: string; surveyNumber?: string; address?: string },
  urgencyFacts?: string,
  irreparableInjuryFacts?: string,
  courtFormat?: string
): string {
  const parties = matterFacts.parties || [];
  const plaintiffs = parties.filter((p: any) => p.role === "plaintiff");
  const defendants = parties.filter((p: any) => p.role === "defendant");

  let prompt = `Draft a complete Interlocutory Application for an Injunction in a civil suit.

## Injunction Type
- **Type:** ${injunctionType === "temporary" ? "Temporary Injunction" : injunctionType === "mandatory" ? "Mandatory Injunction" : "Status Quo Order"}
- **Applicable Law:** ${injunctionType === "temporary" ? "Order 39 Rules 1 & 2 CPC" : injunctionType === "mandatory" ? "Order 39 Rule 2 CPC + Section 38-40 Specific Relief Act" : "Order 39 Rule 1 & 2 CPC (status quo)"}

## Court & Jurisdiction
- **Jurisdiction:** ${matterFacts.jurisdiction || "Not specified"}
- **Court:** ${matterFacts.courtName || "Not specified"}
- **Cause of Action Date:** ${matterFacts.causeOfActionDate || "Not specified"}
`;

  if (courtFormat) {
    prompt += `- **Court Format/Style:** ${courtFormat}\n`;
  }

  prompt += `
## Parties

### Applicants/Plaintiffs
${plaintiffs.map((p: any, i: number) => `${i + 1}. **${p.name}**, ${p.address || "Address not specified"}${p.counsel ? ` (Advocate: ${p.counsel})` : ""}`).join("\n") || "Not specified"}

### Respondents/Defendants
${defendants.map((p: any, i: number) => `${i + 1}. **${p.name}**, ${p.address || "Address not specified"}${p.counsel ? ` (Advocate: ${p.counsel})` : ""}`).join("\n") || "Not specified"}
`;

  if (propertyDetails) {
    prompt += `\n## Property Details
- **Description:** ${propertyDetails.description}
${propertyDetails.surveyNumber ? `- **Survey Number:** ${propertyDetails.surveyNumber}` : ""}
${propertyDetails.address ? `- **Address:** ${propertyDetails.address}` : ""}
`;
  }

  prompt += `
## Suit Type & Reliefs
- **Suit Type:** ${matterFacts.suitType || "Not specified"}
- **Reliefs in Main Suit:** ${(matterFacts.reliefs || []).join(", ") || "Not specified"}

## Chronology of Events
${(matterFacts.events || []).map((e: any, i: number) => `${i + 1}. **${e.date || "Date unspecified"}:** ${e.description}`).join("\n") || "No events provided."}
`;

  if (urgencyFacts) {
    prompt += `\n## Urgency Facts (provided by advocate)
${urgencyFacts}
`;
  }

  if (irreparableInjuryFacts) {
    prompt += `\n## Irreparable Injury Facts (provided by advocate)
${irreparableInjuryFacts}
`;
  }

  prompt += `
Draft:
1. **The IA application** with proper cause title, grounds structured around the three-part test (prima facie case, balance of convenience, irreparable loss), prayer clause, verification
2. **A supporting affidavit** with jurat, deponent details, numbered paragraphs of supporting facts, and verification

Ensure references to Order 39 Rules 1 & 2 CPC and relevant case law principles.`;

  return prompt;
}

// ─── Task: generateWrittenArguments ────────────────────────────────────────────

function buildWrittenArgumentsPrompt(
  issues: { issueNumber: number; issueText: string }[],
  evidence: { exhibitNumber: string; description: string; type: string; gist?: string }[],
  pleadings: { plaintSummary?: string; wsSummary?: string },
  caseType: string,
  courtFormat?: string
): string {
  let prompt = `Draft comprehensive Written Arguments for a civil suit.

## Case Type
${caseType}
`;

  if (courtFormat) {
    prompt += `**Court Format:** ${courtFormat}\n\n`;
  }

  prompt += `
## Issues to be Argued
${issues.map((iss: any) => `**Issue ${iss.issueNumber}:** ${iss.issueText}`).join("\n")}
`;

  if (evidence && evidence.length > 0) {
    prompt += `\n## Evidence on Record
`;
    evidence.forEach((ev: any) => {
      prompt += `- **Exhibit ${ev.exhibitNumber}** (${ev.type}): ${ev.description}`;
      if (ev.gist) prompt += ` | Gist: ${ev.gist}`;
      prompt += `\n`;
    });
  }

  if (pleadings.plaintSummary) {
    prompt += `\n## Plaint Summary\n${pleadings.plaintSummary}\n`;
  }

  if (pleadings.wsSummary) {
    prompt += `\n## Written Statement Summary\n${pleadings.wsSummary}\n`;
  }

  prompt += `
For EACH issue, provide:
1. A heading
2. Facts supporting your side
3. Facts against your side (that you need to counter)
4. Relevant legal provisions and sections
5. A detailed argument draft combining facts, evidence, and law

Also include an overall introduction and conclusion with prayer.`;

  return prompt;
}

// ─── Task: parseIssues ─────────────────────────────────────────────────────────

function buildParseIssuesPrompt(orderText: string): string {
  return `You are provided with the full text of a court order that frames issues in a civil suit. Your task is to extract and structure every issue framed by the court.

## Issues Framed Order Text
---
${orderText}
---

Instructions:
1. Read the order text carefully
2. Identify EVERY issue framed by the court
3. Number the issues as they appear in the order
4. Classify each issue as "question_of_law", "question_of_fact", or "mixed"
5. Quote the issue text exactly or as close to the original as possible

Classify based on:
- **question_of_law**: Issues that require interpretation of law, statutory provisions, or legal principles
- **question_of_fact**: Issues that require determination of facts from evidence
- **mixed**: Issues requiring both legal interpretation and factual determination

Extract ALL issues. If no issues are explicitly framed, note that in the response with an empty array.`;
}

// ─── Task: extractFacts ────────────────────────────────────────────────────────

function buildExtractFactsPrompt(text: string, context?: string): string {
  let prompt = `Extract structured legal facts from the following text.

## Source Text
---
${text}
---

`;

  if (context) {
    prompt += `## Context
The text is related to: **${context}** (e.g., a plaint, contract, correspondence).
`;
  }

  prompt += `Instructions:
1. Identify ALL persons/entities mentioned with their roles (plaintiff, defendant, witness, other)
2. Extract ALL dates mentioned and what happened on each date
3. Extract ALL monetary amounts and what they relate to
4. Extract ALL properties/immovable assets mentioned
5. Summarize the key facts in concise statements
6. Identify CRITICAL missing information that would be needed to draft a pleading

Be thorough — do not miss any parties, dates, amounts, or properties mentioned in the text.`;

  return prompt;
}

// ─── Main Cloud Function ───────────────────────────────────────────────────────

export const apiAiCivil = https.onRequest(
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
        const { task } = req.body;

        if (!task) {
          res.status(400).json({
            success: false,
            error: "task is required. Valid tasks: generatePlaint, generateWS, generateInjunctionIA, generateWrittenArguments, parseIssues, extractFacts",
          });
          return;
        }

        console.log(`[ai-civil] Task: ${task}`);

        switch (task) {
          // ────────────────────────────────────────────────────────────────────
          // TASK 1: generatePlaint
          // ────────────────────────────────────────────────────────────────────
          case "generatePlaint": {
            const { matterFacts, valuation, courtFormat } = req.body;

            if (!matterFacts || !matterFacts.parties || !matterFacts.events) {
              res.status(400).json({
                success: false,
                error: "matterFacts with parties and events is required for generatePlaint.",
              });
              return;
            }

            const userPrompt = buildPlaintPrompt(matterFacts, valuation, courtFormat);

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
              }>(SYSTEM_PROMPT, userPrompt, PLAINT_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generatePlaint, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  title: string;
                  content: string;
                  keyPoints: string[];
                  warnings: string[];
                }>(SYSTEM_PROMPT, userPrompt, PLAINT_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generatePlaint, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${PLAINT_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 2: generateWS
          // ────────────────────────────────────────────────────────────────────
          case "generateWS": {
            const { plaintText, defendantName, defendantCounsel, additionalPleas, setOffCounterClaim } = req.body;

            if (!plaintText || !defendantName) {
              res.status(400).json({
                success: false,
                error: "plaintText and defendantName are required for generateWS.",
              });
              return;
            }

            const userPrompt = buildWSPrompt(plaintText, defendantName, defendantCounsel, additionalPleas, setOffCounterClaim);

            let data: {
              title: string;
              content: string;
              paraReplies: {
                paraNumber: number;
                plainText: string;
                stance: "admit" | "deny" | "partly_admit" | "require_proof";
                replyDraft: string;
              }[];
              preliminarySubmissions: string[];
            };
            try {
              data = await callSarvamStructured<{
                title: string;
                content: string;
                paraReplies: {
                  paraNumber: number;
                  plainText: string;
                  stance: "admit" | "deny" | "partly_admit" | "require_proof";
                  replyDraft: string;
                }[];
                preliminarySubmissions: string[];
              }>(SYSTEM_PROMPT, userPrompt, WS_JSON_STRUCTURE, 0.3, "sarvam-105b", 4096);
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generateWS, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  title: string;
                  content: string;
                  paraReplies: {
                    paraNumber: number;
                    plainText: string;
                    stance: "admit" | "deny" | "partly_admit" | "require_proof";
                    replyDraft: string;
                  }[];
                  preliminarySubmissions: string[];
                }>(SYSTEM_PROMPT, userPrompt, WS_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generateWS, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${WS_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 3: generateInjunctionIA
          // ────────────────────────────────────────────────────────────────────
          case "generateInjunctionIA": {
            const { matterFacts, injunctionType, propertyDetails, urgencyFacts, irreparableInjuryFacts, courtFormat } = req.body;

            if (!matterFacts || !injunctionType) {
              res.status(400).json({
                success: false,
                error: "matterFacts and injunctionType are required for generateInjunctionIA.",
              });
              return;
            }

            if (!["temporary", "mandatory", "status_quo"].includes(injunctionType)) {
              res.status(400).json({
                success: false,
                error: "injunctionType must be 'temporary', 'mandatory', or 'status_quo'.",
              });
              return;
            }

            const userPrompt = buildInjunctionIAPrompt(matterFacts, injunctionType, propertyDetails, urgencyFacts, irreparableInjuryFacts, courtFormat);

            let data: {
              title: string;
              content: string;
              affidavitContent: string;
            };
            try {
              data = await callSarvamStructured<{
                title: string;
                content: string;
                affidavitContent: string;
              }>(SYSTEM_PROMPT, userPrompt, INJUNCTION_IA_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generateInjunctionIA, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  title: string;
                  content: string;
                  affidavitContent: string;
                }>(SYSTEM_PROMPT, userPrompt, INJUNCTION_IA_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generateInjunctionIA, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${INJUNCTION_IA_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 4: generateWrittenArguments
          // ────────────────────────────────────────────────────────────────────
          case "generateWrittenArguments": {
            const { issues, evidence, pleadings, caseType, courtFormat } = req.body;

            if (!issues || !Array.isArray(issues) || issues.length === 0) {
              res.status(400).json({
                success: false,
                error: "issues array with at least one issue is required for generateWrittenArguments.",
              });
              return;
            }

            const userPrompt = buildWrittenArgumentsPrompt(issues, evidence || [], pleadings || {}, caseType || "Civil Suit", courtFormat);

            let data: {
              title: string;
              content: string;
              issueArguments: {
                issueNumber: number;
                heading: string;
                factsFor: string[];
                factsAgainst: string[];
                legalProvisions: string[];
                argumentDraft: string;
              }[];
              conclusion: string;
            };
            try {
              data = await callSarvamStructured<{
                title: string;
                content: string;
                issueArguments: {
                  issueNumber: number;
                  heading: string;
                  factsFor: string[];
                  factsAgainst: string[];
                  legalProvisions: string[];
                  argumentDraft: string;
                }[];
                conclusion: string;
              }>(SYSTEM_PROMPT, userPrompt, WRITTEN_ARGUMENTS_JSON_STRUCTURE, 0.3, "sarvam-105b", 4096);
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generateWrittenArguments, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  title: string;
                  content: string;
                  issueArguments: {
                    issueNumber: number;
                    heading: string;
                    factsFor: string[];
                    factsAgainst: string[];
                    legalProvisions: string[];
                    argumentDraft: string;
                  }[];
                  conclusion: string;
                }>(SYSTEM_PROMPT, userPrompt, WRITTEN_ARGUMENTS_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generateWrittenArguments, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${WRITTEN_ARGUMENTS_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 5: parseIssues
          // ────────────────────────────────────────────────────────────────────
          case "parseIssues": {
            const { orderText } = req.body;

            if (!orderText) {
              res.status(400).json({
                success: false,
                error: "orderText is required for parseIssues.",
              });
              return;
            }

            const userPrompt = buildParseIssuesPrompt(orderText);

            let data: {
              issues: {
                issueNumber: number;
                issueText: string;
                type: "question_of_law" | "question_of_fact" | "mixed";
              }[];
            };
            try {
              data = await callSarvamStructured<{
                issues: {
                  issueNumber: number;
                  issueText: string;
                  type: "question_of_law" | "question_of_fact" | "mixed";
                }[];
              }>(SYSTEM_PROMPT, userPrompt, PARSE_ISSUES_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for parseIssues, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  issues: {
                    issueNumber: number;
                    issueText: string;
                    type: "question_of_law" | "question_of_fact" | "mixed";
                  }[];
                }>(SYSTEM_PROMPT, userPrompt, PARSE_ISSUES_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for parseIssues, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${PARSE_ISSUES_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 6: extractFacts
          // ────────────────────────────────────────────────────────────────────
          case "extractFacts": {
            const { text, context } = req.body;

            if (!text) {
              res.status(400).json({
                success: false,
                error: "text is required for extractFacts.",
              });
              return;
            }

            const userPrompt = buildExtractFactsPrompt(text, context);

            let data: {
              parties: { name: string; address: string; role: string }[];
              dates: { date: string; event: string }[];
              amounts: { amount: string; context: string }[];
              properties: { description: string }[];
              keyFacts: string[];
              missingInfo: string[];
            };
            try {
              data = await callSarvamStructured<{
                parties: { name: string; address: string; role: string }[];
                dates: { date: string; event: string }[];
                amounts: { amount: string; context: string }[];
                properties: { description: string }[];
                keyFacts: string[];
                missingInfo: string[];
              }>(SYSTEM_PROMPT, userPrompt, EXTRACT_FACTS_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for extractFacts, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  parties: { name: string; address: string; role: string }[];
                  dates: { date: string; event: string }[];
                  amounts: { amount: string; context: string }[];
                  properties: { description: string }[];
                  keyFacts: string[];
                  missingInfo: string[];
                }>(SYSTEM_PROMPT, userPrompt, EXTRACT_FACTS_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for extractFacts, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${EXTRACT_FACTS_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // Unknown task
          // ────────────────────────────────────────────────────────────────────
          default: {
            res.status(400).json({
              success: false,
              error: `Unknown task: "${task}". Valid tasks: generatePlaint, generateWS, generateInjunctionIA, generateWrittenArguments, parseIssues, extractFacts`,
            });
          }
        }
      } catch (error) {
        console.error("[ai-civil] Error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to process civil drafting request",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
);
