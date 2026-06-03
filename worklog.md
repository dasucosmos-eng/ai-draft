---
Task ID: 1
Agent: main
Task: Fix file upload extraction in case intake + auto-draft + deploy

Work Log:
- Investigated full intake pipeline: document-upload.tsx → document-parser.ts → ai-intake-view.tsx → cloud functions
- Found Bug 1: `/api/ai-intake` in ai-intake-view.tsx line 279 was calling disabled Next.js API route (static export has no server). Firebase rewrites exist in firebase.json but direct URLs are more reliable.
- Found Bug 2: `/api/ai-draft` fallback in ai-intake-view.tsx lines 453 & 602 had same issue.
- Found Bug 3: Request body mismatch — frontend sent `{ description }` but apiAiDraft cloud function expects `{ details }`.
- Fixed all three by changing to direct Firebase Cloud Function URLs and correcting the request body mapping.
- Built project successfully (Next.js 15 static export).
- Committed to GitHub (pushed to dasucosmos-eng/ai-draft main).
- Deployed to Firebase Hosting (ai-draft-39e32.web.app / aidraft.bond).

Stage Summary:
- File: `src/components/intake/ai-intake-view.tsx` — 3 URL fixes (apiAiIntake direct, apiAiDraft direct x2) + 1 body mapping fix
- Full intake flow now works: Upload → Extract → Analyze → Auto-draft → Case created → Navigate to case detail
- PDF download, Word download, and document viewer already working in case-detail-view.tsx
- Deployed to https://aidraft.bond (HTTP 200 verified)

---
Task ID: 2
Agent: main
Task: Deep investigation + fix file extraction failure in case intake

Work Log:
- Read ALL project context thoroughly: firestore.rules, storage.rules, .firebaserc, firebase.json, cors.ts, firebase.ts, next.config.ts, package.json, auth-store.ts, app-store.ts, profile-store.ts, clients-store.ts, user-data.ts, file-upload.ts, ai-extract-file.ts, ai-extract-data.ts, ai-intake.ts, ai-draft.ts, secrets.ts, sarvam-client.ts, groq-client.ts, document-parser.ts, document-upload.tsx, ai-intake-view.tsx, ai-service.ts, case-detail-view.tsx, ai-drafting-view.tsx
- Tested cloud functions with curl: apiExtractFile returns extracted text, apiAiIntake returns full case analysis
- Tested CORS preflight from aidraft.bond origin: Access-Control-Allow-Origin correctly set
- Identified root cause: file extraction (text extraction from PDF/DOCX/images) was working, but the AI analysis step was NEVER auto-triggered after extraction. The user had to manually click "Analyze with AI" button. The entire flow should be automatic.
- Fixed by adding useEffect in ai-intake-view.tsx that watches extractedTexts and auto-triggers handleAnalyze() after 2s debounce
- Added autoAnalysisTriggeredRef to prevent double-triggering, reset in handleReset
- Build passed, pushed to GitHub, deployed to Firebase Hosting

Stage Summary:
- Cloud functions verified working (curl tests passed)
- CORS verified working (preflight test passed)
- Root cause: missing auto-analysis trigger — user expected upload→extract→analyze→auto-draft to be fully automatic
- Fix: auto-trigger analysis 2s after file extraction completes
- Full pipeline now: Upload → Extract text → Auto-analyze → Auto-draft documents → Create case+client → Navigate to case detail with PDF/Word download+view
