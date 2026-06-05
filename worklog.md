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
