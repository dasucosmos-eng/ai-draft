"use strict";
// Sarvam AI for Indian language processing
// Uses REST API at https://api.sarvam.ai/
// Features: translate, transliterate, sarvamChat
// NOTE: detect-language endpoint doesn't exist; use character-based detection instead
Object.defineProperty(exports, "__esModule", { value: true });
exports.translate = translate;
exports.transliterate = transliterate;
exports.detectLanguage = detectLanguage;
exports.sarvamChat = sarvamChat;
exports.sarvamHealthCheck = sarvamHealthCheck;
const SARVAM_API_URL = "https://api.sarvam.ai";
// Language code mapping: internal names → Sarvam API codes (xx-IN format)
const LANG_TO_SARVAM = {
    english: "en-IN",
    hindi: "hi-IN",
    tamil: "ta-IN",
    telugu: "te-IN",
    kannada: "kn-IN",
    malayalam: "ml-IN",
    bengali: "bn-IN",
    marathi: "mr-IN",
    urdu: "ur-IN",
    gujarati: "gu-IN",
    punjabi: "pa-IN",
    odia: "or-IN",
    assamese: "as-IN",
    // Also support direct xx-IN codes
    "en-IN": "en-IN",
    "hi-IN": "hi-IN",
    "ta-IN": "ta-IN",
    "te-IN": "te-IN",
    "kn-IN": "kn-IN",
    "ml-IN": "ml-IN",
    "bn-IN": "bn-IN",
    "mr-IN": "mr-IN",
    "ur-IN": "ur-IN",
    "gu-IN": "gu-IN",
    "pa-IN": "pa-IN",
    "or-IN": "or-IN",
    "as-IN": "as-IN",
    // Auto-detect
    auto: "auto",
};
// Reverse mapping: Sarvam xx-IN → internal name
const SARVAM_TO_LANG = {
    "en-IN": "english",
    "hi-IN": "hindi",
    "ta-IN": "tamil",
    "te-IN": "telugu",
    "kn-IN": "kannada",
    "ml-IN": "malayalam",
    "bn-IN": "bengali",
    "mr-IN": "marathi",
    "ur-IN": "urdu",
    "gu-IN": "gujarati",
    "pa-IN": "punjabi",
    "or-IN": "odia",
    "as-IN": "assamese",
};
// Unicode ranges for Indian language detection
const SCRIPT_RANGES = [
    { name: "tamil", start: 0x0B80, end: 0x0BFF },
    { name: "telugu", start: 0x0C00, end: 0x0C7F },
    { name: "kannada", start: 0x0C80, end: 0x0CFF },
    { name: "malayalam", start: 0x0D00, end: 0x0D7F },
    { name: "hindi", start: 0x0900, end: 0x097F },
    { name: "bengali", start: 0x0980, end: 0x09FF },
    { name: "gujarati", start: 0x0A80, end: 0x0AFF },
    { name: "oriya", start: 0x0B00, end: 0x0B7F },
    { name: "punjabi", start: 0x0A00, end: 0x0A7F },
    { name: "assamese", start: 0x0950, end: 0x097F }, // overlaps with Devanagari
    { name: "urdu", start: 0x0600, end: 0x06FF },
];
const SUPPORTED_LANGUAGES = [
    "hindi", "tamil", "telugu", "kannada", "malayalam", "bengali",
    "marathi", "urdu", "english", "gujarati", "punjabi", "odia", "assamese",
];
function getApiKey() {
    const apiKey = process.env.SARVAM_API_KEY;
    if (apiKey)
        return apiKey;
    // Fallback key — move to Firebase secrets for production
    const fallbackKey = "sk_4xhq6i5i_DwqndXJRof0qZa0sm1BOwhSD";
    console.warn("[sarvam] Using fallback API key (SARVAM_API_KEY env var not set)");
    return fallbackKey;
}
function getHeaders() {
    return {
        "Content-Type": "application/json",
        "api-subscription-key": getApiKey(),
    };
}
/**
 * Convert internal language name or xx-IN code to Sarvam API format
 */
function toSarvamCode(lang) {
    return LANG_TO_SARVAM[lang] || LANG_TO_SARVAM[lang.toLowerCase()] || "en-IN";
}
/**
 * Convert Sarvam xx-IN code to internal language name
 */
function fromSarvamCode(code) {
    return SARVAM_TO_LANG[code] || code;
}
/**
 * Translate text between Indian languages
 * @param text Source text
 * @param sourceLang Source language code (e.g., "english", "hi-IN")
 * @param targetLang Target language code (e.g., "telugu", "te-IN")
 * @returns Translated text
 */
