'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { aiLitigation } from '@/lib/ai-service';
import { Loader2, Brain, AlertCircle } from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';

export function ArgumentAnalyzerView() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!input.trim()) { toast.error('Please enter arguments to analyze'); return; }
    setLoading(true);
    setResult('');
    setError('');
    try {
      const res = await aiLitigation('argument-analyzer', { query: input });
      setResult(res.content || res.responseText || JSON.stringify(res, null, 2));
    } catch (err: any) {
      setError(err?.message || 'Failed');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          Argument Analyzer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Analyze legal arguments for strengths, weaknesses, and counter-arguments.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Arguments to Analyze</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="Paste or type the legal arguments you want to analyze..." value={input} onChange={(e) => setInput(e.target.value)} rows={6} />
          <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </Button>
        </CardContent>
      </Card>

      {error && <Card className="border-destructive/50"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>}
      {result && (
        <Card className="border-border/50 animate-in fade-in-0">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Analysis</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[600px]">
              <MarkdownContent content={result} />
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
