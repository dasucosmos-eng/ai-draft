// document-parser.ts — Client-side document extraction
// Handles images via Tesseract.js OCR (FREE, no API cost)
// Handles text files directly
// Falls back to server-side for PDFs and DOCX (pdf-parse + mammoth on Firebase)
//
// This eliminates Gemini Vision dependency — saving ₹8-15 per image extraction

// ─── Tesseract.js (lazy-loaded) ────────────────────────────────────

let tesseractWorker: any = null
let tesseractInitPromise: Promise<any> | null = null

async function getTesseractWorker() {
  if (tesseractWorker) return tesseractWorker
  if (tesseractInitPromise) return tesseractInitPromise

  tesseractInitPromise = (async () => {
    try {
      const Tesseract = await import('tesseract.js')
      const worker = await Tesseract.createWorker('eng+hin+tam+tel+kan+ben+mar+guj+mal+pan+ori+urd', undefined, {
        logger: () => {}, // Suppress verbose logs
      })
      tesseractWorker = worker
      return worker
    } catch (err) {
      console.error('[document-parser] Failed to init Tesseract:', err)
      tesseractInitPromise = null
      throw new Error('OCR engine failed to initialize')
    }
  })()

  return tesseractInitPromise
}

// ─── Image OCR ────────────────────────────────────────────────────

async function extractImageText(file: File): Promise<string> {
  const worker = await getTesseractWorker()
  const { data } = await worker.recognize(file)
  return data?.text || ''
}

// ─── Plain text ────────────────────────────────────────────────────

async function extractPlainText(file: File): Promise<string> {
  return file.text()
}

// ─── Main extraction function ───────────────────────────────────────

export type ExtractionMethod = 'tesseract-ocr' | 'server-pdf' | 'server-docx' | 'plain-text'

export interface ExtractionResult {
  fileName: string
  content: string
  method: ExtractionMethod
}

/**
 * Extract text from a file.
 *
 * Strategy:
 * - Images (png/jpg/jpeg/gif/bmp/webp) → Tesseract.js OCR (client-side, FREE)
 * - Text files (txt/md/csv) → FileReader (client-side, FREE)
 * - PDFs → Server-side pdf-parse (already uses Firebase Function, NO Gemini)
 * - DOCX → Server-side mammoth (already uses Firebase Function, NO Gemini)
 * - Old .doc → Server-side fallback
 */
export async function extractFileContentLocal(
  file: File
): Promise<{ needsServer: false; result: ExtractionResult } | { needsServer: true; file: File }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const mimeType = file.type || guessMimeType(file.name)

  // 1. Images → client-side Tesseract OCR
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) {
    try {
      const text = await extractImageText(file)
      if (text.trim().length >= 3) {
        console.log(`[document-parser] OCR extracted ${text.length} chars from ${file.name}`)
        return {
          needsServer: false,
          result: { fileName: file.name, content: text, method: 'tesseract-ocr' },
        }
      }
    } catch (err) {
      console.warn('[document-parser] Tesseract OCR failed, will try server:', err)
    }
    // If OCR failed or returned nothing, still try server as last resort
    return { needsServer: true, file }
  }

  // 2. Plain text files → direct read
  if (mimeType === 'text/plain' || ['txt', 'md', 'csv'].includes(ext)) {
    try {
      const text = await extractPlainText(file)
      return {
        needsServer: false,
        result: { fileName: file.name, content: text, method: 'plain-text' },
      }
    } catch {
      return { needsServer: true, file }
    }
  }

  // 3. PDFs and DOCX → server-side (NO Gemini, uses pdf-parse/mammoth)
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return { needsServer: true, file }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    return { needsServer: true, file }
  }

  // 4. Old .doc and unknown → try server
  return { needsServer: true, file }
}

// ─── Convenience: extract with server fallback ──────────────────────

const EXTRACT_FILE_URL = 'https://us-central1-ai-draft-39e32.cloudfunctions.net/apiExtractFile'

async function extractViaServer(file: File): Promise<ExtractionResult> {
  const base64DataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
  const base64 = base64DataUrl.replace(/^data:[^;]+;base64,/, '')

  const res = await fetch(EXTRACT_FILE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileData: base64,
      fileName: file.name,
      mimeType: file.type || guessMimeType(file.name),
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Server extraction failed (${res.status}): ${errText}`)
  }

  const data = await res.json()
  if (!data.success || !data.content) {
    throw new Error(data.error || 'Failed to extract content from ' + file.name)
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const method: ExtractionMethod = ext === 'pdf' ? 'server-pdf' : ext === 'docx' ? 'server-docx' : 'server-pdf'

  return { fileName: data.fileName || file.name, content: data.content, method }
}

/**
 * Full extraction pipeline:
 * 1. Try client-side first (images via Tesseract, text files directly)
 * 2. If needs server (PDF/DOCX), call Firebase function (NO Gemini)
 */
export async function extractFileContent(file: File): Promise<ExtractionResult> {
  const local = await extractFileContentLocal(file)

  if (!local.needsServer) {
    return local.result
  }

  // Server-side extraction (PDF/DOCX — no Gemini Vision)
  return extractViaServer(file)
}

/**
 * Extract content from multiple files in parallel
 */
export async function extractFilesContent(files: File[]): Promise<ExtractionResult[]> {
  return Promise.all(
    files.map(async (file) => {
      try {
        return await extractFileContent(file)
      } catch (err) {
        console.warn('[document-parser] Failed for ' + file.name + ':', err)
        return { fileName: file.name, content: `[Could not extract content from ${file.name}]`, method: 'plain-text' as ExtractionMethod }
      }
    })
  )
}

// ─── Helpers ───────────────────────────────────────────────────────

function guessMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
  }
  return map[ext] || 'application/octet-stream'
}
