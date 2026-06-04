'use client';

import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/data-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Files, Search, Plus, FileText, Trash2, Eye, Download, Filter,
} from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';
import { generatePDF, downloadPDF } from '@/lib/pdf-generator';

export function DocumentsView() {
  const documents = useDataStore((s) => s.documents);
  const addDocument = useDataStore((s) => s.addDocument);
  const deleteDocument = useDataStore((s) => s.deleteDocument);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', type: '', category: '', content: '' });

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      return true;
    });
  }, [documents, search, typeFilter]);

  const docTypes = useMemo(() => [...new Set(documents.map((d) => d.type))], [documents]);

  const handleCreate = () => {
    if (!newDoc.name.trim()) { toast.error('Name required'); return; }
    addDocument({
      id: crypto.randomUUID(),
      name: newDoc.name,
      type: newDoc.type || 'Note',
      category: newDoc.category || 'General',
      content: newDoc.content,
      createdAt: new Date().toISOString(),
    });
    setNewDoc({ name: '', type: '', category: '', content: '' });
    setCreateOpen(false);
    toast.success('Document created');
  };

  const handleDownload = () => {
    if (!selectedDoc) return;
    const doc = generatePDF(selectedDoc.content || '', selectedDoc.name);
    downloadPDF(doc, `${selectedDoc.name}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{documents.length} documents</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> New Document
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All Types</option>
                {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <Files className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((doc) => (
            <Card key={doc.id} className="border-border/50 hover:border-border transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{doc.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{doc.type}</span>
                      <span>•</span>
                      <span>{doc.category}</span>
                      <span>•</span>
                      <span>{format(new Date(doc.createdAt), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedDoc(doc); setViewOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { deleteDocument(doc.id); toast.success('Deleted'); }}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{selectedDoc?.name}</span>
              <Button variant="outline" size="sm" className="gap-1.5 ml-4" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownContent content={selectedDoc?.content || 'No content available.'} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Document</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs">Name *</label>
              <Input value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs">Type</label>
                <Input placeholder="e.g., Petition" value={newDoc.type} onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs">Category</label>
                <Input placeholder="e.g., Pleading" value={newDoc.category} onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs">Content</label>
              <textarea
                placeholder="Document content..."
                value={newDoc.content}
                onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
