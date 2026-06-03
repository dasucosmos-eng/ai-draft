"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiAiExecution = void 0;
// @ts-nocheck
const parse_json_1 = require("./parse-json");
const secrets_1 = require("./secrets");
// ai-execution — Firebase Cloud Function
// AI-powered execution module for Indian legal proceedings under CPC
// Generates Execution Petitions, Execution Applications, schedules, and calculations
// Uses Sarvam AI (primary, sarvam-105b) with Groq fallback
// Returns: { success, data: { ... } } — structure varies by task
const v2_1 = require("firebase-functions/v2");
const cors_1 = require("./cors");
const sarvam_client_1 = require("./sarvam-client");
const groq_client_1 = require("./groq-client");
const gemini_client_1 = require("./gemini-client");
const corsHandler = cors_1.restrictedCors;
// ─── System Prompt ───
const SYSTEM_PROMPT = `You are an expert Indian legal document drafter specializing in execution proceedings under the Code of Civil Procedure, 1908 (CPC). You draft precise, court-ready execution petitions (Order 21 Rule 11), execution applications, interlocutory applications for property attachment, salary attachment, civil arrest (Order 21 Rule 37-41), garnishee orders, and supporting schedules.

Key legal provisions:
- Order 21 Rule 11: Execution Petition
- Order 21 Rule 37-41: Civil Arrest
- Order 21 Rule 64-67: Attachment of Property
- Order 21 Rule 68-72: Attachment of Salary
- Section 125 CrPC: Maintenance execution
- Limitation: Article 136 Limitation Act (12 years for execution of decree)

Document drafting rules:
- Use proper format with cause title, heading, body paragraphs, prayer, verification
- Include relevant CPC order and rule numbers
- Reference the decree being executed
- Include decretal amount with interest calculation
- Include memorandum of calculation as annexure
- Use standard Indian court format (district court / high court)
- Include schedule of properties/assets where applicable
- For civil arrest: include specific factual allegations of judgment-debtor's conduct
- For attachment: include schedule and valuation`;
// ─── JSON Structures for each task ───
const EP_JSON_STRUCTURE = `{
  "title": "Short title of the document (e.g., 'Execution Petition under Order 21 Rule 11 CPC')",
  "content": "Full execution petition text in PLAIN TEXT format (NO markdown). Use ALL CAPS for headings (##, ###), cause title, body paragraphs detailing the decree, decretal amount, interest, modes of execution sought, prayer clause, and verification. Make it court-ready with accurate CPC references.",
  "keyPoints": ["Key legal point 1", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer 1", "Important warning 2"],
  "memoOfCalculation": "Detailed memorandum of calculation showing principal, interest accrued, costs, total amount, and any amounts already paid/received. Format as a clear breakdown in markdown."
}`;
const EA_JSON_STRUCTURE = `{
  "title": "Short title of the execution application (e.g., 'IA for Attachment of Property under Order 21 Rule 64 CPC')",
  "content": "Full execution application text in PLAIN TEXT format (NO markdown). Use ALL CAPS for headings (##, ###), cause title, grounds, factual allegations, prayer clause, and verification. Make it court-ready with accurate CPC references. Include asset details, valuation, and mode-specific legal requirements.",
  "keyPoints": ["Key legal point 1", "Key legal point 2", "Key legal point 3"],
  "warnings": ["Important warning or disclaimer 1", "Important warning 2"]
}`;
const SCHEDULE_JSON_STRUCTURE = `{
  "schedule": "Complete property/assets schedule in markdown table or structured format. Include item number, type of asset, description, location/address, estimated market value, and encumbrance if any. Also include a summary of total value.",
  "memoOfCalculation": "Detailed memorandum of calculation in markdown format showing: (1) Decretal amount, (2) Interest rate and period, (3) Interest calculation (year-wise or period-wise), (4) Court costs awarded, (5) Total amount, (6) Amount already paid/received, (7) Balance payable. Format with clear headings and line items."
}`;
const PARSE_JSON_STRUCTURE = `{
  "decreeDate": "Date of decree in DD/MM/YYYY format",
  "decreeType": "Type of decree (e.g., 'Money Decree', 'Injunction Decree', 'Specific Performance Decree', 'Possession Decree', 'Declaratory Decree')",
  "decreeAmount": "Principal decretal amount as number, or null if not a money decree",
  "interestRate": "Rate of interest per annum as number (e.g., 6, 9, 12, 18), or null if no interest",
  "interestFrom": "Date from which interest starts in DD/MM/YYYY format, or null",
  "interestTo": "Date till which interest is to be calculated (usually 'till realization'), or null",
  "costs": "Court costs awarded as number, or null if no costs",
  "parties": {
    "plaintiff": "Name(s) of the plaintiff(s)/decree-holder(s)",
    "defendant": "Name(s) of the defendant(s)/judgment-debtor(s)"
  },
  "operativePortion": "The operative portion of the decree summarizing what the court ordered",
  "courtName": "Name of the court that passed the decree"
}`;
const LIMITATION_JSON_STRUCTURE = `{
  "limitationYears": "Number of years for limitation period as number",
  "lastDate": "Last date for filing execution in DD/MM/YYYY format",
  "daysRemaining": "Number of days remaining from today, or negative number if expired",
  "isExpired": true or false,
  "warnings": ["Warning about approaching deadline", "Advice on condonation if expired", "Reference to relevant Article of Limitation Act"]
}`;
// ─── Prompt builders for each task ───
function buildEPPrompt(decreeDetails, executionDetails, courtFormat) {
    const lines = [];
    lines.push(`Draft an Execution Petition under Order 21 Rule 11 CPC with the following details:`);
    lines.push(``);
    lines.push(`**Decree Details:**`);
    lines.push(`- Case Number: ${decreeDetails.caseNumber || "Not specified"}`);
    lines.push(`- Court: ${decreeDetails.courtName || "Not specified"}`);
    lines.push(`- Parties: ${decreeDetails.parties || "Not specified"}`);
    lines.push(`- Decree Date: ${decreeDetails.decreeDate || "Not specified"}`);
    lines.push(`- Decree Type: ${decreeDetails.decreeType || "Not specified"}`);
    lines.push(`- Decree Amount: ₹${decreeDetails.decreeAmount || "0"}`);
    lines.push(`- Interest Rate: ${decreeDetails.interestRate || "N/A"}% per annum`);
    lines.push(`- Interest From: ${decreeDetails.interestFrom || "N/A"}`);
    lines.push(`- Interest To: ${decreeDetails.interestTo || "N/A"}`);
    lines.push(`- Costs: ₹${decreeDetails.costs || "0"}`);
    lines.push(``);
    lines.push(`**Execution Details:**`);
    lines.push(`- Mode(s) of Execution: ${(executionDetails.modes || []).join(", ") || "Not specified"}`);
    lines.push(`- Filed On: ${executionDetails.filedOn || "Not specified"}`);
    lines.push(`- Amount Paid: ₹${executionDetails.amountPaid || "0"}`);
    lines.push(`- Pending Amount: ₹${executionDetails.pendingAmount || "Not specified"}`);
    lines.push(`- Execution Court: ${executionDetails.executionCourt || "Not specified"}`);
    if (executionDetails.condonationReason) {
        lines.push(`- Condonation of Delay Reason: ${executionDetails.condonationReason}`);
    }
    if (courtFormat) {
        lines.push(`- Court Format: ${courtFormat}`);
    }
    lines.push(``);
    lines.push(`Draft a complete, court-ready Execution Petition. Include cause title with parties, detailed body referencing the decree, modes of execution sought, memorandum of calculation as annexure, prayer clause, and verification. Format for ${courtFormat || "District Court"}.`);
    return lines.join("\n");
}
function buildEAPrompt(decreeDetails, mode, assetDetails, courtFormat) {
    const lines = [];
    const modeDescriptions = {
        property_attachment: "Attachment of Property under Order 21 Rule 64-67 CPC",
        salary_attachment: "Attachment of Salary under Order 21 Rule 68-72 CPC",
        civil_arrest: "Civil Arrest of the Judgment-Debtor under Order 21 Rule 37-41 CPC",
        garnishee: "Garnishee Order under Order 21 Rule 72A CPC",
    };
    lines.push(`Draft an Interlocutory Application for ${modeDescriptions[mode] || mode} with the following details:`);
    lines.push(``);
    lines.push(`**Decree Details:**`);
    lines.push(`- Case Number: ${decreeDetails.caseNumber || "Not specified"}`);
    lines.push(`- Court: ${decreeDetails.courtName || "Not specified"}`);
    lines.push(`- Parties: ${decreeDetails.parties || "Not specified"}`);
    lines.push(`- Decree Date: ${decreeDetails.decreeDate || "Not specified"}`);
    lines.push(`- Decree Type: ${decreeDetails.decreeType || "Not specified"}`);
    lines.push(`- Decree Amount: ₹${decreeDetails.decreeAmount || "0"}`);
    lines.push(`- Interest Rate: ${decreeDetails.interestRate || "N/A"}% per annum`);
    lines.push(``);
    if (assetDetails) {
        lines.push(`**Asset Details:**`);
        lines.push(`- Type: ${assetDetails.type || "Not specified"}`);
        lines.push(`- Description: ${assetDetails.description || "Not specified"}`);
        lines.push(`- Estimated Value: ₹${assetDetails.valueEstimate || "Not specified"}`);
        lines.push(`- Address: ${assetDetails.address || "Not specified"}`);
        if (assetDetails.employerName) {
            lines.push(`- Employer Name: ${assetDetails.employerName}`);
        }
        if (assetDetails.bankName) {
            lines.push(`- Bank Name: ${assetDetails.bankName}`);
        }
        if (assetDetails.accountNumber) {
            lines.push(`- Account Number: ${assetDetails.accountNumber}`);
        }
        lines.push(``);
    }
    if (courtFormat) {
        lines.push(`- Court Format: ${courtFormat}`);
        lines.push(``);
    }
    if (mode === "civil_arrest") {
        lines.push(`For civil arrest, include specific factual allegations about the judgment-debtor's conduct showing willful disobedience or refusal to comply with the decree. Include affidavit requirements and conditions for arrest under Order 21 Rule 37-41.`);
    }
    else if (mode === "property_attachment") {
        lines.push(`For property attachment, include a schedule of the property to be attached, its description, location, and estimated value. Reference Order 21 Rule 64-67 and include prohibitory order requirements.`);
    }
    else if (mode === "salary_attachment") {
        lines.push(`For salary attachment, include the employer's details, judgment-debtor's employment information, amount to be attached (not exceeding prescribed limits), and provisions for the judgment-debtor's maintenance. Reference Order 21 Rule 68-72.`);
    }
    else if (mode === "garnishee") {
        lines.push(`For garnishee order, include the garnishee's (bank/third party) details, judgment-debtor's account/holdings with the garnishee, and the amount to be attached. Reference Order 21 Rule 72A.`);
    }
    lines.push(``);
    lines.push(`Draft a complete, court-ready application with cause title, grounds, factual allegations, prayer clause, and verification. Format for ${courtFormat || "District Court"}.`);
    return lines.join("\n");
}
function buildSchedulePrompt(decreeDetails, assets, interestToDate) {
    const lines = [];
    lines.push(`Generate a property/assets schedule and memorandum of calculation for an execution proceeding:`);
    lines.push(``);
    lines.push(`**Decree Details:**`);
    lines.push(`- Case Number: ${decreeDetails.caseNumber || "Not specified"}`);
    lines.push(`- Court: ${decreeDetails.courtName || "Not specified"}`);
    lines.push(`- Parties: ${decreeDetails.parties || "Not specified"}`);
    lines.push(`- Decree Date: ${decreeDetails.decreeDate || "Not specified"}`);
    lines.push(`- Decree Type: ${decreeDetails.decreeType || "Not specified"}`);
    lines.push(`- Decree Amount: ₹${decreeDetails.decreeAmount || "0"}`);
    lines.push(`- Interest Rate: ${decreeDetails.interestRate || "N/A"}% per annum`);
    lines.push(`- Interest From: ${decreeDetails.interestFrom || "N/A"}`);
    lines.push(`- Interest To: ${decreeDetails.interestTo || "Till realization"}`);
    lines.push(`- Costs: ₹${decreeDetails.costs || "0"}`);
    if (interestToDate !== undefined && interestToDate !== null) {
        lines.push(`- Interest To Date (calculated): ₹${interestToDate}`);
    }
    lines.push(``);
    if (assets && assets.length > 0) {
        lines.push(`**Assets/Properties for Schedule:**`);
        assets.forEach((asset, index) => {
            lines.push(`${index + 1}. Type: ${asset.type || "N/A"} | Description: ${asset.description || "N/A"} | Value: ₹${asset.valueEstimate || "N/A"} | Address: ${asset.address || "N/A"}`);
        });
        lines.push(``);
    }
    lines.push(`Generate a comprehensive schedule of properties/assets in a clear table format and a detailed memorandum of calculation showing principal, interest (calculated year-wise or period-wise), costs, and total amount payable. Include all relevant dates and legal references.`);
    return lines.join("\n");
}
function buildParsePrompt(decreeText) {
    return `Parse the following decree document text and extract all structured information. Be precise with dates, amounts, party names, and the operative portion of the decree.

**Decree Document Text:**
${decreeText}

Extract all information accurately. If any field cannot be determined from the text, use null. Pay special attention to the operative portion which contains the court's actual orders.`;
}
function buildLimitationPrompt(decreeDate, decreeType, customPeriod) {
    const lines = [];
    lines.push(`Calculate the execution limitation period for the following decree:`);
    lines.push(``);
    lines.push(`- Decree Date: ${decreeDate}`);
    lines.push(`- Decree Type: ${decreeType}`);
    if (customPeriod) {
        lines.push(`- Custom Limitation Period (if applicable): ${customPeriod} years`);
    }
    lines.push(``);
    lines.push(`Calculate based on the Limitation Act, 1963. Consider Article 136 (12 years for execution of a decree) as the default, but adjust for specific decree types if applicable (e.g., shorter periods for certain orders).`);
    lines.push(``);
    lines.push(`Provide: (1) the applicable limitation period in years, (2) the last date for filing execution, (3) days remaining from today, (4) whether the limitation has expired, and (5) any relevant warnings about condonation of delay or special provisions.`);
    return lines.join("\n");
}
// ─── Main Cloud Function ───
exports.apiAiExecution = v2_1.https.onRequest({
    timeoutSeconds: 180,
    region: "us-central1", secrets: secrets_1.aiFunctionSecrets,
}, async (req, res) => {
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
                    error: "task is required. Valid tasks: generateEP, generateEA, generateSchedule, parseDecree, calculateLimitation",
                });
                return;
            }
            console.log(`[ai-execution] Task: ${task}`);
            switch (task) {
                // ─── Task 1: Generate Execution Petition ───
                case "generateEP": {
                    const { decreeDetails, executionDetails, courtFormat } = req.body;
                    if (!decreeDetails || !executionDetails) {
                        res.status(400).json({
                            success: false,
                            error: "decreeDetails and executionDetails are required for generateEP.",
                        });
                        return;
                    }
                    const userPrompt = buildEPPrompt(decreeDetails, executionDetails, courtFormat);
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, EP_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-execution] Sarvam failed for generateEP, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, EP_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-execution] Groq failed for generateEP, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${EP_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-execution", undefined, 3000);
                    res.json({
                        success: true,
                        data,
                    });
                    return;
                }
                // ─── Task 2: Generate Execution Application ───
                case "generateEA": {
                    const { decreeDetails, mode, assetDetails, courtFormat } = req.body;
                    const validModes = ["property_attachment", "salary_attachment", "civil_arrest", "garnishee"];
                    if (!decreeDetails || !mode) {
                        res.status(400).json({
                            success: false,
                            error: "decreeDetails and mode are required for generateEA.",
                        });
                        return;
                    }
                    if (!validModes.includes(mode)) {
                        res.status(400).json({
                            success: false,
                            error: `Invalid mode "${mode}". Valid modes: ${validModes.join(", ")}`,
                        });
                        return;
                    }
                    const userPrompt = buildEAPrompt(decreeDetails, mode, assetDetails, courtFormat);
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, EA_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-execution] Sarvam failed for generateEA, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, EA_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-execution] Groq failed for generateEA, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${EA_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-execution", undefined, 3000);
                    res.json({
                        success: true,
                        data,
                    });
                    return;
                }
                // ─── Task 3: Generate Schedule & Memo of Calculation ───
                case "generateSchedule": {
                    const { decreeDetails, assets, interestToDate } = req.body;
                    if (!decreeDetails) {
                        res.status(400).json({
                            success: false,
                            error: "decreeDetails is required for generateSchedule.",
                        });
                        return;
                    }
                    const userPrompt = buildSchedulePrompt(decreeDetails, assets || [], interestToDate);
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, SCHEDULE_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-execution] Sarvam failed for generateSchedule, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, SCHEDULE_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-execution] Groq failed for generateSchedule, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${SCHEDULE_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-execution", undefined, 3000);
                    res.json({
                        success: true,
                        data,
                    });
                    return;
                }
                // ─── Task 4: Parse Decree ───
                case "parseDecree": {
                    const { decreeText } = req.body;
                    if (!decreeText?.trim()) {
                        res.status(400).json({
                            success: false,
                            error: "decreeText is required for parseDecree.",
                        });
                        return;
                    }
                    const userPrompt = buildParsePrompt(decreeText);
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, PARSE_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-execution] Sarvam failed for parseDecree, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, PARSE_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-execution] Groq failed for parseDecree, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${PARSE_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-execution", undefined, 3000);
                    res.json({
                        success: true,
                        data,
                    });
                    return;
                }
                // ─── Task 5: Calculate Limitation Period ───
                case "calculateLimitation": {
                    const { decreeDate, decreeType, customPeriod } = req.body;
                    if (!decreeDate || !decreeType) {
                        res.status(400).json({
                            success: false,
                            error: "decreeDate and decreeType are required for calculateLimitation.",
                        });
                        return;
                    }
                    const userPrompt = buildLimitationPrompt(decreeDate, decreeType, customPeriod);
                    let data;
                    try {
                        data = await (0, sarvam_client_1.callSarvamStructured)(SYSTEM_PROMPT, userPrompt, LIMITATION_JSON_STRUCTURE, 0.3, "sarvam-105b");
                    }
                    catch (sarvamErr) {
                        console.error("[ai-execution] Sarvam failed for calculateLimitation, falling back to Groq:", sarvamErr?.message);
                        try {
                            data = await (0, groq_client_1.callGroqStructured)(SYSTEM_PROMPT, userPrompt, LIMITATION_JSON_STRUCTURE, 0.3);
                        }
                        catch (groqErr) {
                            console.error("[ai-execution] Groq failed for calculateLimitation, falling back to Gemini:", groqErr?.message);
                            const geminiPrompt = `${SYSTEM_PROMPT}\n\nCRITICAL: Respond ONLY with valid JSON:\n${LIMITATION_JSON_STRUCTURE}`;
                            const geminiResponse = await (0, gemini_client_1.callGeminiText)(geminiPrompt, userPrompt, 0.3);
                            try {
                                data = (0, parse_json_1.parseLLMJSON)(geminiResponse);
                            }
                            catch (pe) {
                                throw new Error("Could not parse Gemini: " + pe?.message);
                            }
                        }
                    }
                    (0, groq_client_1.logUsage)("ai-execution", undefined, 3000);
                    res.json({
                        success: true,
                        data,
                    });
                    return;
                }
                // ─── Unknown task ───
                default: {
                    res.status(400).json({
                        success: false,
                        error: `Unknown task "${task}". Valid tasks: generateEP, generateEA, generateSchedule, parseDecree, calculateLimitation`,
                    });
                    return;
                }
            }
        }
        catch (error) {
            console.error("[ai-execution] Error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to process execution request. Please try again.",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });
});
