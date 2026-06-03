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
