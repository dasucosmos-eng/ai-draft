// ai-service.ts — Client-side AI service
// Routes all AI calls through Firebase Cloud Functions
// File extraction: client-side for images (Tesseract.js), server-side for PDF/DOCX (no Gemini)

import { extractFileContent, extractFilesContent, type ExtractionResult } from './document-parser'

// Strip markdown formatting to clean text
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\`{3}[\s\S]*?\`{3}/g, '')
    .replace(/\`(.+?)\`/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '• ')
    .replace(/^\s*\d+\.\s/gm, '')
    .replace(/^\[([^\]]+)\]\([^)]+\)/gm, '$1')
    .replace(/^---+$/gm, '')
    .replace(/^===+$/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const API_BASE = typeof window !== 'undefined' && (window as any).__API_BASE__
  ? (window as any).__API_BASE__
  : 'https://aidraft.bond/api'

// ─── Helper: POST to /api/* ──────────────────────────────────────────

async function apiPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const url = endpoint.startsWith('/') ? `${API_BASE}${endpoint}` : `${API_BASE}/${endpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    let errMsg = `API error ${res.status}`
    try { errMsg = JSON.parse(errText)?.details || errMsg } catch { /* use default */ }
    throw new Error(errMsg)
  }
  return res.json() as Promise<T>
}

// ════════════════════════════════════════════════════════════════
// AI Chat (with suggestions)
// ════════════════════════════════════════════════════════════════

interface ChatResponse {
  success: boolean
  response?: string
  suggestions?: string[]
  error?: string
}

export async function aiChatWithSuggestions(
  message: string,
  history: { role: string; content: string }[] = [],
  caseContext?: string
): Promise<{ response: string; suggestions: string[] }> {
  const data = await apiPost<ChatResponse>('/ai-chat', { message, history, caseContext })
  if (!data.success || !data.response) {
    throw new Error(data.error || 'AI chat failed')
  }
  return { response: data.response, suggestions: data.suggestions || [] }
}

// ════════════════════════════════════════════════════════════════
// AI Draft — generate legal documents
// ════════════════════════════════════════════════════════════════

interface DraftResponse {
  success: boolean
  data?: { title: string; content: string; keyPoints: string[]; warnings: string[] }
  error?: string
}

export async function aiDraftDocument(
  caseType: string,
  documentType: string,
  details: string,
  caseContext?: string
): Promise<{ title: string; content: string; keyPoints: string[]; warnings: string[] }> {
  const data = await apiPost<DraftResponse>('/ai-draft', { caseType, documentType, details, caseContext })
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Document generation failed')
  }
  data.data.content = stripMarkdown(data.data.content)
  return data.data
}

// ════════════════════════════════════════════════════════════════
// AI Intake — case classification + document analysis
// ════════════════════════════════════════════════════════════════

interface IntakeResponse {
  data?: {
    caseClassification: {
      caseType: string
      caseTypeIcon: string
      priority: string
      priorityColor: string
      jurisdiction: string
      relevantSections: string[]
    }
    extractedInfo: {
      parties: { role: string; name: string }[]
      keyDates: { label: string; date: string }[]
      facts: string[]
      missingInfo: string[]
      documentLanguage: string
    }
    suggestedDocuments: { name: string; type: string }[]
    nextSteps: { step: number; action: string; timeline: string }[]
  }
  error?: string
}

export async function aiIntake(
  description: string,
  filesContent?: string[]
): Promise<IntakeResponse['data']> {
  const data = await apiPost<IntakeResponse>('/ai-intake', {
    description,
    filesContent: filesContent || [],
  })

  if (!data.data) {
    throw new Error(data.error || 'Intake analysis failed')
  }
  // Strip markdown from any string fields in the intake response
  if (data.data.caseClassification) {
    // caseClassification has no long text fields to strip
  }
  if (data.data.extractedInfo) {
    if (data.data.extractedInfo.facts) {
      data.data.extractedInfo.facts = data.data.extractedInfo.facts.map(f => stripMarkdown(f))
    }
    if (data.data.extractedInfo.missingInfo) {
      data.data.extractedInfo.missingInfo = data.data.extractedInfo.missingInfo.map(f => stripMarkdown(f))
    }
  }
  if (data.data.nextSteps) {
    data.data.nextSteps = data.data.nextSteps.map(s => ({ ...s, action: stripMarkdown(s.action) }))
  }
  return data.data
}

