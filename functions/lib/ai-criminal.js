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
exports.apiAiCriminal = void 0;
// @ts-nocheck
const parse_json_1 = require("./parse-json");
const secrets_1 = require("./secrets");
const admin = __importStar(require("firebase-admin"));
// ai-criminal — Firebase Cloud Function
// AI-powered Criminal Law drafting module for AI Draft legal platform
// Generates Bail Applications, CRP (Revision/Quashing), Writ Petitions,
// CRLMP (Criminal Miscellaneous Petitions), parses FIRs, and suggests bail grounds
// Handles both IPC/CrPC (pre-July 1, 2024) and BNS/BNSS (post-July 1, 2024) law references
// Returns: { success, data: {...} } or { success: false, error: "..." }
const v2_1 = require("firebase-functions/v2");
const cors_1 = require("./cors");
const utils_1 = require("./utils");
const sarvam_client_1 = require("./sarvam-client");
const groq_client_1 = require("./groq-client");
const gemini_client_1 = require("./gemini-client");
const corsHandler = cors_1.restrictedCors;
// ─── System Prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert Indian criminal law drafter integrated into AI Draft platform. You draft precise, court-ready criminal law documents.

CRITICAL: India's criminal law changed on July 1, 2024:
- BNS 2023 replaced IPC 1860
- BNSS 2023 replaced CrPC 1973
- BSA 2023 replaced Indian Evidence Act

Key section mappings:
- CrPC 437 (Magistrate bail) → BNSS 480
- CrPC 438 (Anticipatory bail) → BNSS 482
- CrPC 439 (Regular bail) → BNSS 483
- CrPC 167(2) (Default bail) → BNSS 187
- CrPC 397 (Revision) → BNSS 438
- CrPC 482 (Inherent powers/quashing) → BNSS 528

CRITICAL AI TRAP: BNSS Sec 438 = CrPC Sec 397 (revision), NOT CrPC Sec 438 (anticipatory bail). The numbers shifted!

CRITICAL TEXT CASING RULES:
- Body text MUST be in normal sentence case (NOT all caps, NOT all uppercase)
- Only specific HEADING WORDS may be in ALL CAPS: IN THE HIGH COURT OF..., BAIL APPLICATION, CRIMINAL REVISION PETITION, WRIT PETITION, CRLMP, AFFIDAVIT, VERIFICATION, VAKALATNAMA, PRAYER, CAUSE TITLE
- Section sub-headings (e.g., "Facts of the Case", "Grounds for Bail") should use Title Case, NOT ALL CAPS
- Party names, court names, legal terms should use normal capitalization
- DO NOT write the entire document or body paragraphs in uppercase/block letters

