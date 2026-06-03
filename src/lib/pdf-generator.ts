// pdf-generator.ts — Branded PDF generation for legal documents
// Uses jspdf for client-side PDF creation with lawyer branding

import jsPDF from 'jspdf'
import type { ProfileData } from '@/store/profile-store'

interface PdfGenerateOptions {
  title: string
  content: string
  profile: ProfileData
  includeHeader?: boolean
  includeFooter?: boolean
  includeDisclaimer?: boolean
}

/**
 * Generate a branded PDF with lawyer firm branding
 */
export function generateBrandedPdf(options: PdfGenerateOptions): void {
  const {
    title,
    content,
    profile,
    includeHeader = true,
    includeFooter = true,
    includeDisclaimer = true,
  } = options

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let yPosition = margin

  // ─── Header with branding ───
  if (includeHeader) {
    // Firm name or Advocate name
    const headerName = profile.firmName || profile.fullName || 'Ai Draft'
    
    // Set header background
    doc.setFillColor(26, 35, 50) // Dark navy
    doc.rect(0, 0, pageWidth, 32, 'F')
    
    // Firm name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text(headerName, margin, 13)
    
    // Advocate name
    if (profile.fullName && profile.fullName !== profile.firmName) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(180, 200, 220)
      doc.text(`Adv. ${profile.fullName}${profile.barCouncilNumber ? ' | ' + profile.barCouncilNumber : ''}`, margin, 20)
    }
    
    // Address line
    const addressLine = [
      profile.firmAddress || profile.city || '',
      profile.phone ? `Ph: ${profile.phone}` : '',
      profile.email ? `Email: ${profile.email}` : '',
    ].filter(Boolean).join(' | ')
    
    if (addressLine) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(160, 180, 200)
      doc.text(addressLine, margin, 27)
    }
    
    // Ai Draft watermark on right side of header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 150, 255)
    doc.text('Ai Draft', pageWidth - margin - 25, 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(120, 160, 220)
    doc.text('AI-Powered Legal Drafting', pageWidth - margin - 25, 18)
    
    // Accent line below header
    doc.setDrawColor(59, 130, 246) // Primary blue
    doc.setLineWidth(0.8)
    doc.line(margin, 32, pageWidth - margin, 32)
    
    yPosition = 40
  }

  // ─── Title ───
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(26, 35, 50)
  
  const titleLines = doc.splitTextToSize(title, contentWidth)
  doc.text(titleLines, margin, yPosition)
  yPosition += titleLines.length * 7 + 6

  // Separator line below title
  doc.setDrawColor(200, 210, 220)
  doc.setLineWidth(0.3)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 6

  // ─── Content ───
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)

  // Clean up content - remove markdown formatting
  const cleanContent = content
    .replace(/#{1,6}\s/g, '')         // Remove markdown headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
    .replace(/\*([^*]+)\*/g, '$1')     // Remove italic markers
    .replace(/`([^`]+)`/g, '$1')       // Remove code markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/---+/g, '────────────────────────────────') // Replace HR
    .replace(/\t/g, '    ')              // Tabs to spaces
    .replace(/  +/g, ' ')               // Collapse multiple spaces

  // Split into paragraphs and process each
  const paragraphs = cleanContent.split(/\n\n+/)
  const allLines: { text: string; bold: boolean; indent?: number }[] = []

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    // Detect headings and special formatting
    const isHeading = trimmed.startsWith('IN THE') ||
                     /^(PLAINT|WRITTEN STATEMENT|AFFIDAVIT|EXECUTION PETITION|MEMORANDUM|PETITION|APPLICATION|NOTICE|DEED|AGREEMENT|WILL|SUIT)/i.test(trimmed) ||
                     /^\d+\.?\s+[A-Z]/.test(trimmed) ||
                     (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 100)

    // Detect numbered items (1., 2., a), b), i), etc.)
    const isNumbered = /^\(?(?:\d+|[a-z]|[ivx]+)\)?[.)]\s/.test(trimmed)

    // Detect sub-points (indented lines starting with - or *)
    const isBullet = /^[-*]\s+/.test(trimmed)

    if (isHeading) {
      allLines.push({ text: trimmed, bold: true })
    } else if (isBullet) {
      const bulletText = trimmed.replace(/^[-*]\s+/, '  • ')
      const wrapped = doc.splitTextToSize(bulletText, contentWidth - 6)
      for (const w of wrapped) allLines.push({ text: w, indent: 6 })
    } else if (isNumbered) {
      allLines.push({ text: trimmed })
    } else {
      // Regular paragraph — word-wrap
      const wrapped = doc.splitTextToSize(trimmed, contentWidth)
      for (const w of wrapped) allLines.push({ text: w })
    }
    // Add paragraph spacing
    allLines.push({ text: '', bold: false })
  }

  for (const item of allLines) {
    // Check if we need a new page
    if (yPosition > pageHeight - 30) {
      doc.addPage()
      yPosition = margin
      if (includeHeader) {
        addPageHeader(doc, pageWidth, margin, profile)
        yPosition = 22
      }
    }

    if (item.text === '') {
      yPosition += 3
      continue
    }

    const indent = item.indent || 0
    doc.setFont(item.bold ? 'helvetica' : 'helvetica', item.bold ? 'bold' : 'normal')
    doc.setFontSize(item.bold ? 10.5 : 10)
    doc.setTextColor(50, 50, 50)
    doc.text(item.text, margin + indent, yPosition)
    yPosition += item.bold ? 6 : 4.5
  }

  // ─── Disclaimer ───
  if (includeDisclaimer) {
    yPosition += 10
    if (yPosition > pageHeight - 20) {
      addFooter(doc, pageWidth, pageHeight, margin, 0)
      doc.addPage()
      yPosition = margin
    }

    doc.setDrawColor(220, 180, 60)
    doc.setLineWidth(0.3)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 4

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(140, 140, 140)

    const disclaimerLines = doc.splitTextToSize(
      'Disclaimer: This document has been generated using AI-powered tools by Ai Draft. It is intended as a draft for review by a qualified legal professional. The advocate must review, verify, and modify the content as necessary before filing in any court or submitting to any authority. Ai Draft and its affiliates shall not be liable for any errors, omissions, or inaccuracies in this document.',
      contentWidth - 10
    )
    doc.text(disclaimerLines, margin + 5, yPosition)
  }

  // ─── Footer on last page ───
  addFooter(doc, pageWidth, pageHeight, margin, content.length)

  // ─── Fix page numbers on all pages ───
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const footerY = doc.internal.pageSize.getHeight() - 7
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 15, footerY)
  }

  // ─── Download via Blob URL (more reliable than doc.save) ───
  const safeFileName = title
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60)
  try {
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeFileName}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    // Fallback to doc.save if Blob URL fails
    doc.save(`${safeFileName}.pdf`)
  }
}

/**
 * Add page header (simplified for continuation pages)
 */
function addPageHeader(doc: jsPDF, pageWidth: number, margin: number, profile: ProfileData) {
  const headerName = profile.firmName || profile.fullName || 'Ai Draft'
  doc.setFillColor(26, 35, 50)
  doc.rect(0, 0, pageWidth, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(180, 200, 220)
  doc.text(headerName, margin, 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(100, 150, 255)
  doc.text('Ai Draft', pageWidth - margin - 15, 7)
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.5)
  doc.line(margin, 10, pageWidth - margin, 10)
}

/**
 * Add page footer
 */
function addFooter(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number, _contentLength: number) {
  const footerY = pageHeight - 12
  doc.setDrawColor(200, 210, 220)
  doc.setLineWidth(0.2)
  doc.line(margin, footerY, pageWidth - margin, footerY)

  // Date
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated: ${today}`, margin, footerY + 5)

  // Ai Draft mark
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6)
  doc.setTextColor(180, 180, 180)
  doc.text('Generated by Ai Draft', pageWidth / 2 - 18, footerY + 5)

  // Page number
  const pageCount = doc.getNumberOfPages()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`Page ${pageCount} of {total}`, pageWidth - margin - 15, footerY + 5)
}

