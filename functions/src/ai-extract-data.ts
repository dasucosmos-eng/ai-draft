// @ts-nocheck
import { parseLLMJSON } from "./parse-json";
import { aiFunctionSecrets } from "./secrets";
// ai-extract-data — Firebase Cloud Function
// Extracts structured legal data from uploaded document text
// Returns module-specific fields that auto-fill form inputs
// Uses Sarvam AI (primary, sarvam-105b) with Groq fallback
//
// Supported modules:
//   - execution: Decree details, parties, amounts, dates, court info
//   - civil: Parties, facts, events, reliefs, cause of action, properties
//   - criminal: FIR details, accused, victim, sections, dates
//   - family: Petitioner/respondent, marriage details, children, grounds

import { https } from "firebase-functions/v2";
import { restrictedCors } from "./cors";
import { callSarvamStructured } from "./sarvam-client";
import { callGroqStructured, logUsage } from "./groq-client";
import { callGeminiText } from "./gemini-client";

const corsHandler = restrictedCors;

/* ─── System Prompts per Module ─── */

const MODULE_PROMPTS: Record<string, string> = {
  execution: `You are an expert Indian legal data extractor specializing in execution/decree documents. You extract structured data from court decrees, judgment copies, and execution-related documents under the Code of Civil Procedure (CPC).

You identify and extract:
- Case number and court details
- Decree type (money decree, specific performance, injunction, possession, etc.)
- Decree date and any interest rate specified
- Plaintiff/decree holder name and defendant/judgment debtor name
- Decree amount with costs
- Interest details (rate, from date, to date)
- Court name and jurisdiction
- Any advocate/counsel names mentioned

Return ONLY the extracted data. If a field cannot be found, use empty string. Do not hallucinate values.`,

  civil: `You are an expert Indian legal data extractor specializing in civil suit documents. You extract structured data from plaints, contracts, agreements, notices, correspondence, and any documents related to civil original side matters.

You identify and extract:
- All parties (plaintiffs and defendants) with names, addresses, and roles
- Key events with dates (contract date, breach date, notice date, etc.)
- Cause of action date
- Properties or assets involved (with descriptions and addresses)
- Contracts/agreements (dates, amounts, terms, breaches)
- Payments made (dates, amounts, purposes)
- Relief sought (recovery amount, specific performance, injunction, possession, etc.)
- Court name and jurisdiction if mentioned
- Any advocate/counsel names mentioned

Return ONLY the extracted data. If a field cannot be found, use empty string. Do not hallucinate values.`,

  criminal: `You are an expert Indian legal data extractor specializing in criminal case documents. You extract structured data from FIRs, charge sheets, bail applications, and criminal complaint documents.

You identify and extract:
- FIR number, police station, date
- Sections of IPC/CRPC/other acts invoked
- Accused person(s) name(s) and details
- Complainant/victim name and details
- Date and place of alleged offense
- Brief facts of the offense
- Court name if mentioned
- Lawyer/advocate names if mentioned
- Bail status if mentioned

Return ONLY the extracted data. If a field cannot be found, use empty string. Do not hallucinate values.`,

  family: `You are an expert Indian legal data extractor specializing in family law documents. You extract structured data from petitions under Hindu Marriage Act, Special Marriage Act, Guardian and Wards Act, Succession Act, and related family law matters.

You identify and extract:
- Petitioner and respondent names with addresses
- Marriage date and place
- Children details (names, ages, custody status)
- Grounds for petition (cruelty, desertion, adultery, etc.)
- Properties and assets in dispute
- Income details of parties
- Relief sought (divorce, custody, maintenance, etc.)
- Court name if mentioned

Return ONLY the extracted data. If a field cannot be found, use empty string. Do not hallucinate values.`,
};

/* ─── JSON Structures per Module ─── */

