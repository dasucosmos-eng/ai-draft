'use client'

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  File,
  Sparkles,
  FileType2,
} from 'lucide-react'
import { extractFileContent } from '@/lib/document-parser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

/* ─── Types ─── */

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  mimeType: string
  base64: string
  extractedText?: string
  extractedAiData?: Record<string, unknown>
  status: 'uploading' | 'extracting' | 'extracted' | 'ai_processing' | 'done' | 'error'
  error?: string
  previewUrl?: string
}

interface DocumentUploadProps {
  onFilesExtracted?: (files: UploadedFile[]) => void
  onAiDataExtracted?: (data: Record<string, unknown>, file: UploadedFile) => void
  accept?: string
  maxFiles?: number
  compact?: boolean
  module?: 'execution' | 'civil' | 'criminal' | 'family' | 'general'
  className?: string
}

/* ─── Constants ─── */

const AI_EXTRACT_API = 'https://us-central1-ai-draft-39e32.cloudfunctions.net/apiAiExtractData'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/bmp',
  'image/webp',
]

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

/* ─── Helpers ─── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string): React.ReactNode {
  if (mimeType.startsWith('image/')) return <ImageIcon className="size-4" />
  if (mimeType === 'application/pdf') return <FileText className="size-4" />
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileType2 className="size-4" />
  return <File className="size-4" />
}

function getFileTypeColor(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  if (mimeType.startsWith('image/')) return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
}

/* ─── Component ─── */