DRAFTING RULES:
- For bail: Apply triple test (flight risk, evidence tampering, investigation hampering)
- For bail: Include Satender Kumar Antil v. K.B. Sanjay (2023) categorization for co-accused
- For CRP revision: Check jurisdiction, patent defects, manifest injustice
- For quashing: Apply Bhajan Lal 7-category grounds (S.B. Saxena v. State of U.P. categories)
- For writs: Check locus standi, alternative remedy, territorial jurisdiction
- For writs: Article 226 (High Court) vs Article 32 (Supreme Court)
- Include proper cause title, facts, grounds, prayer, verification
- Use formal legal language with appropriate section references
- Flag if old/new law sections are used incorrectly
- Auto-detect whether the case falls under IPC/CrPC or BNS/BNSS based on FIR date or sections cited`;
// ─── JSON Structure Definitions per Task ────────────────────────────────────────
const BAIL_JSON_STRUCTURE = `{
  "title": "Short title of the bail application (e.g., 'Application for Regular Bail under Section 439 CrPC / Section 483 BNSS')",
  "content": "Full bail application text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like IN THE HIGH COURT OF..., BAIL APPLICATION, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title with court name and case number, applicant/accused details in numbered paragraphs, FIR details and sections charged, grounds for bail applying the triple test (flight risk, evidence tampering, investigation hampering), specific facts supporting each ground, Satender Kumar Antil categorization analysis if co-accused, surety details if provided, prayer clause requesting release on bail with conditions, verification and signature block. Make it court-ready.",
  "keyPoints": ["Key legal point 1", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer about the draft", "Any flag about old/new law section usage"]
}`;
const CRP_JSON_STRUCTURE = `{
  "title": "Title of the CRP (e.g., 'Criminal Revision Petition under Section 397/399 CrPC / Section 438 BNSS' or 'Criminal Miscellaneous Case for Quashing under Section 482 CrPC / Section 528 BNSS')",
  "content": "Full CRP text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like IN THE HIGH COURT OF..., CRIMINAL REVISION PETITION, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title with court name and CRP/Case number, petitioner and respondent details, impugned order date and details, case history in numbered paragraphs, jurisdiction and maintainability analysis, grounds in numbered paragraphs with legal reasoning, for revision: patent defects / manifest injustice / jurisdictional error; for quashing: Bhajan Lal 7-category grounds analysis, prayer clause, verification and signature block. Make it court-ready.",
  "keyPoints": ["Key legal point 1", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning about maintainability or limitation", "Any flag about old/new law section usage"]
}`;
const WRIT_JSON_STRUCTURE = `{
  "title": "Title of the writ petition (e.g., 'Writ Petition under Article 226 of the Constitution of India')",
  "content": "Full writ petition text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like IN THE HIGH COURT OF..., WRIT PETITION, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title with court name and WP number (if PIL, indicate PIL status), petitioner details, respondent details with designations and departments, facts in numbered paragraphs, locus standi analysis, alternative remedy check and why writ is maintainable, fundamental right violation analysis with specific constitutional articles, grounds in numbered paragraphs, interim relief sought if any, prayer clause specifying the exact writ (mandamus/certiorari/prohibition/habeas corpus/quo warranto), verification and signature block. Make it court-ready.",
  "keyPoints": ["Key legal point 1", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Locus standi concern if applicable", "Alternative remedy availability warning", "Territorial jurisdiction note"]
}`;
const PARSE_FIR_JSON_STRUCTURE = `{
  "firNumber": "FIR number as extracted from the text",
  "policeStation": "Name of the police station",
  "dateOfFir": "Date when FIR was lodged (DD-MM-YYYY format if possible)",
  "sectionsCharged": ["Section 302 IPC" or "Section 103 BNS", "Section 34 IPC" or "Section 48 BNS"],
  "underOldOrNewLaw": "IPC_CrPC or BNS_BNSS or UNKNOWN",
  "complainantName": "Name of the person who lodged the FIR",
  "accusedNames": ["Name of accused 1", "Name of accused 2"],
  "briefFacts": "Brief summary of the factual allegations in the FIR",
  "offenceCategory": "bailable or nonBailable or compoundable or nonCompoundable",
  "bailableStatus": "bailable or nonBailable or mixed"
}`;
const SUGGEST_BAIL_GROUNDS_JSON_STRUCTURE = `{
  "grounds": ["Ground 1: e.g., The accused is a permanent resident with deep roots in the community, making flight risk minimal", "Ground 2: e.g., No prior criminal antecedents of the accused", "Ground 3: e.g., Investigation is substantially complete and custodial interrogation is no longer required"],
  "applicableBailType": "regular or anticipatory or default or interim",
  "relevantSections": ["Section 439 CrPC / Section 483 BNSS", "Other relevant sections"],
  "strongestArguments": ["Strongest legal argument 1 supporting bail", "Strongest legal argument 2 supporting bail", "Strongest legal argument 3 supporting bail"]
}`;
const CRLMP_JSON_STRUCTURE = `{
  "title": "Title of the CRLMP (e.g., 'Criminal Miscellaneous Petition for Interim Relief' or 'CRLMP for Suspension of Sentence')",
  "content": "Full CRLMP text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like IN THE HIGH COURT OF..., CRLMP, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title with court name and CRLMP number, case details (case number, court, order date), petitioner and respondent details, factual background in numbered paragraphs, grounds for the relief sought in numbered paragraphs with legal provisions, prayer clause specifying the exact relief, verification and signature block. Make it court-ready.",
  "keyPoints": ["Key legal point 1", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning about limitations or procedural requirements", "Any flag about old/new law section usage"]
}`;
// ─── Task: generateBail ──────────────────────────────────────────────────────────
function buildBailPrompt(bailType, firDetails, accusedDetails, caseDetails, grounds, suretyDetails, offenceCategory, punishmentRange) {
    let prompt = `Draft a complete, court-ready Bail Application.

## Bail Type
- **Type:** ${bailType === "regular" ? "Regular Bail" : bailType === "anticipatory" ? "Anticipatory Bail" : bailType === "default" ? "Default Bail" : "Interim Bail"}
`;
    if (bailType === "regular") {
        prompt += `- **Applicable Law:** Section 439 CrPC / Section 483 BNSS\n`;
    }
    else if (bailType === "anticipatory") {
        prompt += `- **Applicable Law:** Section 438 CrPC / Section 482 BNSS\n`;
    }
    else if (bailType === "default") {
        prompt += `- **Applicable Law:** Section 167(2) CrPC / Section 187 BNSS\n`;
    }
    else {
        prompt += `- **Applicable Law:** Section 438 or 439 CrPC / Section 482 or 483 BNSS (as applicable)\n`;
    }
    prompt += `
## FIR Details
- **FIR Number:** ${firDetails.firNumber || "Not specified"}
- **Police Station:** ${firDetails.policeStation || "Not specified"}
- **Date of FIR:** ${firDetails.dateOfFir || "Not specified"}
- **Sections Charged:** ${(firDetails.sectionsCharged || []).join(", ") || "Not specified"}
- **Under Old or New Law:** ${firDetails.underOldOrNewLaw || "Not specified"}`;
    if (firDetails.underOldOrNewLaw === "IPC_CrPC") {
        prompt += ` (IPC 1860 / CrPC 1973 — Note: If the offence was committed before July 1, 2024, old law applies. If after, BNS/BNSS applies.)\n`;
    }
    else if (firDetails.underOldOrNewLaw === "BNS_BNSS") {
        prompt += ` (BNS 2023 / BNSS 2023 — New criminal law effective July 1, 2024)\n`;
    }
    else {
        prompt += `\n`;
    }
    prompt += `
## Accused Details
- **Name:** ${accusedDetails.name || "Not specified"}
- **Age:** ${accusedDetails.age || "Not specified"}
- **Address:** ${accusedDetails.address || "Not specified"}
- **Occupation:** ${accusedDetails.occupation || "Not specified"}
- **Arrested:** ${accusedDetails.arrested ? "Yes" : "No"}
- **Custody Date:** ${accusedDetails.custodyDate || "Not applicable"}

## Case Details
- **Court Name:** ${caseDetails.courtName || "Not specified"}
- **Case Number:** ${caseDetails.caseNumber || "Not specified"}
- **Next Hearing:** ${caseDetails.nextHearing || "Not specified"}

## Offence Category
- **Category:** ${offenceCategory || "Not specified"}
`;
    if (punishmentRange) {
        prompt += `- **Punishment Range:** ${punishmentRange}\n`;
    }
    if (suretyDetails) {
        prompt += `
## Surety Details
- **Surety Name:** ${suretyDetails.name || "Not specified"}
- **Address:** ${suretyDetails.address || "Not specified"}
- **Amount:** ${suretyDetails.amount || "Not specified"}
- **Relation to Accused:** ${suretyDetails.relation || "Not specified"}
`;
    }
    prompt += `
## Grounds for Bail (as provided by advocate)
${grounds.map((g, i) => `${i + 1}. ${g}`).join("\n") || "No specific grounds provided — derive from available facts."}

Draft the complete bail application. You must:
1. Apply the triple test: (a) flight risk — the accused is not likely to abscond; (b) evidence tampering — the accused will not tamper with evidence or influence witnesses; (c) investigation hampering — bail will not hamper the investigation
2. Include Satender Kumar Antil v. K.B. Sanjay (2023) categorization analysis: Category 1 (trivial offences, bail as matter of right), Category 2 (moderate offences, bail after some conditions), Category 3 (grave offences like terror/Maoist, strict bail standards)
3. Auto-detect correct section references based on underOldOrNewLaw — if IPC/CrPC, use CrPC section numbers; if BNS/BNSS, use BNSS section numbers; include BOTH if the transition period applies
4. Include proper cause title, facts, grounds, prayer, and verification
5. Flag any warnings about old vs new law usage`;
    return prompt;
}
// ─── Task: generateCRP ──────────────────────────────────────────────────────────
function buildCRPPrompt(crpType, impugnedOrder, petitionerDetails, respondentDetails, caseHistory, grounds, caseType) {
    let prompt = `Draft a complete, court-ready Criminal Revision Petition or Quashing Petition.

## Petition Type
- **Type:** ${crpType === "revision" ? "Criminal Revision Petition" : "Criminal Miscellaneous Case for Quashing"}`;
    if (crpType === "revision") {
        prompt += `
- **Applicable Law:** Section 397 read with Section 399 CrPC (or Section 438 BNSS)
- **Scope:** Interference with order only on grounds of jurisdictional error, patent illegality, or manifest injustice`;
    }
    else {
        prompt += `
- **Applicable Law:** Section 482 CrPC (or Section 528 BNSS) — Inherent powers of the High Court
- **Scope:** Quashing of FIR/complaint/proceedings under Bhajan Lal categories`;
    }
    prompt += `
## Impugned Order
- **Date:** ${impugnedOrder.date || "Not specified"}
- **Court Name:** ${impugnedOrder.courtName || "Not specified"}
- **Order Details:** ${impugnedOrder.orderDetails || "Not specified"}

## Petitioner Details
- **Name:** ${petitionerDetails.name || "Not specified"}
- **Address:** ${petitionerDetails.address || "Not specified"}
- **Advocate:** ${petitionerDetails.advocate || "Not specified"}

## Respondent Details
- **Name:** ${respondentDetails.name || "Not specified"}
- **Address:** ${respondentDetails.address || "Not specified"}
- **Advocate:** ${respondentDetails.advocate || "Not specified"}

## Case History
${caseHistory || "No case history provided."}

## Case Type
- **Type:** ${caseType || "criminal"}

## Grounds (as provided by advocate)
${grounds.map((g, i) => `${i + 1}. ${g}`).join("\n") || "No specific grounds provided — derive from available facts."}
`;
    if (crpType === "revision") {
        prompt += `
For revision, analyze and include:
1. Jurisdiction of the revisional court
2. Maintainability — whether the order is revisable
3. Patent defects / jurisdictional error / manifest injustice in the impugned order
4. Whether a separate appeal lies and if not filed, consequences
5. Reference to Section 397/399 CrPC or Section 438 BNSS`;
    }
    else {
        prompt += `
For quashing, analyze and include all applicable Bhajan Lal 7-category grounds:
1. **Category 1:** Where the allegations do not constitute any offence (no prima facie case)
2. **Category 2:** Where there is express legal bar to institution of proceedings
3. **Category 3:** Where allegations are absurd, inherently improbable, or fanciful
4. **Category 4:** Where there is clear miscarriage of justice and no reasonable ground for proceeding
5. **Category 5:** Where proceeding is maliciously instituted with ulterior motive
6. **Category 6:** Where the proceeding is abuse of process of law
7. **Category 7:** Where parties have settled the matter and continuation of proceedings serves no purpose (compromise/quash after settlement)`;
    }
    prompt += `
Draft the complete CRP with proper cause title, facts, jurisdiction/maintainability analysis, grounds, prayer, and verification.`;
    return prompt;
}
// ─── Task: generateWrit ──────────────────────────────────────────────────────────
function buildWritPrompt(writType, isPIL, petitionerDetails, respondentDetails, violationDetails, facts, jurisdiction, highCourtName) {
    let prompt = `Draft a complete, court-ready Writ Petition.

## Writ Type
- **Type:** ${writType === "mandamus" ? "Writ of Mandamus" : writType === "certiorari" ? "Writ of Certiorari" : writType === "prohibition" ? "Writ of Prohibition" : writType === "habeas_corpus" ? "Writ of Habeas Corpus" : "Writ of Quo Warranto"}
`;
    if (writType === "mandamus") {
        prompt += `- **Purpose:** To direct a public authority to perform a duty it is legally bound to perform\n`;
    }
    else if (writType === "certiorari") {
        prompt += `- **Purpose:** To quash an order or decision of a lower tribunal/body lacking jurisdiction or acting in excess of jurisdiction\n`;
    }
    else if (writType === "prohibition") {
        prompt += `- **Purpose:** To prevent a lower court or tribunal from exceeding its jurisdiction\n`;
    }
    else if (writType === "habeas_corpus") {
        prompt += `- **Purpose:** To produce a person before the court and determine the legality of their detention\n`;
    }
    else {
        prompt += `- **Purpose:** To inquire into the legality of a person holding a public office\n`;
    }
    prompt += `
## PIL Status
- **Is PIL:** ${isPIL ? "Yes — Public Interest Litigation" : "No — Individual Petition"}
${isPIL ? "- **Note:** Since this is a PIL, locus standi requirements are relaxed. Still explain how the petitioner has sufficient interest in the matter.\n" : ""}

## Jurisdiction
- **Court:** ${jurisdiction === "supreme_court" ? "Supreme Court of India (Article 32)" : `High Court of ${highCourtName || "[Name]"} (Article 226)`}`;
    if (jurisdiction === "supreme_court") {
        prompt += `
- **Constitutional Article:** Article 32 — Right to Constitutional Remedies (Supreme Court)
- **Note:** Article 32 is a fundamental right itself. Writ jurisdiction of the Supreme Court.`;
    }
    else {
        prompt += `
- **Constitutional Article:** Article 226 — Power of High Courts to issue certain writs
- **High Court:** ${highCourtName || "Not specified"}`;
    }
    prompt += `
## Petitioner Details
- **Name:** ${petitionerDetails.name || "Not specified"}
- **Address:** ${petitionerDetails.address || "Not specified"}
- **Advocate:** ${petitionerDetails.advocate || "Not specified"}

## Respondent Details
${respondentDetails.map((r, i) => `${i + 1}. **Respondent ${i + 1}** — ${r.designation || "Not specified"}, ${r.department || "Not specified"}, ${r.address || "Address not specified"}`).join("\n") || "No respondents specified"}

## Violation Details
- **Fundamental Right Violated:** ${violationDetails.fundamentalRight || "Not specified"}
- **Administrative Action:** ${violationDetails.administrativeAction || "Not specified"}
- **Relief Sought:** ${violationDetails.reliefSought || "Not specified"}

## Facts
${facts || "No facts provided — draft with placeholders."}

Draft the complete writ petition. You must:
1. Include locus standi analysis (how petitioner is aggrieved; relaxed for PIL)
2. Include alternative remedy check — if an alternative statutory remedy exists, explain why writ is maintainable (exhaustion rule, futility, irreparable injury)
3. Include territorial jurisdiction analysis
4. Identify the specific fundamental right(s) violated (Articles 14, 19, 21, 22, 25, etc.)
5. Include proper cause title, facts, grounds, prayer specifying the exact writ, verification
6. For PIL: Include public interest dimension and why individual approach is not sufficient`;
    return prompt;
}
// ─── Task: parseFIR ─────────────────────────────────────────────────────────────
function buildParseFIRPrompt(firText) {
    return `You are provided with the full text of a First Information Report (FIR) registered at an Indian police station. Your task is to extract and structure all key information.

IMPORTANT: Indian criminal law changed on July 1, 2024:
- BNS 2023 replaced IPC 1860
- BNSS 2023 replaced CrPC 1973

Auto-detect the law framework:
- If sections mention "IPC" or "CrPC" or section numbers typical of IPC (e.g., 302, 376, 420, 498A, 304B) → IPC_CrPC
- If sections mention "BNS" or "BNSS" or section numbers from the new law → BNS_BNSS
- Common mapping hints: IPC 302 → BNS 103, IPC 376 → BNS 64, IPC 420 → BNS 316, IPC 498A → BNS 85, IPC 304B → BNS 108

## FIR Text
---
${firText}
---

Instructions:
1. Extract the FIR number, police station name, and date
2. List ALL sections charged — include both old and new law references if possible
3. Determine whether the FIR is under IPC/CrPC or BNS/BNSS
4. Extract complainant/informant name
5. Extract ALL accused names mentioned
6. Summarize the brief facts/allegations
7. Determine offence category: bailable, nonBailable, compoundable, nonCompoundable
8. Determine bailable status: bailable, nonBailable, or mixed (both bailable and non-bailable offences charged)

Be thorough — extract ALL information present in the FIR text.`;
}
// ─── Task: suggestBailGrounds ───────────────────────────────────────────────────
function buildSuggestBailGroundsPrompt(firDetails, accusedDetails, custodyPeriod) {
    return `Analyze the following case details and suggest the strongest possible bail grounds and arguments.

IMPORTANT: Indian criminal law changed on July 1, 2024:
- BNS 2023 replaced IPC 1860
- BNSS 2023 replaced CrPC 1973
- Key mapping: CrPC 437→BNSS 480, CrPC 438→BNSS 482, CrPC 439→BNSS 483, CrPC 167(2)→BNSS 187

## FIR Details
- **Sections Charged:** ${(firDetails.sectionsCharged || []).join(", ") || "Not specified"}
- **Under Old or New Law:** ${firDetails.underOldOrNewLaw || "Not specified"}
- **Brief Facts:** ${firDetails.briefFacts || "Not specified"}

## Accused Details
- **Age:** ${accusedDetails.age || "Not specified"}
- **Occupation:** ${accusedDetails.occupation || "Not specified"}
- **Arrested:** ${accusedDetails.arrested ? "Yes" : "No"}
${custodyPeriod ? `- **Custody Period:** ${custodyPeriod}` : ""}

Analyze and provide:
1. **Applicable Bail Type:** Determine whether regular, anticipatory, default, or interim bail is most appropriate
2. **Relevant Sections:** The exact legal provisions under which bail should be sought (include BOTH old and new law references)
3. **Strongest Arguments:** The 3-5 strongest legal arguments supporting bail, including:
   - Triple test analysis (flight risk, evidence tampering, investigation hampering)
   - Whether the offence is bailable or non-bailable
   - If non-bailable, grounds under Section 439 CrPC / Section 483 BNSS
   - Satender Kumar Antil categorization
   - Maximum punishment and whether it warrants denial of bail
   - Age, health, family ties, antecedents
   - Whether investigation is complete
   - Whether chargesheet has been filed
   - Any statutory bars to bail (e.g., UAPA, NDPS, PMLA, POCSO)
   - If default bail is applicable (e.g., if custody exceeds statutory period under Section 167(2) CrPC / Section 187 BNSS without chargesheet)`;
}
// ─── Task: generateCRLMP ─────────────────────────────────────────────────────────
function buildCRLMPPrompt(crlmpType, caseDetails, petitionerDetails, respondentDetails, prayerDetails, grounds) {
    let prompt = `Draft a complete, court-ready Criminal Miscellaneous Petition (CRLMP).

## CRLMP Type
- **Type:** ${crlmpType === "interim_relief" ? "Interim Relief" : crlmpType === "suspension_sentence" ? "Suspension of Sentence" : crlmpType === "modification" ? "Modification of Order" : crlmpType === "directions" ? "Directions to Lower Court" : crlmpType === "transfer" ? "Transfer of Case" : "Expunction of Remarks/Orders"}`;
    if (crlmpType === "suspension_sentence") {
        prompt += `\n- **Applicable Law:** Section 389 CrPC / Section 473 BNSS — Suspension of sentence pending appeal
- **Requirements:** Show that the appellant has already filed an appeal and that suspension is in the interest of justice`;
    }
    else if (crlmpType === "transfer") {
        prompt += `\n- **Applicable Law:** Section 407 CrPC / Section 447 BNSS — Transfer of cases
- **Requirements:** Show that a fair trial is not possible in the current court (real apprehension of bias, convenience of parties/witnesses)`;
    }
    else if (crlmpType === "directions") {
        prompt += `\n- **Applicable Law:** Section 482 CrPC / Section 528 BNSS (inherent powers) or supervisory jurisdiction under Section 397 CrPC / Section 438 BNSS`;
    }
    else if (crlmpType === "expunction") {
        prompt += `\n- **Applicable Law:** Section 482 CrPC / Section 528 BNSS (inherent powers) — expunction of adverse remarks from judicial orders`;
    }
    else {
        prompt += `\n- **Applicable Law:** Relevant provisions under CrPC/BNSS as applicable to the relief sought`;
    }
    prompt += `
## Case Details
- **Case Number:** ${caseDetails.caseNumber || "Not specified"}
- **Court Name:** ${caseDetails.courtName || "Not specified"}
- **Order Date:** ${caseDetails.orderDate || "Not specified"}

## Petitioner Details
- **Name:** ${petitionerDetails.name || "Not specified"}
- **Address:** ${petitionerDetails.address || "Not specified"}

## Respondent Details
- **Name:** ${respondentDetails.name || "Not specified"}
- **Address:** ${respondentDetails.address || "Not specified"}

## Prayer Details (as provided by advocate)
${prayerDetails || "Not specified — derive from available facts."}

## Grounds (as provided by advocate)
${grounds || "No specific grounds provided — derive from available facts."}

Draft the complete CRLMP with proper cause title, factual background, grounds for the relief, prayer clause, and verification.`;
    return prompt;
}
// ─── Main Cloud Function ───────────────────────────────────────────────────────
exports.apiAiCriminal = v2_1.https.onRequest({
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
            const { task } = req.body;
            if (!task) {
                res.status(400).json({
                    success: false,
                    error: "task is required. Valid tasks: generateBail, generateCRP, generateWrit, parseFIR, suggestBailGrounds, generateCRLMP",
                });
                return;
            }
            console.log(`[ai-criminal] Task: ${task}`);
            switch (task) {
                // ────────────────────────────────────────────────────────────────────
                // TASK 1: generateBail
                // ────────────────────────────────────────────────────────────────────
                case "generateBail": {
                    const { bailType, firDetails, accusedDetails, caseDetails, grounds, suretyDetails, offenceCategory, punishmentRange } = req.body;
                    if (!bailType || !firDetails || !accusedDetails || !caseDetails) {
                        res.status(400).json({
                            success: false,
                            error: "bailType, firDetails, accusedDetails, and caseDetails are required for generateBail.",
                        });
                        return;
                    }
                    if (!["regular", "anticipatory", "default", "interim"].includes(bailType)) {
                        res.status(400).json({
                            success: false,
                            error: "bailType must be 'regular', 'anticipatory', 'default', or 'interim'.",
                        });
                        return;
                    }
                    const userPrompt = buildBailPrompt(bailType, firDetails, accusedDetails, caseDetails, grounds || [], suretyDetails, offenceCategory, punishmentRange);
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, BAIL_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-criminal] Sarvam failed for generateBail, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, BAIL_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-criminal] Groq failed for generateBail, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${BAIL_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-criminal", undefined, 3000);
                    data = (0, utils_1.stripMarkdownFromData)(data);
                    res.json({ success: true, data });
                    break;
                }
                // ────────────────────────────────────────────────────────────────────
                // TASK 2: generateCRP
                // ────────────────────────────────────────────────────────────────────
                case "generateCRP": {
                    const { crpType, impugnedOrder, petitionerDetails, respondentDetails, caseHistory, grounds, caseType } = req.body;
                    if (!crpType || !impugnedOrder || !petitionerDetails || !respondentDetails) {
                        res.status(400).json({
                            success: false,
                            error: "crpType, impugnedOrder, petitionerDetails, and respondentDetails are required for generateCRP.",
                        });
                        return;
                    }
                    if (!["revision", "quashing"].includes(crpType)) {
                        res.status(400).json({
                            success: false,
                            error: "crpType must be 'revision' or 'quashing'.",
                        });
                        return;
                    }
                    const userPrompt = buildCRPPrompt(crpType, impugnedOrder, petitionerDetails, respondentDetails, caseHistory || "", grounds || [], caseType);
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, CRP_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-criminal] Sarvam failed for generateCRP, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, CRP_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-criminal] Groq failed for generateCRP, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${CRP_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-criminal", undefined, 3000);
                    data = (0, utils_1.stripMarkdownFromData)(data);
                    res.json({ success: true, data });
                    break;
                }
                // ────────────────────────────────────────────────────────────────────
                // TASK 3: generateWrit
                // ────────────────────────────────────────────────────────────────────
                case "generateWrit": {
                    const { writType, isPIL, petitionerDetails, respondentDetails, violationDetails, facts, jurisdiction, highCourtName } = req.body;
                    if (!writType || !petitionerDetails || !respondentDetails || !violationDetails) {
                        res.status(400).json({
                            success: false,
                            error: "writType, petitionerDetails, respondentDetails, and violationDetails are required for generateWrit.",
                        });
                        return;
                    }
                    if (!["mandamus", "certiorari", "prohibition", "habeas_corpus", "quo_warranto"].includes(writType)) {
                        res.status(400).json({
                            success: false,
                            error: "writType must be 'mandamus', 'certiorari', 'prohibition', 'habeas_corpus', or 'quo_warranto'.",
                        });
                        return;
                    }
                    if (!["high_court", "supreme_court"].includes(jurisdiction)) {
                        res.status(400).json({
                            success: false,
                            error: "jurisdiction must be 'high_court' or 'supreme_court'.",
                        });
                        return;
                    }
                    const userPrompt = buildWritPrompt(writType, !!isPIL, petitionerDetails, respondentDetails || [], violationDetails, facts || "", jurisdiction, highCourtName);
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, WRIT_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-criminal] Sarvam failed for generateWrit, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, WRIT_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-criminal] Groq failed for generateWrit, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${WRIT_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-criminal", undefined, 3000);
                    data = (0, utils_1.stripMarkdownFromData)(data);
                    res.json({ success: true, data });
                    break;
                }
                // ────────────────────────────────────────────────────────────────────
                // TASK 4: parseFIR
                // ────────────────────────────────────────────────────────────────────
                case "parseFIR": {
                    const { firText } = req.body;
                    if (!firText) {
                        res.status(400).json({
                            success: false,
                            error: "firText is required for parseFIR.",
                        });
                        return;
                    }
                    const userPrompt = buildParseFIRPrompt(firText);
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, PARSE_FIR_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-criminal] Sarvam failed for parseFIR, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, PARSE_FIR_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-criminal] Groq failed for parseFIR, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${PARSE_FIR_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-criminal", undefined, 3000);
                    data = (0, utils_1.stripMarkdownFromData)(data);
                    res.json({ success: true, data });
                    break;
                }
                // ────────────────────────────────────────────────────────────────────
                // TASK 5: suggestBailGrounds
                // ────────────────────────────────────────────────────────────────────
                case "suggestBailGrounds": {
                    const { firDetails, accusedDetails, custodyPeriod } = req.body;
                    if (!firDetails || !accusedDetails) {
                        res.status(400).json({
                            success: false,
                            error: "firDetails and accusedDetails are required for suggestBailGrounds.",
                        });
                        return;
                    }
                    const userPrompt = buildSuggestBailGroundsPrompt(firDetails, accusedDetails, custodyPeriod);
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, SUGGEST_BAIL_GROUNDS_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-criminal] Sarvam failed for suggestBailGrounds, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, SUGGEST_BAIL_GROUNDS_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-criminal] Groq failed for suggestBailGrounds, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${SUGGEST_BAIL_GROUNDS_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-criminal", undefined, 3000);
                    data = (0, utils_1.stripMarkdownFromData)(data);
                    res.json({ success: true, data });
                    break;
                }
                // ────────────────────────────────────────────────────────────────────
                // TASK 6: generateCRLMP
                // ────────────────────────────────────────────────────────────────────
                case "generateCRLMP": {
                    const { crlmpType, caseDetails, petitionerDetails, respondentDetails, prayerDetails, grounds } = req.body;
                    if (!crlmpType || !caseDetails || !petitionerDetails || !respondentDetails) {
                        res.status(400).json({
                            success: false,
                            error: "crlmpType, caseDetails, petitionerDetails, and respondentDetails are required for generateCRLMP.",
                        });
                        return;
                    }
                    if (!["interim_relief", "suspension_sentence", "modification", "directions", "transfer", "expunction"].includes(crlmpType)) {
                        res.status(400).json({
                            success: false,
                            error: "crlmpType must be 'interim_relief', 'suspension_sentence', 'modification', 'directions', 'transfer', or 'expunction'.",
                        });
                        return;
                    }
                    const userPrompt = buildCRLMPPrompt(crlmpType, caseDetails, petitionerDetails, respondentDetails, prayerDetails || "", grounds || "");
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, CRLMP_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-criminal] Sarvam failed for generateCRLMP, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, CRLMP_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-criminal] Groq failed for generateCRLMP, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${CRLMP_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-criminal", undefined, 3000);
                    data = (0, utils_1.stripMarkdownFromData)(data);
                    res.json({ success: true, data });
                    break;
                }
                // ────────────────────────────────────────────────────────────────────
                // Unknown task
                // ────────────────────────────────────────────────────────────────────
                default: {
                    res.status(400).json({
                        success: false,
                        error: `Unknown task: "${task}". Valid tasks: generateBail, generateCRP, generateWrit, parseFIR, suggestBailGrounds, generateCRLMP`,
                    });
                }
            }
        }
        catch (error) {
            console.error("[ai-criminal] Error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to process criminal drafting request",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });
});
