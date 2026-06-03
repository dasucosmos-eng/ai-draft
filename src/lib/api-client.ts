// api-client.ts — Centralized API client

export { aiChatWithSuggestions, aiDraftDocument, aiIntake, aiAnalyzeDocument, aiResearch, extractFileContent, extractFilesContent } from './ai-service'

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const w = window as unknown as Record<string, string>
    if (w.__API_BASE__) return w.__API_BASE__
  }
  return 'https://aidraft.bond/api'
}
