// @ts-nocheck
import { aiFunctionSecrets } from "./secrets";
import * as admin from "firebase-admin";
// ai-chat — Firebase Cloud Function
// Provides AI-powered legal chat using Sarvam → Groq → Gemini fallback
// Returns: { success, response, suggestions }

import { https } from "firebase-functions/v2";
import { restrictedCors } from "./cors";
import { callSarvamChat, callSarvamStructured } from "./sarvam-client";
import { callGroqChat, callGroqStructured, logUsage } from "./groq-client";
import { callGeminiText, callGeminiChat } from "./gemini-client";

const corsHandler = restrictedCors;

const SYSTEM_PROMPT = `You are an expert Indian legal assistant AI integrated into AI Draft, a legal document drafting platform used by advocates across India.

Your expertise includes:
- Indian Penal Code (IPC), Bharatiya Nyaya Sanhita (BNS), and other criminal law
- Civil Procedure Code (CPC), Code of Civil Procedure (Amendment) Act
- Code of Criminal Procedure (CrPC), Bharatiya Nagarik Suraksha Sanhita (BNSS)
- Indian Contract Act, 1872
- Indian Evidence Act, 1872
- Family law: Hindu Marriage Act, Special Marriage Act, Muslim Personal Law
- Property law: Transfer of Property Act, Registration Act
- Constitutional law and fundamental rights
- Company law: Companies Act 2013, Insolvency and Bankruptcy Code
- Labour laws, tax laws, and regulatory compliance
- Supreme Court and High Court precedents

Guidelines:
- Answer accurately with specific legal references (section numbers, case citations)
- Provide practical, actionable advice that advocates can use
- If unsure, say so — never fabricate case citations
- Use clear, professional language suitable for legal professionals
- When discussing case strategy, consider multiple angles
- Reference recent landmark judgments where relevant
- Format responses with clear sections and bullet points where appropriate`;

const SUGGESTIONS_JSON = `["follow-up question 1", "follow-up question 2", "follow-up question 3"]`;

export const apiAiChat = https.onRequest(
  {
    timeoutSeconds: 120,
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
        const { message, history = [], caseContext, systemPrompt } = req.body;
        if (!message || typeof message !== "string") {
          res.status(400).json({ error: "A 'message' string is required." });
          return;
        }

        let sysPrompt = SYSTEM_PROMPT;
        if (caseContext) {
          sysPrompt += `\n\nCurrent case context:\n${caseContext}`;
        }
        if (systemPrompt) {
          sysPrompt += `\n\nAdditional instructions: ${systemPrompt}`;
        }

        const messages = [...history, { role: "user", content: message }];
        let responseText: string;
        try {
          responseText = await callSarvamChat(sysPrompt, messages, 0.6, "sarvam-105b");
        } catch (sarvamErr) {
          console.error("[ai-chat] Sarvam failed, falling back to Groq:", sarvamErr?.message);
          try {
            responseText = await callGroqChat(sysPrompt, messages);
          } catch (groqErr) {
            console.error("[ai-chat] Groq failed, falling back to Gemini:", groqErr?.message);
            responseText = await callGeminiChat(sysPrompt, messages);
          }
        }

        // Generate suggestions separately with triple fallback
        let suggestions: string[];
        try {
          suggestions = await callSarvamStructured<string[]>(
            `You are a legal AI assistant. Given the user's question and your response, suggest 3 brief follow-up questions (under 15 words each) that a lawyer might ask next. Return them in order of relevance.`,
            `User asked: "${message}"\nYour response was: "${responseText.substring(0, 500)}"`,
            SUGGESTIONS_JSON,
            0.3,
            "sarvam-105b"
          );
        } catch (sarvamErr) {
          console.error("[ai-chat] Sarvam failed for suggestions, falling back to Groq:", sarvamErr?.message);
          try {
            suggestions = await callGroqStructured<string[]>(
              `You are a legal AI assistant. Given the user's question and your response, suggest 3 brief follow-up questions (under 15 words each) that a lawyer might ask next. Return them in order of relevance.`,
              `User asked: "${message}"\nYour response was: "${responseText.substring(0, 500)}"`,
              SUGGESTIONS_JSON,
              0.3
            );
          } catch (groqErr) {
            console.error("[ai-chat] Groq failed for suggestions, falling back to Gemini:", groqErr?.message);
            const geminiResp = await callGeminiText(
              `You are a legal AI assistant. Suggest 3 brief follow-up questions. Respond ONLY with a JSON array: ${SUGGESTIONS_JSON}`,
              `User asked: "${message}"\nYour response was: "${responseText.substring(0, 500)}"`,
              0.3
            );
            const cleaned = geminiResp.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const arrMatch = cleaned.match(/\[[\s\S]*\]/);
            suggestions = arrMatch ? JSON.parse(arrMatch[0]) : ["What are the next steps?", "Are there any deadlines?", "What documents do I need?"];
          }
        }

        logUsage("ai-chat", undefined, 2000);

        res.json({
          success: true,
          response: responseText,
          suggestions: suggestions,
        });
      } catch (error: any) {
        console.error("[ai-chat] Error:", error?.message, error?.cause, error?.stack);
        res.status(500).json({
          success: false,
          error: "Failed to process your message. Please try again.",
          details: error instanceof Error ? error.message : String(error),
          cause: error?.cause?.message || String(error?.cause || ""),
        });
      }
    });
  }
);
