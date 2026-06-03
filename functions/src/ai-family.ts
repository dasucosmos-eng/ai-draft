// @ts-nocheck
import { parseLLMJSON } from "./parse-json";
import { aiFunctionSecrets } from "./secrets";
// ai-family — Firebase Cloud Function
// AI-powered Family & Motor Accident drafting module for AI Draft legal platform
// Generates petitions for HMOP, DOP, MVOP, Succession, Guardian, Maintenance
// Returns: { success, data: {...} } or { success: false, error: "..." }

import { https } from "firebase-functions/v2";
import { restrictedCors } from "./cors";
import { stripMarkdownFromData } from "./utils";
import { callSarvamStructured } from "./sarvam-client";
import { callGroqStructured, logUsage } from "./groq-client";
import { callGeminiText } from "./gemini-client";

const corsHandler = restrictedCors;

// ─── System Prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Indian family law and motor accident claims drafter integrated into AI Draft platform. You draft precise, court-ready petitions.

Key areas:
- Hindu Marriage Act (Sec 13, 13-B, 9, 24, 25, 26, 14)
- Protection of Women from Domestic Violence Act 2005 (Sec 12, 18-23)
- Motor Vehicles Act (Sec 166, 140, 163)
- Indian Succession Act (Sec 372, 214-257, 218-234)
- Guardian and Wards Act 1890 (Sec 7, 25)
- CrPC 125-128 / BNSS 144-148 (maintenance)
- Hindu Adoptions and Maintenance Act 1956 (Sec 18-22)

CRITICAL RULES:
- Family Court has exclusive jurisdiction for HMOP, DOP, maintenance, custody
- JMFC handles DOP applications
- District Court handles succession, guardianship
- MACT (Motor Accident Claims Tribunal) handles MVOP
- Include detailed factual narration
- For MVOP: Calculate compensation using income multiplier method (Selvi 2018)
- For succession: Distinguish personal law (Hindu/Muslim/Christian)
- For maintenance: Consider both CrPC 125 and HAMA provisions
- Include verification and vakalatnama format

