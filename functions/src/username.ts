// @ts-nocheck
import { https } from "firebase-functions/v2";
import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { restrictedCors } from "./cors";
import { aiFunctionSecrets } from "./secrets";

/* ─── Verify Firebase ID Token ─── */

async function verifyUid(req: Request): Promise<string | null> {
  const token =
    (req.headers.authorization || "").replace("Bearer ", "") ||
    req.body?.token ||
    req.body?._token;
  if (!token) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid || null;
  } catch {
    return null;
  }
}

/* ─── Firestore Helpers ─── */

function userDataRef(uid: string) {
  return admin.firestore().collection("users").doc(uid).collection("app").doc("data");
}

function usernamesRef(username: string) {
  return admin.firestore().collection("usernames").doc(username);
}

/* ─── Username Validation ─── */

const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

function isValidUsername(username: string): boolean {
  if (!username || typeof username !== "string") return false;
  if (username.length < 3 || username.length > 30) return false;
  return USERNAME_REGEX.test(username);
}

/* ─── POST /api/username-check ─── */

const checkHandler = async (req: Request, res: Response) => {
  if (req.method === "OPTIONS") {
    return res.status(204).send();
  }

  let body = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(typeof body === "string" ? body : (req.rawBody || "{}"));
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== "object") body = {};
  req.body = body;

  const uid = await verifyUid(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { username } = req.body || {};
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Username is required", available: false });
  }

  const trimmed = username.toLowerCase().trim();

  if (!isValidUsername(trimmed)) {
    return res.json({
      available: false,
      reason: "Username must be 3-30 characters, lowercase letters, numbers, and hyphens only. Must start and end with a letter or number.",
    });
  }

  try {
    const doc = await usernamesRef(trimmed).get();
    if (doc.exists) {
      const data = doc.data();
      // If the username belongs to the current user, it's still "available" (they can keep it)
      if (data && data.uid === uid) {
        return res.json({ available: true, isCurrent: true });
      }
      return res.json({ available: false, reason: "Username is already taken" });
    }

    return res.json({ available: true });
  } catch (err) {
    console.error("[username-check] Error:", err);
    return res.status(500).json({ error: "Internal server error", available: false });
  }
};

/* ─── POST /api/username-claim ─── */

const claimHandler = async (req: Request, res: Response) => {
  if (req.method === "OPTIONS") {
    return res.status(204).send();
  }

  let body = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(typeof body === "string" ? body : (req.rawBody || "{}"));
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== "object") body = {};
  req.body = body;

  const uid = await verifyUid(req);
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { username } = req.body || {};
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Username is required" });
  }

  const trimmed = username.toLowerCase().trim();

  if (!isValidUsername(trimmed)) {
    return res.status(400).json({
      error: "Invalid username format. Must be 3-30 characters, lowercase letters, numbers, and hyphens only.",
    });
  }

  try {
    // Use a transaction to atomically check and claim
    const claimed = await admin.firestore().runTransaction(async (transaction) => {
      const usernameDocRef = usernamesRef(trimmed);
      const usernameDoc = await transaction.get(usernameDocRef);

      // If the doc exists and belongs to someone else, reject
      if (usernameDoc.exists) {
        const data = usernameDoc.data();
        if (data && data.uid !== uid) {
          return false;
        }
        // If it belongs to the current user, it's a no-op (they already claimed it)
        return true;
      }

      // Claim the username
      transaction.set(usernameDocRef, {
        uid,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return true;
    });

    if (!claimed) {
      return res.json({ success: false, error: "Username is already taken" });
    }

    // Also update the user's profile doc with the username
    await userDataRef(uid).set(
      {
        profile: { username: trimmed },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({ success: true, username: trimmed });
  } catch (err) {
    console.error("[username-claim] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─── Exports ─── */

export const apiUsernameCheck = https.onRequest(
  { secrets: aiFunctionSecrets },
  async (req, res) => {
    return restrictedCors(req, res, async () => {
      return checkHandler(req, res);
    });
  }
);

export const apiUsernameClaim = https.onRequest(
  { secrets: aiFunctionSecrets },
  async (req, res) => {
    return restrictedCors(req, res, async () => {
      return claimHandler(req, res);
    });
  }
);