/**
 * Generate preview HTML for print dialog (as alternative to PDF)
 */
export function generatePrintHtml(title: string, content: string, profile: ProfileData): string {
  const headerName = profile.firmName || profile.fullName || 'Ai Draft'
  const addressParts = [
    profile.firmAddress || profile.city || '',
    profile.phone ? `Ph: ${profile.phone}` : '',
    profile.email ? `Email: ${profile.email}` : '',
  ].filter(Boolean).join(' | ')

  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Georgia, serif; color: #1a2332; line-height: 1.7; }
    
    .header { 
      background: #1a2332; color: white; padding: 16px 20px; margin: -15mm -15mm 0 -15mm;
    }
    .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
    .header .advocate { font-size: 10px; color: #b4c8dc; }
    .header .address { font-size: 8px; color: #a0b4c8; margin-top: 2px; }
    .header .brand { position: absolute; right: 20px; top: 14px; text-align: right; }
    .header .brand .name { font-size: 8px; font-weight: bold; color: #6496ff; }
    .header .brand .tagline { font-size: 6px; color: #78a0dc; }
    
    .accent-line { height: 2px; background: #3b82f6; margin: 0 -15mm; }
    
    .title { font-size: 15px; font-weight: bold; margin: 20px 0 8px 0; text-align: center; }
    .separator { border: none; border-top: 1px solid #dde2e6; margin: 10px 0; }
    
    .content { font-size: 11px; white-space: pre-wrap; margin-top: 12px; }
    
    .disclaimer {
      margin-top: 30px; padding-top: 10px; border-top: 1px solid #dcb43c;
      font-size: 7.5px; color: #8c8c8c; font-style: italic; text-align: justify;
    }
    
    .footer {
      position: fixed; bottom: -10mm; left: -15mm; right: -15mm;
      border-top: 1px solid #dde2e6; padding: 6px 20px;
      font-size: 7px; color: #999;
      display: flex; justify-content: space-between;
    }
    
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${headerName}</h1>
    ${profile.fullName ? `<div class="advocate">Adv. ${profile.fullName}${profile.barCouncilNumber ? ' | ' + profile.barCouncilNumber : ''}</div>` : ''}
    ${addressParts ? `<div class="address">${addressParts}</div>` : ''}
    <div class="brand">
      <div class="name">Ai Draft</div>
      <div class="tagline">AI-Powered Legal Drafting</div>
    </div>
  </div>
  <div class="accent-line"></div>
  
  <div class="title">${title}</div>
  <hr class="separator">
  <div class="content">${content}</div>
  
  <div class="disclaimer">
    Disclaimer: This document has been generated using AI-powered tools by Ai Draft. It is intended as a draft for review by a qualified legal professional. The advocate must review, verify, and modify the content as necessary before filing in any court or submitting to any authority.
  </div>
  
  <div class="footer no-print">
    <span>Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
    <span>Generated by Ai Draft</span>
    <span>Page 1</span>
  </div>
</body>
</html>`
}
