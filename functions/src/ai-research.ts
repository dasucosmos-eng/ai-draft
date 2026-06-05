// @ts-nocheck
import { aiFunctionSecrets } from "./secrets";
import * as admin from "firebase-admin";
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

import { https } from "firebase-functions/v2";
import { restrictedCors } from "./cors";
import { performLegalSearch, analyzeLegalData } from "./legal-search";

const corsHandler = restrictedCors;

export const apiAiResearch = https.onRequest(
  {
    timeoutSeconds: 300,
    region: "us-central1", secrets: aiFunctionSecrets,
  },
  async (req, res) => {
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
      let uid: string;
      try {
        const decoded = await admin.auth().verifyIdToken(authToken);
        uid = decoded.uid;
      } catch {
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
        const searchData = await performLegalSearch(query, { court, year, caseType });
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
        const data = await analyzeLegalData(searchData);
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
      } catch (error) {
        console.error("[ai-research] Error:", error);
        res.status(500).json({
          error: "Failed to complete research",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
);
