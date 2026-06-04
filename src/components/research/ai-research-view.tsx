'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { aiResearch } from '@/lib/ai-service';
import { Loader2, Search, ExternalLink, BookOpen, Gavel, AlertCircle } from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';

export function AiResearchView() {
  const [query, setQuery] = useState('');
  const [court, setCourt] = useState('');
  const [year, setYear] = useState('');
  const [caseType, setCaseType] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) { toast.error('Enter a search query'); return; }
    setLoading(true);
    setResults(null);
    setError('');
    try {
      const res = await aiResearch(query, court || undefined, year || undefined, caseType || undefined);
      setResults(res);
    } catch (err: any) {
      setError(err?.message || 'Search failed');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          AI Legal Research
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Research Indian case law, statutes, and legal precedents with AI.
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Research Query</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="e.g., Doctrine of basic structure in Indian Constitution, maintenance under Section 125 CrPC..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select value={court} onValueChange={setCourt}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Court" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supreme">Supreme Court</SelectItem>
                <SelectItem value="high">High Court</SelectItem>
                <SelectItem value="district">District Court</SelectItem>
                <SelectItem value="all">All Courts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2015', '2010', '2005', '2000', 'all'].map((y) => (
                  <SelectItem key={y} value={y}>{y === 'all' ? 'All Years' : y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={caseType} onValueChange={setCaseType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Case Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="civil">Civil</SelectItem>
                <SelectItem value="criminal">Criminal</SelectItem>
                <SelectItem value="constitutional">Constitutional</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="all">All Types</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSearch} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Researching...' : 'Research'}
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

      {results && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          {results.summary && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Research Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownContent content={results.summary} />
              </CardContent>
            </Card>
          )}

          {results.cases && results.cases.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Relevant Cases ({results.cases.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.cases.map((c: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border border-border/50 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Gavel className="h-3.5 w-3.5 text-primary shrink-0" />
                        {c.title || c.caseName || `Case ${i + 1}`}
                      </h4>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <ExternalLink className="h-3 w-3" /> Indian Kanoon
                          </Badge>
                        </a>
                      )}
                    </div>
                    {c.citation && <p className="text-xs text-muted-foreground font-mono">{c.citation}</p>}
                    {c.holding && <p className="text-sm text-muted-foreground">{c.holding}</p>}
                    {c.year && <Badge variant="outline" className="text-[10px]">{c.year}</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {results.content && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Detailed Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  <MarkdownContent content={typeof results.content === 'string' ? results.content : JSON.stringify(results.content, null, 2)} />
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
