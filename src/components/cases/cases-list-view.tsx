'use client';

import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/data-store';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { cn, safeFormat } from '@/lib/utils';
import {
  Briefcase, Plus, Search, Filter, ArrowUpDown,
  Calendar, MapPin, User, MoreVertical, Trash2, Eye
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CaseItem } from '@/lib/types';

export function CasesListView() {
  const cases = useDataStore((s) => s.cases);
  const addCase = useDataStore((s) => s.addCase);
  const deleteCase = useDataStore((s) => s.deleteCase);
  const { setCurrentView, setSelectedCaseId } = useAppStore((s) => ({ setCurrentView: s.setCurrentView, setSelectedCaseId: s.setSelectedCaseId }));

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  // New case form
  const [newCase, setNewCase] = useState<Partial<CaseItem>>({});

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (search && !c.title?.toLowerCase().includes(search.toLowerCase()) && !c.caseNumber?.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (typeFilter !== 'all' && c.caseType !== typeFilter) return false;
      return true;
    });
  }, [cases, search, statusFilter, typeFilter]);

  const caseTypes = useMemo(() => [...new Set(cases.map((c) => c.caseType).filter(Boolean))], [cases]);

  const handleCreate = () => {
    if (!newCase.title?.trim()) {
      toast.error('Case title is required');
      return;
    }
    const caseItem: CaseItem = {
      id: uuidv4(),
      title: newCase.title || '',
      description: newCase.description || '',
      caseType: newCase.caseType || 'Civil',
      status: newCase.status || 'active',
      priority: newCase.priority || 'medium',
      clientName: newCase.clientName || '',
      courtName: newCase.courtName || '',
      filingDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addCase(caseItem);
    setNewCase({});
    setCreateOpen(false);
    toast.success('Case created successfully');
  };

  const handleDelete = (id: string) => {
    // BUG #10 FIX: Add confirmation before permanent delete
    const caseItem = cases.find(c => c.id === id);
    if (caseItem && !window.confirm(`Delete case "${caseItem.title}"? This action cannot be undone.`)) {
      return;
    }
    deleteCase(id);
    toast.success('Case deleted');
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500';
      case 'pending': return 'bg-amber-500/10 text-amber-500';
      case 'closed': return 'bg-gray-500/10 text-gray-400';
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{cases.length} total cases</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> New Case
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cases..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-full sm:w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {caseTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No cases found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {cases.length === 0 ? 'Create your first case to get started.' : 'Try adjusting your filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((c) => (
            <Card key={c.id} className="border-border/50 hover:border-border transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => { setSelectedCaseId(c.id); setCurrentView('case-detail'); }}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold truncate">{c.title}</h3>
                          {c.caseNumber && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {c.caseNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{c.caseType}</span>
                          {c.courtName && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.courtName}</span>
                          )}
                          {c.clientName && (
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{c.clientName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusColor(c.status))}>
                            {c.status}
                          </Badge>
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', priorityColor(c.priority))}>
                            {c.priority}
                          </Badge>
                          {c.nextHearing && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {safeFormat(c.nextHearing, 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedCaseId(c.id); setCurrentView('case-detail'); }}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Case Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Case Title *</Label>
              <Input
                placeholder="e.g., Sharma vs State of Maharashtra"
                value={newCase.title || ''}
                onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Case Type</Label>
                <Select value={newCase.caseType || 'Civil'} onValueChange={(v) => setNewCase({ ...newCase, caseType: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Civil">Civil</SelectItem>
                    <SelectItem value="Criminal">Criminal</SelectItem>
                    <SelectItem value="Family">Family</SelectItem>
                    <SelectItem value="Constitutional">Constitutional</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                    <SelectItem value="Tax">Tax</SelectItem>
                    <SelectItem value="Intellectual Property">Intellectual Property</SelectItem>
                    <SelectItem value="Labour">Labour</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={newCase.priority || 'medium'} onValueChange={(v) => setNewCase({ ...newCase, priority: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Client Name</Label>
              <Input
                placeholder="Client name"
                value={newCase.clientName || ''}
                onChange={(e) => setNewCase({ ...newCase, clientName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Court Name</Label>
              <Input
                placeholder="e.g., High Court of Delhi"
                value={newCase.courtName || ''}
                onChange={(e) => setNewCase({ ...newCase, courtName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                placeholder="Brief description of the case..."
                value={newCase.description || ''}
                onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Case</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