CRITICAL TEXT CASING RULES:
- Body text MUST be in normal sentence case (NOT all caps, NOT all uppercase)
- Only specific HEADING WORDS may be in ALL CAPS: IN THE HIGH COURT OF..., IN THE FAMILY COURT OF..., BEFORE THE JUDICIAL MAGISTRATE..., PETITION, APPLICATION, AFFIDAVIT, VERIFICATION, VAKALATNAMA, PRAYER, CAUSE TITLE
- Section sub-headings (like "Facts of the Case", "Grounds for Relief") should use Title Case, NOT ALL CAPS
- Party names, court names, and legal terms should use normal capitalization
- DO NOT write the entire document or body paragraphs in uppercase/block letters`;

// ─── JSON Structure Definitions per Task ────────────────────────────────────────

const DIVORCE_JSON_STRUCTURE = `{
  "title": "Title of the petition (e.g., 'Petition for Divorce under Sec 13(1)(ia) HMA', 'Joint Petition for Mutual Consent Divorce under Sec 13-B HMA')",
  "content": "Full petition text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like IN THE FAMILY COURT..., PETITION, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title with court name and case number placeholder, jurisdiction clause, parties description, detailed factual narration in numbered paragraphs (marriage details, cohabitation, grounds/mutual consent, children if any, efforts at reconciliation, grounds under specific section), reliefs sought, verification, and signature block. Make it court-ready.",
  "keyPoints": ["Key legal point 1 (e.g., 'Sec 14 bar: 1 year from marriage before filing')", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

const DOP_JSON_STRUCTURE = `{
  "title": "Title of the DOP application (e.g., 'Application under Sec 12 PWDVA 2005 for Protection Order', 'Application under Sec 12 PWDVA 2005 for Monetary Relief')",
  "content": "Full application text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like BEFORE THE JUDICIAL MAGISTRATE..., APPLICATION, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title (before JMFC), application under Sec 12 PWDVA 2005, applicant and respondent details, detailed factual narration of domestic violence incidents in numbered paragraphs, impact on applicant and children, specific reliefs sought under relevant sections (18-23), affidavit of facts, verification, and signature block. Make it court-ready.",
  "keyPoints": ["Key legal point 1 (e.g., '60-day disposal mandate under Sec 12(5)')", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

const MVOP_JSON_STRUCTURE = `{
  "title": "Title of the claim petition (e.g., 'Claim Petition under Sec 166 Motor Vehicles Act', 'Application for Interim Compensation under Sec 140 MVA')",
  "content": "Full petition text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like BEFORE THE MOTOR ACCIDENT CLAIMS TRIBUNAL..., CLAIM PETITION, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title before MACT, petition under Sec 166 MVA (or Sec 140 for interim), claimant details, vehicle and insurance details, detailed factual narration of accident in numbered paragraphs, injury/death details, FIR details, grounds for compensation, prayer for compensation with breakdown, list of documents to be annexed, verification, and signature block. Make it court-ready.",
  "compensationBreakdown": {
    "annualIncome": "Claimant's annual income",
    "multiplier": "Multiplier applicable based on Selvi v. Tamil Nadu (2018) age-based table",
    "lossOfIncome": "Calculated figure: annual income × multiplier",
    "futureMedicalExpenses": "Estimated future medical costs",
    "lossOfEarningCapacity": "If disability, percentage × relevant factor",
    "funeralExpenses": "If fatal accident",
    "lossOfDependency": "If fatal: (annual income - personal consumption) × multiplier",
    "personalConsumptionDeduction": "1/3 or 1/2 deduction rationale",
    "totalCompensation": "Grand total of all heads"
  },
  "keyPoints": ["Key legal point 1 (e.g., 'No-fault liability under Sec 140 for interim compensation')", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

const SUCCESSION_JSON_STRUCTURE = `{
  "title": "Title of the petition (e.g., 'Petition for Succession Certificate under Sec 372 ISA', 'Petition for Probate under Sec 254 ISA', 'Petition for Declaration of Legal Heirs')",
  "content": "Full petition text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like IN THE DISTRICT COURT..., PETITION, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title with court name and case number placeholder, petition under relevant section of Indian Succession Act, deceased person details (name, age, date/place of death, religion, last address), property details (movable/immovable, description, estimated value, debts), list of legal heirs with shares under applicable personal law, ground for petition, prayer for certificate/probate, list of documents to be annexed, verification, and signature block. Make it court-ready.",
  "keyPoints": ["Key legal point 1 (e.g., 'Section 213 deleted by Repealing Act 2025 — probate now voluntary')", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

const GUARDIAN_JSON_STRUCTURE = `{
  "title": "Title of the petition (e.g., 'Petition for Appointment of Guardian under Sec 7 GW Act', 'Application for Variation of Guardianship under Sec 25 GW Act', 'Application for Removal of Guardian')",
  "content": "Full petition text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like IN THE DISTRICT COURT..., PETITION, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title with court name and case number placeholder, petition under Guardian and Wards Act 1890, minor details (name, age, gender, address), parent status (alive/deceased/absent with details), applicant details (name, address, relation, income), grounds for guardianship/variation/removal with detailed factual narration in numbered paragraphs, child welfare considerations, prayer clause, list of documents to be annexed, verification, and signature block. Make it court-ready.",
  "keyPoints": ["Key legal point 1 (e.g., 'Child welfare is the paramount consideration under Sec 17 GW Act')", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

const MAINTENANCE_JSON_STRUCTURE = `{
  "title": "Title of the application (e.g., 'Application for Maintenance under Sec 125 CrPC', 'Application for Maintenance under Sec 18 HAMA')",
  "content": "Full application text in PLAIN TEXT format (NO markdown). Body text must be in normal sentence case — DO NOT write in ALL CAPS. Only use ALL CAPS for top-level headings like BEFORE THE..., APPLICATION, VERIFICATION, PRAYER. Section sub-headings use Title Case. Include: cause title with court name and case number placeholder, application under the relevant section (CrPC 125 or HAMA Sec 18-22), applicant and respondent details, marriage details, children details, factual narration of neglect/refusal to maintain in numbered paragraphs, income and means of both parties, amount claimed with justification, grounds for entitlement, reliefs sought, verification, and signature block. Make it court-ready.",
  "keyPoints": ["Key legal point 1 (e.g., 'CrPC 125 is a summary proceeding — standard of proof is preponderance of probabilities')", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer about the draft"]
}`;

// ─── Task 1: generateDivorce Prompt Builder ──────────────────────────────────

function buildDivorcePrompt(input: any): string {
  const { divorceType, petitionerDetails, respondentDetails, marriageDetails, grounds, underSection, waiverCoolingPeriod } = input;

  const isMutualConsent = divorceType === "mutual_consent";
  const sectionLabel = isMutualConsent
    ? `Section 13-B of the Hindu Marriage Act, 1955 (Mutual Consent Divorce)`
    : `Section ${underSection} of the Hindu Marriage Act, 1955`;

  let prompt = `Draft a complete, court-ready petition for divorce.

## Divorce Type
- **Type:** ${isMutualConsent ? "Mutual Consent Divorce" : "Contested Divorce"}
- **Provision:** ${sectionLabel}
${waiverCoolingPeriod ? "- **Waiver of 6-month Cooling Period:** Yes (under Supreme Court guidelines — Amardeep Singh v. Harveen Kaur)" : ""}

## Petitioner Details
- **Name:** ${petitionerDetails.name}
- **Gender:** ${petitionerDetails.gender}
- **Address:** ${petitionerDetails.address}
- **Religion:** ${petitionerDetails.religion}
- **Occupation:** ${petitionerDetails.occupation}
- **Income:** ${petitionerDetails.income || "Not specified"}

## Respondent Details
- **Name:** ${respondentDetails.name}
- **Gender:** ${respondentDetails.gender}
- **Address:** ${respondentDetails.address}
- **Religion:** ${respondentDetails.religion}
- **Occupation:** ${respondentDetails.occupation}
- **Income:** ${respondentDetails.income || "Not specified"}

## Marriage Details
- **Date of Marriage:** ${marriageDetails.dateOfMarriage || "Not specified"}
- **Place of Marriage:** ${marriageDetails.placeOfMarriage || "Not specified"}
`;

  if (marriageDetails.children && marriageDetails.children.length > 0) {
    prompt += `- **Children:**\n`;
    marriageDetails.children.forEach((child: any, i: number) => {
      prompt += `  ${i + 1}. ${child.name}, Age: ${child.age}, Gender: ${child.gender}`;
      if (child.custodyPreference) prompt += `, Custody Preference: ${child.custodyPreference}`;
      prompt += `\n`;
    });
  } else {
    prompt += `- **Children:** None\n`;
  }

  if (!isMutualConsent && grounds) {
    const _gl = Array.isArray(grounds) ? grounds : String(grounds).split("\n").filter(Boolean);
    if (_gl.length > 0) {
      prompt += `\n## Grounds for Divorce\n${_gl.map((g, i) => `${i + 1}. ${g}`).join("\n")}\n`;
    }
  }

  if (isMutualConsent) {
    prompt += `
## Mutual Consent Statements
Both parties have been living separately for [period to be stated] and have mutually agreed that the marriage has irretrievably broken down. Both parties consent to dissolve the marriage by mutual consent.

`;
  }

  prompt += `
Draft the complete petition. Include:
1. Cause title (Before the Family Court / District Court)
2. Jurisdiction clause (Family Court Act)
3. Detailed factual narration in numbered paragraphs covering:
   - Marriage solemnization
   - Cohabitation and matrimonial home
   ${isMutualConsent ? "- Period of separation\n   - Irretrievable breakdown\n   - Mutual consent statement\n   - Settlement of alimony, maintenance, custody" : `- Specific grounds under Sec 13(1)(ia-ig)\n   - Cruelty / Desertion / Adultery / Conversion / etc. as applicable\n   - Efforts at reconciliation\n   - No possibility of living together again`}
4. Reliefs sought
${isMutualConsent ? "5. Terms of settlement (alimony, custody, division of assets)" : "5. Prayer for dissolution of marriage"}
6. Verification and signature block
7. Vakalatnama format

Ensure proper statutory references throughout. For contested divorce, apply the specific ground(s) under Sec 13(1)(ia-ig) as mentioned. Note the Sec 14 one-year bar if applicable.`;

  return prompt;
}

// ─── Task 2: generateDOP Prompt Builder ──────────────────────────────────────

function buildDOPPrompt(input: any): string {
  const { applicationType, applicantDetails, respondentDetails, domesticViolenceDetails } = input;

  const reliefTypeMap: Record<string, string> = {
    protection: "Protection Order under Sec 18 PWDVA",
    residence: "Residence Order under Sec 19 PWDVA",
    monetary: "Monetary Relief under Sec 20 PWDVA",
    custody: "Custody Order under Sec 21 PWDVA",
    compensation: "Compensation under Sec 22 PWDVA",
  };

  let prompt = `Draft a complete, court-ready application under the Protection of Women from Domestic Violence Act, 2005.

## Application Type
- **Relief Sought:** ${reliefTypeMap[applicationType] || applicationType}
- **Provision:** Section 12 PWDVA 2005
- **Court:** Before the Judicial Magistrate First Class (JMFC)

## Applicant (Aggrieved Person) Details
- **Name:** ${applicantDetails.name}
- **Gender:** ${applicantDetails.gender}
- **Age:** ${applicantDetails.age}
- **Address:** ${applicantDetails.address}
- **Occupation:** ${applicantDetails.occupation}
- **Income:** ${applicantDetails.income || "Not specified"}

## Respondent Details
- **Name:** ${respondentDetails.name}
- **Gender:** ${respondentDetails.gender}
- **Address:** ${respondentDetails.address}
- **Relationship:** ${respondentDetails.relation}
- **Occupation:** ${respondentDetails.occupation}
- **Income:** ${respondentDetails.income || "Not specified"}

## Domestic Violence Incidents
`;
  if (domesticViolenceDetails.incidents && domesticViolenceDetails.incidents.length > 0) {
    domesticViolenceDetails.incidents.forEach((inc: any, i: number) => {
      prompt += `${i + 1}. **Date:** ${inc.date || "Not specified"} — ${inc.description}\n`;
    });
  } else {
    prompt += `No specific incidents listed — draft with general allegations based on relief sought.\n`;
  }

  if (domesticViolenceDetails.children && domesticViolenceDetails.children.length > 0) {
    prompt += `\n## Children
${domesticViolenceDetails.children.map((c: any, i: number) => `${i + 1}. ${c.name}, Age: ${c.age}`).join("\n")}
`;
  }

  if (domesticViolenceDetails.reliefSought && domesticViolenceDetails.reliefSought.length > 0) {
    prompt += `\n## Specific Reliefs Sought
${domesticViolenceDetails.reliefSought.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}
`;
  }

  prompt += `
Draft the complete application. Include:
1. Cause title (Before the JMFC, [District])
2. Application under Sec 12, PWDVA 2005
3. Detailed factual narration in numbered paragraphs:
   - Nature of domestic relationship (marriage, live-in, shared household)
   - Specific acts of domestic violence (physical, verbal, emotional, economic, sexual)
   - Impact on applicant and children
   - Prior complaints (if any)
4. Reliefs sought under appropriate sections (18-23 PWDVA)
5. Prayer clause for protection/residence/monetary relief/custody/compensation
6. Interim relief prayer if applicable
7. List of supporting documents
8. Verification and signature block
9. Vakalatnama format

Note the 60-day disposal mandate under Sec 12(5) PWDVA. Include that respondent may be directed to reside in the shared household or not to enter. For monetary relief, include income and expense details of both parties.`;

  return prompt;
}

// ─── Task 3: generateMVOP Prompt Builder ──────────────────────────────────────

function buildMVOPPrompt(input: any): string {
  const { claimType, claimantDetails, vehicleDetails, accidentDetails, injuryDetails, respondentDetails, deceased } = input;

  const isInterim = claimType === "interim";

  let prompt = `Draft a complete, court-ready ${isInterim ? "application for interim compensation" : "claim petition for compensation"}.

## Claim Type
- **Type:** ${isInterim ? "Interim Compensation (No-fault liability)" : "Full Compensation Claim"}
- **Provision:** ${isInterim ? "Section 140, Motor Vehicles Act, 1988" : "Section 166, Motor Vehicles Act, 1988"}
- **Court:** Before the Motor Accident Claims Tribunal (MACT), [District]

## Claimant Details
- **Name:** ${claimantDetails.name}
- **Age:** ${claimantDetails.age}
- **Address:** ${claimantDetails.address}
- **Occupation:** ${claimantDetails.occupation}
- **Monthly Income:** ${claimantDetails.monthlyIncome || "Not specified"}
`;

  if (deceased) {
    prompt += `\n## Deceased Person Details (Fatal Accident)
- **Name:** ${deceased.name}
- **Age:** ${deceased.age}
- **Income:** ${deceased.income || "Not specified"}
- **Number of Dependents:** ${deceased.dependents || "Not specified"}
`;
  }

  prompt += `\n## Vehicle Details
- **Type:** ${vehicleDetails.type}
- **Registration Number:** ${vehicleDetails.registrationNumber}
- **Insurance Company:** ${vehicleDetails.insuranceCompany}
- **Insurance Policy Number:** ${vehicleDetails.insurancePolicyNumber}

## Accident Details
- **Date:** ${accidentDetails.date}
- **Time:** ${accidentDetails.time || "Not specified"}
- **Place:** ${accidentDetails.place}
- **Police Station:** ${accidentDetails.policeStation}
- **FIR Number:** ${accidentDetails.firNumber || "Not specified"}

## Injury / Loss Details
- **Nature of Injury:** ${injuryDetails.nature}
- **Disability Percentage:** ${injuryDetails.disabilityPercentage || "Not applicable"}
- **Hospitalization Days:** ${injuryDetails.hospitalizationDays || "Not specified"}
- **Medical Expenses:** ${injuryDetails.medicalExpenses || "Not specified"}

## Respondent Details
- **Name:** ${respondentDetails.name}
- **Address:** ${respondentDetails.address || "Not specified"}
`;

  prompt += `
Draft the complete petition. Include:
1. Cause title (Before MACT, [District])
2. Petition under ${isInterim ? "Sec 140" : "Sec 166"}, Motor Vehicles Act 1988
3. Detailed factual narration in numbered paragraphs:
   - How the accident occurred
   - Role of driver/respondent
   - Injuries sustained / fatality
   - Medical treatment details
   - Impact on livelihood
4. ${isInterim ? "Interim compensation amount with justification under no-fault liability" : `Compensation calculation using the income multiplier method (Selvi v. State of Tamil Nadu, 2018 Supreme Court):
   - Determine annual income of claimant/deceased
   - Apply age-based multiplier from Selvi 2018 table
   - Add future medical expenses
   - Subtract personal consumption (1/3 for deceased with dependents, 1/2 for deceased without dependents)
   - Calculate under all heads: loss of income, medical expenses, loss of earning capacity, funeral expenses (if fatal), pain and suffering, loss of consortium`}
5. Prayer clause with specific amount claimed
6. List of documents to be annexed (FIR copy, medical records, income proof, death certificate if fatal, insurance papers)
7. Verification and signature block
8. Vakalatnama format

Provide the compensation breakdown in the compensationBreakdown field of the JSON response.`;

  return prompt;
}

// ─── Task 4: generateSuccession Prompt Builder ────────────────────────────────

function buildSuccessionPrompt(input: any): string {
  const { petitionType, deceasedDetails, propertyDetails, legalHeirs, personalLaw, willExists } = input;

  const petitionTypeMap: Record<string, string> = {
    succession_certificate: "Succession Certificate under Section 372, Indian Succession Act, 1925",
    probate: "Probate Petition under Section 254, Indian Succession Act, 1925",
    legal_heir: "Petition for Declaration of Legal Heirs",
  };

  const personalLawNotes: Record<string, string> = {
    hindu: "Hindu Succession Act, 1956 applies. Class I heirs (son, daughter, widow, mother) get equal share. Class II heirs if no Class I exists. Mitakshara and Dayabhaga schools for coparcenary property.",
    muslim: "Muslim Personal Law applies. No will for more than 1/3 of estate (for Sunnis). Sharers (wife, sons, daughters) get fixed shares. Residuary heirs take remainder. No concept of joint family property.",
    christian: "Indian Succession Act applies for Christians. Widow gets 1/3 of estate. Children share remaining equally. Lineal descendants in equal shares per stirpes.",
    parsi: "Indian Succession Act applies for Parsis. Widow and children get equal shares. Specific rules for widow's share and children's shares.",
    other: "General provisions of Indian Succession Act apply.",
  };

  let prompt = `Draft a complete, court-ready petition.

## Petition Type
- **Type:** ${petitionTypeMap[petitionType] || petitionType}
- **Personal Law:** ${personalLaw}
- **Applicable Law:** ${personalLawNotes[personalLaw] || "Applicable succession law based on religion and jurisdiction."}

## Deceased Person Details
- **Name:** ${deceasedDetails.name}
- **Age at Death:** ${deceasedDetails.age || "Not specified"}
- **Date of Death:** ${deceasedDetails.dateOfDeath}
- **Place of Death:** ${deceasedDetails.placeOfDeath || "Not specified"}
- **Religion:** ${deceasedDetails.religion}
- **Last Address:** ${deceasedDetails.lastAddress}

## Property Details
- **Type of Property:** ${propertyDetails.type === "both" ? "Movable and Immovable" : propertyDetails.type === "movable" ? "Movable" : "Immovable"}
- **Description:** ${propertyDetails.description}
- **Estimated Value:** ${propertyDetails.estimatedValue || "Not specified"}
- **Outstanding Debts:** ${propertyDetails.debts || "None"}

## Legal Heirs
${legalHeirs.map((heir: any, i: number) => `${i + 1}. **${heir.name}**, Relation: ${heir.relation}, Age: ${heir.age || "Not specified"}, Address: ${heir.address || "Not specified"}, Share: ${heir.share || "To be determined by applicable personal law"}`).join("\n")}

## Will
- ${willExists ? "A **will exists** — probate petition to be filed to validate the will." : "No will exists — intestate succession applies."}
- **IMPORTANT NOTE:** Section 213 of the Indian Succession Act has been **deleted by the Repealing Act 2025**. Probate is now **VOLUNTARY** for all communities. This significantly affects the probate requirement analysis.
`;

  prompt += `
Draft the complete petition. Include:
1. Cause title (Before the District Court, [District])
2. Petition under the relevant section of the Indian Succession Act
3. Deceased person details in numbered paragraphs
4. Property details with description and valuation
5. List of legal heirs with shares under ${personalLaw} personal law
6. Grounds for the petition (necessity of certificate/probate, debts to be cleared, etc.)
${petitionType === "probate" ? "7. Will execution details, executor(s), and codicils (if any)" : "7. Statement that no will exists — intestate succession"}
8. Prayer for ${petitionType === "succession_certificate" ? "succession certificate" : petitionType === "probate" ? "probate of will" : "declaration of legal heirs"}
9. List of documents to be annexed (death certificate, property documents, identity proofs of heirs, will if exists)
10. Verification and signature block
11. Vakalatnama format

Ensure the share distribution follows the applicable personal law (${personalLaw}).`;

  return prompt;
}

// ─── Task 5: generateGuardian Prompt Builder ─────────────────────────────────

function buildGuardianPrompt(input: any): string {
  const { petitionType, minorDetails, parentDetails, applicantDetails } = input;

  const petitionTypeMap: Record<string, string> = {
    guardianship: "Appointment of Guardian under Section 7, Guardian and Wards Act, 1890",
    variation: "Variation of Guardianship under Section 25, Guardian and Wards Act, 1890",
    removal: "Removal of Guardian under the Guardian and Wards Act, 1890",
  };

  let prompt = `Draft a complete, court-ready petition.

## Petition Type
- **Type:** ${petitionTypeMap[petitionType] || petitionType}
- **Court:** Before the District Court, [District]

## Minor Details
- **Name:** ${minorDetails.name}
- **Age:** ${minorDetails.age}
- **Gender:** ${minorDetails.gender}
- **Address:** ${minorDetails.address}

## Parent Details
${parentDetails.map((p: any, i: number) => `${i + 1}. **${p.name}**, Relation: ${p.relation}, Status: ${p.status}${p.address ? `, Address: ${p.address}` : ""}`).join("\n")}

## Applicant Details
- **Name:** ${applicantDetails.name}
- **Address:** ${applicantDetails.address}
- **Relation to Minor:** ${applicantDetails.relation}
- **Income:** ${applicantDetails.income || "Not specified"}
- **Grounds:** ${applicantDetails.grounds || "To be stated in the petition"}
`;

  prompt += `
Draft the complete petition. Include:
1. Cause title (Before the District Court, [District])
2. Petition under ${petitionType === "guardianship" ? "Section 7" : petitionType === "variation" ? "Section 25" : "relevant provisions"}, Guardian and Wards Act, 1890
3. Minor details in numbered paragraphs
4. Parent status (alive, deceased, absent) with circumstances
${petitionType === "guardianship" ? "5. Grounds for appointment (death of parent(s), incapacity, abandonment, neglect, etc.)\n6. Applicant's fitness (income, character, ability to care for minor)\n7. Child's preference (if minor is of sufficient age)" : petitionType === "variation" ? "5. Existing guardianship details\n6. Changed circumstances warranting variation\n7. Best interest of the minor" : "5. Existing guardian details\n6. Grounds for removal (misconduct, incapacity, neglect, abuse)\n7. Welfare of the minor"}
8. Prayer for ${petitionType === "guardianship" ? "appointment as guardian of person and/or property" : petitionType === "variation" ? "variation of existing guardianship order" : "removal of existing guardian and appointment of replacement"}
9. List of documents to be annexed (birth certificate, death certificate of parent(s) if applicable, income proof, character references)
10. Verification and signature block
11. Vakalatnama format

Child welfare is the PARAMOUNT consideration. Emphasize best interests of the minor throughout. Refer to Sec 17 of the Guardian and Wards Act.`;

  return prompt;
}

// ─── Task 6: generateMaintenance Prompt Builder ────────────────────────────────

function buildMaintenancePrompt(input: any): string {
  const { actUnder, applicantDetails, respondentDetails, marriageDetails, grounds, amountClaimed } = input;

  const actLabel = actUnder === "hama"
    ? "Hindu Adoptions and Maintenance Act, 1956 (Sections 18-22)"
    : "Code of Criminal Procedure, 1973 (Sections 125-128) / Bharatiya Nagarik Suraksha Sanhita (Sections 144-148)";

  let prompt = `Draft a complete, court-ready maintenance application.

## Act Under
- **Provision:** ${actLabel}
- **Court:** Before the ${actUnder === "hama" ? "Family Court / District Court" : "Judicial Magistrate First Class (JMFC) / Family Court"}

## Applicant Details
- **Name:** ${applicantDetails.name}
- **Gender:** ${applicantDetails.gender}
- **Age:** ${applicantDetails.age}
- **Address:** ${applicantDetails.address}
- **Occupation:** ${applicantDetails.occupation}
- **Income:** ${applicantDetails.income || "Not specified / Unable to maintain herself/himself"}

## Respondent Details
- **Name:** ${respondentDetails.name}
- **Gender:** ${respondentDetails.gender}
- **Address:** ${respondentDetails.address}
- **Occupation:** ${respondentDetails.occupation}
- **Income:** ${respondentDetails.income || "Not specified"}
`;

  if (marriageDetails) {
    prompt += `\n## Marriage Details
- **Date of Marriage:** ${marriageDetails.dateOfMarriage || "Not specified"}
- **Separation Date:** ${marriageDetails.separationDate || "Not specified"}
`;
    if (marriageDetails.children && marriageDetails.children.length > 0) {
      prompt += `- **Children:**\n`;
      marriageDetails.children.forEach((child: any, i: number) => {
        prompt += `  ${i + 1}. ${child.name}, Age: ${child.age}${child.custody ? `, Current Custody: ${child.custody}` : ""}\n`;
      });
    }
  }
  if (grounds) {
    const _gl = Array.isArray(grounds) ? grounds : String(grounds).split("\n").filter(Boolean);
    if (_gl.length > 0) {
      prompt += `\n## Grounds for Maintenance\n${_gl.map((g, i) => `${i + 1}. ${g}`).join("\n")}\n`;
    }
  }

  if (amountClaimed) {
    prompt += `\n## Amount Claimed
${amountClaimed}
`;
  }

  prompt += `
Draft the complete application. Include:
1. Cause title (Before the ${actUnder === "hama" ? "Family Court" : "JMFC / Family Court"})
2. Application under ${actUnder === "hama" ? "Section 18 HAMA (and Section 20 for monthly maintenance) / Section 19 for parental maintenance" : "Section 125 CrPC / Section 144 BNSS"}
3. Applicant and respondent details in numbered paragraphs
4. Marriage details and cohabitation
${actUnder === "crpc125" ? "5. Statement that respondent has neglected or refused to maintain\n6. Applicant is unable to maintain herself/himself\n7. No grounds for refusal under Sec 127" : "5. Applicant is a Hindu wife/child/parent entitled to maintenance under HAMA\n6. Respondent has sufficient income/property but neglects maintenance\n7. Comparative analysis of income and living standards"}
${marriageDetails?.children?.length ? "8. Children's details and their needs" : ""}
9. Income and expenditure of both parties
10. Amount claimed with justification (considering lifestyle, needs, cost of living)
11. Prayer for monthly maintenance amount
12. Interim maintenance prayer (if applicable)
13. Arrears prayer (if applicable)
14. Verification and signature block
15. Vakalatnama format

${actUnder === "crpc125" ? "Note: CrPC 125 is a summary proceeding with preponderance of probabilities as the standard. It applies to all religions. Failure to comply is punishable under Sec 126(2). Maximum 1/5th of respondent's income can be attached under Sec 128." : "Note: HAMA Sec 18-22 provides additional maintenance provisions specifically for Hindus. Can be claimed simultaneously with CrPC 125 but amounts are set off."}`;

  return prompt;
}

// ─── Main Cloud Function ───────────────────────────────────────────────────────

export const apiAiFamily = https.onRequest(
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
      try {
        const { task } = req.body;

        if (!task) {
          res.status(400).json({
            success: false,
            error: "task is required. Valid tasks: generateDivorce, generateDOP, generateMVOP, generateSuccession, generateGuardian, generateMaintenance",
          });
          return;
        }

        console.log(`[ai-family] Task: ${task}`);

        switch (task) {
          // ────────────────────────────────────────────────────────────────────
          // TASK 1: generateDivorce
          // ────────────────────────────────────────────────────────────────────
          case "generateDivorce": {
            const { divorceType, petitionerDetails, respondentDetails, marriageDetails, grounds, underSection, waiverCoolingPeriod } = req.body;

            if (!divorceType || !petitionerDetails || !respondentDetails || !marriageDetails) {
              res.status(400).json({
                success: false,
                error: "divorceType, petitionerDetails, respondentDetails, and marriageDetails are required for generateDivorce.",
              });
              return;
            }

            if (!["contested", "mutual_consent"].includes(divorceType)) {
              res.status(400).json({
                success: false,
                error: "divorceType must be 'contested' or 'mutual_consent'.",
              });
              return;
            }

            const userPrompt = buildDivorcePrompt(req.body);

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
              }>(SYSTEM_PROMPT, userPrompt, DIVORCE_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-family] Sarvam failed for generateDivorce, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  title: string;
                  content: string;
                  keyPoints: string[];
                  warnings: string[];
                }>(SYSTEM_PROMPT, userPrompt, DIVORCE_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-family] Groq failed for generateDivorce, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${DIVORCE_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-family", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 2: generateDOP
          // ────────────────────────────────────────────────────────────────────
          case "generateDOP": {
            const { applicationType, applicantDetails, respondentDetails, domesticViolenceDetails } = req.body;

            if (!applicationType || !applicantDetails || !respondentDetails) {
              res.status(400).json({
                success: false,
                error: "applicationType, applicantDetails, and respondentDetails are required for generateDOP.",
              });
              return;
            }

            const validTypes = ["protection", "residence", "monetary", "custody", "compensation"];
            if (!validTypes.includes(applicationType)) {
              res.status(400).json({
                success: false,
                error: `applicationType must be one of: ${validTypes.join(", ")}.`,
              });
              return;
            }

            const userPrompt = buildDOPPrompt(req.body);

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
              }>(SYSTEM_PROMPT, userPrompt, DOP_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-family] Sarvam failed for generateDOP, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  title: string;
                  content: string;
                  keyPoints: string[];
                  warnings: string[];
                }>(SYSTEM_PROMPT, userPrompt, DOP_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-family] Groq failed for generateDOP, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${DOP_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-family", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 3: generateMVOP
          // ────────────────────────────────────────────────────────────────────
          case "generateMVOP": {
            const { claimType, claimantDetails, vehicleDetails, accidentDetails, injuryDetails, respondentDetails } = req.body;

            if (!claimType || !claimantDetails || !vehicleDetails || !accidentDetails || !injuryDetails) {
              res.status(400).json({
                success: false,
                error: "claimType, claimantDetails, vehicleDetails, accidentDetails, and injuryDetails are required for generateMVOP.",
              });
              return;
            }

            if (!["compensation", "interim"].includes(claimType)) {
              res.status(400).json({
                success: false,
                error: "claimType must be 'compensation' or 'interim'.",
              });
              return;
            }

            const userPrompt = buildMVOPPrompt(req.body);

            let data: {
              title: string;
              content: string;
              compensationBreakdown?: {
                annualIncome: string;
                multiplier: string;
                lossOfIncome: string;
                futureMedicalExpenses: string;
                lossOfEarningCapacity: string;
                funeralExpenses: string;
                lossOfDependency: string;
                personalConsumptionDeduction: string;
                totalCompensation: string;
              };
              keyPoints: string[];
              warnings: string[];
            };
            try {
              data = await callSarvamStructured<{
                title: string;
                content: string;
                compensationBreakdown?: {
                  annualIncome: string;
                  multiplier: string;
                  lossOfIncome: string;
                  futureMedicalExpenses: string;
                  lossOfEarningCapacity: string;
                  funeralExpenses: string;
                  lossOfDependency: string;
                  personalConsumptionDeduction: string;
                  totalCompensation: string;
                };
                keyPoints: string[];
                warnings: string[];
              }>(SYSTEM_PROMPT, userPrompt, MVOP_JSON_STRUCTURE, 0.3, "sarvam-105b", 6000);
            } catch (sarvamErr) {
              console.error("[ai-family] Sarvam failed for generateMVOP, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  title: string;
                  content: string;
                  compensationBreakdown?: {
                    annualIncome: string;
                    multiplier: string;
                    lossOfIncome: string;
                    futureMedicalExpenses: string;
                    lossOfEarningCapacity: string;
                    funeralExpenses: string;
                    lossOfDependency: string;
                    personalConsumptionDeduction: string;
                    totalCompensation: string;
                  };
                  keyPoints: string[];
                  warnings: string[];
                }>(SYSTEM_PROMPT, userPrompt, MVOP_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-family] Groq failed for generateMVOP, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${MVOP_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-family", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 4: generateSuccession
          // ────────────────────────────────────────────────────────────────────
          case "generateSuccession": {
            const { petitionType, deceasedDetails, propertyDetails, legalHeirs, personalLaw, willExists } = req.body;

            if (!petitionType || !deceasedDetails || !propertyDetails || !legalHeirs || !personalLaw) {
              res.status(400).json({
                success: false,
                error: "petitionType, deceasedDetails, propertyDetails, legalHeirs, and personalLaw are required for generateSuccession.",
              });
              return;
            }

            const validTypes = ["succession_certificate", "probate", "legal_heir"];
            if (!validTypes.includes(petitionType)) {
              res.status(400).json({
                success: false,
                error: `petitionType must be one of: ${validTypes.join(", ")}.`,
              });
              return;
            }

            const validPersonalLaws = ["hindu", "muslim", "christian", "parsi", "other"];
            if (!validPersonalLaws.includes(personalLaw)) {
              res.status(400).json({
                success: false,
                error: `personalLaw must be one of: ${validPersonalLaws.join(", ")}.`,
              });
              return;
            }

            const userPrompt = buildSuccessionPrompt(req.body);

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
              }>(SYSTEM_PROMPT, userPrompt, SUCCESSION_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-family] Sarvam failed for generateSuccession, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  title: string;
                  content: string;
                  keyPoints: string[];
                  warnings: string[];
                }>(SYSTEM_PROMPT, userPrompt, SUCCESSION_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-family] Groq failed for generateSuccession, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${SUCCESSION_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-family", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 5: generateGuardian
          // ────────────────────────────────────────────────────────────────────
          case "generateGuardian": {
            const { petitionType, minorDetails, parentDetails, applicantDetails } = req.body;

            if (!petitionType || !minorDetails || !applicantDetails) {
              res.status(400).json({
                success: false,
                error: "petitionType, minorDetails, and applicantDetails are required for generateGuardian.",
              });
              return;
            }

            const validTypes = ["guardianship", "variation", "removal"];
            if (!validTypes.includes(petitionType)) {
              res.status(400).json({
                success: false,
                error: `petitionType must be one of: ${validTypes.join(", ")}.`,
              });
              return;
            }

            const userPrompt = buildGuardianPrompt(req.body);

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
              }>(SYSTEM_PROMPT, userPrompt, GUARDIAN_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-family] Sarvam failed for generateGuardian, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  title: string;
                  content: string;
                  keyPoints: string[];
                  warnings: string[];
                }>(SYSTEM_PROMPT, userPrompt, GUARDIAN_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-family] Groq failed for generateGuardian, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${GUARDIAN_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-family", undefined, 3000);

            data = stripMarkdownFromData(data);
            res.json({ success: true, data });
            break;
          }

          // ────────────────────────────────────────────────────────────────────
          // TASK 6: generateMaintenance
          // ────────────────────────────────────────────────────────────────────
          case "generateMaintenance": {
            const { actUnder, applicantDetails, respondentDetails, marriageDetails, grounds, amountClaimed } = req.body;

            if (!actUnder || !applicantDetails || !respondentDetails) {
              res.status(400).json({
                success: false,
                error: "actUnder, applicantDetails, and respondentDetails are required for generateMaintenance.",
              });
              return;
            }

            if (!["crpc125", "hama"].includes(actUnder)) {
              res.status(400).json({
                success: false,
                error: "actUnder must be 'crpc125' or 'hama'.",
              });
              return;
            }

            const userPrompt = buildMaintenancePrompt(req.body);

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
              }>(SYSTEM_PROMPT, userPrompt, MAINTENANCE_JSON_STRUCTURE, 0.3, "sarvam-105b");
            } catch (sarvamErr) {
              console.error("[ai-family] Sarvam failed for generateMaintenance, falling back to Groq:", sarvamErr?.message);
              try {
                data = await callGroqStructured<{
                  title: string;
                  content: string;
                  keyPoints: string[];
                  warnings: string[];
                }>(SYSTEM_PROMPT, userPrompt, MAINTENANCE_JSON_STRUCTURE, 0.3);
              } catch (groqErr) {
                console.error("[ai-family] Groq failed for generateMaintenance, falling back to Gemini:", groqErr?.message);
                const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${MAINTENANCE_JSON_STRUCTURE}`;
                const geminiResponse = await callGeminiText(geminiPrompt, userPrompt, 0.3);
                try { data = parseLLMJSON(geminiResponse); } catch (pe) {
                  throw new Error("Could not parse Gemini: " + pe?.message);
                }
              }
            }

            logUsage("ai-family", undefined, 3000);

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
              error: `Unknown task: "${task}". Valid tasks: generateDivorce, generateDOP, generateMVOP, generateSuccession, generateGuardian, generateMaintenance`,
            });
          }
        }
      } catch (error) {
        console.error("[ai-family] Error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to process family law drafting request",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
);
