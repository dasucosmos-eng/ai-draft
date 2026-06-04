'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { aiLitigation } from '@/lib/ai-service';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';

export function DefenseBuilderView() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  const handleBuild = async () => {
    if (!input.trim()) { toast.error('Please describe the case'); return; }
    setLoading(true);
    setResult('');
    setError('');
    try {
      const res = await aiLitigation('defense-builder', { query: input });
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
          <Shield className="h-6 w-6 text-primary" />
          Defense Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Build defense arguments and strategies with AI assistance.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Case Details for Defense</CardTitle>
          <CardDescription className="text-xs">Describe the prosecution&apos;s case, charges, and facts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="e.g., My client is accused under Section 304 IPC. The prosecution alleges that the deceased died due to negligence while driving. The facts are..." value={input} onChange={(e) => setInput(e.target.value)} rows={6} />
          <Button onClick={handleBuild} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {loading ? 'Building...' : 'Build Defense'}
          </Button>
        </CardContent>
      </Card>

      {error && <Card className="border-destructive/50"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>}
      {result && (
        <Card className="border-border/50 animate-in fade-in-0">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Defense Strategy</CardTitle></CardHeader>
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
