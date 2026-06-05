import { parseLLMJSON } from "./parse-json";
import { aiFunctionSecrets } from "./secrets";
import * as admin from "firebase-admin";
// ai-civil — Firebase Cloud Function
// AI-powered Civil Original Side drafting module for AI Draft legal platform
// Generates Plaints, Written Statements, Injunction IAs, Written Arguments,
// Counter-Affidavits, Civil Appeals, Dismissal/Sist Applications,
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
- Counter-Affidavit / Rejoinder: Para-wise rebuttal of opposite party's affidavit claims, verification
- Civil Appeal: Memorandum of Appeal, grounds of appeal, impugned order analysis, factual and legal submissions
- Dismissal / Sist Application: Application for dismissal of suit, sist of proceedings, or withdrawal with grounds and prayer
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

const COUNTER_AFFIDAVIT_JSON_STRUCTURE = `{
  "title": "Title of the Counter-Affidavit (e.g., 'Counter-Affidavit on behalf of Respondent')",
  "content": "Full counter-affidavit text in PLAIN TEXT format (NO markdown, NO ** or ##). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings. Section sub-headings use Title Case. Include: cause title, jurat, deponent details, para-wise rebuttal of each claim in the original affidavit, additional facts, verification, and signature block",
  "rebuttalPoints": [
    {
      "originalClaim": "The claim or assertion made in the original affidavit being rebutted",
      "rebuttal": "Detailed factual and legal rebuttal of that claim"
    }
  ],
  "keyPoints": ["Key legal point 1", "Key legal point 2"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

const APPEAL_JSON_STRUCTURE = `{
  "title": "Title of the Memorandum of Appeal (e.g., 'First Appeal from Order under Section 104 CPC')",
  "content": "Full memorandum of appeal text in PLAIN TEXT format (NO markdown, NO ** or ##). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings. Section sub-headings use Title Case. Include: cause title, memorandum of appeal, impugned order summary, grounds of appeal (numbered), factual submissions, legal submissions, prayer, verification, and signature block",
  "groundsOfAppeal": [
    {
      "groundNumber": 1,
      "groundText": "Full text of the ground of appeal with legal reasoning"
    }
  ],
  "keyPoints": ["Key legal point 1", "Key legal point 2"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

const DISMISS_JSON_STRUCTURE = `{
  "title": "Title of the Application (e.g., 'Application for Dismissal of Suit under Order XXV CPC' or 'Application for Sist of Proceedings')",
  "content": "Full application text in PLAIN TEXT format (NO markdown, NO ** or ##). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings. Section sub-headings use Title Case. Include: cause title, grounds for the application, relevant facts, statutory provisions, prayer clause, verification, and signature block",
  "keyPoints": ["Key legal point 1", "Key legal point 2"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

// ─── Flat-to-Nested Adapters ───────────────────────────────────────────────────

/**
 * Build matterFacts from flat fields sent by frontend views.
 */
function buildMatterFactsFromFlat(body: Record<string, any>): {
  matterFacts: Record<string, any>;
  valuation?: { suitValue: string; courtFeePaid: string };
  courtFormat?: string;
} {
  const matterFacts: Record<string, any> = {
    suitType: body.subjectMatter || body.documentType || 'CIVIL SUIT',
    jurisdiction: body.jurisdiction || '',
    courtName: body.courtName || '',
    causeOfActionDate: body.filingDate || body.causeOfAction || '',
    parties: [
      ...(body.plaintiffName || body.applicantName ? [{
        name: body.plaintiffName || body.applicantName || '',
        address: body.plaintiffAddress || body.applicantAddress || '',
        role: 'plaintiff',
        counsel: '',
      }] : []),
      ...(body.defendantName || body.respondentName ? [{
        name: body.defendantName || body.respondentName || '',
        address: body.defendantAddress || body.respondentAddress || '',
        role: 'defendant',
        counsel: '',
      }] : []),
    ],
    events: body.facts
      ? body.facts.split('\n').filter(Boolean).map((f: string) => ({ date: '', description: f }))
      : [],
    reliefs: body.reliefSought || body.prayer ? [body.reliefSought || body.prayer] : [],
    properties: body.propertyDetails ? [{ description: body.propertyDetails }] : [],
  };

  // Carry over any events array already present (for backward compat)
  if (body.events && Array.isArray(body.events) && body.events.length > 0) {
    matterFacts.events = body.events;
  }

  const valuation = body.valuation
    ? { suitValue: String(body.valuation), courtFeePaid: '' }
    : undefined;

  const courtFormat = body.courtFormat || undefined;

  return { matterFacts, valuation, courtFormat };
}

/**
 * Parse a flat issues string (newline or number-delimited) into structured issue objects.
 */
function parseIssuesFromFlat(issuesText: string): { issueNumber: number; issueText: string }[] {
  if (!issuesText) return [];
  const lines = issuesText.split('\n').filter(Boolean);
  return lines.map((line, i) => {
    // Strip leading numbers like "1." or "1)" or "Issue 1:"
    const cleaned = line.replace(/^[\d]+[\.\)\:]\s*/, '').replace(/^Issue\s+[\d]+[\.\:]\s*/i, '').trim();
    return {
      issueNumber: i + 1,
      issueText: cleaned || line.trim(),
    };
  });
}

// ─── Task: generatePlaint ──────────────────────────────────────────────────────

function buildPlaintPrompt(matterFacts: Record<string, any>, valuation?: { suitValue: string; courtFeePaid: string }, courtFormat?: string): string {
  const parties: Array<{ name: string; address: string; role: string; counsel: string }> = matterFacts.parties || [];
  const plaintiffs = parties.filter((p) => p.role === "plaintiff");
  const defendants = parties.filter((p) => p.role === "defendant");

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
${plaintiffs.map((p, i) => `${i + 1}. **${p.name}**, ${p.address || "Address not specified"}${p.counsel ? ` (Advocate: ${p.counsel})` : ""}`).join("\n") || "Not specified"}

### Defendants
${defendants.map((p, i) => `${i + 1}. **${p.name}**, ${p.address || "Address not specified"}${p.counsel ? ` (Advocate: ${p.counsel})` : ""}`).join("\n") || "Not specified"}
`;

  if (matterFacts.properties && matterFacts.properties.length > 0) {
    prompt += `\n## Properties\n`;
    matterFacts.properties.forEach((prop: Record<string, string>, i: number) => {
      prompt += `${i + 1}. ${prop.description}${prop.surveyNumber ? `, Survey No. ${prop.surveyNumber}` : ""}${prop.address ? `, ${prop.address}` : ""}\n`;
    });
  }

  if (matterFacts.contracts && matterFacts.contracts.length > 0) {
    prompt += `\n## Contracts/Agreements\n`;
    matterFacts.contracts.forEach((c: Record<string, string>, i: number) => {
      prompt += `${i + 1}. **Date:** ${c.date} | **Amount:** ${c.amount} | **Terms:** ${c.terms || "Not specified"} | **Breach:** ${c.breach || "Not specified"}\n`;
    });
  }

  prompt += `\n## Chronology of Events\n`;
  if (matterFacts.events && matterFacts.events.length > 0) {
    matterFacts.events.forEach((e: Record<string, string>, i: number) => {
      prompt += `${i + 1}. **${e.date || "Date unspecified"}:** ${e.description}\n`;
    });
  } else {
    prompt += `No events provided — draft from the available facts above.\n`;
  }

  if (matterFacts.payments && matterFacts.payments.length > 0) {
    prompt += `\n## Payments\n`;
    matterFacts.payments.forEach((p: Record<string, string>, i: number) => {
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
${additionalPleas.map((p, i) => `${i + 1}. ${p}`).join("\n")}
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
  matterFacts: Record<string, any>,
  injunctionType: string,
  propertyDetails?: { description: string; surveyNumber?: string; address?: string },
  urgencyFacts?: string,
  irreparableInjuryFacts?: string,
  courtFormat?: string
): string {
  const parties: Array<{ name: string; address: string; role: string; counsel: string }> = matterFacts.parties || [];
  const plaintiffs = parties.filter((p) => p.role === "plaintiff" || p.role === "applicant");
  const defendants = parties.filter((p) => p.role === "defendant" || p.role === "respondent");

  let prompt = `Draft a complete Interlocutory Application for an Injunction in a civil suit.

## Injunction Type
- **Type:** ${injunctionType === "temporary" ? "Temporary Injunction" : injunctionType === "mandatory" ? "Mandatory Injunction" : injunctionType === "permanent" ? "Permanent Injunction" : injunctionType === "prohibitory" ? "Prohibitory Injunction" : "Status Quo Order"}
- **Applicable Law:** ${injunctionType === "temporary" ? "Order 39 Rules 1 & 2 CPC" : injunctionType === "mandatory" ? "Order 39 Rule 2 CPC + Section 38-40 Specific Relief Act" : injunctionType === "permanent" ? "Section 37-42 Specific Relief Act" : injunctionType === "prohibitory" ? "Order 39 Rule 1 & 2 CPC + Section 38 Specific Relief Act" : "Order 39 Rule 1 & 2 CPC (status quo)"}

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
${plaintiffs.map((p, i) => `${i + 1}. **${p.name}**, ${p.address || "Address not specified"}${p.counsel ? ` (Advocate: ${p.counsel})` : ""}`).join("\n") || "Not specified"}

### Respondents/Defendants
${defendants.map((p, i) => `${i + 1}. **${p.name}**, ${p.address || "Address not specified"}${p.counsel ? ` (Advocate: ${p.counsel})` : ""}`).join("\n") || "Not specified"}
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
${(matterFacts.events || []).map((e: Record<string, string>, i: number) => `${i + 1}. **${e.date || "Date unspecified"}:** ${e.description}`).join("\n") || "No events provided."}
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
${issues.map((iss) => `**Issue ${iss.issueNumber}:** ${iss.issueText}`).join("\n")}
`;

  if (evidence && evidence.length > 0) {
    prompt += `\n## Evidence on Record
`;
    evidence.forEach((ev) => {
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

// ─── Task: generateCounter ────────────────────────────────────────────────────

function buildCounterPrompt(body: Record<string, any>): string {
  let prompt = `Draft a complete, court-ready Counter-Affidavit / Rejoinder.

## Deponent Details
- **Name:** ${body.deponentName || "Not specified"}
- **Designation:** ${body.designation || "Not specified"}

## Case Details
- **Respondent (filing counter):** ${body.respondentName || "Not specified"}
- **Petitioner (original):** ${body.petitionerName || "Not specified"}
- **Case Number:** ${body.caseNumber || "Not specified"}
- **Court:** ${body.courtName || "Not specified"}

## Original Relief Sought by Petitioner
${body.originalRelief || "Not specified"}

## Grounds for Rejection / Opposition
${body.rejectionGrounds || "Not specified"}

## Counter Facts (Factual Rebuttal)
${body.facts || "Not specified"}

## Supporting Documents
${body.supportingDocuments || "Not specified"}

Draft the Counter-Affidavit following the standard court format. Include:
1. Cause title with court name, case number, parties
2. Jurat and deponent details
3. Para-wise rebuttal of each material claim in the original affidavit/petition
4. Additional facts in support of the counter
5. List of supporting documents annexed
6. Verification and signature block

Ensure the rebuttal is specific, legally grounded, and properly structured. Reference relevant statutory provisions and case law.`;

  return prompt;
}

// ─── Task: generateAppeal ───────────────────────────────────────────────────────

function buildAppealPrompt(body: Record<string, any>): string {
  let prompt = `Draft a complete, court-ready Memorandum of Civil Appeal.

## Appellate Party Details
- **Appellant:** ${body.appellantName || "Not specified"}
- **Respondent:** ${body.respondentName || "Not specified"}

## Court Details
- **Lower Court (passed decree):** ${body.lowerCourt || "Not specified"}
- **Appellate Court:** ${body.appealCourt || "Not specified"}
- **Decree/Order Date:** ${body.decreeDate || "Not specified"}
- **Original Suit Number:** ${body.suitNumber || "Not specified"}

## Impugned Order Summary
${body.impugnedOrder || "Not specified"}

## Grounds of Appeal
${body.groundsOfAppeal || "Not specified"}

## Relevant Facts
${body.facts || "Not specified"}

## Relief Sought in Appeal
${body.reliefSought || "Not specified"}

Draft the Memorandum of Appeal following Section 100 / Section 104 CPC as applicable. Include:
1. Cause title with appellate court name, appeal number, parties
2. Details of the impugned order/decree and the lower court
3. Valuation and court fee for the appeal
4. Numbered grounds of appeal with detailed legal and factual reasoning
5. Factual submissions
6. Legal submissions with statutory references
7. Prayer clause setting out the relief sought
8. Verification and signature block

Ensure proper reference to the limit on grounds under Section 100 CPC (substantial question of law) if applicable.`;

  return prompt;
}

// ─── Task: generateDismiss ───────────────────────────────────────────────────

function buildDismissPrompt(body: Record<string, any>): string {
  const dismissType = body.dismissalType || "Dismissal of Suit";
  let prompt = `Draft a complete, court-ready Application for ${dismissType}.

## Applicant & Respondent
- **Applicant:** ${body.applicantName || "Not specified"}
- **Respondent:** ${body.respondentName || "Not specified"}

## Case Details
- **Case Number:** ${body.caseNumber || "Not specified"}
- **Court:** ${body.courtName || "Not specified"}
- **Type of Application:** ${dismissType}

## Grounds
${body.grounds || "Not specified"}

## Relevant Facts
${body.facts || "Not specified"}

## Prayer
${body.prayer || "Not specified"}

Draft the Application following the appropriate provisions of CPC:
- If Dismissal of Suit: Order XXV CPC
- If Sist of Proceedings: Order XXV Rule 1 CPC
- If Withdrawal: Order XXV Rule 1 CPC read with Rule 2

Include:
1. Cause title with court name, case number, parties
2. Grounds for the application in numbered paragraphs
3. Relevant facts supporting the grounds
4. Statutory provisions relied upon
5. Prayer clause setting out specific relief sought
6. Verification and signature block

Ensure proper legal terminology and statutory references.`;

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

// ─── Generic Document Prompt (for generateDocument fallback) ────────────────────

function buildGenericDocumentPrompt(body: Record<string, any>): string {
  return `Draft a complete, court-ready civil litigation document based on the information provided below.

## Document Type
${body.documentType || "Civil Suit Document"}

## Parties
${body.plaintiffName ? `- **Plaintiff:** ${body.plaintiffName}` : ""}
${body.defendantName ? `- **Defendant:** ${body.defendantName}` : ""}

## Court
${body.courtName || "Not specified"}

## Cause of Action
${body.causeOfAction || "Not specified"}

## Facts
${body.facts || "Not specified"}

## Relief Sought
${body.reliefSought || "Not specified"}

Draft the document following the appropriate provisions of the Code of Civil Procedure, 1908 and relevant substantive law. Include:
1. Proper cause title
2. Relevant factual narration in numbered paragraphs
3. Cause of action
4. Appropriate reliefs
5. Verification and signature block

Ensure proper statutory references and legal terminology throughout.`;
}

const GENERIC_DOCUMENT_JSON_STRUCTURE = `{
  "title": "Title of the document",
  "content": "Full document text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings. Include all necessary sections for a court-ready document.",
  "keyPoints": ["Key legal point 1", "Key legal point 2"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

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
            error: "task is required. Valid tasks: generateDocument, generatePlaint, generateWS, generateInjunctionIA, generateWrittenArguments, generateCounter, generateAppeal, generateDismiss, parseIssues, extractFacts",
          });
          return;
        }

        console.log(`[ai-civil] Task: ${task}, UID: ${uid}`);

        switch (task) {
          // ────────────────────────────────────────────────────────────────────
          // TASK 0: generateDocument — routes to appropriate handler based on fields
          // ────────────────────────────────────────────────────────────────────
          case "generateDocument": {
            const body = req.body;

            // Route to parseIssues if orderText is provided
            if (body.orderText) {
              console.log("[ai-civil] generateDocument routing to parseIssues (orderText provided)");
              req.body.task = "parseIssues";
              // Fall through by calling parseIssues logic inline
              const orderText = body.orderText;

              if (!orderText) {
                res.status(400).json({ success: false, error: "orderText is required for parseIssues." });
                return;
              }

              const userPrompt = buildParseIssuesPrompt(orderText);

              let data: { issues: { issueNumber: number; issueText: string; type: "question_of_law" | "question_of_fact" | "mixed"; }[] };
              try {
                data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, PARSE_ISSUES_JSON_STRUCTURE, 0.3, "sarvam-105b");
              } catch (sarvamErr) {
                console.error("[ai-civil] Sarvam failed for parseIssues, falling back to Groq:", sarvamErr?.message);
                try {
                  data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, PARSE_ISSUES_JSON_STRUCTURE, 0.3);
                } catch (groqErr) {
                  console.error("[ai-civil] Groq failed for parseIssues, falling back to Gemini:", groqErr?.message);
                  const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${PARSE_ISSUES_JSON_STRUCTURE}`;
                  const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                  try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                    throw new Error("Could not parse Gemini: " + pe?.message);
                  }
                }
              }

              logUsage("ai-civil", uid, 3000);
              data = stripMarkdownFromData(data);
              res.json({ success: true, data });
              return;
            }

            // Route to generatePlaint if plaintiffName and defendantName are provided
            if (body.plaintiffName && body.defendantName) {
              console.log("[ai-civil] generateDocument routing to generatePlaint (plaintiffName + defendantName provided)");
              // Build matterFacts from flat fields
              const { matterFacts, valuation, courtFormat } = buildMatterFactsFromFlat(body);

              const userPrompt = buildPlaintPrompt(matterFacts, valuation, courtFormat);

              let data: { title: string; content: string; keyPoints: string[]; warnings: string[]; };
              try {
                data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, PLAINT_JSON_STRUCTURE, 0.3, "sarvam-105b");
              } catch (sarvamErr) {
                console.error("[ai-civil] Sarvam failed for generatePlaint, falling back to Groq:", sarvamErr?.message);
                try {
                  data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, PLAINT_JSON_STRUCTURE, 0.3);
                } catch (groqErr) {
                  console.error("[ai-civil] Groq failed for generatePlaint, falling back to Gemini:", groqErr?.message);
                  const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${PLAINT_JSON_STRUCTURE}`;
                  const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                  try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                    throw new Error("Could not parse Gemini: " + pe?.message);
                  }
                }
              }

              logUsage("ai-civil", uid, 3000);
              data = stripMarkdownFromData(data);
              res.json({ success: true, data });
              return;
            }

            // Fallback: generate a generic civil document
            console.log("[ai-civil] generateDocument using generic document fallback");
            const genericPrompt = buildGenericDocumentPrompt(body);

            let genericData: { title: string; content: string; keyPoints: string[]; warnings: string[]; };
            try {
              genericData = await callSarvamStructured<typeof genericData>(SYSTEM_PROMPT, genericPrompt, GENERIC_DOCUMENT_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generateDocument, falling back to Groq:", sarvamErr?.message);
              try {
                genericData = await callGroqStructured<typeof genericData>(SYSTEM_PROMPT, genericPrompt, GENERIC_DOCUMENT_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generateDocument, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${GENERIC_DOCUMENT_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, genericPrompt, 0.3);
                try { genericData = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", uid, 3000);
            genericData = stripMarkdownFromData(genericData);
            res.json({ success: true, data: genericData });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 1: generatePlaint (with flat-to-nested adapter)
          // ────────────────────────────────────────────────────────────────────
          case "generatePlaint": {
            const body = req.body;

            // Accept both nested matterFacts (backward compat) and flat fields
            let matterFacts: Record<string, any>;
            let valuation: { suitValue: string; courtFeePaid: string } | undefined;
            let courtFormat: string | undefined;

            if (body.matterFacts && body.matterFacts.parties && body.matterFacts.events) {
              // Already nested — use directly
              matterFacts = body.matterFacts;
              valuation = body.valuation;
              courtFormat = body.courtFormat;
            } else {
              // Flat fields from frontend — build nested objects
              const adapted = buildMatterFactsFromFlat(body);
              matterFacts = adapted.matterFacts;
              valuation = adapted.valuation;
              courtFormat = adapted.courtFormat;
            }

            if (!matterFacts.parties.length && !matterFacts.events.length) {
              res.status(400).json({
                success: false,
                error: "Parties and events/facts are required for generatePlaint. Provide plaintiffName and defendantName (or matterFacts.parties), and facts (or matterFacts.events).",
              });
              return;
            }

            const userPrompt = buildPlaintPrompt(matterFacts, valuation, courtFormat);

            let data: { title: string; content: string; keyPoints: string[]; warnings: string[]; };
            try {
              data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, PLAINT_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generatePlaint, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, PLAINT_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generatePlaint, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${PLAINT_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", uid, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 2: generateWS (unchanged except error message)
          // ────────────────────────────────────────────────────────────────────
          case "generateWS": {
            const { plaintText, defendantName, defendantCounsel, additionalPleas, setOffCounterClaim } = req.body;

            if (!plaintText || !defendantName) {
              res.status(400).json({
                success: false,
                error: "Please enter the Plaint Text (paste the full plaint allegations) and Defendant Name before generating a Written Statement.",
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
              data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, WS_JSON_STRUCTURE, 0.3, "sarvam-105b", 4096);
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generateWS, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, WS_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generateWS, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${WS_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", uid, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 3: generateInjunctionIA (with flat-to-nested adapter)
          // ────────────────────────────────────────────────────────────────────
          case "generateInjunctionIA": {
            const body = req.body;

            // Accept both nested matterFacts (backward compat) and flat fields
            let matterFacts: Record<string, any>;
            let injunctionType: string;
            let propertyDetails: { description: string; surveyNumber?: string; address?: string } | undefined;
            let urgencyFacts: string | undefined;
            let irreparableInjuryFacts: string | undefined;
            let courtFormat: string | undefined;

            if (body.matterFacts && body.matterFacts.parties) {
              // Already nested — use directly
              matterFacts = body.matterFacts;
              injunctionType = body.injunctionType;
              propertyDetails = body.propertyDetails;
              urgencyFacts = body.urgencyFacts;
              irreparableInjuryFacts = body.irreparableInjuryFacts;
              courtFormat = body.courtFormat;
            } else {
              // Flat fields from frontend — build nested objects
              const adapted = buildMatterFactsFromFlat(body);
              matterFacts = adapted.matterFacts;
              // Map flat fields to expected parameters
              injunctionType = body.injunctionType || "temporary";
              // Use facts as urgencyFacts and grounds as irreparableInjuryFacts if provided
              urgencyFacts = body.facts || undefined;
              irreparableInjuryFacts = body.grounds || undefined;
              propertyDetails = body.propertyDetails ? { description: body.propertyDetails } : undefined;
              courtFormat = adapted.courtFormat;

              // Also carry over reliefs from prayer
              if (body.prayer) {
                matterFacts.reliefs = [body.prayer];
              }
            }

            if (!injunctionType) {
              res.status(400).json({
                success: false,
                error: "injunctionType is required for generateInjunctionIA.",
              });
              return;
            }

            if (!matterFacts.parties.length) {
              res.status(400).json({
                success: false,
                error: "Parties are required for generateInjunctionIA. Provide applicantName and respondentName (or matterFacts.parties).",
              });
              return;
            }

            const userPrompt = buildInjunctionIAPrompt(matterFacts, injunctionType, propertyDetails, urgencyFacts, irreparableInjuryFacts, courtFormat);

            let data: { title: string; content: string; affidavitContent: string; };
            try {
              data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, INJUNCTION_IA_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generateInjunctionIA, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, INJUNCTION_IA_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generateInjunctionIA, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${INJUNCTION_IA_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", uid, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 4: generateWrittenArguments (with flat-to-nested adapter)
          // ────────────────────────────────────────────────────────────────────
          case "generateWrittenArguments": {
            const body = req.body;

            // Accept both nested issues array (backward compat) and flat fields
            let issues: { issueNumber: number; issueText: string }[];
            let evidence: { exhibitNumber: string; description: string; type: string; gist?: string }[];
            let pleadings: { plaintSummary?: string; wsSummary?: string };
            let caseType: string;
            let courtFormat: string | undefined;

            if (body.issues && Array.isArray(body.issues) && body.issues.length > 0 && typeof body.issues[0] === "object") {
              // Already structured array
              issues = body.issues;
              evidence = body.evidence || [];
              pleadings = body.pleadings || {};
              caseType = body.caseType || "Civil Suit";
              courtFormat = body.courtFormat;
            } else {
              // Flat fields from frontend — build structured objects
              issues = parseIssuesFromFlat(body.issues || "");
              if (issues.length === 0) {
                res.status(400).json({
                  success: false,
                  error: "issues (text) is required for generateWrittenArguments. Provide at least one issue to be argued.",
                });
                return;
              }

              evidence = [];
              // Build pleadings from flat facts/arguments
              const wsSummary = body.arguments || "";
              const plaintSummary = body.facts || "";
              pleadings = { plaintSummary, wsSummary };
              caseType = body.caseTitle ? `${body.caseTitle} — ${body.partyPosition || "Plaintiff"}` : `Civil Suit — ${body.partyPosition || "Plaintiff"}`;
              courtFormat = body.courtName || undefined;

              // If caseLaws or conclusion are provided, append to pleadings
              if (body.caseLaws) {
                pleadings.plaintSummary = `${pleadings.plaintSummary}\n\nRelevant Case Laws / Precedents:\n${body.caseLaws}`;
              }
            }

            const userPrompt = buildWrittenArgumentsPrompt(issues, evidence, pleadings, caseType, courtFormat);

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
              data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, WRITTEN_ARGUMENTS_JSON_STRUCTURE, 0.3, "sarvam-105b", 4096);
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generateWrittenArguments, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, WRITTEN_ARGUMENTS_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generateWrittenArguments, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${WRITTEN_ARGUMENTS_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", uid, 3000);

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
              data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, PARSE_ISSUES_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for parseIssues, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, PARSE_ISSUES_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for parseIssues, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${PARSE_ISSUES_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", uid, 3000);

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
              data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, EXTRACT_FACTS_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for extractFacts, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, EXTRACT_FACTS_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for extractFacts, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${EXTRACT_FACTS_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", uid, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 7: generateCounter — Counter-Affidavit / Rejoinder
          // ────────────────────────────────────────────────────────────────────
          case "generateCounter": {
            const body = req.body;

            if (!body.respondentName && !body.deponentName) {
              res.status(400).json({
                success: false,
                error: "Respondent Name or Deponent Name is required for generateCounter.",
              });
              return;
            }

            const userPrompt = buildCounterPrompt(body);

            let data: {
              title: string;
              content: string;
              rebuttalPoints: { originalClaim: string; rebuttal: string }[];
              keyPoints: string[];
              warnings: string[];
            };
            try {
              data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, COUNTER_AFFIDAVIT_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generateCounter, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, COUNTER_AFFIDAVIT_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generateCounter, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${COUNTER_AFFIDAVIT_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", uid, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 8: generateAppeal — Civil Appeal
          // ────────────────────────────────────────────────────────────────────
          case "generateAppeal": {
            const body = req.body;

            if (!body.appellantName) {
              res.status(400).json({
                success: false,
                error: "Appellant Name is required for generateAppeal.",
              });
              return;
            }

            const userPrompt = buildAppealPrompt(body);

            let data: {
              title: string;
              content: string;
              groundsOfAppeal: { groundNumber: number; groundText: string }[];
              keyPoints: string[];
              warnings: string[];
            };
            try {
              data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, APPEAL_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generateAppeal, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, APPEAL_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generateAppeal, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${APPEAL_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", uid, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 9: generateDismiss — Dismissal / Sist Application
          // ────────────────────────────────────────────────────────────────────
          case "generateDismiss": {
            const body = req.body;

            if (!body.applicantName) {
              res.status(400).json({
                success: false,
                error: "Applicant Name is required for generateDismiss.",
              });
              return;
            }

            const userPrompt = buildDismissPrompt(body);

            let data: { title: string; content: string; keyPoints: string[]; warnings: string[]; };
            try {
              data = await callSarvamStructured<typeof data>(SYSTEM_PROMPT, userPrompt, DISMISS_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-civil] Sarvam failed for generateDismiss, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<typeof data>(SYSTEM_PROMPT, userPrompt, DISMISS_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-civil] Groq failed for generateDismiss, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${DISMISS_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-civil", uid, 3000);

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
              error: `Unknown task: "${task}". Valid tasks: generateDocument, generatePlaint, generateWS, generateInjunctionIA, generateWrittenArguments, generateCounter, generateAppeal, generateDismiss, parseIssues, extractFacts`,
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
