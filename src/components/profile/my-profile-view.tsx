'use client';

import { useMemo, useState } from 'react';
import { useDataStore } from '@/store/data-store';
import { useProfileStore } from '@/store/profile-store';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Briefcase, Users, FileText, PenTool, Clock, Mail, Phone, MapPin, Building2,
  AtSign, ArrowRight, Calendar, MessageSquare,
} from 'lucide-react';
import { cn, safeFormat } from '@/lib/utils';

export function MyProfileView() {
  const profile = useProfileStore((s) => s.profile);
  const cases = useDataStore((s) => s.cases);
  const clients = useDataStore((s) => s.clients);
  const documents = useDataStore((s) => s.documents);
  const tasks = useDataStore((s) => s.tasks);
  const timelineEvents = useDataStore((s) => s.timelineEvents);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedCaseId = useAppStore((s) => s.setSelectedCaseId);
  const [activeTab, setActiveTab] = useState('clients');

  const initials = profile.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  const stats = useMemo(() => {
    const activeCases = cases.filter((c) => c.status === 'active').length;
    const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
    return {
      totalClients: clients.length,
      totalCases: cases.length,
      totalDocuments: documents.length,
      totalDrafts: pendingTasks,
    };
  }, [cases, clients, documents, tasks]);

  const recentTimeline = useMemo(() =>
    [...timelineEvents]
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
      .slice(0, 20),
    [timelineEvents]
  );

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500';
      case 'pending': return 'bg-amber-500/10 text-amber-500';
      case 'closed': return 'bg-gray-500/10 text-gray-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  const handleCaseClick = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCurrentView('case-detail');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header */}
      <Card className="border-border/50 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-8">
            <Avatar className="h-16 w-16 ring-4 ring-background shadow-lg">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pb-1">
              <h1 className="text-xl font-bold tracking-tight">{profile.fullName || 'Advocate'}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {profile.username && (
                  <span className="text-sm text-primary font-medium flex items-center gap-1">
                    <AtSign className="h-3.5 w-3.5" />
                    {profile.username}
                  </span>
                )}
                {profile.email && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {profile.email}
                  </span>
                )}
                {profile.city && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile.city}
                  </span>
                )}
                {profile.practiceArea && (
                  <Badge variant="secondary" className="text-[10px]">{profile.practiceArea}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details Row */}
          {(profile.firmName || profile.phone || profile.barCouncilNumber) && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                {profile.firmName && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {profile.firmName}
                  </span>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {profile.phone}
                  </span>
                )}
                {profile.barCouncilNumber && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    BC No. {profile.barCouncilNumber}
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { title: 'Clients', value: stats.totalClients, icon: Users, color: 'text-primary', bg: 'bg-primary/10', view: 'clients' },
          { title: 'Cases', value: stats.totalCases, icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-500/10', view: 'cases' },
          { title: 'Documents', value: stats.totalDocuments, icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10', view: 'documents' },
          { title: 'Drafts', value: stats.totalDrafts, icon: PenTool, color: 'text-purple-500', bg: 'bg-purple-500/10', view: null },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="border-border/50 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => stat.view && setCurrentView(stat.view)}
            >
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

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clients" className="text-xs">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="cases" className="text-xs">
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            Cases
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Clients ({clients.length})</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setCurrentView('clients')}>
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {clients.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No clients yet.
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="px-4 pb-2 space-y-1">
                    {clients.map((client) => {
                      const clientCases = cases.filter((c) =>
                        c.clientName === client.name || c.clientEmail === client.email
                      );
                      return (
                        <div
                          key={client.id}
                          className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {client.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{client.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {client.email && <span className="truncate">{client.email}</span>}
                              {client.phone && <span>{client.phone}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="outline" className="text-[10px]">
                              {clientCases.length} {clientCases.length === 1 ? 'case' : 'cases'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Cases ({cases.length})</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setCurrentView('cases')}>
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {cases.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No cases yet.
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="px-4 pb-2 space-y-1">
                    {cases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleCaseClick(c.id)}
                        className="w-full flex items-start gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors text-left"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0 mt-0.5">
                          <Briefcase className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            <span>{c.caseType}</span>
                            {c.clientName && (
                              <>
                                <span>·</span>
                                <span>{c.clientName}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusColor(c.status))}>
                              {c.status}
                            </Badge>
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', priorityColor(c.priority))}>
                              {c.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                          {safeFormat(c.updatedAt, 'MMM d, yyyy')}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Documents ({documents.length})</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setCurrentView('documents')}>
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No documents yet.
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="px-4 pb-2 space-y-1">
                    {documents.map((doc) => {
                      const linkedCase = cases.find((c) => c.id === doc.caseId);
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                            <FileText className="h-4 w-4 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>{doc.type}</span>
                              {doc.category && (
                                <>
                                  <span>·</span>
                                  <span>{doc.category}</span>
                                </>
                              )}
                              {linkedCase && (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{linkedCase.title}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground shrink-0">
                            {safeFormat(doc.createdAt, 'MMM d, yyyy')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentTimeline.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No activity yet.
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="px-4 pb-2 space-y-1">
                    {recentTimeline.map((event) => {
                      const linkedCase = cases.find((c) => c.id === event.caseId);
                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center h-9 w-9 rounded-lg bg-purple-500/10 shrink-0">
                            <span className="text-[10px] font-medium text-purple-500">
                              {safeFormat(event.eventDate, 'MMM')}
                            </span>
                            <span className="text-xs font-bold text-purple-500">
                              {safeFormat(event.eventDate, 'dd')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {event.caseId && linkedCase && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {linkedCase.title}
                                </span>
                              )}
                              {event.isMilestone && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/20">
                                  Milestone
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-1 shrink-0">
                            <span className={cn(
                              'h-2.5 w-2.5 rounded-full inline-block',
                              event.isCompleted ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                            )} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
