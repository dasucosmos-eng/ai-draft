// @ts-nocheck
import { https } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import { Request, Response } from "express";
import * as admin from "firebase-admin";
import jwt from "jsonwebtoken";
import { restrictedCors } from "./cors";
import { aiFunctionSecrets } from "./secrets";
import { parseLLMJSON } from "./parse-json";


/* ─── Types ─── */

interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  barCouncilNumber: string;
  firmName: string;
  city: string;
  firmAddress: string;
  practiceArea: string;
  stampLine: string;
  logoUrl: string;
  isComplete: boolean;
  completedAt: string | null;
}

interface UserCase {
  id: string;
  caseNumber?: string;
  title: string;
  description?: string;
  caseType: string;
  subType?: string;
  status: string;
  priority: string;
  jurisdiction?: string;
  courtName?: string;
  judgeName?: string;
  filingDate?: string;
  nextHearing?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  tasksCount?: number;
  documentsCount?: number;
  upcomingEvents?: number;
  aiInsights?: string;
  createdAt: string;
  updatedAt: string;
}

/* ─── Verify Token ─── */

async function verifyUid(req: Request): Promise<string | null> {
  const JWT_SECRET = process.env.JWT_SECRET || "aidraft-auth-secret-2026";
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
    const decoded = jwt.verify(token, JWT_SECRET) as { uid?: string };
    return decoded.uid || null;
  } catch {
    return null;
  }
}

/* ─── Firestore Helpers ─── */

function userDataRef(uid: string) {
  return admin.firestore().collection("users").doc(uid).collection("data").doc("app");
}

/* ─── Handler ─── */

const handler = async (req: Request, res: Response) => {
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
    } catch {
      body = {};
    }
  }
  // If body is still not an object, give up
  if (!body || typeof body !== 'object') body = {};
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
        const updateData: Record<string, any> = {};
        if (profile !== undefined) updateData.profile = profile;

        // Merge arrays by ID — read existing, upsert incoming, return union
        const existingDoc = await userDataRef(uid).get();
        const existing = existingDoc.exists ? existingDoc.data() : {};

        // Merge clients by ID (same logic as other arrays)
        if (clients !== undefined && Array.isArray(clients)) {
          const existingClients: any[] = existing.clients || [];
          const existingClientIds = new Set(existingClients.map((c: any) => c.id));
          const incomingClientIds = new Set(clients.map((c: any) => c.id));
          updateData.clients = [
            ...existingClients.filter((c: any) => !incomingClientIds.has(c.id)),
            ...clients,
          ];
        } else if (clients === undefined && existing.clients) {
          // Don't overwrite existing clients if none sent
        }

        if (subscription !== undefined) updateData.subscription = subscription;

        // ANTI-DATA-LOSS: Only block if ALL fields (including clients, profile, chatMessages)
        // are empty/undefined AND existing Firestore doc has real data.
        // This prevents blocking legitimate saves that have clients but empty cases
        // (e.g., when addClient fires before addCase).
        const hasIncomingData =
          (Array.isArray(clients) && clients.length > 0) ||
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
            console.warn(
              `[user-data] SAVE BLOCKED: incoming save has no data at all but`,
              `Firestore has data (cases:${existing.cases?.length || 0},`,
              `docs:${existing.documents?.length || 0}, clients:${existing.clients?.length || 0}).`,
              `Preventing data loss.`
            );
            return res.json({
              success: true,
              warning: "Save blocked: would overwrite existing data with empty data",
            });
          }
        }

        if (cases !== undefined && Array.isArray(cases)) {
          const existingCases: any[] = existing.cases || [];
          const existingIds = new Set(existingCases.map((c: any) => c.id));
          const incomingIds = new Set(cases.map((c: any) => c.id));
          // Union: keep existing items not in incoming, add all incoming
          const merged = [
            ...existingCases.filter((c: any) => !incomingIds.has(c.id)),
            ...cases,
          ];
          updateData.cases = merged;
        }
        if (documents !== undefined && Array.isArray(documents)) {
          const existingDocs: any[] = existing.documents || [];
          const existingIds = new Set(existingDocs.map((d: any) => d.id));
          const incomingIds = new Set(documents.map((d: any) => d.id));
          updateData.documents = [
            ...existingDocs.filter((d: any) => !incomingIds.has(d.id)),
            ...documents,
          ];
        }
        if (tasks !== undefined && Array.isArray(tasks)) {
          const existingTasks: any[] = existing.tasks || [];
          const existingIds = new Set(existingTasks.map((t: any) => t.id));
          const incomingIds = new Set(tasks.map((t: any) => t.id));
          updateData.tasks = [
            ...existingTasks.filter((t: any) => !incomingIds.has(t.id)),
            ...tasks,
          ];
        }
        if (timelineEvents !== undefined && Array.isArray(timelineEvents)) {
          const existingEvents: any[] = existing.timelineEvents || [];
          const existingIds = new Set(existingEvents.map((e: any) => e.id));
          const incomingIds = new Set(timelineEvents.map((e: any) => e.id));
          updateData.timelineEvents = [
            ...existingEvents.filter((e: any) => !incomingIds.has(e.id)),
            ...timelineEvents,
          ];
        }
        if (invoices !== undefined && Array.isArray(invoices)) {
          const existingInvoices: any[] = existing.invoices || [];
          const existingIds = new Set(existingInvoices.map((i: any) => i.id));
          const incomingIds = new Set(invoices.map((i: any) => i.id));
          updateData.invoices = [
            ...existingInvoices.filter((i: any) => !incomingIds.has(i.id)),
            ...invoices,
          ];
        }
        if (chatMessages !== undefined && Array.isArray(chatMessages)) {
          const existingChat: any[] = existing.chatMessages || [];
          const existingIds = new Set(existingChat.map((m: any) => m.id));
          const incomingIds = new Set(chatMessages.map((m: any) => m.id));
          updateData.chatMessages = [
            ...existingChat.filter((m: any) => !incomingIds.has(m.id)),
            ...chatMessages,
          ];
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await userDataRef(uid).set(updateData, { merge: true });
        return res.json({ success: true });
      }

      case "saveProfile": {
        const { profile } = req.body || {};
        if (!profile) return res.status(400).json({ error: "No profile data" });
        await userDataRef(uid).set({
          profile,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return res.json({ success: true });
      }

      case "saveCase": {
        const { case: caseItem } = req.body || {};
        if (!caseItem || !caseItem.id) return res.status(400).json({ error: "No case data" });

        // Get current cases array
        const doc = await userDataRef(uid).get();
        const currentCases: UserCase[] = doc.exists ? (doc.data()?.cases || []) : [];
        const idx = currentCases.findIndex((c) => c.id === caseItem.id);

        if (idx >= 0) {
          currentCases[idx] = caseItem;
        } else {
          currentCases.unshift(caseItem);
        }

        await userDataRef(uid).set({ cases: currentCases, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return res.json({ success: true });
      }

      case "deleteCase": {
        const { caseId } = req.body || {};
        if (!caseId) return res.status(400).json({ error: "No case ID" });

        const doc = await userDataRef(uid).get();
        const currentCases: UserCase[] = doc.exists ? (doc.data()?.cases || []) : [];
        const filtered = currentCases.filter((c) => c.id !== caseId);

        await userDataRef(uid).set({ cases: filtered, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return res.json({ success: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error("[user-data] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const corsHandler = restrictedCors;

export const apiUserData = https.onRequest(
  { secrets: aiFunctionSecrets },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      return handler(req, res);
    });
  }
);
