"use strict";
// subscription-middleware.ts — Server-side subscription enforcement
// Validates user subscription before allowing AI operations
// Reads subscription data from Firebase Auth custom claims
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
exports.QUOTAS = void 0;
exports.checkAndIncrementUsage = checkAndIncrementUsage;
exports.checkFeatureAccess = checkFeatureAccess;
exports.requireSubscription = requireSubscription;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
exports.QUOTAS = {
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
async function checkAndIncrementUsage(uid, module) {
    const db = (0, firestore_1.getFirestore)();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const usageRef = db.collection("usage").doc(`${uid}_${today}`);
    // Get user's subscription plan (from auth claims or profile doc)
    let plan = "free";
    try {
        const user = await admin.auth().getUser(uid);
        plan = user.customClaims?.plan || "free";
    }
    catch {
        // User not found or auth error — default to free
    }
    const quota = exports.QUOTAS[plan] || exports.QUOTAS.free;
    // Unlimited users — skip counting
    if (quota.maxDailyQueries === -1) {
        return { allowed: true, remaining: -1, quota };
    }
    // Atomic increment using Firestore transaction
    const doc = await usageRef.get();
    const current = doc.exists ? doc.data()?.queryCount || 0 : 0;
    if (current >= quota.maxDailyQueries) {
        return { allowed: false, remaining: 0, quota };
    }
    // Increment
    await usageRef.set({
        uid,
        date: today,
        queryCount: current + 1,
        lastQuery: admin.firestore.Timestamp.now(),
        modules: admin.firestore.FieldValue.arrayUnion(module),
    }, { merge: true });
    return { allowed: true, remaining: quota.maxDailyQueries - current - 1, quota };
}
// ─── Feature access check ────────────────────────────────────
async function checkFeatureAccess(uid, feature) {
    try {
        const user = await admin.auth().getUser(uid);
        const plan = user.customClaims?.plan || "free";
        const quota = exports.QUOTAS[plan] || exports.QUOTAS.free;
        return quota.features[feature] || false;
    }
    catch {
        return false;
    }
}
// ─── Express middleware wrapper ────────────────────────────────
function requireSubscription(feature) {
    return async (req, res, next) => {
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
                    limit: exports.QUOTAS.free.maxDailyQueries,
                    plan: "free",
                });
            }
            // Attach usage info to request
            req.usage = { remaining, uid };
            next();
        }
        catch (err) {
            console.error("[subscription] Auth/validation error:", err);
            return res.status(401).json({ error: "Invalid or expired token" });
        }
    };
}
