"use strict";
// custom-auth.ts — Custom Auth Functions
// v2.1 — Fixed OAuth credentials injection
// Handles: Google OAuth (server-side redirect flow), Email/Password, Phone OTP
// JWT-first: user info stored in JWT token, Firestore writes are best-effort (non-blocking)
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authVerify = exports.authPhoneVerify = exports.authPhoneSend = exports.authEmailSignin = exports.authEmailSignup = exports.authGoogle = exports.authGoogleCallback = exports.authGoogleUrl = void 0;
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const cors_1 = require("./cors");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const secrets_1 = require("./secrets");
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const corsHandler = cors_1.restrictedCors;
// Lazy-init Firestore — only connect if/when needed (avoids NOT_FOUND on projects without Firestore)
let _db = null;
function getDb() {
    try {
        if (!_db)
            _db = admin.firestore();
        return _db;
    }
    catch {
        return null;
    }
}
// JWT Secret (rotate in production via secret manager)
const JWT_SECRET = process.env.JWT_SECRET || "aidraft-auth-secret-2026";
const JWT_EXPIRES_IN = "7d";
// ─── Google OAuth Config ──────────────────────────────────────
const GOOGLE_CLIENT_ID_RUNTIME = process.env.GOOGLE_CLIENT_ID || secrets_1.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET_RUNTIME = process.env.GOOGLE_CLIENT_SECRET || secrets_1.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = "https://aidraft.bond/api/auth-google-callback";
// ─── JWT Helpers ─────────────────────────────────────────────
function generateToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function decodeToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
// ─── Firestore Best-Effort Writer ─────────────────────────────
// Writes user to Firestore in the background — NEVER blocks auth flow
function saveUserToFirestore(user) {
    const db = getDb();
    if (!db) {
        console.log(`[saveUserToFirestore] Firestore not available, skipping save for ${user.uid}`);
        return;
    }
    db.collection("users").doc(user.uid).set({
        ...user,
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).catch((err) => {
        console.warn(`[saveUserToFirestore] Failed to save ${user.uid}:`, err?.message);
    });
}
// ─── Google OAuth: Generate Auth URL ───────────────────────────
exports.authGoogleUrl = v2_1.https.onRequest({ timeoutSeconds: 10, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        try {
            const state = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
            const url = [
                "https://accounts.google.com/o/oauth2/v2/auth",
                `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID_RUNTIME)}`,
                `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}`,
                "&response_type=code",
                "&scope=email%20profile",
                "&access_type=offline",
                "&prompt=consent",
                `&state=${state}`,
            ].join("");
            console.log("[auth-google-url] Redirecting to Google OAuth");
            res.redirect(url);
        }
        catch (error) {
            console.error("[auth-google-url] Error:", error?.message);
            res.status(500).json({ error: "Failed to generate Google OAuth URL" });
        }
    });
});
// ─── Google OAuth: Callback ────────────────────────────────────
exports.authGoogleCallback = v2_1.https.onRequest({ timeoutSeconds: 30, region: "us-central1" }, async (req, res) => {
    const { code, state, error: oauthError } = req.query;
    if (oauthError) {
        console.error("[auth-google-callback] OAuth error:", oauthError, req.query.error_description);
        const desc = req.query.error_description || oauthError;
        res.redirect(`https://aidraft.bond/?error=${encodeURIComponent(oauthError)}&error_detail=${encodeURIComponent(String(desc))}`);
        return;
    }
    if (!code) {
        res.redirect("https://aidraft.bond/?error=missing_code");
        return;
    }
    try {
        // Exchange authorization code for tokens
        console.log(`[auth-google-callback] Exchanging code, client_id=${GOOGLE_CLIENT_ID_RUNTIME ? GOOGLE_CLIENT_ID_RUNTIME.substring(0, 10) + "..." : "EMPTY"}, redirect_uri=${GOOGLE_REDIRECT_URI}`);
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: [
                `code=${code}`,
                `client_id=${GOOGLE_CLIENT_ID_RUNTIME}`,
                `client_secret=${GOOGLE_CLIENT_SECRET_RUNTIME}`,
                `redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}`,
                "grant_type=authorization_code",
            ].join("&"),
        });
        const tokenData = (await tokenRes.json());
        if (tokenData.error) {
            console.error("[auth-google-callback] Token exchange error:", tokenData.error, tokenData.error_description);
            res.redirect(`https://aidraft.bond/?error=token_exchange_failed&error_detail=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
            return;
        }
        // Get user info with access token
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = (await userInfoRes.json());
        if (!userInfo?.id || !userInfo?.email) {
            console.error("[auth-google-callback] No user info from Google:", JSON.stringify(userInfo));
            res.redirect("https://aidraft.bond/?error=no_user_info&error_detail=missing_email_or_id");
            return;
        }
        const uid = `google_${userInfo.id}`;
        const userPayload = {
            uid,
            email: userInfo.email,
            displayName: userInfo.name || null,
            phoneNumber: null,
            photoURL: userInfo.picture || null,
            provider: "google",
        };
        // Generate JWT with user info inside — auth-verify can decode without Firestore
        const token = generateToken(userPayload);
        // Best-effort: save to Firestore in background (non-blocking)
        saveUserToFirestore(userPayload);
        console.log(`[auth-google-callback] User signed in: ${uid} (${userInfo.email})`);
        res.redirect(`https://aidraft.bond/?token=${token}&uid=${uid}`);
    }
    catch (error) {
        console.error("[auth-google-callback] Error:", error?.message, error?.stack);
        const errMsg = encodeURIComponent(String(error?.message || "unknown_server_error"));
        res.redirect(`https://aidraft.bond/?error=google_signin_failed&error_detail=${errMsg}`);
    }
});
// ─── Google Sign-In (ID Token) ────────────────────────────────
exports.authGoogle = v2_1.https.onRequest({ timeoutSeconds: 30, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        try {
            const body = req.body;
            if (!body.idToken && !body.accessToken) {
                res.status(400).json({ error: "Google ID token or access token is required" });
                return;
            }
            let payload;
            if (body.accessToken) {
                const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: { Authorization: `Bearer ${body.accessToken}` },
                });
                payload = (await userInfoRes.json());
                if (payload.id)
                    payload.sub = payload.id;
            }
            else if (body.isFirebaseToken) {
                try {
                    const decoded = await admin.auth().verifyIdToken(body.idToken);
                    payload = {
                        sub: decoded.uid || decoded.sub,
                        email: decoded.email,
                        name: decoded.name || decoded.displayName,
                        given_name: decoded.given_name,
                        phone_number: decoded.phone_number,
                        picture: decoded.picture || decoded.photoURL,
                    };
                }
                catch (fbErr) {
                    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${body.idToken}`);
                    payload = (await response.json());
                }
            }
            else {
                const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${body.idToken}`);
                payload = (await response.json());
            }
            if (!payload?.sub || !payload?.email) {
                res.status(401).json({ error: "Invalid Google credentials" });
                return;
            }
            const uid = `google_${payload.sub}`;
            const userPayload = {
                uid,
                email: payload.email || null,
                displayName: payload.name || payload.given_name || null,
                phoneNumber: payload.phone_number || null,
                photoURL: payload.picture || null,
                provider: "google",
            };
            const token = generateToken(userPayload);
            saveUserToFirestore(userPayload);
            console.log(`[auth-google] User signed in: ${uid} (${payload.email})`);
            res.json({
                success: true,
                token,
                user: userPayload,
            });
        }
        catch (error) {
            console.error("[auth-google] Error:", error?.message);
            res.status(500).json({ error: "Google sign-in failed" });
        }
    });
});
// ─── Email/Password Sign-Up ─────────────────────────────────
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
            // Check existing user via Firestore (if available)
            const db = getDb();
            if (db) {
                try {
                    const existingUser = await db.collection("users").where("email", "==", email).limit(1).get();
                    if (!existingUser.empty) {
                        res.status(409).json({ error: "An account with this email already exists" });
                        return;
                    }
                }
                catch (err) {
                    console.warn("[auth-email-signup] Firestore check failed, continuing:", err?.message);
                }
            }
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(password, salt);
            const uid = `email_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
            const userPayload = {
                uid,
                email,
                displayName: displayName || null,
                phoneNumber: null,
                photoURL: null,
                provider: "email",
            };
            const token = generateToken(userPayload);
            saveUserToFirestore({ ...userPayload, passwordHash });
            console.log(`[auth-email-signup] User created: ${uid} (${email})`);
            res.json({
                success: true,
                token,
                user: userPayload,
            });
        }
        catch (error) {
            console.error("[auth-email-signup] Error:", error?.message);
            res.status(500).json({ error: "Account creation failed" });
        }
    });
});
// ─── Email/Password Sign-In ──────────────────────────────────
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
            // Email/password requires Firestore to check password hash
            const db = getDb();
            if (!db) {
                res.status(500).json({ error: "Sign-in temporarily unavailable. Please try Google sign-in." });
                return;
            }
            const userQuery = await db.collection("users").where("email", "==", email).limit(1).get();
            if (userQuery.empty) {
                res.status(401).json({ error: "Invalid email or password" });
                return;
            }
            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();
            if (!userData.passwordHash) {
                res.status(401).json({ error: "Invalid email or password" });
                return;
            }
            const validPassword = await bcryptjs_1.default.compare(password, userData.passwordHash);
            if (!validPassword) {
                res.status(401).json({ error: "Invalid email or password" });
                return;
            }
            const userPayload = {
                uid: userData.uid,
                email: userData.email,
                displayName: userData.displayName || null,
                phoneNumber: null,
                photoURL: null,
                provider: "email",
            };
            const token = generateToken(userPayload);
            saveUserToFirestore(userPayload);
            console.log(`[auth-email-signin] User signed in: ${userData.uid} (${email})`);
            res.json({
                success: true,
                token,
                user: userPayload,
            });
        }
        catch (error) {
            console.error("[auth-email-signin] Error:", error?.message);
            res.status(500).json({ error: "Sign-in failed" });
        }
    });
});
// ─── Phone OTP: Send ─────────────────────────────────────────
exports.authPhoneSend = v2_1.https.onRequest({ timeoutSeconds: 30, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        try {
            const { phoneNumber } = req.body;
            if (!phoneNumber || phoneNumber.length < 10) {
                res.status(400).json({ error: "Valid phone number is required" });
                return;
            }
            const db = getDb();
            if (!db) {
                res.status(500).json({ error: "Phone sign-in temporarily unavailable. Please try Google sign-in." });
                return;
            }
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const sessionId = `phone_${phoneNumber.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
            await db.collection("phone_otps").doc(sessionId).set({
                phoneNumber,
                otp,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
                verified: false,
            });
            console.log(`[auth-phone-send] OTP for ${phoneNumber}: ${otp} (sessionId: ${sessionId})`);
            // Return OTP in response (demo/development mode — in production, integrate MSG91/Twilio for real SMS)
            res.json({ success: true, sessionId, otp, message: "OTP generated successfully" });
        }
        catch (error) {
            console.error("[auth-phone-send] Error:", error?.message);
            res.status(500).json({ error: "Failed to send OTP" });
        }
    });
});
// ─── Phone OTP: Verify ───────────────────────────────────────
exports.authPhoneVerify = v2_1.https.onRequest({ timeoutSeconds: 30, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        try {
            const { sessionId, otp } = req.body;
            if (!sessionId || !otp) {
                res.status(400).json({ error: "Session ID and OTP are required" });
                return;
            }
            const db = getDb();
            if (!db) {
                res.status(500).json({ error: "Phone sign-in temporarily unavailable. Please try Google sign-in." });
                return;
            }
            const otpDoc = await db.collection("phone_otps").doc(sessionId).get();
            if (!otpDoc.exists) {
                res.status(401).json({ error: "Invalid or expired session" });
                return;
            }
            const otpData = otpDoc.data();
            const expiresAt = otpData.expiresAt?.toDate();
            if (expiresAt && expiresAt < new Date()) {
                res.status(401).json({ error: "OTP expired. Please request a new one" });
                return;
            }
            if (otpData.verified) {
                res.status(401).json({ error: "OTP already used. Please request a new one" });
                return;
            }
            if (otpData.otp !== otp) {
                res.status(401).json({ error: "Invalid OTP" });
                return;
            }
            await otpDoc.ref.update({ verified: true });
            const phoneNumber = otpData.phoneNumber;
            const uid = `phone_${phoneNumber.replace(/[^a-zA-Z0-9]/g, "_")}`;
            const userPayload = {
                uid,
                email: null,
                displayName: null,
                phoneNumber,
                photoURL: null,
                provider: "phone",
            };
            const token = generateToken(userPayload);
            saveUserToFirestore(userPayload);
            console.log(`[auth-phone-verify] User signed in: ${uid} (${phoneNumber})`);
            res.json({
                success: true,
                token,
                user: userPayload,
            });
        }
        catch (error) {
            console.error("[auth-phone-verify] Error:", error?.message);
            res.status(500).json({ error: "OTP verification failed" });
        }
    });
});
// ─── Auth Verify ─────────────────────────────────────────────
// Decodes JWT and returns user info — NO Firestore dependency
exports.authVerify = v2_1.https.onRequest({ timeoutSeconds: 15, region: "us-central1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        try {
            const { token } = req.body;
            if (!token) {
                res.status(401).json({ error: "Token is required" });
                return;
            }
            // Decode JWT — user info is inside the token, no Firestore needed
            const user = decodeToken(token);
            res.json({
                success: true,
                user,
            });
        }
        catch (error) {
            console.error("[auth-verify] Error:", error?.message);
            res.status(401).json({ error: "Invalid or expired token" });
        }
    });
});
