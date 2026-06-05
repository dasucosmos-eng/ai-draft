import jsPDF from 'jspdf';
import { useProfileStore } from '@/store/profile-store';

export function generatePDF(content: string, title: string): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const profile = useProfileStore.getState().profile;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // Letterhead
  if (profile && (profile.firmName || profile.fullName)) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.firmName || profile.fullName, margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (profile.firmAddress) {
      doc.text(profile.firmAddress, margin, y);
      y += 4;
    }
    if (profile.city) {
      const line = [profile.city, profile.phone ? `Ph: ${profile.phone}` : ''].filter(Boolean).join(' | ');
      doc.text(line, margin, y);
      y += 4;
    }
    if (profile.barCouncilNumber) {
      doc.text(`Advocate, ${profile.barCouncilNumber}`, margin, y);
      y += 4;
    }

    // Separator
    doc.setDrawColor(180, 140, 60);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

  // Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  y += 10;

  // Body content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const lines = doc.splitTextToSize(content, maxWidth);
  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 5.5;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    const stampLine = profile?.stampLine ? ` | ${profile.stampLine}` : '';
    doc.text(`Page ${i} of ${pageCount}${stampLine}`, pageWidth / 2, 287, { align: 'center' });
  }

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}