async function translate(text, sourceLang, targetLang) {
    try {
        const srcCode = sourceLang === "auto" ? "auto" : toSarvamCode(sourceLang);
        const tgtCode = toSarvamCode(targetLang);
        const response = await fetch(`${SARVAM_API_URL}/translate`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                input: text,
                source_language_code: srcCode,
                target_language_code: tgtCode,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Sarvam translate error (${response.status}): ${errorText}`);
            throw new Error(`Sarvam translate API failed with status ${response.status}`);
        }
        const data = (await response.json());
        return data?.translated_text || data?.output || text;
    }
    catch (error) {
        console.error("Sarvam translate error:", error);
        throw error;
    }
}
/**
 * Transliterate text from one script to another (e.g., Hindi → Telugu script)
 * @param text Source text
 * @param sourceScript Source script code
 * @param targetScript Target script code
 * @returns Transliterated text
 */
async function transliterate(text, sourceScript, targetScript) {
    try {
        const response = await fetch(`${SARVAM_API_URL}/transliterate`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                input: text,
                source_language_code: toSarvamCode(sourceScript),
                target_language_code: toSarvamCode(targetScript),
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Sarvam transliterate error (${response.status}): ${errorText}`);
            throw new Error(`Sarvam transliterate API failed with status ${response.status}`);
        }
        const data = (await response.json());
        return data?.transliterated_text || data?.output || text;
    }
    catch (error) {
        console.error("Sarvam transliterate error:", error);
        throw error;
    }
}
/**
 * Detect the language of the given text using Unicode script analysis
 * (Sarvam doesn't have a standalone detect-language endpoint)
 * @param text Text to analyze
 * @returns Detected language with confidence
 */
async function detectLanguage(text) {
    // Count characters in each script range
    const scores = {};
    for (const char of text) {
        const code = char.codePointAt(0) || 0;
        for (const range of SCRIPT_RANGES) {
            if (code >= range.start && code <= range.end) {
                scores[range.name] = (scores[range.name] || 0) + 1;
            }
        }
    }
    // Find the dominant script
    let bestLang = "english"; // default
    let bestScore = 0;
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    for (const [lang, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            bestLang = lang;
        }
    }
    const confidence = total > 0 ? bestScore / total : 0;
    return {
        language: confidence > 0.3 ? bestLang : "english",
        confidence,
    };
}
/**
 * Multilingual chat using Sarvam AI
 * Uses the v1/chat/completions endpoint
 * @param messages Array of chat messages
 * @param language Optional language hint for response
 * @param modelOverride Optional model name override (default: "sarvam-105b")
 * @returns Chat response string
 */
async function sarvamChat(messages, language, modelOverride, temperatureOverride, maxTokensOverride) {
    try {
        let systemInstruction = "";
        const chatMessages = [];
        for (const msg of messages) {
            if (msg.role === "system") {
                systemInstruction = msg.content;
            }
            else {
                chatMessages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
        }
        const langHint = language
            ? ` You MUST respond in ${language} language.`
            : " You MUST respond in the same language as the user's message.";
        const body = {
            model: modelOverride || "sarvam-105b",
            messages: chatMessages,
            temperature: temperatureOverride !== undefined ? temperatureOverride : 0.7,
            max_tokens: maxTokensOverride || 4096,
        };
        if (systemInstruction) {
            body.messages = [
                { role: "system", content: systemInstruction + langHint },
                ...chatMessages,
            ];
        }
        const response = await fetch(`${SARVAM_API_URL}/v1/chat/completions`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Sarvam chat error (${response.status}): ${errorText}`);
            throw new Error(`Sarvam chat API failed with status ${response.status}`);
        }
        const data = (await response.json());
        const choices = data.choices;
        const firstChoice = choices?.[0];
        const message = firstChoice?.message;
        const finishReason = firstChoice?.finish_reason;
        // Reasoning models (sarvam-105b, sarvam-105b) may put content in reasoning_content
        const content = message?.content || "";
        if (content) {
            return content;
        }
        // Fallback: extract answer from reasoning_content if content is null
        const reasoningContent = message?.reasoning_content || "";
        if (reasoningContent) {
            if (finishReason === "stop") {
                // Model finished but content is still null — extract from reasoning tail
                console.warn("[sarvam] Model finished reasoning but content is null, using reasoning_content");
                return reasoningContent;
            }
            // Model hit token limit — still return what we have
            console.warn(`[sarvam] Token limit hit (${finishReason}), returning reasoning content as fallback`);
            return reasoningContent;
        }
        return "";
    }
    catch (error) {
        console.error("Sarvam sarvamChat error:", error);
        throw error;
    }
}
// Health check for Sarvam provider — use translate as the test
async function sarvamHealthCheck() {
    try {
        const apiKey = process.env.SARVAM_API_KEY;
        if (!apiKey)
            return false;
        const response = await fetch(`${SARVAM_API_URL}/translate`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                input: "hello",
                source_language_code: "en-IN",
                target_language_code: "hi-IN",
            }),
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