export function DocumentUpload({
  onFilesExtracted,
  onAiDataExtracted,
  accept,
  maxFiles = 10,
  compact = false,
  module = 'general',
  className,
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showViewer, setShowViewer] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ─── File Reading ─── */

  const readFileAsBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  /* ─── Text Extraction ─── */

  const extractTextFromFile = useCallback(async (file: File): Promise<string> => {
    try {
      const result = await extractFileContent(file)
      return result.content || ''
    } catch (err) {
      console.error('[document-upload] Extraction error:', err)
      toast.error(`File extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      throw err
    }
  }, [])

  /* ─── AI Data Extraction ─── */

  const extractAiData = useCallback(async (text: string, uploadedFile: UploadedFile): Promise<Record<string, unknown>> => {
    if (!module || module === 'general') return {}
    try {
      const response = await fetch(AI_EXTRACT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          module,
        }),
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `AI extraction failed (${response.status})`)
      }
      const data = await response.json()
      return data.fields || data || {}
    } catch (err) {
      console.error('[document-upload] AI extraction error:', err)
      const errMsg = err instanceof Error ? err.message : 'AI extraction failed'
      toast.error(`AI extraction failed: ${errMsg}`)
      return {}
    }
  }, [module])

  /* ─── Process File ─── */

  const processFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) return

    const id = crypto.randomUUID()
    const base64 = await readFileAsBase64(file)
    
    // For images, create preview URL
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined

    const uploadedFile: UploadedFile = {
      id,
      name: file.name,
      size: file.size,
      type: file.name.split('.').pop()?.toLowerCase() || '',
      mimeType: file.type,
      base64,
      status: 'extracting',
      previewUrl,
    }

    setFiles((prev) => [...prev, uploadedFile])

    // Step 1: Extract text (client-side OCR for images, server for PDF/DOCX)
    try {
      const extractedText = await extractTextFromFile(file)
      uploadedFile.extractedText = extractedText
      uploadedFile.status = 'extracted'

      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, extractedText, status: 'extracted' as const } : f))
      )

      // Step 2: AI data extraction (if module is specified)
      if (module !== 'general' && extractedText.length > 50) {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'ai_processing' as const } : f))
        )

        const aiData = await extractAiData(extractedText, uploadedFile)
        if (Object.keys(aiData).length > 0) {
          uploadedFile.extractedAiData = aiData
          uploadedFile.status = 'done'
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, extractedAiData: aiData, status: 'done' as const } : f))
          )
          onAiDataExtracted?.(aiData, uploadedFile)
        } else {
          uploadedFile.status = 'done'
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: 'done' as const } : f))
          )
        }
      } else {
        uploadedFile.status = 'done'
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'done' as const } : f))
        )
      }

      // Notify parent
      setFiles((current) => {
        onFilesExtracted?.(current)
        return current
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process file'
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'error' as const, error: errorMsg } : f))
      )
    }
  }, [readFileAsBase64, extractTextFromFile, extractAiData, module, onFilesExtracted, onAiDataExtracted])

  /* ─── Handle Files Input ─── */

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList)
      .filter((f) => {
        if (ACCEPTED_TYPES.includes(f.type) || f.name.match(/\.(pdf|docx?|txt|csv|png|jpe?g|gif|bmp|webp)$/i)) return true
        return false
      })
      .slice(0, maxFiles - files.length)

    for (const file of newFiles) {
      await processFile(file)
    }
  }, [files.length, maxFiles, processFile])

  /* ─── Drag & Drop ─── */

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  /* ─── Remove File ─── */

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  /* ─── View File ─── */

  const viewFile = useCallback((id: string) => {
    setShowViewer(id)
  }, [])

  const closeViewer = useCallback(() => {
    setShowViewer(null)
  }, [])

  const viewerFile = showViewer ? files.find((f) => f.id === showViewer) : null

  /* ─── RENDER ─── */

  if (compact) {
    return (
      <>
        <div className={cn('flex items-center gap-2', className)}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 text-xs border-dashed"
          >
            <Upload className="size-3.5" />
            Upload Document
          </Button>
          {files.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {files.filter((f) => f.status === 'done').length}/{files.length} processed
            </Badge>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept || '.pdf,.docx,.doc,.txt,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp'}
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-2 space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border text-xs',
                  file.status === 'done' && 'border-green-500/20 bg-green-500/5',
                  file.status === 'error' && 'border-red-500/20 bg-red-500/5',
                  (file.status === 'extracting' || file.status === 'ai_processing') && 'border-blue-500/20 bg-blue-500/5',
                  file.status === 'extracted' && 'border-amber-500/20 bg-amber-500/5'
                )}
              >
                {file.status === 'extracting' || file.status === 'ai_processing' ? (
                  <Loader2 className="size-3.5 animate-spin text-blue-500" />
                ) : file.status === 'done' ? (
                  <CheckCircle2 className="size-3.5 text-green-500" />
                ) : file.status === 'error' ? (
                  <AlertCircle className="size-3.5 text-red-500" />
                ) : (
                  <Loader2 className="size-3.5 animate-spin text-amber-500" />
                )}
                <span className="truncate flex-1 text-foreground">{file.name}</span>
                <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                {file.previewUrl && (
                  <button onClick={() => viewFile(file.id)} className="p-1 hover:bg-muted rounded">
                    <Eye className="size-3 text-muted-foreground" />
                  </button>
                )}
                <button onClick={() => removeFile(file.id)} className="p-1 hover:bg-muted rounded">
                  <X className="size-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Viewer Modal */}
        {viewerFile && (
          <DocumentViewerModal
            file={viewerFile}
            onClose={closeViewer}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30',
            files.length > 0 && 'p-5'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept || '.pdf,.docx,.doc,.txt,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp'}
            multiple
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              'flex size-14 items-center justify-center rounded-2xl transition-colors',
              isDragging ? 'bg-primary/15' : 'bg-muted'
            )}>
              <Upload className={cn('size-6', isDragging ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isDragging ? 'Drop files here' : 'Upload Legal Documents'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, DOC, TXT, CSV, Images — up to 15MB each
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {['PDF', 'DOCX', 'Images'].map((type) => (
                <Badge key={type} variant="outline" className="text-[10px] px-2 py-0.5">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* AI Extraction notice */}
        {module !== 'general' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
            <Sparkles className="size-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              AI will automatically extract relevant data from your documents and fill in the form fields.
            </p>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Uploaded Files ({files.length})
              </p>
            </div>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    file.status === 'done' && 'border-green-500/20 bg-green-500/5',
                    file.status === 'error' && 'border-red-500/20 bg-red-500/5',
                    (file.status === 'extracting' || file.status === 'ai_processing') && 'border-blue-500/20 bg-blue-500/5',
                    file.status === 'extracted' && 'border-amber-500/20 bg-amber-500/5'
                  )}
                >
                  {/* File icon */}
                  <div className={cn('flex size-9 items-center justify-center rounded-lg shrink-0', getFileTypeColor(file.mimeType))}>
                    {getFileIcon(file.mimeType)}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                      {file.extractedText && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {file.extractedText.length} chars extracted
                        </span>
                      )}
                      {file.status === 'extracting' && (
                        <span className="text-xs text-blue-500 flex items-center gap-1">
                          <Loader2 className="size-3 animate-spin" /> Extracting text...
                        </span>
                      )}
                      {file.status === 'ai_processing' && (
                        <span className="text-xs text-purple-500 flex items-center gap-1">
                          <Loader2 className="size-3 animate-spin" /> AI analyzing...
                        </span>
                      )}
                      {file.status === 'done' && file.extractedAiData && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20">
                          AI extracted
                        </Badge>
                      )}
                    </div>
                    {file.error && (
                      <p className="text-xs text-red-500 mt-1">{file.error}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {file.previewUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); viewFile(file.id) }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); removeFile(file.id) }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Viewer Modal */}
      {viewerFile && (
        <DocumentViewerModal
          file={viewerFile}
          onClose={closeViewer}
        />
      )}
    </>
  )
}

/* ─── Document Viewer Modal ─── */

function DocumentViewerModal({ file, onClose }: { file: UploadedFile; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={cn('flex size-8 items-center justify-center rounded-lg', getFileTypeColor(file.mimeType))}>
              {getFileIcon(file.mimeType)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {file.previewUrl ? (
            /* Image preview */
            <div className="flex items-center justify-center min-h-[300px]">
              <img
                src={file.previewUrl}
                alt={file.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          ) : file.mimeType === 'application/pdf' ? (
            /* PDF preview */
            <iframe
              src={`data:application/pdf;base64,${file.base64.split(',')[1]}`}
              className="w-full h-[70vh] rounded-lg border"
              title={file.name}
            />
          ) : (
            /* Text/DOCX preview */
            <div className="max-h-[70vh] overflow-auto">
              {file.extractedText ? (
                <pre className="whitespace-pre-wrap text-sm text-foreground font-[family-name:var(--font-geist-sans)] leading-relaxed p-4 bg-muted/50 rounded-lg">
                  {file.extractedText}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="size-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {file.status === 'extracting' || file.status === 'ai_processing'
                      ? 'Extracting document content...'
                      : 'No text content available for preview'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
