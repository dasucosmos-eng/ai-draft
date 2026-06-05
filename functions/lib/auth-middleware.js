"use strict";
// auth-middleware.ts — Shared Firebase ID Token verification middleware
// Replaces all custom JWT verification across the codebase
// Uses Firebase Admin Auth SDK's verifyIdToken() for secure, stateless auth
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
exports.verifyFirebaseToken = verifyFirebaseToken;
exports.verifyUid = verifyUid;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
async function verifyFirebaseToken(req) {
    const token = (req.headers.authorization || "").replace("Bearer ", "") ||
        req.body?.token ||
        req.body?._token;
    if (!token)
        return null;
    try {
        const decoded = await admin.auth().verifyIdToken(token); // false = don't check revoked (avoids spurious 401s on fresh tokens)
        // Determine the primary provider from the Firebase Auth sign-in provider info
        const signInProvider = decoded.firebase?.sign_in_provider || "unknown";
        return {
            uid: decoded.uid,
            email: decoded.email || null,
            displayName: decoded.name || decoded.displayName || null,
            phoneNumber: decoded.phone_number || null,
            photoURL: decoded.picture || decoded.photoURL || null,
            provider: signInProvider,
        };
    }
    catch (err) {
        console.error("[auth-middleware] Token verification failed:", err?.message);
        return null;
    }
}
// ─── Verify UID (simplified) ──────────────────────────────────
// Quick helper that returns just the uid string (backward-compatible with existing code)
async function verifyUid(req) {
    const user = await verifyFirebaseToken(req);
    return user?.uid || null;
}
