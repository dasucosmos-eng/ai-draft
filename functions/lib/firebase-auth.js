"use strict";
// firebase-auth.ts — Firebase Authentication Functions
// Migrated from custom JWT auth to native Firebase Authentication
//
// Frontend now uses Firebase Client SDK for sign-in (Google popup, Email/Password, Phone OTP).
// Backend only needs to verify Firebase ID tokens and provide utility endpoints.
//
// Authentication flow:
// 1. Client signs in via Firebase Client SDK → gets Firebase User
// 2. Client calls user.getIdToken() → gets Firebase ID token
// 3. Client sends ID token in Authorization: Bearer <token> header to API
// 4. Backend verifies via admin.auth().verifyIdToken()
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
exports.authPhoneVerify = exports.authPhoneSend = exports.authEmailSignin = exports.authEmailSignup = exports.authGoogleCallback = exports.authGoogleUrl = exports.authGoogle = exports.authVerify = void 0;
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const cors_1 = require("./cors");
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const corsHandler = cors_1.restrictedCors;
// ─── Auth Verify (verify Firebase ID token) ────────────────────
// Replaces old JWT decode — now verifies Firebase ID tokens
// Used by frontend to validate/refresh tokens on app load
exports.authVerify = v2_1.https.onRequest({ timeoutSeconds: 15, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        try {
            const { token } = req.body;
            // Try to get token from body first, then from Authorization header
            const idToken = token || (req.headers.authorization || "").replace("Bearer ", "");
            if (!idToken) {
                res.status(401).json({ error: "Token is required" });
                return;
            }
            const decoded = await admin.auth().verifyIdToken(idToken);
            const signInProvider = decoded.firebase?.sign_in_provider || "unknown";
            const user = {
                uid: decoded.uid,
                email: decoded.email || null,
                displayName: decoded.name || decoded.displayName || null,
                phoneNumber: decoded.phone_number || null,
                photoURL: decoded.picture || decoded.photoURL || null,
                provider: signInProvider,
            };
            res.json({ success: true, user });
        }
        catch (error) {
            console.error("[auth-verify] Error:", error?.message);
            res.status(401).json({ error: "Invalid or expired token" });
        }
    });
});
// ─── Google Sign-In (ID Token verification helper) ───────────
// Accepts a Google ID token, verifies it, and returns user info
// The actual Google popup sign-in happens on the client via Firebase SDK
// This endpoint is kept for backward compatibility with older clients
exports.authGoogle = v2_1.https.onRequest({ timeoutSeconds: 30, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        try {
            const body = req.body;
            if (!body.idToken) {
                res.status(400).json({ error: "Google ID token is required" });
                return;
            }
            // Verify the Google ID token via Firebase Admin
            // This handles the Google credential → Firebase Auth user mapping
            const decoded = await admin.auth().verifyIdToken(body.idToken);
            const user = {
                uid: decoded.uid,
                email: decoded.email || null,
                displayName: decoded.name || decoded.displayName || null,
                phoneNumber: decoded.phone_number || null,
                photoURL: decoded.picture || decoded.photoURL || null,
                provider: decoded.firebase?.sign_in_provider || "google.com",
            };
            console.log(`[auth-google] User verified: ${user.uid} (${user.email})`);
            res.json({ success: true, user });
        }
        catch (error) {
            console.error("[auth-google] Error:", error?.message);
            res.status(401).json({ error: "Google sign-in verification failed" });
        }
    });
});
// ─── Google OAuth Redirect (deprecated — kept for backward compat) ──
// New clients should use Firebase popup sign-in (signInWithPopup)
// This redirects to the main page with a message
exports.authGoogleUrl = v2_1.https.onRequest({ timeoutSeconds: 10, region: "us-central1" }, async (req, res) => {
    res.redirect("https://aidraft.bond/?auth_method=google_popup");
});
exports.authGoogleCallback = v2_1.https.onRequest({ timeoutSeconds: 10, region: "us-central1" }, async (req, res) => {
    res.redirect("https://aidraft.bond/?auth_method=google_popup");
});
// ─── Email/Password Signup (deprecated — kept for backward compat) ──
// New clients use Firebase Client SDK: createUserWithEmailAndPassword()
// This endpoint now creates the user via Firebase Admin Auth if needed
exports.authEmailSignup = v2_1.https.onRequest({ timeoutSeconds: 30, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        try {
            const { email, password, displayName } = req.body;
            if (!email || !password) {
                res.status(400).json({ error: "Email and password are required" });
                return;
            }
            if (password.length < 6) {
                res.status(400).json({ error: "Password must be at least 6 characters" });
                return;
            }
            // Create user via Firebase Admin Auth
            const userRecord = await admin.auth().createUser({
                email,
                password,
                displayName: displayName || undefined,
                emailVerified: false,
            });
            const user = {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName || null,
                phoneNumber: userRecord.phoneNumber || null,
                photoURL: userRecord.photoURL || null,
                provider: "password",
            };
            console.log(`[auth-email-signup] User created: ${userRecord.uid} (${email})`);
            res.json({ success: true, user });
        }
        catch (error) {
            console.error("[auth-email-signup] Error:", error?.message);
            if (error?.code === "auth/email-already-exists") {
                res.status(409).json({ error: "An account with this email already exists" });
                return;
            }
            res.status(500).json({ error: "Account creation failed" });
        }
    });
});
// ─── Email/Password Sign-In (deprecated — kept for backward compat) ──
// New clients use Firebase Client SDK: signInWithEmailAndPassword()
// This endpoint verifies credentials via Firebase Admin Auth
exports.authEmailSignin = v2_1.https.onRequest({ timeoutSeconds: 30, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(400).json({ error: "Email and password are required" });
                return;
            }
            // Firebase Admin SDK doesn't have a direct signIn method for email/password.
            // Email/password auth should be handled by the Firebase Client SDK.
            // This endpoint is provided for backward compatibility only.
            // It returns instructions to use the client SDK.
            res.json({
                success: false,
                error: "Email/password sign-in is now handled client-side via Firebase Auth SDK. Please use signInWithEmailAndPassword() on the client.",
                hint: "Use Firebase Client SDK: signInWithEmailAndPassword(auth, email, password)",
            });
        }
        catch (error) {
            console.error("[auth-email-signin] Error:", error?.message);
            res.status(500).json({ error: "Sign-in failed" });
        }
    });
});
// ─── Phone OTP: Send (deprecated — kept for backward compat) ──
// New clients use Firebase Client SDK: signInWithPhoneNumber()
// Firebase handles OTP delivery and verification natively
exports.authPhoneSend = v2_1.https.onRequest({ timeoutSeconds: 30, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        res.json({
            success: false,
            error: "Phone sign-in is now handled client-side via Firebase Auth SDK with reCAPTCHA verification. Please use signInWithPhoneNumber() on the client.",
            hint: "Use Firebase Client SDK: signInWithPhoneNumber(auth, phoneNumber, appVerifier)",
        });
    });
});
// ─── Phone OTP: Verify (deprecated — kept for backward compat) ──
exports.authPhoneVerify = v2_1.https.onRequest({ timeoutSeconds: 30, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        res.json({
            success: false,
            error: "Phone sign-in is now handled client-side via Firebase Auth SDK. Please use confirmationResult.confirm(otp) on the client.",
            hint: "Use Firebase Client SDK: confirmationResult.confirm(otp)",
        });
    });
});
