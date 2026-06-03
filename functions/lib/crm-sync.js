"use strict";
// crm-sync.ts — Auto-sync user signups to Zoho CRM (backend-only)
// Every Google / Phone / Email auth signup triggers this → creates/updates Lead in Zoho
// Also stores user data in Firestore + fires optional WhatsApp webhook
//
// Required env vars (set via firebase functions:secrets:set):
//   ZOHO_CLIENT_ID        — Zoho self-client ID
//   ZOHO_CLIENT_SECRET    — Zoho self-client secret
//   ZOHO_REFRESH_TOKEN    — Zoho OAuth2 refresh token
//   ZOHO_DATA_CENTER      — "com" (US), "in" (India), "eu" (Europe), etc. (default: "com")
//
// Optional:
//   WHATSAPP_WEBHOOK_URL  — WhatsApp marketing webhook URL
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
exports.apiCrmSync = void 0;
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const cors_1 = require("./cors");
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const corsHandler = cors_1.restrictedCors;
// ─── Zoho OAuth2 Configuration ──────────────────────────────────
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || "1000.KM3KMH3AF9IIOM473Q116UKAR1HA8B";
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || "175494431e652507bed67fc3fe00233862b680bb97";
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || "1000.f14e72ceeef222d98b24efebf966cad8.fcb825b9acfaadf000aee78c567ff4c3";
const ZOHO_DATA_CENTER = process.env.ZOHO_DATA_CENTER || "in";
const WHATSAPP_WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL || "";
// Build the correct Zoho API domain based on data center
function getZohoDomain() {
    return `https://www.zohoapis.${ZOHO_DATA_CENTER}`;
}
function getZohoAccountsDomain() {
    return `https://accounts.zoho.${ZOHO_DATA_CENTER}`;
}
// ─── Cached Access Token ───────────────────────────────────────
// Access tokens expire every hour. We cache in-memory and auto-refresh.
let cachedAccessToken = null;
let tokenExpiresAt = 0;
async function getAccessToken() {
    // Return cached token if still valid (with 5-minute buffer)
    if (cachedAccessToken && Date.now() < tokenExpiresAt - 300_000) {
        return cachedAccessToken;
    }
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
        console.log("[crm-sync] Zoho OAuth2 credentials not configured");
        return null;
    }
    try {
        const url = `${getZohoAccountsDomain()}/oauth/v2/token?refresh_token=${encodeURIComponent(ZOHO_REFRESH_TOKEN)}&client_id=${encodeURIComponent(ZOHO_CLIENT_ID)}&client_secret=${encodeURIComponent(ZOHO_CLIENT_SECRET)}&grant_type=refresh_token`;
        const res = await fetch(url, { method: "POST" });
        if (!res.ok) {
            const errText = await res.text();
            console.error(`[crm-sync] Token refresh failed (${res.status}):`, errText);
            return null;
        }
        const data = (await res.json());
        if (data.access_token) {
            cachedAccessToken = data.access_token;
            // Zoho access tokens last 1 hour
            tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
            console.log("[crm-sync] Access token refreshed successfully");
            return cachedAccessToken;
        }
        console.error("[crm-sync] No access_token in response:", JSON.stringify(data));
        return null;
    }
    catch (err) {
        console.error("[crm-sync] Token refresh error:", err);
        return null;
    }
}
// ─── Zoho CRM Sync ──────────────────────────────────────────────
// Creates or updates a Lead in Zoho CRM for every signup
async function syncToZoho(userData) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
        return false;
    }
    const zohoDomain = getZohoDomain();
    // Split display name into first/last
    const nameParts = (userData.displayName || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
    // Build signup description with full context
    const authMethod = userData.provider || "unknown";
    const signupDate = userData.createdAt
        ? new Date(userData.createdAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
        })
        : "Unknown";
    const description = [
        `Firebase UID: ${userData.uid}`,
        `Auth Method: ${authMethod === "google" ? "Google OAuth" : authMethod === "phone" ? "Phone OTP" : authMethod === "email" ? "Email/Password" : authMethod}`,
        `Signup Date: ${signupDate}`,
        `Source: ${userData.source || "aidraft.bond"}`,
    ].join("\n");
    const leadData = {
        data: [
            {
                First_Name: firstName,
                Last_Name: lastName,
                Email: userData.email || "",
                Phone: userData.phoneNumber || "",
                Lead_Source: "AI Draft Website",
                Description: description,
                // Standard Zoho fields
                Company: "AI Draft User",
                City: "",
                State: "",
            },
        ],
        trigger: ["workflow"],
    };
    try {
        // ── Step 1: Check if this user already exists in Leads ──
        const existingLeadId = await findExistingLead(accessToken, zohoDomain, userData);
        if (existingLeadId) {
            // Update existing lead
            const updateRes = await fetch(`${zohoDomain}/crm/v2/Leads/${existingLeadId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(leadData),
            });
            if (updateRes.ok) {
                console.log(`[crm-sync] Updated Zoho Lead: ${existingLeadId} (${userData.email || userData.phoneNumber})`);
            }
            else {
                const errText = await updateRes.text();
                console.error(`[crm-sync] Lead update failed:`, errText);
            }
        }
        else {
            // Check if they exist as Contact already
            const existingContactId = await findExistingContact(accessToken, zohoDomain, userData);
            if (existingContactId) {
                console.log(`[crm-sync] User exists as Contact (${existingContactId}), skipping Lead creation`);
                return true;
            }
            // ── Step 2: Create new Lead ──
            const createRes = await fetch(`${zohoDomain}/crm/v2/Leads`, {
                method: "POST",
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(leadData),
            });
            if (createRes.ok) {
                const result = (await createRes.json());
                const newLeadId = result?.data?.[0]?.details?.id || "unknown";
                console.log(`[crm-sync] Created new Zoho Lead: ${newLeadId} (${userData.email || userData.phoneNumber})`);
            }
            else {
                const errText = await createRes.text();
                console.error(`[crm-sync] Lead creation failed:`, errText);
            }
        }
        return true;
    }
    catch (err) {
        console.error("[crm-sync] Zoho sync error:", err);
        return false;
    }
}
// ─── Helper: Find existing Lead by email or phone ──────────────
async function findExistingLead(accessToken, zohoDomain, userData) {
    try {
        // Search by email first
        if (userData.email) {
            const emailRes = await fetch(`${zohoDomain}/crm/v2/Leads/search?criteria=(Email:equals:${encodeURIComponent(userData.email)})`, {
                headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            });
            if (emailRes.ok) {
                const emailData = (await emailRes.json());
                if (emailData?.data?.length > 0) {
                    return emailData.data[0].id;
                }
            }
        }
        // Search by phone
        if (userData.phoneNumber) {
            const phoneClean = userData.phoneNumber.replace(/[^\d+]/g, "");
            const phoneRes = await fetch(`${zohoDomain}/crm/v2/Leads/search?criteria=(Phone:equals:${encodeURIComponent(phoneClean)})`, {
                headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            });
            if (phoneRes.ok) {
                const phoneData = (await phoneRes.json());
                if (phoneData?.data?.length > 0) {
                    return phoneData.data[0].id;
                }
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
// ─── Helper: Find existing Contact by email or phone ────────────
async function findExistingContact(accessToken, zohoDomain, userData) {
    try {
        if (userData.email) {
            const emailRes = await fetch(`${zohoDomain}/crm/v2/Contacts/search?criteria=(Email:equals:${encodeURIComponent(userData.email)})`, {
                headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            });
            if (emailRes.ok) {
                const emailData = (await emailRes.json());
                if (emailData?.data?.length > 0) {
                    return emailData.data[0].id;
                }
            }
        }
        if (userData.phoneNumber) {
            const phoneClean = userData.phoneNumber.replace(/[^\d+]/g, "");
            const phoneRes = await fetch(`${zohoDomain}/crm/v2/Contacts/search?criteria=(Phone:equals:${encodeURIComponent(phoneClean)})`, {
                headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
            });
            if (phoneRes.ok) {
                const phoneData = (await phoneRes.json());
                if (phoneData?.data?.length > 0) {
                    return phoneData.data[0].id;
                }
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
// ─── WhatsApp Marketing Webhook ─────────────────────────────────
async function syncToWhatsApp(userData) {
    if (!WHATSAPP_WEBHOOK_URL || !userData.phoneNumber) {
        return false;
    }
    try {
        await fetch(WHATSAPP_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: "new_user_phone",
                phone_number: userData.phoneNumber,
                name: userData.displayName || "",
                email: userData.email || "",
                source: "aidraft-bond",
                tags: ["legal-professional", "aidraft-signup"],
                opt_in: true,
            }),
        });
        console.log("[crm-sync] WhatsApp webhook fired");
        return true;
    }
    catch (err) {
        console.error("[crm-sync] WhatsApp webhook failed:", err);
        return false;
    }
}
// ─── Store user data in Firestore ──────────────────────────────
async function storeInFirestore(userData) {
    try {
        const db = admin.firestore();
        await db.collection("users").doc(userData.uid).set({
            uid: userData.uid,
            email: userData.email || null,
            displayName: userData.displayName || null,
            phoneNumber: userData.phoneNumber || null,
            photoURL: userData.photoURL || null,
            authProvider: userData.provider,
            source: userData.source,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
            crmSynced: false,
        }, { merge: true });
        console.log(`[crm-sync] User stored in Firestore: ${userData.uid}`);
    }
    catch (err) {
        console.error("[crm-sync] Firestore write failed:", err);
    }
}
// ─── Main HTTP Function ─────────────────────────────────────────
exports.apiCrmSync = v2_1.https.onRequest({
    timeoutSeconds: 30,
    region: "us-central1",
}, async (req, res) => {
    corsHandler(req, res, async () => {
        try {
            if (req.method !== "POST") {
                res.status(405).json({ error: "Method not allowed" });
                return;
            }
            const userData = req.body;
            if (!userData.uid) {
                res.status(400).json({ error: "Missing user UID" });
                return;
            }
            console.log(`[crm-sync] Processing user: ${userData.uid} (${userData.email || userData.phoneNumber})`);
            // Store in Firestore (always)
            await storeInFirestore(userData);
            // Sync to Zoho CRM + WhatsApp (parallel, non-blocking)
            const results = await Promise.allSettled([
                syncToZoho(userData),
                syncToWhatsApp(userData),
            ]);
            const successes = results.filter((r) => r.status === "fulfilled" && r.value).length;
            console.log(`[crm-sync] Done: ${successes}/${results.length} CRM syncs succeeded`);
            // Update crmSynced flag in Firestore if Zoho sync succeeded
            if (results[0].status === "fulfilled" && results[0].value) {
                try {
                    const db = admin.firestore();
                    await db.collection("users").doc(userData.uid).update({
                        crmSynced: true,
                    });
                }
                catch {
                    /* ignore */
                }
            }
            res.status(200).json({
                success: true,
                crmSynced: successes > 0,
                details: {
                    zoho: results[0].status === "fulfilled" && results[0].value,
                    whatsapp: results[1].status === "fulfilled" && results[1].value,
                },
            });
        }
        catch (err) {
            console.error("[crm-sync] Error:", err);
            res.status(500).json({
                error: "CRM sync failed",
                details: err instanceof Error ? err.message : "Unknown error",
            });
        }
    });
});
