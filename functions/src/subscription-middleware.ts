// subscription-middleware.ts — Server-side subscription enforcement
// Validates user subscription before allowing AI operations
// Reads subscription data from Firebase Auth custom claims

import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// ─── Subscription Tiers ───────────────────────────────────────

export interface UsageQuota {
  maxDailyQueries: number;       // AI queries per day
  maxCases: number;              // Active cases
  maxDocumentsPerCase: number;   // Documents per case
  features: {
    advancedDrafting: boolean;   // Citations, multiple formats
    caseLawSearch: boolean;      // Full Indian Kanoon search
    defenseBuilder: boolean;
    argumentAnalyzer: boolean;
    aiResearch: boolean;         // Deep legal research
    documentAnalysis: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
  };
}

export const QUOTAS: Record<string, UsageQuota> = {
  free: {
    maxDailyQueries: 5,
    maxCases: 5,
    maxDocumentsPerCase: 10,
    features: {
      advancedDrafting: false,
      caseLawSearch: false,
      defenseBuilder: false,
      argumentAnalyzer: false,
      aiResearch: false,
      documentAnalysis: true,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  pro: {
    maxDailyQueries: -1, // unlimited
    maxCases: 100,
    maxDocumentsPerCase: 100,
    features: {
      advancedDrafting: true,
      caseLawSearch: true,
      defenseBuilder: true,
      argumentAnalyzer: true,
      aiResearch: true,
      documentAnalysis: true,
      prioritySupport: false,
      apiAccess: true,
    },
  },
  enterprise: {
    maxDailyQueries: -1, // unlimited
    maxCases: -1, // unlimited
    maxDocumentsPerCase: 500,
    features: {
      advancedDrafting: true,
      caseLawSearch: true,
      defenseBuilder: true,
      argumentAnalyzer: true,
      aiResearch: true,
      documentAnalysis: true,
      prioritySupport: true,
      apiAccess: true,
    },
  },
};

// ─── Daily usage tracking (Firestore) ──────────────────────────

interface DailyUsage {
  uid: string;
  date: string;       // YYYY-MM-DD
  queryCount: number;
  lastQuery: admin.firestore.Timestamp;
}

export async function checkAndIncrementUsage(uid: string, module: string): Promise<{ allowed: boolean; remaining: number; quota: UsageQuota }> {
  const db = getFirestore();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const usageRef = db.collection("usage").doc(`${uid}_${today}`);

  // Get user's subscription plan (from auth claims or profile doc)
  let plan = "free";
  try {
    const user = await admin.auth().getUser(uid);
    plan = (user.customClaims?.plan as string) || "free";
  } catch {
    // User not found or auth error — default to free
  }

  const quota = QUOTAS[plan] || QUOTAS.free;

  // Unlimited users — skip counting
  if (quota.maxDailyQueries === -1) {
    return { allowed: true, remaining: -1, quota };
  }

  // Atomic increment using Firestore transaction to prevent race conditions
  let remaining = 0;
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(usageRef);
    const current = doc.exists ? (doc.data()?.queryCount as number) || 0 : 0;

    if (current >= quota.maxDailyQueries) {
      remaining = 0;
      return; // Abort transaction — quota exceeded
    }

    remaining = quota.maxDailyQueries - current - 1;
    transaction.set(usageRef, {
      uid,
      date: today,
      queryCount: current + 1,
      lastQuery: admin.firestore.Timestamp.now(),
      modules: admin.firestore.FieldValue.arrayUnion(module),
    }, { merge: true });
  });

  if (remaining === 0) {
    return { allowed: false, remaining: 0, quota };
  }

  return { allowed: true, remaining, quota };
}

// ─── Feature access check ────────────────────────────────────

export async function checkFeatureAccess(uid: string, feature: keyof UsageQuota["features"]): Promise<boolean> {
  try {
    const user = await admin.auth().getUser(uid);
    const plan = (user.customClaims?.plan as string) || "free";
    const quota = QUOTAS[plan] || QUOTAS.free;
    return quota.features[feature] || false;
  } catch {
    return false;
  }
}

// ─── Express middleware wrapper ────────────────────────────────

export function requireSubscription(feature?: keyof UsageQuota["features"]) {
  return async (req: any, res: any, next: any) => {
    try {
      // Extract UID from Authorization header (Firebase ID token)
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const token = authHeader.split("Bearer ")[1];
      const decoded = await admin.auth().verifyIdToken(token);
      const uid = decoded.uid;

      // Check feature access if specified
      if (feature) {
        const hasAccess = await checkFeatureAccess(uid, feature);
        if (!hasAccess) {
          return res.status(403).json({
            error: "Upgrade required",
            message: `This feature requires a Pro or Enterprise subscription`,
            requiredPlan: "pro",
          });
        }
      }

      // Check and increment usage
      const { allowed, remaining } = await checkAndIncrementUsage(uid, req.path);
      if (!allowed) {
        return res.status(429).json({
          error: "Daily limit reached",
          message: `You've used all your daily AI queries. Upgrade to Pro for unlimited access.`,
          limit: QUOTAS.free.maxDailyQueries,
          plan: "free",
        });
      }

      // Attach usage info to request
      req.usage = { remaining, uid };
      next();
    } catch (err) {
      console.error("[subscription] Auth/validation error:", err);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}
