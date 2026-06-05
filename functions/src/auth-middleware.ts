// auth-middleware.ts — Shared Firebase ID Token verification middleware
// Replaces all custom JWT verification across the codebase
// Uses Firebase Admin Auth SDK's verifyIdToken() for secure, stateless auth

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

// ─── Verify Firebase ID Token ─────────────────────────────────
// Extracts and verifies a Firebase ID token from the request.
// Supports three token sources:
//   1. Authorization header (standard Bearer token)
//   2. req.body.token (explicit body field)
//   3. req.body._token (fallback for sendBeacon which can't set headers)
//
// Returns the decoded token (uid, email, displayName, etc.) or null if invalid.

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  provider: string;
}

export async function verifyFirebaseToken(
  req: any
): Promise<AuthenticatedUser | null> {
  const token =
    (req.headers.authorization || "").replace("Bearer ", "") ||
    req.body?.token ||
    req.body?._token;

  if (!token) return null;

  try {
    const decoded = await admin.auth().verifyIdToken(token); // false = don't check revoked (avoids spurious 401s on fresh tokens)

    // Determine the primary provider from the Firebase Auth sign-in provider info
    const signInProvider =
      decoded.firebase?.sign_in_provider || "unknown";

    return {
      uid: decoded.uid,
      email: decoded.email || null,
      displayName: decoded.name || decoded.displayName || null,
      phoneNumber: decoded.phone_number || null,
      photoURL: decoded.picture || decoded.photoURL || null,
      provider: signInProvider,
    };
  } catch (err: any) {
    console.error("[auth-middleware] Token verification failed:", err?.message);
    return null;
  }
}

// ─── Verify UID (simplified) ──────────────────────────────────
// Quick helper that returns just the uid string (backward-compatible with existing code)

export async function verifyUid(req: any): Promise<string | null> {
  const user = await verifyFirebaseToken(req);
  return user?.uid || null;
}
