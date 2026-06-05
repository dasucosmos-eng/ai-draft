"use strict";
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
exports.apiUserData = void 0;
// @ts-nocheck
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const cors_1 = require("./cors");
const secrets_1 = require("./secrets");
/* ─── Verify Token (Firebase ID Token) ─── */
async function verifyUid(req) {
    // Support three token sources:
    // 1. Authorization header (standard)
    // 2. req.body.token (explicit body field)
    // 3. req.body._token (fallback for sendBeacon which can't set headers)
    const token = (req.headers.authorization || "").replace("Bearer ", "") ||
        req.body?.token ||
        req.body?._token;
    if (!token)
        return null;
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        return decoded.uid || null;
    }
    catch {
        return null;
    }
}
/* ─── Firestore Helpers ─── */
function userDataRef(uid) {
    return admin.firestore().collection("users").doc(uid).collection("app").doc("data");
}
/* ─── Handler ─── */
const handler = async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return res.status(204).send();
    }
    // SAFETY: If req.body is not parsed (e.g., Content-Type was text/plain instead
    // of application/json), try to parse the raw body manually.
    // This can happen with certain browsers' sendBeacon or fetch keepalive.
    let body = req.body;
    if (!body || typeof body === 'string') {
        try {
            body = JSON.parse(typeof body === 'string' ? body : (req.rawBody || '{}'));
        }
        catch {
            body = {};
        }
    }
    // If body is still not an object, give up
    if (!body || typeof body !== 'object')
        body = {};
    // Reassign to req.body so downstream code works unchanged
    req.body = body;
    const uid = await verifyUid(req);
    if (!uid) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        if (req.method === "GET") {
            // Load all user data
            const doc = await userDataRef(uid).get();
            if (!doc.exists) {
                return res.json({ success: true, data: {} });
            }
            return res.json({ success: true, data: doc.data() });
        }
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }
        const { action } = req.body || {};
        switch (action) {
            case "load": {
                const doc = await userDataRef(uid).get();
                if (!doc.exists) {
                    return res.json({ success: true, data: {} });
                }
                return res.json({ success: true, data: doc.data() });
            }
            case "save": {
                // Smart merge — arrays are merged by ID (upsert), scalars are replaced
                const { profile, cases, documents, tasks, timelineEvents, invoices, clients, chatMessages, subscription } = req.body || {};
                const updateData = {};
                if (profile !== undefined)
                    updateData.profile = profile;
                // Merge arrays by ID — read existing, upsert incoming, return union
                const existingDoc = await userDataRef(uid).get();
                const existing = existingDoc.exists ? existingDoc.data() : {};
                // Merge clients by ID (same logic as other arrays)
                if (clients !== undefined && Array.isArray(clients)) {
                    const existingClients = existing.clients || [];
                    const existingClientIds = new Set(existingClients.map((c) => c.id));
                    const incomingClientIds = new Set(clients.map((c) => c.id));
                    updateData.clients = [
                        ...existingClients.filter((c) => !incomingClientIds.has(c.id)),
                        ...clients,
                    ];
                }
                else if (clients === undefined && existing.clients) {
                    // Don't overwrite existing clients if none sent
                }
                if (subscription !== undefined)
                    updateData.subscription = subscription;
                // ANTI-DATA-LOSS: Only block if ALL fields (including clients, profile, chatMessages)
                // are empty/undefined AND existing Firestore doc has real data.
                // This prevents blocking legitimate saves that have clients but empty cases
                // (e.g., when addClient fires before addCase).
                const hasIncomingData = (Array.isArray(clients) && clients.length > 0) ||
                    (Array.isArray(cases) && cases.length > 0) ||
                    (Array.isArray(documents) && documents.length > 0) ||
                    (Array.isArray(tasks) && tasks.length > 0) ||
                    (Array.isArray(timelineEvents) && timelineEvents.length > 0) ||
                    (Array.isArray(invoices) && invoices.length > 0) ||
                    (Array.isArray(chatMessages) && chatMessages.length > 0) ||
                    (profile && typeof profile === 'object' && Object.keys(profile).length > 0);
                if (!hasIncomingData) {
                    const existingHasCases = (existing.cases?.length || 0) > 0;
                    const existingHasDocs = (existing.documents?.length || 0) > 0;
                    const existingHasClients = (existing.clients?.length || 0) > 0;
                    const existingHasChat = (existing.chatMessages?.length || 0) > 0;
                    const existingHasData = existingHasCases || existingHasDocs || existingHasClients || existingHasChat;
                    if (existingHasData) {
                        console.warn(`[user-data] SAVE BLOCKED: incoming save has no data at all but`, `Firestore has data (cases:${existing.cases?.length || 0},`, `docs:${existing.documents?.length || 0}, clients:${existing.clients?.length || 0}).`, `Preventing data loss.`);
                        return res.json({
                            success: true,
                            warning: "Save blocked: would overwrite existing data with empty data",
                        });
                    }
                }
                if (cases !== undefined && Array.isArray(cases)) {
                    const existingCases = existing.cases || [];
                    const existingIds = new Set(existingCases.map((c) => c.id));
                    const incomingIds = new Set(cases.map((c) => c.id));
                    // Union: keep existing items not in incoming, add all incoming
                    const merged = [
                        ...existingCases.filter((c) => !incomingIds.has(c.id)),
                        ...cases,
                    ];
                    updateData.cases = merged;
                }
                if (documents !== undefined && Array.isArray(documents)) {
                    const existingDocs = existing.documents || [];
                    const existingIds = new Set(existingDocs.map((d) => d.id));
                    const incomingIds = new Set(documents.map((d) => d.id));
                    updateData.documents = [
                        ...existingDocs.filter((d) => !incomingIds.has(d.id)),
                        ...documents,
                    ];
                }
                if (tasks !== undefined && Array.isArray(tasks)) {
                    const existingTasks = existing.tasks || [];
                    const existingIds = new Set(existingTasks.map((t) => t.id));
                    const incomingIds = new Set(tasks.map((t) => t.id));
                    updateData.tasks = [
                        ...existingTasks.filter((t) => !incomingIds.has(t.id)),
                        ...tasks,
                    ];
                }
                if (timelineEvents !== undefined && Array.isArray(timelineEvents)) {
                    const existingEvents = existing.timelineEvents || [];
                    const existingIds = new Set(existingEvents.map((e) => e.id));
                    const incomingIds = new Set(timelineEvents.map((e) => e.id));
                    updateData.timelineEvents = [
                        ...existingEvents.filter((e) => !incomingIds.has(e.id)),
                        ...timelineEvents,
                    ];
                }
                if (invoices !== undefined && Array.isArray(invoices)) {
                    const existingInvoices = existing.invoices || [];
                    const existingIds = new Set(existingInvoices.map((i) => i.id));
                    const incomingIds = new Set(invoices.map((i) => i.id));
                    updateData.invoices = [
                        ...existingInvoices.filter((i) => !incomingIds.has(i.id)),
                        ...invoices,
                    ];
                }
                if (chatMessages !== undefined && Array.isArray(chatMessages)) {
                    const existingChat = existing.chatMessages || [];
                    const existingIds = new Set(existingChat.map((m) => m.id));
                    const incomingIds = new Set(chatMessages.map((m) => m.id));
                    updateData.chatMessages = [
                        ...existingChat.filter((m) => !incomingIds.has(m.id)),
                        ...chatMessages,
                    ];
                }
                updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
                await userDataRef(uid).set(updateData, { merge: true });
                return res.json({ success: true });
            }
            case "saveProfile": {
                const { profile } = req.body || {};
                if (!profile)
                    return res.status(400).json({ error: "No profile data" });
                await userDataRef(uid).set({
                    profile,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                return res.json({ success: true });
            }
            case "saveCase": {
                const { case: caseItem } = req.body || {};
                if (!caseItem || !caseItem.id)
                    return res.status(400).json({ error: "No case data" });
                // Use Firestore transaction to prevent race conditions on concurrent saves
                await admin.firestore().runTransaction(async (transaction) => {
                    const docRef = userDataRef(uid);
                    const doc = await transaction.get(docRef);
                    const currentCases = doc.exists ? (doc.data()?.cases || []) : [];
                    const idx = currentCases.findIndex((c) => c.id === caseItem.id);
                    if (idx >= 0) {
                        currentCases[idx] = caseItem;
                    }
                    else {
                        currentCases.unshift(caseItem);
                    }
                    transaction.set(docRef, { cases: currentCases, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                });
                return res.json({ success: true });
            }
            case "deleteCase": {
                const { caseId } = req.body || {};
                if (!caseId)
                    return res.status(400).json({ error: "No case ID" });
                // Use Firestore transaction to prevent race conditions
                await admin.firestore().runTransaction(async (transaction) => {
                    const docRef = userDataRef(uid);
                    const doc = await transaction.get(docRef);
                    const currentCases = doc.exists ? (doc.data()?.cases || []) : [];
                    const filtered = currentCases.filter((c) => c.id !== caseId);
                    transaction.set(docRef, { cases: filtered, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                });
                return res.json({ success: true });
            }
            default:
                return res.status(400).json({ error: "Unknown action" });
        }
    }
    catch (err) {
        console.error("[user-data] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};
const corsHandler = cors_1.restrictedCors;
exports.apiUserData = v2_1.https.onRequest({ secrets: secrets_1.aiFunctionSecrets }, async (req, res) => {
    return corsHandler(req, res, async () => {
        return handler(req, res);
    });
});
