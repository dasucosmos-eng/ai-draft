'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { generatePDF, downloadPDF } from '@/lib/pdf-generator';
import { MarkdownContent } from '@/components/shared/markdown-content';
import { Download, FileText, Edit3, Save, Copy, X, Eye, FileDown } from 'lucide-react';

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  onSave?: (content: string) => void;
}

export function DocumentViewer({ open, onOpenChange, title, content, onSave }: DocumentViewerProps) {
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  // Sync editedContent when content prop changes (e.g., different document selected)
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const handleEditToggle = () => {
    if (editing) {
      setEditedContent(content);
      setEditing(false);
    } else {
      setEditedContent(content);
      setEditing(true);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedContent);
      toast.success('Document saved');
    }
    setEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownloadPDF = () => {
    const doc = generatePDF(content, title);
    downloadPDF(doc, `${title.toLowerCase().replace(/ /g, '-')}.pdf`);
    toast.success('PDF downloaded');
  };

  const handleDownloadDOC = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title>
      <style>body{font-family:Times New Roman,serif;font-size:12pt;line-height:1.6;margin:1in;}h1{font-size:16pt;font-weight:bold;}h2{font-size:14pt;font-weight:bold;}</style></head>
      <body>${content.replace(/\n/g, '<br>')}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/ /g, '-')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('DOC downloaded');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base">{title}</DialogTitle>
            {editing && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Editing</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {onSave && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEditToggle} title={editing ? 'Cancel Edit' : 'Edit'}>
                {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              </Button>
            )}
            {editing && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={handleSave} title="Save">
                <Save className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownloadPDF} title="Download PDF">
              <FileDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownloadDOC} title="Download DOC">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {editing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="h-full resize-none border-0 rounded-none focus-visible:ring-0 p-6 font-mono text-sm"
            />
          ) : (
            <ScrollArea className="h-full">
              <div className="p-6">
                <MarkdownContent content={content} />
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border shrink-0">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-muted-foreground">{content.length.toLocaleString()} characters</span>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
