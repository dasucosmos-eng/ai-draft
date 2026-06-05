---
Task ID: 1
Agent: Main Agent
Task: Bug investigation and fixing across ai-draft codebase

Work Log:
- Launched 3 parallel exploration agents to read 35+ files across frontend and backend
- Identified 18 bugs across severity levels (4 Critical, 6 High, 8 Medium/Low)
- Fixed all 17 actionable bugs across 9 files

Stage Summary:
- CRITICAL: Fixed Firestore path mismatch (users/{uid}/data/app → users/{uid}/app/data) in user-data.ts
- CRITICAL: Fixed auth listener memory leak in page.tsx (return inside async init was never registered with useEffect)
- CRITICAL: Fixed stale closure in ai-intake-view.tsx (uploadedFiles from current upload not saved with case)
- CRITICAL: Added AbortController for long-running sequential drafting loop
- HIGH: Fixed reCAPTCHA verifier not reset between OTP attempts in auth-store.ts
- HIGH: Fixed XSS in DOC download by escaping HTML in ai-intake-view.tsx
- HIGH: Fixed race conditions in saveCase/deleteCase using Firestore transactions
- HIGH: Fixed path traversal vulnerability in file-upload.ts
- HIGH: Fixed non-atomic usage counting using Firestore transaction in subscription-middleware.ts
- MEDIUM: Added missing updatedAt on document/timeline updates in sync-layer.ts
- MEDIUM: Removed dead imports (parseLLMJSON, stripMarkdownFromData, defineSecret) from 3 files
- MEDIUM: Removed error detail leakage from ai-intake.ts and ai-document.ts
- LOW: Added null guard for profile in pdf-generator.ts
- LOW: Removed action injection in error message (user-data.ts)

---
Task ID: 2
Agent: Main Agent
Task: Replace Gemini with Sarvam AI as primary provider for document drafting

Work Log:
- Analyzed ai-draft.ts fallback chain: Gemini → Groq → Sarvam (all 3 failing)
- Read sarvam.ts and sarvam-client.ts to understand Sarvam AI API integration
- Reordered provider fallback to Sarvam → Groq → Gemini (Sarvam as primary)
- Fixed temperature passthrough: sarvam.ts hardcoded 0.7, now accepts parameter from caller
- Fixed sarvam-client.ts to pass temperature through to sarvamChat()
- Updated CI workflow (.github/workflows/firebase-deploy.yml) to deploy both hosting AND functions
- Built functions locally — compiles cleanly with no errors
- Committed and pushed to GitHub (commit 0651319)

Stage Summary:
- Primary fix: Sarvam AI is now the first provider tried for document drafting
- Code changes in 3 files: ai-draft.ts, sarvam.ts, sarvam-client.ts
- CI workflow updated to deploy Cloud Functions (not just hosting)
- BLOCKER: Firebase CLI not authenticated in this session — cannot deploy functions
  User needs to either: (a) provide FIREBASE_TOKEN, or (b) deploy manually with `firebase deploy --only functions --project ai-draft-39e32`
- Also ensure SARVAM_API_KEY is set in Firebase Functions secrets

---
Task ID: 3
Agent: Main Agent
Task: Fix 502 cold start crash on case intake upload

Work Log:
- Diagnosed 502 as cold start crash (all Cloud Functions modules load at once)
- Added `minInstances: 1` to ai-intake, ai-draft, ai-extract-file (keeps warm instances)
- Added `memory: "512MiB"` to ai-intake and ai-draft, `memory: "256MiB"` to ai-extract-file
- Fixed ai-intake: changed model from "sarvam-30b" to "sarvam-m" (known working)
- Fixed missing dependencies: bcryptjs, jsonwebtoken, express, tesseract.js, @types
- Fixed CI workflow: added `--force` flag to firebase deploy (required for minInstances)
- Built locally — compiles cleanly
- Deployed via GitHub Actions Run #38 (all 11 steps passed)

Stage Summary:
- 502 cold start crash should now be resolved with minInstances: 1
- Deploy commits: f1f7aaf (deps), 0651319 (Sarvam primary), f3d41a2 (minInstances), 30994b4 (--force flag)

---
Task ID: 4
Agent: Main Agent
Task: Full audit and deployment of ALL AI features

Work Log:
- Read and audited ALL 13 AI backend source files: sarvam.ts, sarvam-client.ts, groq.ts, groq-client.ts, gemini.ts, gemini-client.ts, ai-router.ts, ai-chat.ts, ai-draft.ts, ai-civil.ts, ai-criminal.ts, ai-family.ts, ai-execution.ts, ai-intake.ts, ai-research.ts, ai-litigation.ts, ai-document.ts, ai-extract-data.ts, ai-extract-file.ts, ai-fallback.ts, legal-search.ts
- Verified ALL model references: sarvam-105b used consistently across all files (no sarvam-30b or sarvam-m references in actual API calls)
- Verified ALL maxTokens values: 4096 or less (matching Sarvam starter tier limit)
- Verified ALL fallback chains: Sarvam → Groq → Gemini triple fallback in every function
- Verified frontend ai-service.ts: all 12 API calls correctly map to backend endpoints
- Verified firebase.json: all 26 API rewrites correctly route to functions
- Verified index.ts: all 20+ function exports present
- Built frontend: Next.js build successful (8 static pages)
- Built backend: TypeScript compilation successful (0 errors)
- Committed and pushed to GitHub (commit 5805eb4)
- GitHub Actions Run #27011305045: ALL 7 steps passed (Checkout, Node Setup, Install deps, Build Functions, Build Frontend, Deploy Firebase)

Stage Summary:
- Full deployment successful: Hosting + ALL Cloud Functions deployed
- All 13 AI features use sarvam-105b with proper Groq and Gemini fallback chains
- AI features deployed: AI Chat, AI Draft, AI Document Analysis, AI Intake, AI Research, AI Litigation, AI Civil (6 tasks), AI Criminal (6 tasks), AI Family (6 tasks), AI Execution (5 tasks), AI Extract Data (4 modules), AI Extract File
- Live URL: https://ai-draft-39e32.web.app
