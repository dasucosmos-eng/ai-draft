'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
// ScrollArea removed — using native overflow for reliable scrolling in Dialog
import { Separator } from '@/components/ui/separator'
import { Eye, Copy, Download, FileText, X, Check, FileDown, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  content: string
  category?: string
  createdAt?: string
  caseNumber?: string
  docId?: string
  caseId?: string
  clientId?: string
  onSaveContent?: (docId: string, newContent: string) => void
}

export function DocumentViewer({
  isOpen,
  onClose,
  title,
  content,
  category,
  createdAt,
  caseNumber,
  docId,
  caseId,
  clientId,
  onSaveContent,
}: DocumentViewerProps) {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')

  const handleEdit = () => {
    setEditedContent(content)
    setIsEditing(true)
  }

  const handleSave = () => {
    onSaveContent?.(docId!, editedContent)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedContent('')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = content
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      const { generateBrandedPdf } = await import('@/lib/pdf-generator')
      const profile = (await import('@/store/profile-store')).useProfileStore.getState().profile
      generateBrandedPdf({
        title,
        content,
        profile: profile || { fullName: '', email: '', phone: '', city: '', state: '', barCouncilNumber: '', firmName: '', firmAddress: '' },
      })
      toast.success('PDF downloaded successfully')
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      toast.error('Failed to generate PDF. Please try again.')
    }
  }

  const handleDownloadWord = async () => {
    try {
      const profile = (await import('@/store/profile-store')).useProfileStore.getState().profile
      // Generate a simple .doc file using HTML-based Word document format
      const header = profile?.firmName || profile?.fullName || 'Ai Draft'
      const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${title}</title>
<style>
body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.6; margin: 1in; color: #1a1a1a; }
h1 { font-size: 16pt; text-align: center; margin-bottom: 12pt; }
h2 { font-size: 14pt; margin-top: 18pt; }
p { margin: 6pt 0; text-align: justify; }
.header { font-family: 'Arial', sans-serif; background: #1a2332; color: white; padding: 12px 20px; margin: -1in -1in 20pt -1in; }
.header h1 { font-size: 14pt; text-align: left; color: white; margin: 0; }
.header p { font-size: 9pt; color: #b4c8dc; margin: 2pt 0; }
.disclaimer { font-size: 8pt; color: #888; font-style: italic; border-top: 1px solid #ccc; margin-top: 24pt; padding-top: 8pt; }
</style></head>
<body>
<div class='header'>
<h1>${header}</h1>
${profile?.fullName ? `<p>Adv. ${profile.fullName}${profile.barCouncilNumber ? ' | ' + profile.barCouncilNumber : ''}</p>` : ''}
${profile?.firmAddress || profile?.city ? `<p>${[profile?.firmAddress, profile?.city].filter(Boolean).join(', ')}</p>` : ''}
${profile?.phone ? `<p>Ph: ${profile.phone}</p>` : ''}
${profile?.email ? `<p>Email: ${profile.email}</p>` : ''}
</div>
<h1>${title}</h1>
<div>${content.replace(/\n/g, '<br/>')}</div>
<div class='disclaimer'>Disclaimer: This document has been generated using AI-powered tools by Ai Draft. It is intended as a draft for review by a qualified legal professional.</div>
</body></html>`

      const blob = new Blob([htmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeFileName = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 60)
      a.download = `${safeFileName}.doc`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Word document downloaded successfully')
    } catch (err) {
      console.error('Failed to generate Word doc:', err)
      toast.error('Failed to generate Word document. Please try again.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 flex flex-col gap-0 !grid-cols-1 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-3 space-y-0 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <FileText className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold truncate">{title}</DialogTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {category && (
                    <Badge variant="outline" className="text-[10px] h-5">{category}</Badge>
                  )}
                  {caseNumber && (
                    <Badge variant="secondary" className="text-[10px] h-5">{caseNumber}</Badge>
                  )}
                  {createdAt && (
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[60vh] text-sm font-mono leading-relaxed resize-none border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-mono">
                {content || 'No content available for this document.'}
              </div>
            )}
        </div>

        <Separator className="shrink-0" />

        {/* Footer */}
        <div className="px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleSave}
                >
                  <Check className="size-3.5" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleCancel}
                >
                  <X className="size-3.5" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copy Text
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleDownloadPdf}
                >
                  <Download className="size-3.5" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleDownloadWord}
                >
                  <FileDown className="size-3.5" />
                  Word
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={handleEdit}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={onClose}
            >
              <X className="size-3.5" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
