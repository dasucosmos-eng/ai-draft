"use strict";
// secrets.ts — Firebase Cloud Functions secrets configuration
// This file is gitignored and contains secret names referenced in cloud functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_CLIENT_SECRET = exports.GOOGLE_CLIENT_ID = exports.aiFunctionSecrets = void 0;
exports.aiFunctionSecrets = [
    "GEMINI_API_KEY",
    "SARVAM_API_KEY",
    "GROQ_API_KEY",
    "ALLOWED_ORIGINS",
    "INDIAN_KANOON_API_KEY",
    "GOOGLE_CSE_ID",
];
// Google OAuth secrets (for custom auth)
exports.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
exports.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
