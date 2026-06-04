import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scale } from 'lucide-react';
import Link from 'next/link';

interface PublicPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function PublicPageLayout({ title, children }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Scale className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">AI Draft Bond</span>
          <Link href="/" className="ml-auto">
            <Button variant="outline" size="sm">Back to Home</Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight mb-6">{title}</h1>
          <Card className="border-border/50">
            <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
              {children}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="max-w-3xl mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} AI Draft Bond. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
