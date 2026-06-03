// @ts-nocheck
// Tesseract OCR for extracting text from scanned documents/images
// Uses tesseract.js (already installed)
// Default languages: Indian + English

import Tesseract from "tesseract.js";

// Default languages: English + major Indian languages
const DEFAULT_LANGUAGES = "eng+hin+tam+tel+kan+ben+mar+urd";

interface OcrResult {
  text: string;
  confidence: number;
  detectedLanguage: string;
}

/**
 * Extract text from a raw image buffer using Tesseract OCR
 * @param imageBuffer Raw image buffer (PNG, JPEG, TIFF, etc.)
 * @param languages Optional language codes (e.g., 'eng+hin+tam'). Defaults to Indian + English.
 * @returns Extracted text string
 */
export async function extractTextFromBuffer(
  imageBuffer: Buffer,
  languages?: string
): Promise<string> {
  try {
    const langs = languages || DEFAULT_LANGUAGES;
    const result = await Tesseract.recognize(imageBuffer, langs, {
      logger: (m: { status?: string }) => {
        // Suppress verbose logging; can enable for debugging
        if (m.status === "recognizing text") {
          // Progress tracking available here if needed
        }
      },
    });
    return result.data.text || "";
  } catch (error) {
    console.error("OCR extractTextFromBuffer error:", error);
    throw new Error("Failed to extract text from image buffer");
  }
}

/**
 * Extract text from a base64-encoded image using Tesseract OCR
 * @param base64Data Base64-encoded image data (without data URI prefix)
 * @param mimeType MIME type of the image (e.g., 'image/png', 'image/jpeg')
 * @param languages Optional language codes. Defaults to Indian + English.
 * @returns Extracted text string
 */
export async function extractTextFromBase64(
  base64Data: string,
  mimeType: string,
  languages?: string
): Promise<string> {
  try {
    const langs = languages || DEFAULT_LANGUAGES;

    // Strip data URI prefix if present
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");

    const result = await Tesseract.recognize(
      `data:${mimeType};base64,${cleanBase64}`,
      langs,
      {
        logger: () => {},
      }
    );

    return result.data.text || "";
  } catch (error) {
    console.error("OCR extractTextFromBase64 error:", error);
    throw new Error("Failed to extract text from base64 image");
  }
}

/**
 * Detect the primary language of an image and return OCR result with confidence
 * @param imageBuffer Raw image buffer
 * @param languages Optional language codes. Defaults to Indian + English.
 * @returns Object with detected language, confidence, and extracted text
 */
export async function detectLanguage(
  imageBuffer: Buffer,
  languages?: string
): Promise<OcrResult> {
  try {
    const langs = languages || DEFAULT_LANGUAGES;
    const result = await Tesseract.recognize(imageBuffer, langs, {
      logger: () => {},
    });

    const data = result.data;

    // Extract the dominant language from Tesseract's language detection
    const detectedLang = extractDominantLanguage(data, langs);

    return {
      text: data.text || "",
      confidence: data.confidence || 0,
      detectedLanguage: detectedLang,
    };
  } catch (error) {
    console.error("OCR detectLanguage error:", error);
    return {
      text: "",
      confidence: 0,
      detectedLanguage: "unknown",
    };
  }
}

/**
 * Full OCR extraction with detailed result including language and confidence
 * @param imageBuffer Raw image buffer
 * @param mimeType MIME type hint
 * @param languages Optional language codes
 * @returns Complete OCR result
 */
export async function performFullOcr(
  imageBuffer: Buffer,
  mimeType?: string,
  languages?: string
): Promise<OcrResult> {
  return detectLanguage(imageBuffer, languages);
}

// --- Internal helpers ---

// Map Tesseract language codes to human-readable names
const LANG_CODE_MAP: Record<string, string> = {
  eng: "english",
  hin: "hindi",
  tam: "tamil",
  tel: "telugu",
  kan: "kannada",
  ben: "bengali",
  mar: "marathi",
  urd: "urdu",
  mal: "malayalam",
  guj: "gujarati",
  pan: "punjabi",
  ori: "odia",
  asm: "assamese",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDominantLanguage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  requestedLangs: string
): string {
  // Check Tesseract's language data if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const langs: Array<{ lang?: string }> = data?.languages || [];
  if (langs.length > 0) {
    const topLang = langs[0];
    const code = topLang.lang?.split("-")[0] || "";
    return LANG_CODE_MAP[code] || code || "unknown";
  }

  // Fallback: return the first requested language
  const firstLang = requestedLangs.split("+")[0]?.split("-")[0] || "eng";
  return LANG_CODE_MAP[firstLang] || firstLang;
}

// Health check for Tesseract OCR
export async function ocrHealthCheck(): Promise<boolean> {
  try {
    // Just check that Tesseract module loaded correctly
    // Don't run actual OCR in health check (too slow in cloud environment)
    return typeof Tesseract?.recognize === "function";
  } catch {
    return false;
  }
}
