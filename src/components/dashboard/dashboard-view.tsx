'use client';

import { useMemo } from 'react';
import { useDataStore } from '@/store/data-store';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Briefcase, Clock, AlertCircle, Calendar,
  FilePlus, FileText, Search, ArrowRight, TrendingUp,
  CheckCircle2, Circle, ListTodo
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function DashboardView() {
  const cases = useDataStore((s) => s.cases);
  const tasks = useDataStore((s) => s.tasks);
  const timelineEvents = useDataStore((s) => s.timelineEvents);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedCaseId = useAppStore((s) => s.setSelectedCaseId);

  const stats = useMemo(() => {
    const activeCases = cases.filter((c) => c.status === 'active').length;
    const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
    const upcomingEvents = timelineEvents
      .filter((e) => !e.isCompleted && new Date(e.eventDate) >= new Date())
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, 5);
    return { total: cases.length, active: activeCases, pendingTasks, upcomingEvents };
  }, [cases, tasks, timelineEvents]);

  const recentCases = useMemo(() =>
    [...cases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [cases]
  );

  const priorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500';
      case 'pending': return 'bg-amber-500/10 text-amber-500';
      case 'closed': return 'bg-gray-500/10 text-gray-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statCards = [
    { title: 'Total Cases', value: stats.total, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Active Cases', value: stats.active, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Pending Tasks', value: stats.pendingTasks, icon: ListTodo, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Upcoming', value: stats.upcomingEvents.length, icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Here&apos;s an overview of your legal practice.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCurrentView('ai-drafting')} className="gap-2" size="sm">
            <FileText className="h-4 w-4" />
            AI Draft
          </Button>
          <Button onClick={() => setCurrentView('ai-research')} variant="outline" className="gap-2" size="sm">
            <Search className="h-4 w-4" />
            Research
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.bg)}>
                    <Icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setCurrentView('cases')}>
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="text-xs">New Case</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setCurrentView('ai-intake')}>
              <FilePlus className="h-5 w-5 text-emerald-500" />
              <span className="text-xs">AI Intake</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setCurrentView('ai-drafting')}>
              <FileText className="h-5 w-5 text-amber-500" />
              <span className="text-xs">AI Draft</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setCurrentView('ai-research')}>
              <Search className="h-5 w-5 text-purple-500" />
              <span className="text-xs">Research</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Cases</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setCurrentView('cases')}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentCases.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No cases yet. Create your first case.
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="px-4 pb-2 space-y-2">
                  {recentCases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCaseId(c.id); setCurrentView('case-detail'); }}
                      className="w-full flex items-start gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                        <Briefcase className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {c.caseType} {c.caseNumber ? `• ${c.caseNumber}` : ''} {c.courtName ? `• ${c.courtName}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusColor(c.status))}>
                            {c.status}
                          </Badge>
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', priorityColor(c.priority))}>
                            {c.priority}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.upcomingEvents.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No upcoming events.
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="px-4 pb-2 space-y-2">
                  {stats.upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 rounded-lg p-3">
                      <div className="flex flex-col items-center justify-center h-9 w-9 rounded-lg bg-purple-500/10 shrink-0">
                        <span className="text-[10px] font-medium text-purple-500">
                          {format(new Date(event.eventDate), 'MMM')}
                        </span>
                        <span className="text-xs font-bold text-purple-500">
                          {format(new Date(event.eventDate), 'dd')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        {event.caseId && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {cases.find((c) => c.id === event.caseId)?.title || 'Linked case'}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          {event.isMilestone && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/20">
                              Milestone
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(event.eventDate), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1">
                        {event.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
