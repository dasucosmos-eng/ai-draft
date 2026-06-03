// secrets.ts — Firebase Cloud Functions secrets configuration
// This file is gitignored and contains secret names referenced in cloud functions

export const aiFunctionSecrets: string[] = [
  "GEMINI_API_KEY",
  "SARVAM_API_KEY",
  "GROQ_API_KEY",
  "ALLOWED_ORIGINS",
  "INDIAN_KANOON_API_KEY",
  "GOOGLE_CSE_ID",
];

// Google OAuth secrets (for custom auth)
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
