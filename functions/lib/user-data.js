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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiUserData = void 0;
// @ts-nocheck
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cors_1 = require("./cors");
const secrets_1 = require("./secrets");
/* ─── Verify Token ─── */
async function verifyUid(req) {
    const JWT_SECRET = process.env.JWT_SECRET || "aidraft-auth-secret-2026";
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded.uid || null;
    }
    catch {
        return null;
    }
}
/* ─── Firestore Helpers ─── */
function userDataRef(uid) {
    return admin.firestore().collection("users").doc(uid).collection("data").doc("app");
}
/* ─── Handler ─── */
const handler = async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return res.status(204).send();
    }
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
                const { profile, cases, documents, tasks, timelineEvents, invoices, clients } = req.body || {};
                const updateData = {};
                if (profile !== undefined)
                    updateData.profile = profile;
                if (clients !== undefined)
                    updateData.clients = clients;
                // Merge arrays by ID — read existing, upsert incoming, return union
                const existingDoc = await userDataRef(uid).get();
                const existing = existingDoc.exists ? existingDoc.data() : {};
                // ANTI-DATA-LOSS: If the incoming save has ALL arrays empty AND
                // the existing Firestore doc has real data, REJECT the save to prevent
                // empty data from overwriting real data. This can happen when a
                // heartbeat fires before loadFromFirestore completes, or when
                // beforeunload sends stale empty state.
                const incomingArrays = [cases, documents, tasks, timelineEvents, invoices].filter((arr) => Array.isArray(arr));
                const allIncomingEmpty = incomingArrays.length > 0 && incomingArrays.every((arr) => arr.length === 0);
                const existingHasCases = (existing.cases?.length || 0) > 0;
                const existingHasDocs = (existing.documents?.length || 0) > 0;
                const existingHasTasks = (existing.tasks?.length || 0) > 0;
                const existingHasEvents = (existing.timelineEvents?.length || 0) > 0;
                const existingHasInvoices = (existing.invoices?.length || 0) > 0;
                const existingHasData = existingHasCases || existingHasDocs || existingHasTasks ||
                    existingHasEvents || existingHasInvoices;
                if (allIncomingEmpty && existingHasData) {
                    console.warn(`[user-data] SAVE BLOCKED: incoming save has all empty arrays but`, `Firestore has data (cases:${existing.cases?.length || 0},`, `docs:${existing.documents?.length || 0}, tasks:${existing.tasks?.length || 0}).`, `Preventing data loss.`);
                    return res.json({
                        success: true,
                        warning: "Save blocked: would overwrite existing data with empty data",
                    });
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
                // Get current cases array
                const doc = await userDataRef(uid).get();
                const currentCases = doc.exists ? (doc.data()?.cases || []) : [];
                const idx = currentCases.findIndex((c) => c.id === caseItem.id);
                if (idx >= 0) {
                    currentCases[idx] = caseItem;
                }
                else {
                    currentCases.unshift(caseItem);
                }
                await userDataRef(uid).set({ cases: currentCases, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                return res.json({ success: true });
            }
            case "deleteCase": {
                const { caseId } = req.body || {};
                if (!caseId)
                    return res.status(400).json({ error: "No case ID" });
                const doc = await userDataRef(uid).get();
                const currentCases = doc.exists ? (doc.data()?.cases || []) : [];
                const filtered = currentCases.filter((c) => c.id !== caseId);
                await userDataRef(uid).set({ cases: filtered, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                return res.json({ success: true });
            }
            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
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