const JSON_STRUCTURES: Record<string, string> = {
  execution: `{
  "caseNumber": "e.g., OS 123/2023",
  "courtName": "e.g., District Court, Bangalore",
  "plaintiffName": "Full name of decree holder",
  "defendantName": "Full name of judgment debtor",
  "decreeDate": "YYYY-MM-DD or DD/MM/YYYY",
  "decreeType": "money_decree or specific_performance or injunction or possession or other",
  "decreeAmount": "Amount as number string e.g., 500000",
  "interestRate": "e.g., 6% or 9% per annum",
  "interestFrom": "Date interest starts from",
  "costs": "Costs awarded as number string",
  "plaintiffCounsel": "Advocate name if found",
  "defendantCounsel": "Advocate name if found"
}`,

  civil: `{
  "parties": [
    { "name": "Full name", "address": "Address if found", "role": "plaintiff or defendant", "counsel": "Advocate name if found" }
  ],
  "events": [
    { "date": "YYYY-MM-DD or DD/MM/YYYY", "description": "What happened" }
  ],
  "causeOfActionDate": "Date of cause of action",
  "reliefs": ["List of reliefs sought e.g., Recovery of Rs.5,00,000"],
  "properties": [
    { "description": "Property description", "address": "Address if found", "surveyNumber": "Survey number if found" }
  ],
  "contracts": [
    { "date": "YYYY-MM-DD", "amount": "Amount as string", "terms": "Brief terms", "breach": "How it was breached" }
  ],
  "payments": [
    { "date": "YYYY-MM-DD", "amount": "Amount as string", "purpose": "What the payment was for" }
  ],
  "courtName": "Court name if mentioned",
  "jurisdiction": "Jurisdiction details if mentioned"
}`,

  criminal: `{
  "firNumber": "FIR number if found",
  "policeStation": "Police station name",
  "firDate": "FIR date",
  "offenseDate": "Date of alleged offense",
  "offensePlace": "Place of offense",
  "sections": ["IPC/CRPC sections invoked e.g., Section 420 IPC"],
  "accusedName": "Name of accused",
  "complainantName": "Name of complainant/victim",
  "facts": "Brief facts of the offense",
  "courtName": "Court name if mentioned",
  "bailStatus": "Bail status if mentioned"
}`,

  family: `{
  "petitionerName": "Full name of petitioner",
  "petitionerAddress": "Address of petitioner",
  "respondentName": "Full name of respondent",
  "respondentAddress": "Address of respondent",
  "marriageDate": "Date of marriage",
  "marriagePlace": "Place of marriage",
  "children": [
    { "name": "Child name", "age": "Age or DOB", "custody": "Current custody if mentioned" }
  ],
  "grounds": ["List of grounds e.g., cruelty, desertion"],
  "properties": ["Properties in dispute"],
  "incomeDetails": "Income details of parties if found",
  "reliefs": ["Relief sought e.g., divorce, custody, maintenance"],
  "courtName": "Court name if mentioned"
}`,
};

/* ─── Main Handler ─── */

export const apiAiExtractData = https.onRequest(
  {
    timeoutSeconds: 120,
    region: "us-central1", secrets: aiFunctionSecrets,
  },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      try {
        const { text, module } = req.body;

        if (!text || typeof text !== "string") {
          res.status(400).json({ error: "text (extracted document content) is required" });
          return;
        }

        const mod = module || "general";
        const systemPrompt = MODULE_PROMPTS[mod] || MODULE_PROMPTS.civil;
        const jsonStructure = JSON_STRUCTURES[mod] || JSON_STRUCTURES.civil;

        if (!systemPrompt) {
          res.status(400).json({ error: `Unsupported module: ${mod}` });
          return;
        }

        console.log(
          `[ai-extract-data] Module: ${mod}, Text length: ${text.length}`
        );

        // Truncate very long text to avoid token overflow (50000 chars covers most legal docs)
        let processedText = text;
        if (text.length > 50000) {
          processedText =
            text.substring(0, 50000) +
            "\n\n[Content truncated for processing - document exceeds 50000 characters]";
        }

        const userPrompt = `Extract ALL relevant legal data from the following document text. Be thorough — extract every field mentioned in the JSON structure. Do not skip any field. If a field is not found in the document, use an empty string "" or empty array []. Return the data in the specified JSON structure.

IMPORTANT: Extract ALL names, dates, amounts, addresses, sections, and legal references found anywhere in the document. Be exhaustive.

Document text:
---
${processedText}
---

Extract and return the structured data now.`;

        let data: Record<string, unknown>;
        let usedProvider = "none";

        try {
          data = await callSarvamStructured<Record<string, unknown>>(
            systemPrompt,
            userPrompt,
            jsonStructure,
            0.2,
            "sarvam-105b",
            6000
          );
          usedProvider = "sarvam";
        } catch (sarvamErr) {
          console.error(
            "[ai-extract-data] Sarvam failed, falling back to Groq:",
            sarvamErr instanceof Error ? sarvamErr.message : sarvamErr
          );

          try {
            data = await callGroqStructured<Record<string, unknown>>(
              systemPrompt,
              userPrompt,
              jsonStructure,
              0.2
            );
            usedProvider = "groq";
          } catch (groqErr) {
            console.error(
              "[ai-extract-data] Groq failed, falling back to Gemini:",
              groqErr instanceof Error ? groqErr.message : groqErr
            );

            // Provider 3: Gemini (reliable fallback)
            const geminiPrompt = `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON matching this structure:\n${jsonStructure}`;
            const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.2);
            // Parse JSON from text response
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
            usedProvider = "gemini";
          }
        }

        logUsage("ai-extract-data", undefined, 4000);
        console.log(`[ai-extract-data] Success via provider: ${usedProvider}`);

        // Wrap in response envelope — include both `data` (for frontend compat) and `fields`
        res.json({
          success: true,
          data: data,
          extracted: data,
          module: mod,
          fieldsCount: Object.keys(data).length,
          charCount: text.length,
        });
      } catch (error) {
        console.error("[ai-extract-data] Error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to extract data from document",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
);
