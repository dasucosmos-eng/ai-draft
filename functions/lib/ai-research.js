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
exports.apiAiResearch = void 0;
// @ts-nocheck
const secrets_1 = require("./secrets");
const admin = __importStar(require("firebase-admin"));
// ai-research — Firebase Cloud Function (v6 — FULL pipeline, AI via Gemini (direct API))
// 
// ARCHITECTURE:
//   - AI extraction uses Google Gemini API (direct)
//   - Indian Kanoon search directly (Firebase → IK API)
//   - Full pipeline: Search → Fetch docs → AI extraction → Return structured results
//
// Pipeline:
//   1. Indian Kanoon API (3M+ judgments)
//   2. Google Custom Search API (web search for recent/supplementary results)
//   3. Fetch full content from top results
//   4. AI extracts structured data with VERBATIM quotes (via Gemini 2.0 Flash)
//   5. Source excerpts + raw judgment text returned for lawyer verification
const v2_1 = require("firebase-functions/v2");
const cors_1 = require("./cors");
const legal_search_1 = require("./legal-search");
const corsHandler = cors_1.restrictedCors;
exports.apiAiResearch = v2_1.https.onRequest({
    timeoutSeconds: 300,
    region: "us-central1", secrets: secrets_1.aiFunctionSecrets,
}, async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        const authToken = (req.headers.authorization || "").replace("Bearer ", "") || req.body?.token;
        if (!authToken) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }
        let uid;
        try {
            const decoded = await admin.auth().verifyIdToken(authToken);
            uid = decoded.uid;
        }
        catch {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }
        try {
            const { query, court, year, caseType } = req.body;
            if (!query) {
                res.status(400).json({ error: "Query is required" });
                return;
            }
            console.log(`[ai-research] Query: "${query}" | court: ${court || "all"} | year: ${year || "all"} | type: ${caseType || "all"}`);
            // ─── Search REAL data from multiple sources ───
            const searchStart = Date.now();
            const searchData = await (0, legal_search_1.performLegalSearch)(query, { court, year, caseType });
            const searchTime = Date.now() - searchStart;
            console.log(`[ai-research] Search completed in ${searchTime}ms: ${searchData.ikResults.length} IK results, ${searchData.webResults.length} web results, ${searchData.fetchedDocs.length} docs fetched (${searchData.fetchedDocs.reduce((sum, d) => sum + d.text.length, 0)} chars total), sources: [${searchData.dataSources.join(", ")}]`);
            if (!searchData.hasRealData) {
                console.log("[ai-research] No real data found for query:", query);
                res.json({
                    results: [],
                    suggestedArguments: [],
                    relatedPrecedents: [],
                    _meta: {
                        source: "no-data",
                        message: "No matching cases found in Indian Kanoon database or legal web sources. The case may be very recent (2026+) and not yet indexed. Try: (1) searching with different keywords, (2) checking LiveLaw.in directly, or (3) searching on the Supreme Court website.",
                        ikResultsCount: 0,
                        webResultsCount: 0,
                        docsFetchedCount: 0,
                        searchTimeMs: searchTime,
                        dataSources: [],
                    },
                });
                return;
            }
            // ─── Extract structured data from REAL documents with VERBATIM quotes ───
            const analysisStart = Date.now();
            const data = await (0, legal_search_1.analyzeLegalData)(searchData);
            const analysisTime = Date.now() - analysisStart;
            console.log(`[ai-research] Extraction completed in ${analysisTime}ms: ${data.results.length} cases, ${data.results.reduce((sum, r) => sum + (r.keyHoldings?.length || 0), 0)} total holdings, ${data.suggestedArguments.length} arguments`);
            // Add metadata
            const responseMeta = {
                source: "real-data",
                dataSources: searchData.dataSources,
                ikResultsCount: searchData.ikResults.length,
                webResultsCount: searchData.webResults.length,
                docsFetchedCount: searchData.fetchedDocs.length,
                totalCharsFetched: searchData.fetchedDocs.reduce((sum, d) => sum + d.text.length, 0),
                searchTimeMs: searchTime,
                analysisTimeMs: analysisTime,
                totalFound: searchData.totalFound,
            };
            console.log(`[ai-research] Total: ${searchTime + analysisTime}ms | ${data.results.length} results returned`);
            res.json({
                success: true,
                results: data.results || [],
                suggestedArguments: data.suggestedArguments || [],
                relatedPrecedents: data.relatedPrecedents || [],
                _meta: responseMeta,
            });
        }
        catch (error) {
            console.error("[ai-research] Error:", error);
            res.status(500).json({
                error: "Failed to complete research",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });
});
