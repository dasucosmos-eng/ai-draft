// file-upload.ts — Firebase Cloud Function
// Handles file uploads to Firebase Storage with subscription-based limits
// Free: 100MB total storage, Premium: 1GB total storage
// All files scoped to user's uid

import { https } from "firebase-functions/v2";
import { restrictedCors } from "./cors";
import { aiFunctionSecrets } from "./secrets";
import * as admin from "firebase-admin";

const corsHandler = restrictedCors;

// ─── Storage Limits per plan ───
const STORAGE_LIMITS: Record<string, number> = {
  free: 100 * 1024 * 1024,      // 100MB
  pro: 1024 * 1024 * 1024,      // 1GB
  enterprise: 5 * 1024 * 1024 * 1024, // 5GB
};

const MAX_FILE_SIZE: Record<string, number> = {
  free: 10 * 1024 * 1024,       // 10MB per file
  pro: 50 * 1024 * 1024,        // 50MB per file
  enterprise: 100 * 1024 * 1024, // 100MB per file
};

// ─── Firebase ID Token Verification ───

async function verifyUid(req: any): Promise<string | null> {
  // Support three token sources:
  // 1. Authorization header (standard)
  // 2. req.body.token (explicit body field)
  // 3. req.body._token (fallback for sendBeacon which can't set headers)
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

// ─── Get user plan ───
async function getUserPlan(uid: string): Promise<string> {
  try {
    const user = await admin.auth().getUser(uid);
    return (user.customClaims?.plan as string) || "free";
  } catch {
    return "free";
  }
}

// ─── Generate signed upload URL ───
export const fileUploadUrl = https.onRequest(
  { timeoutSeconds: 30, region: "us-central1", invoker: "public" },
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const uid = await verifyUid(req);
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      try {
        const { fileName, contentType, caseId, category } = req.body || {};
        if (!fileName || !contentType) {
          return res.status(400).json({ error: "fileName and contentType required" });
        }

        const plan = await getUserPlan(uid);
        const maxFileSize = MAX_FILE_SIZE[plan] || MAX_FILE_SIZE.free;

        // Check total storage usage
        const bucket = admin.storage().bucket();
        const prefix = `users/${uid}/`;
        const [files] = await bucket.getFiles({ prefix, maxResults: 1000 });
        let totalSize = 0;
        for (const file of files) {
          totalSize += Number((await file.getMetadata())[0].size) || 0;
        }
        const storageLimit = STORAGE_LIMITS[plan] || STORAGE_LIMITS.free;

        if (totalSize >= storageLimit) {
          return res.status(403).json({
            error: "Storage limit reached",
            details: `Your ${plan} plan has a ${Math.round(storageLimit / 1024 / 1024)}MB storage limit. Upgrade for more space.`,
          });
        }

        // Generate signed upload URL (valid for 15 minutes)
        const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${prefix}${caseId ? caseId + "/" : ""}${Date.now()}_${sanitized}`;

        const [uploadUrl] = await bucket.file(filePath).getSignedUrl({
          version: "v4",
          action: "write",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          contentType,
        });

        // Generate signed download URL (valid for 1 year)
        const [downloadUrl] = await bucket.file(filePath).getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        });

        return res.json({
          success: true,
          data: {
            uploadUrl,
            downloadUrl,
            filePath,
            maxFileSize,
            storageUsed: totalSize,
            storageLimit,
          },
        });

      } catch (err: any) {
        console.error("[file-upload-url]", err.message);
        return res.status(500).json({ error: "Failed to generate upload URL" });
      }
    });
  }
);

// ─── Delete file ───
export const fileDelete = https.onRequest(
  { timeoutSeconds: 15, region: "us-central1", invoker: "public" },
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const uid = await verifyUid(req);
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      try {
        const { filePath } = req.body || {};
        if (!filePath) {
          return res.status(400).json({ error: "filePath required" });
        }

        // Only allow deleting files under user's directory
        // Block path traversal attempts (e.g., users/uid/../other_uid/file)
        if (!filePath.startsWith(`users/${uid}/`) || filePath.includes('..')) {
          return res.status(403).json({ error: "Cannot delete files outside your directory" });
        }

        await admin.storage().bucket().file(filePath).delete();
        return res.json({ success: true });

      } catch (err: any) {
        console.error("[file-delete]", err.message);
        return res.status(500).json({ error: "Failed to delete file" });
      }
    });
  }
);

// ─── List files ───
export const fileList = https.onRequest(
  { timeoutSeconds: 15, region: "us-central1", invoker: "public" },
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const uid = await verifyUid(req);
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      try {
        const { caseId, prefix: extraPrefix } = req.body || {};
        const bucket = admin.storage().bucket();
        const fullPrefix = `users/${uid}/${caseId ? caseId + "/" : ""}${extraPrefix || ""}`;

        const [files] = await bucket.getFiles({ prefix: fullPrefix, maxResults: 100 });
        const fileList = await Promise.all(
          files.map(async (file) => {
            const meta = await file.getMetadata();
            return {
              name: meta[0].name,
              size: meta[0].size,
              contentType: meta[0].contentType,
              updated: meta[0].updated,
              downloadUrl: `users/${uid}/${meta[0].name.split("/").slice(1).join("/")}`,
            };
          })
        );

        // Calculate total storage
        let totalSize = 0;
        const [allFiles] = await bucket.getFiles({ prefix: `users/${uid}/`, maxResults: 1000 });
        for (const f of allFiles) {
          totalSize += Number((await f.getMetadata())[0].size) || 0;
        }

        const plan = await getUserPlan(uid);
        return res.json({
          success: true,
          data: {
            files: fileList,
            storageUsed: totalSize,
            storageLimit: STORAGE_LIMITS[plan] || STORAGE_LIMITS.free,
          },
        });

      } catch (err: any) {
        console.error("[file-list]", err.message);
        return res.status(500).json({ error: "Failed to list files" });
      }
    });
  }
);
