'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { aiExecution } from '@/lib/ai-service';
import { generatePDF, downloadPDF } from '@/lib/pdf-generator';
import { Loader2, Gavel, Sparkles, Download, AlertCircle } from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';

export function ExecutionView() {
  const [decreeDetails, setDecreeDetails] = useState({ decreeNumber: '', court: '', date: '', judgmentDebtor: '', judgmentCreditor: '', amount: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!decreeDetails.decreeNumber && !decreeDetails.description) { toast.error('Provide decree details'); return; }
    setLoading(true);
    setResult('');
    setError('');
    try {
      const res = await aiExecution(decreeDetails);
      setResult(res.content || res.responseText || JSON.stringify(res, null, 2));
    } catch (err: any) {
      setError(err?.message || 'Failed');
    }
    setLoading(false);
  };

  const handleDownload = () => {
    const doc = generatePDF(result, 'Execution Petition');
    downloadPDF(doc, 'execution-petition.pdf');
    toast.success('PDF downloaded');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Gavel className="h-6 w-6 text-primary" />
          Execution Matters
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Generate execution petitions and applications.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Decree Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Decree Number</Label><Input placeholder="e.g., Decree No. 123/2024" value={decreeDetails.decreeNumber} onChange={(e) => setDecreeDetails({ ...decreeDetails, decreeNumber: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Court</Label><Input placeholder="Court name" value={decreeDetails.court} onChange={(e) => setDecreeDetails({ ...decreeDetails, court: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Judgment Debtor</Label><Input placeholder="Name" value={decreeDetails.judgmentDebtor} onChange={(e) => setDecreeDetails({ ...decreeDetails, judgmentDebtor: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Judgment Creditor</Label><Input placeholder="Name" value={decreeDetails.judgmentCreditor} onChange={(e) => setDecreeDetails({ ...decreeDetails, judgmentCreditor: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Amount (₹)</Label><Input placeholder="0" value={decreeDetails.amount} onChange={(e) => setDecreeDetails({ ...decreeDetails, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={decreeDetails.date} onChange={(e) => setDecreeDetails({ ...decreeDetails, date: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea placeholder="Describe the decree and what execution is needed..." value={decreeDetails.description} onChange={(e) => setDecreeDetails({ ...decreeDetails, description: e.target.value })} rows={4} />
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating...' : 'Generate Execution Petition'}
          </Button>
        </CardContent>
      </Card>

      {error && <Card className="border-destructive/50"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>}
      {result && (
        <Card className="border-border/50 animate-in fade-in-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Execution Petition</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownload}><Download className="h-3.5 w-3.5" /> PDF</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]"><MarkdownContent content={result} /></ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
