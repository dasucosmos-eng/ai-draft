'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { aiLitigation } from '@/lib/ai-service';
import { Loader2, Scale, Search, Brain, Target, AlertCircle, ExternalLink } from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';

const tools = [
  { id: 'case-search', label: 'Case Law Search', icon: Search, desc: 'Search for relevant case law and precedents' },
  { id: 'legal-analysis', label: 'Legal Analysis', icon: Brain, desc: 'Analyze legal issues and arguments' },
  { id: 'strategy', label: 'Strategy Builder', icon: Target, desc: 'Build litigation strategy with AI' },
];

export function LitigationView() {
  const [activeTool, setActiveTool] = useState('case-search');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!input.trim()) { toast.error('Please enter your query'); return; }
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await aiLitigation(activeTool, { query: input });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Analysis failed');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          Litigation Tools
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered litigation analysis, case search, and strategy building.
        </p>
      </div>

      {/* Tool Selector */}
      <div className="grid grid-cols-3 gap-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => { setActiveTool(tool.id); setResult(null); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeTool === tool.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/50 hover:border-border'
              }`}
            >
              <Icon className={`h-5 w-5 mb-2 ${activeTool === tool.id ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium">{tool.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{tool.desc}</p>
            </button>
          );
        })}
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{tools.find((t) => t.id === activeTool)?.label}</CardTitle>
          <CardDescription className="text-xs">{tools.find((t) => t.id === activeTool)?.desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={
              activeTool === 'case-search'
                ? 'Describe the legal issue or search for case law...'
                : activeTool === 'legal-analysis'
                ? 'Describe the legal issue to analyze...'
                : 'Describe your case to build a litigation strategy...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
          />
          <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            {loading ? 'Analyzing...' : 'Analyze'}
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
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[600px]">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownContent content={result.content || result.responseText || result.analysis || JSON.stringify(result, null, 2)} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