// ════════════════════════════════════════════════════════════════
// AI Document Analysis
// ════════════════════════════════════════════════════════════════

interface DocAnalysisResponse {
  summary: string
  keyClauses: string[]
  riskPoints: string[]
  missingElements: string[]
  deadlines: string[]
  parties: { role: string; name: string }[]
  suggestedActions: string[]
  documentLanguage: string
  error?: string
}

export async function aiAnalyzeDocument(documentContent: string): Promise<DocAnalysisResponse> {
  const data = await apiPost<DocAnalysisResponse>('/ai-document', { documentContent })
  if (data.error) {
    throw new Error(data.error)
  }
  return data
}

// ════════════════════════════════════════════════════════════════
// AI Research — Real data from Indian Kanoon + Groq analysis
// ════════════════════════════════════════════════════════════════

interface ResearchResponse {
  results: ResearchResult[]
  suggestedArguments: string[]
  relatedPrecedents: { title: string; year: string; citation: string }[]
  _meta?: {
    source: 'real-data' | 'no-data' | 'groq-knowledge'
    note?: string
    message?: string
    ikResultsCount?: number
    webResultsCount?: number
    docsFetchedCount?: number
    searchTimeMs?: number
    dataSources?: string[]
    totalFound?: string
  }
  error?: string
}

interface ResearchResult {
  title: string
  court: string
  year: string
  summary: string
  keyHoldings: string[]
  relevance: number
  citation: string
  source?: string // URL to Indian Kanoon or other source
}

export async function aiResearch(
  query: string,
  court?: string,
  year?: string,
  caseType?: string
): Promise<ResearchResponse> {
  // Use direct Cloud Function URL to avoid Firebase Hosting 60s timeout on rewrites
  // Legal research + AI analysis can take up to 180s
  const directUrl = 'https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiResearch'
  const res = await fetch(directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, court, year, caseType }),
  })
    .then(async (r) => {
      const json = await r.json()
      if (!r.ok) throw new Error(json.error || json.details || `API error ${r.status}`)
      return json as ResearchResponse
    })
  if (res.error) {
    throw new Error(res.error)
  }
  return res
}

// ════════════════════════════════════════════════════════════════
// File Content Extraction
// Images → Tesseract.js (client-side, FREE)
// PDF/DOCX → Server-side pdf-parse/mammoth (Firebase Function, NO Gemini)
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// AI Litigation — Legal tools with citations from real case law
// ════════════════════════════════════════════════════════════════

export interface LitigationCitation {
  title: string
  court: string
  year: string
  citation: string
  summary: string
  keyHoldings: string[]
  relevance: number
  source: string
  sourceExcerpts?: {
    facts?: string
    issues?: string
    held?: string
    ratio?: string
    disposition?: string
  }
}

interface LitigationResponse {
  success: boolean
  response?: string
  citations?: LitigationCitation[]
  sources?: string[]
  caseStrength?: number | null
  suggestedArguments?: string[]
  relatedPrecedents?: { title: string; year: string; citation: string; source: string }[]
  _meta?: {
    tool: string
    searchQuery: string
    dataSources: string[]
    citationsCount: number
    searchPerformed: boolean
  }
  error?: string
  details?: string
}

export async function aiLitigation(
  toolType: string,
  input: Record<string, string | undefined>
): Promise<LitigationResponse> {
  // Use direct Cloud Function URL to avoid Firebase Hosting 60s timeout on rewrites
  // The legal search + AI analysis can take up to 180s
  const directUrl = 'https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiLitigation'
  const data = await fetch(directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolType, ...input }),
  })
    .then(async (res) => {
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.details || `API error ${res.status}`)
      return json as LitigationResponse
    })
  if (!data.success && !data.response) {
    throw new Error(data.error || data.details || 'Litigation analysis failed')
  }
  return data
}

export { extractFileContent, extractFilesContent }
export type { ExtractionResult }
