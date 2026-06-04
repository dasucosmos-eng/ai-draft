'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { aiDraft } from '@/lib/ai-service';
import { useDataStore } from '@/store/data-store';
import { generatePDF, downloadPDF } from '@/lib/pdf-generator';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, FileText, Sparkles, Download, Save, AlertCircle } from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';

const caseTypes = ['Civil', 'Criminal', 'Family', 'Constitutional', 'Corporate', 'Tax', 'Labour', 'IP', 'Consumer'];
const documentTypes = [
  { group: 'Civil', items: ['Plaint', 'Written Statement', 'Reply', 'Rejoinder', 'Interlocutory Application', 'IA for Temporary Injunction', 'Execution Application'] },
  { group: 'Criminal', items: ['FIR', 'Charge Sheet', 'Bail Application', 'Anticipatory Bail', 'Quashing Petition', 'Criminal Appeal', 'Revision Petition'] },
  { group: 'Family', items: ['Petition for Divorce', 'Maintenance Application', 'Guardianship Petition', 'Custody Application', 'Domestic Violence Complaint'] },
  { group: 'General', items: ['Legal Notice', 'Reply to Notice', 'Affidavit', 'Vakalatnama', 'Power of Attorney', 'Demand Notice'] },
];

export function AiDraftingView() {
  const [caseType, setCaseType] = useState('');
  const [docType, setDocType] = useState('');
  const [details, setDetails] = useState({
    petitioner: '', respondent: '', facts: '', relief: '', court: '', caseNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const addDocument = useDataStore((s) => s.addDocument);
  const cases = useDataStore((s) => s.cases);

  const filteredDocTypes = documentTypes.find((g) => g.group === caseType) || documentTypes[documentTypes.length - 1];

  const handleGenerate = async () => {
    if (!caseType || !docType || !details.facts) {
      toast.error('Please fill in case type, document type, and facts');
      return;
    }
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await aiDraft(caseType, docType, details);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Generation failed');
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!result) return;
    const doc = generatePDF(result.content || result.responseText || '', result.title || `${docType}`);
    downloadPDF(doc, `${result.title || docType || 'document'}.pdf`);
    toast.success('PDF downloaded');
  };

  const handleSave = () => {
    if (!result) return;
    addDocument({
      id: uuidv4(),
      name: result.title || `${docType} - ${details.petitioner || 'Untitled'}`,
      type: docType,
      category: caseType,
      content: result.content || result.responseText || '',
      summary: result.keyPoints?.join('\n') || '',
      createdAt: new Date().toISOString(),
    });
    toast.success('Document saved');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          AI Drafting
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate professional legal documents with AI assistance.
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Document Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Case Type *</Label>
              <Select value={caseType} onValueChange={(v) => { setCaseType(v); setDocType(''); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select case type" /></SelectTrigger>
                <SelectContent>
                  {caseTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Document Type *</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select document type" /></SelectTrigger>
                <SelectContent>
                  {filteredDocTypes.items.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Petitioner / Applicant</Label>
              <Input placeholder="Name" value={details.petitioner} onChange={(e) => setDetails({ ...details, petitioner: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Respondent / Opposite Party</Label>
              <Input placeholder="Name" value={details.respondent} onChange={(e) => setDetails({ ...details, respondent: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Court</Label>
            <Input placeholder="e.g., District Court, Mumbai" value={details.court} onChange={(e) => setDetails({ ...details, court: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Facts / Case Details *</Label>
            <Textarea
              placeholder="Describe the facts of the case in detail..."
              value={details.facts}
              onChange={(e) => setDetails({ ...details, facts: e.target.value })}
              rows={5}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Relief Sought</Label>
            <Textarea
              placeholder="What relief is being sought?"
              value={details.relief}
              onChange={(e) => setDetails({ ...details, relief: e.target.value })}
              rows={2}
            />
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating...' : 'Generate Document'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          {result.keyPoints && result.keyPoints.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Key Points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {result.keyPoints.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-medium shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.warnings && result.warnings.length > 0 && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-amber-500">Warnings & Considerations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {result.warnings.map((w: string, i: number) => (
                    <li key={i} className="text-sm text-amber-600 dark:text-amber-400">⚠ {w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Generated Document</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSave}>
                    <Save className="h-3.5 w-3.5" /> Save
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownContent content={result.content || result.responseText || ''} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
