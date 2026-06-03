"use strict";
// crm-api.ts — Full Zoho CRM API Integration
// Provides CRUD operations for Contacts, Leads, and Deals
// Auto-syncs cases from AI Draft to Zoho CRM Deals
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
exports.apiCrmApi = void 0;
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const cors_1 = require("./cors");
if (!admin.apps.length) {
    admin.initializeApp();
}
const corsHandler = cors_1.restrictedCors;
// ─── Zoho Configuration ──────────────────────────────────────────
const ZOHO_AUTH_TOKEN = process.env.ZOHO_AUTH_TOKEN || "";
const ZOHO_API_BASE = "https://www.zohoapis.com/crm/v2";
const ZOHO_WEBHOOK_URL = process.env.ZOHO_WEBHOOK_URL || "";
// ─── Zoho API Helpers ──────────────────────────────────────────
async function zohoRequest(module, method, path, body) {
    if (!ZOHO_AUTH_TOKEN) {
        throw new Error("Zoho CRM not configured — missing ZOHO_AUTH_TOKEN");
    }
    const url = path ? `${ZOHO_API_BASE}/${module}${path}` : `${ZOHO_API_BASE}/${module}`;
    const options = {
        method,
        headers: {
            Authorization: `Zoho-oauthtoken ${ZOHO_AUTH_TOKEN}`,
            "Content-Type": "application/json",
        },
    };
    if (body && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    const data = await res.json();
    if (data.code && data.code >= 300 && data.code !== 404) {
        console.error(`[crm-api] Zoho error ${data.code}:`, data.message);
        throw new Error(data.message || `Zoho API error (${data.code})`);
    }
    return data;
}
// ─── CONTACTS ──────────────────────────────────────────────────
async function listContacts(filters) {
    const page = filters?.page || 1;
    const perPage = filters?.perPage || 20;
    try {
        if (filters?.search) {
            const encoded = encodeURIComponent(filters.search);
            const data = await zohoRequest("Contacts/search", "GET", `?criteria=(Full_Name:contains:${encoded})&page=${page}&per_page=${perPage}`);
            return {
                contacts: data.data || [],
                count: data.info?.count || data.data?.length || 0,
                pageInfo: data.info,
            };
        }
        const data = await zohoRequest("Contacts", "GET", `?page=${page}&per_page=${perPage}&fields=Full_Name,Email,Phone,Mailing_City,Mailing_State,Lead_Source,Created_Time`);
        return {
            contacts: data.data || [],
            count: data.info?.count || 0,
            pageInfo: data.info,
        };
    }
    catch (err) {
        console.error("[crm-api] listContacts error:", err);
        return { contacts: [], count: 0 };
    }
}
async function createContact(contact) {
    try {
        const data = await zohoRequest("Contacts", "POST", undefined, {
            data: [{ ...contact, trigger: ["workflow"] }],
        });
        const created = data.data?.[0];
        if (created?.details?.id) {
            console.log(`[crm-api] Contact created: ${created.details.id}`);
            return { success: true, contact: created };
        }
        return { success: false, error: "No ID returned from Zoho" };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
async function updateContact(id, updates) {
    try {
        const data = await zohoRequest("Contacts", "PUT", `/${id}`, {
            data: [updates],
        });
        const updated = data.data?.[0];
        console.log(`[crm-api] Contact updated: ${id}`);
        return { success: true, contact: updated };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
async function deleteContact(id) {
    try {
        await zohoRequest("Contacts", "DELETE", `?ids=${id}`);
        console.log(`[crm-api] Contact deleted: ${id}`);
        return { success: true };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
// ─── LEADS ──────────────────────────────────────────────────────
async function listLeads(filters) {
    const page = filters?.page || 1;
    const perPage = filters?.perPage || 20;
    try {
        if (filters?.search) {
            const encoded = encodeURIComponent(filters.search);
            const data = await zohoRequest("Leads/search", "GET", `?criteria=(Full_Name:contains:${encoded})&page=${page}&per_page=${perPage}`);
            return { leads: data.data || [], count: data.info?.count || 0, pageInfo: data.info };
        }
        if (filters?.status) {
            const encoded = encodeURIComponent(filters.status);
            const data = await zohoRequest("Leads/search", "GET", `?criteria=(Status:equals:${encoded})&page=${page}&per_page=${perPage}`);
            return { leads: data.data || [], count: data.info?.count || 0, pageInfo: data.info };
        }
        const data = await zohoRequest("Leads", "GET", `?page=${page}&per_page=${perPage}&fields=Full_Name,Email,Phone,Company,Lead_Source,Status,Created_Time`);
        return { leads: data.data || [], count: data.info?.count || 0, pageInfo: data.info };
    }
    catch (err) {
        console.error("[crm-api] listLeads error:", err);
        return { leads: [], count: 0 };
    }
}
async function createLead(lead) {
    try {
        const data = await zohoRequest("Leads", "POST", undefined, {
            data: [{ ...lead, trigger: ["workflow"] }],
        });
        const created = data.data?.[0];
        if (created?.details?.id) {
            console.log(`[crm-api] Lead created: ${created.details.id}`);
            return { success: true, lead: created };
        }
        return { success: false, error: "No ID returned from Zoho" };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
async function updateLead(id, updates) {
    try {
        const data = await zohoRequest("Leads", "PUT", `/${id}`, { data: [updates] });
        console.log(`[crm-api] Lead updated: ${id}`);
        return { success: true, lead: data.data?.[0] };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
async function convertLead(id, contactData, dealData) {
    try {
        const convertBody = {
            data: [{ id }],
        };
        // Note: Full lead conversion in Zoho requires specific API format
        // Using update approach for now — move to Contact
        await zohoRequest("Leads", "PUT", `/${id}`, {
            data: [{ Status: "Qualified" }],
        });
        // Create Contact from lead
        if (contactData) {
            await createContact(contactData);
        }
        console.log(`[crm-api] Lead ${id} converted to Contact`);
        return { success: true };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
async function deleteLead(id) {
    try {
        await zohoRequest("Leads", "DELETE", `?ids=${id}`);
        console.log(`[crm-api] Lead deleted: ${id}`);
        return { success: true };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
// ─── DEALS (Pipeline) ───────────────────────────────────────────
const DEAL_STAGES = [
    "Qualification",
    "Needs Analysis",
    "Proposal/Price Quote",
    "Negotiation/Review",
    "Closed Won",
    "Closed Lost",
    "Case Filed",
    "In Progress",
    "Hearing Scheduled",
    "Awaiting Judgment",
];
async function listDeals(filters) {
    const page = filters?.page || 1;
    const perPage = filters?.perPage || 20;
    try {
        if (filters?.search) {
            const encoded = encodeURIComponent(filters.search);
            const data = await zohoRequest("Deals/search", "GET", `?criteria=(Deal_Name:contains:${encoded})&page=${page}&per_page=${perPage}`);
            return { deals: data.data || [], count: data.info?.count || 0, pageInfo: data.info };
        }
        if (filters?.stage) {
            const encoded = encodeURIComponent(filters.stage);
            const data = await zohoRequest("Deals/search", "GET", `?criteria=(Stage:equals:${encoded})&page=${page}&per_page=${perPage}`);
            return { deals: data.data || [], count: data.info?.count || 0, pageInfo: data.info };
        }
        const data = await zohoRequest("Deals", "GET", `?page=${page}&per_page=${perPage}&fields=Deal_Name,Amount,Stage,Contact_Name,Closing_Date,Type,Pipeline,Description,Created_Time`);
        return { deals: data.data || [], count: data.info?.count || 0, pageInfo: data.info };
    }
    catch (err) {
        console.error("[crm-api] listDeals error:", err);
        return { deals: [], count: 0 };
    }
}
async function createDeal(deal) {
    try {
        const data = await zohoRequest("Deals", "POST", undefined, {
            data: [{ ...deal, trigger: ["workflow"] }],
        });
        const created = data.data?.[0];
        if (created?.details?.id) {
            console.log(`[crm-api] Deal created: ${created.details.id}`);
            return { success: true, deal: created };
        }
        return { success: false, error: "No ID returned from Zoho" };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
async function updateDeal(id, updates) {
    try {
        const data = await zohoRequest("Deals", "PUT", `/${id}`, { data: [updates] });
        console.log(`[crm-api] Deal updated: ${id}`);
        return { success: true, deal: data.data?.[0] };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
async function deleteDeal(id) {
    try {
        await zohoRequest("Deals", "DELETE", `?ids=${id}`);
        console.log(`[crm-api] Deal deleted: ${id}`);
        return { success: true };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}
// ─── AUTO-SYNC: Case → Zoho Deal + Contact ───────────────────────
// Called when a lawyer creates a new case in AI Draft
async function syncCaseToCRM(caseData) {
    try {
        let contactId;
        // 1. Create or find Contact for the client
        if (caseData.clientName && caseData.clientEmail) {
            // Search existing contact by email
            try {
                const searchRes = await zohoRequest("Contacts/search", "GET", `?criteria=(Email:equals:${encodeURIComponent(caseData.clientEmail || "")})`);
                if (searchRes.data?.length > 0) {
                    contactId = searchRes.data[0].id;
                    console.log(`[crm-api] Found existing contact: ${contactId}`);
                }
            }
            catch { /* contact not found — create new */ }
            if (!contactId) {
                const nameParts = (caseData.clientName || "").split(" ");
                const contactResult = await createContact({
                    First_Name: nameParts[0] || "",
                    Last_Name: nameParts.slice(1).join(" ") || "",
                    Email: caseData.clientEmail || "",
                    Phone: caseData.clientPhone || "",
                    Lead_Source: "AI Draft Platform",
                    Description: `Client from case: ${caseData.title || "N/A"}. Case Type: ${caseData.caseType || "N/A"}`,
                });
                if (contactResult.success && contactResult.contact?.details?.id) {
                    contactId = contactResult.contact.details.id;
                }
            }
        }
        // 2. Create Deal for the case
        const dealResult = await createDeal({
            Deal_Name: `${caseData.title || "New Case"} — ${caseData.clientName || "Client"}`,
            Amount: caseData.retainerAmount || 0,
            Stage: "Qualification",
            Contact_Name: contactId ? { id: contactId } : undefined,
            Closing_Date: caseData.expectedResolution || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
            Description: `Case auto-synced from AI Draft. Type: ${caseData.caseType || "N/A"}. Jurisdiction: ${caseData.jurisdiction || "N/A"}. Court: ${caseData.courtName || "N/A"}`,
            Type: "New Business",
            Pipeline: "Standard",
            Case_Reference: caseData.caseNumber || caseData.id || "",
        });
        return {
            success: true,
            contactId,
            dealId: dealResult.deal?.details?.id,
        };
    }
    catch (err) {
        console.error("[crm-api] syncCaseToCRM error:", err);
        return { success: false, error: err.message };
    }
}
// ─── DASHBOARD STATS ────────────────────────────────────────────
async function getCRMStats() {
    try {
        const [contactsRes, leadsRes, dealsRes] = await Promise.allSettled([
            zohoRequest("Contacts", "GET", "?page=1&per_page=1"),
            zohoRequest("Leads", "GET", "?page=1&per_page=1"),
            zohoRequest("Deals", "GET", "?page=1&per_page=1&fields=Stage,Amount"),
        ]);
        const contacts = contactsRes.status === "fulfilled" ? contactsRes.value : null;
        const leads = leadsRes.status === "fulfilled" ? leadsRes.value : null;
        const deals = dealsRes.status === "fulfilled" ? dealsRes.value : null;
        const allDeals = deals?.data || [];
        const activeDeals = allDeals.filter((d) => !["Closed Won", "Closed Lost"].includes(d.Stage));
        const wonDeals = allDeals.filter((d) => d.Stage === "Closed Won");
        return {
            totalContacts: contacts?.info?.count || 0,
            totalLeads: leads?.info?.count || 0,
            totalDeals: deals?.info?.count || 0,
            activeDeals: activeDeals.length,
            wonDeals: wonDeals.length,
            totalPipelineValue: allDeals.reduce((sum, d) => sum + (d.Amount || 0), 0),
        };
    }
    catch (err) {
        console.error("[crm-api] getCRMStats error:", err);
        return {
            totalContacts: 0,
            totalLeads: 0,
            totalDeals: 0,
            activeDeals: 0,
            wonDeals: 0,
            totalPipelineValue: 0,
        };
    }
}
// ─── FIREBASE AUTH VERIFICATION ─────────────────────────────────
async function verifyToken(token) {
    try {
        const db = admin.firestore();
        // Simple token verification via Firestore user lookup
        const usersRef = db.collection("users");
        const snapshot = await usersRef.where("token", "==", token).limit(1).get();
        return !snapshot.empty;
    }
    catch {
        // Fallback: accept any non-empty token (dev mode)
        return !!token;
    }
}
// ─── MAIN HTTP FUNCTION ────────────────────────────────────────
exports.apiCrmApi = v2_1.https.onRequest({
    timeoutSeconds: 30,
    region: "us-central1",
}, async (req, res) => {
    corsHandler(req, res, async () => {
        try {
            if (req.method !== "POST") {
                res.status(405).json({ error: "Method not allowed" });
                return;
            }
            const body = req.body;
            const { action, uid, data } = body;
            if (!action) {
                res.status(400).json({ error: "Missing action parameter" });
                return;
            }
            console.log(`[crm-api] Action: ${action}, UID: ${uid || "unknown"}`);
            // ── CONTACTS ──
            if (action === "list_contacts") {
                const result = await listContacts(data?.filters);
                res.status(200).json({ success: true, ...result });
                return;
            }
            if (action === "create_contact") {
                const result = await createContact(data?.contact);
                res.status(200).json({ success: true, ...result });
                return;
            }
            if (action === "update_contact") {
                const result = await updateContact(data?.id, data?.updates);
                res.status(200).json({ success: true, ...result });
                return;
            }
            if (action === "delete_contact") {
                const result = await deleteContact(data?.id);
                res.status(200).json({ success: true, ...result });
                return;
            }
            // ── LEADS ──
            if (action === "list_leads") {
                const result = await listLeads(data?.filters);
                res.status(200).json({ success: true, ...result });
                return;
            }
            if (action === "create_lead") {
                const result = await createLead(data?.lead);
                res.status(200).json({ success: true, ...result });
                return;
            }
            if (action === "update_lead") {
                const result = await updateLead(data?.id, data?.updates);
                res.status(200).json({ success: true, ...result });
                return;
            }
            if (action === "convert_lead") {
                const result = await convertLead(data?.id, data?.contactData, data?.dealData);
                res.status(200).json({ success: true, ...result });
                return;
            }
            if (action === "delete_lead") {
                const result = await deleteLead(data?.id);
                res.status(200).json({ success: true, ...result });
                return;
            }
            // ── DEALS ──
            if (action === "list_deals") {
                const result = await listDeals(data?.filters);
                res.status(200).json({ success: true, ...result });
                return;
            }
            if (action === "create_deal") {
                const result = await createDeal(data?.deal);
                res.status(200).json({ success: true, ...result });
                return;
            }
            if (action === "update_deal") {
                const result = await updateDeal(data?.id, data?.updates);
                res.status(200).json({ success: true, ...result });
                return;
            }
            if (action === "delete_deal") {
                const result = await deleteDeal(data?.id);
                res.status(200).json({ success: true, ...result });
                return;
            }
            // ── SYNC CASE → CRM ──
            if (action === "sync_case") {
                const result = await syncCaseToCRM(data?.case);
                res.status(200).json({ success: true, ...result });
                return;
            }
            // ── STATS ──
            if (action === "get_stats") {
                const stats = await getCRMStats();
                res.status(200).json({ success: true, stats });
                return;
            }
            // ── DEAL STAGES ──
            if (action === "get_stages") {
                res.status(200).json({ success: true, stages: DEAL_STAGES });
                return;
            }
            // ── FIRESTORE USERS (fallback when Zoho not configured) ──
            if (action === "list_firestore_users") {
                try {
                    const db = admin.firestore();
                    const snapshot = await db.collection("users").orderBy("createdAt", "desc").limit(500).get();
                    const users = snapshot.docs.map((doc) => {
                        const d = doc.data();
                        return {
                            uid: d.uid || doc.id,
                            email: d.email || null,
                            displayName: d.displayName || null,
                            phoneNumber: d.phoneNumber || null,
                            photoURL: d.photoURL || null,
                            authProvider: d.authProvider || null,
                            source: d.source || null,
                            createdAt: d.createdAt?._seconds ? new Date(d.createdAt._seconds * 1000).toISOString() : (d.createdAt || null),
                            lastLoginAt: d.lastLoginAt?._seconds ? new Date(d.lastLoginAt._seconds * 1000).toISOString() : (d.lastLoginAt || null),
                            crmSynced: d.crmSynced || false,
                        };
                    });
                    res.status(200).json({ success: true, users });
                }
                catch (err) {
                    console.error("[crm-api] Firestore users error:", err);
                    res.status(200).json({ success: true, users: [] });
                }
                return;
            }
            res.status(400).json({ error: `Unknown action: ${action}` });
        }
        catch (err) {
            console.error("[crm-api] Error:", err);
            res.status(500).json({
                error: "CRM operation failed",
                details: err instanceof Error ? err.message : "Unknown error",
            });
        }
    });
});
