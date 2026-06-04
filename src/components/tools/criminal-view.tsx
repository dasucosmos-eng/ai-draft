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
import { aiCriminal } from '@/lib/ai-service';
import { generatePDF, downloadPDF } from '@/lib/pdf-generator';
import { Loader2, AlertTriangle, Sparkles, Download, AlertCircle } from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';

const docTypes = ['Bail Application', 'Anticipatory Bail', 'Quashing Petition', 'Criminal Appeal', 'Revision Petition', 'FIR', 'Charge Sheet Analysis', 'Defense Statement'];

export function CriminalView() {
  const [docType, setDocType] = useState('');
  const [details, setDetails] = useState({ accused: '', victim: '', firNumber: '', policeStation: '', sections: '', facts: '', offense: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!docType || !details.facts) { toast.error('Select type and provide facts'); return; }
    setLoading(true);
    setResult('');
    setError('');
    try {
      const res = await aiCriminal({ documentType: docType, ...details });
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
          <AlertTriangle className="h-6 w-6 text-primary" />
          Criminal Law
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Draft criminal law documents, bail applications, and petitions.</p>
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
            <div className="space-y-1.5"><Label className="text-xs">Accused Name</Label><Input placeholder="Name" value={details.accused} onChange={(e) => setDetails({ ...details, accused: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Victim / Complainant</Label><Input placeholder="Name" value={details.victim} onChange={(e) => setDetails({ ...details, victim: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">FIR Number</Label><Input placeholder="FIR No." value={details.firNumber} onChange={(e) => setDetails({ ...details, firNumber: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Police Station</Label><Input placeholder="PS Name" value={details.policeStation} onChange={(e) => setDetails({ ...details, policeStation: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sections</Label>
              <Input placeholder="e.g., 304, 279 IPC" value={details.sections} onChange={(e) => setDetails({ ...details, sections: e.target.value })} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Offense</Label><Input placeholder="Offense type" value={details.offense} onChange={(e) => setDetails({ ...details, offense: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Facts *</Label>
            <Textarea placeholder="Describe the facts..." value={details.facts} onChange={(e) => setDetails({ ...details, facts: e.target.value })} rows={5} />
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating...' : 'Generate'}
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
