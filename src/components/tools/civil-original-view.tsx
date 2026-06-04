'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { aiCivil } from '@/lib/ai-service';
import { generatePDF, downloadPDF } from '@/lib/pdf-generator';
import { Loader2, Landmark, Sparkles, Download, AlertCircle } from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';

const docTypes = ['Plaint', 'Written Statement', 'Reply', 'Interlocutory Application', 'Execution Application', 'Temporary Injunction', 'Permanent Injunction', 'Specific Performance', 'Recovery Suit'];

export function CivilOriginalView() {
  const [docType, setDocType] = useState('');
  const [details, setDetails] = useState({ plaintiff: '', defendant: '', court: '', facts: '', relief: '', valuation: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!docType || !details.facts) { toast.error('Select document type and provide facts'); return; }
    setLoading(true);
    setResult('');
    setError('');
    try {
      const res = await aiCivil({ documentType: docType, ...details });
      setResult(res.content || res.responseText || JSON.stringify(res, null, 2));
    } catch (err: any) {
      setError(err?.message || 'Failed');
    }
    setLoading(false);
  };

  const handleDownload = () => {
    const doc = generatePDF(result, `${docType}`);
    downloadPDF(doc, `${docType.toLowerCase().replace(/ /g, '-')}.pdf`);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          Civil Original Side
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Draft civil suit documents and pleadings.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Document Type *</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{docTypes.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Plaintiff</Label><Input placeholder="Name" value={details.plaintiff} onChange={(e) => setDetails({ ...details, plaintiff: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Defendant</Label><Input placeholder="Name" value={details.defendant} onChange={(e) => setDetails({ ...details, defendant: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Court</Label><Input placeholder="Court" value={details.court} onChange={(e) => setDetails({ ...details, court: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Valuation (₹)</Label><Input placeholder="0" value={details.valuation} onChange={(e) => setDetails({ ...details, valuation: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Facts *</Label>
            <Textarea placeholder="Describe the facts..." value={details.facts} onChange={(e) => setDetails({ ...details, facts: e.target.value })} rows={5} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Relief Sought</Label>
            <Textarea placeholder="What relief?" value={details.relief} onChange={(e) => setDetails({ ...details, relief: e.target.value })} rows={2} />
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating...' : 'Generate Document'}
          </Button>
        </CardContent>
      </Card>

      {error && <Card className="border-destructive/50"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>}
      {result && (
        <Card className="border-border/50 animate-in fade-in-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Generated Document</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownload}><Download className="h-3.5 w-3.5" /> PDF</Button>
            </div>
          </CardHeader>
          <CardContent><ScrollArea className="max-h-[500px]"><MarkdownContent content={result} /></ScrollArea></CardContent>
        </Card>
      )}
    </div>
  );
}
