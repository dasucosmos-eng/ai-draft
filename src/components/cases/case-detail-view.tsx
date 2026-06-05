'use client';

import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/data-store';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { cn, safeFormat } from '@/lib/utils';
import {
  ArrowLeft, Briefcase, Calendar, MapPin, User, Users, Hash,
  Plus, CheckCircle2, Circle, Trash2, Clock, Edit, Save, X,
  FileText, ListTodo, ClipboardList, Gavel, Building, Phone, Mail
} from 'lucide-react';
import type { TaskItem, TimelineEvent, DocumentItem } from '@/lib/types';

export function CaseDetailView() {
  const cases = useDataStore((s) => s.cases);
  const tasks = useDataStore((s) => s.tasks);
  const timelineEvents = useDataStore((s) => s.timelineEvents);
  const documents = useDataStore((s) => s.documents);
  const updateCase = useDataStore((s) => s.updateCase);
  const addTask = useDataStore((s) => s.addTask);
  const updateTask = useDataStore((s) => s.updateTask);
  const deleteTask = useDataStore((s) => s.deleteTask);
  const addTimelineEvent = useDataStore((s) => s.addTimelineEvent);
  const updateTimelineEvent = useDataStore((s) => s.updateTimelineEvent);
  const deleteTimelineEvent = useDataStore((s) => s.deleteTimelineEvent);
  const addDocument = useDataStore((s) => s.addDocument);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const selectedCaseId = useAppStore((s) => s.selectedCaseId);

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [taskDialog, setTaskDialog] = useState(false);
  const [eventDialog, setEventDialog] = useState(false);
  const [docDialog, setDocDialog] = useState(false);
  const [newTask, setNewTask] = useState<Partial<TaskItem>>({});
  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({});
  const [newDoc, setNewDoc] = useState<Partial<DocumentItem>>({});

  const caseData = useMemo(() => cases.find((c) => c.id === selectedCaseId), [cases, selectedCaseId]);
  const caseTasks = useMemo(() => tasks.filter((t) => t.caseId === selectedCaseId), [tasks, selectedCaseId]);
  const caseEvents = useMemo(() => timelineEvents
    .filter((e) => e.caseId === selectedCaseId)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()),
    [timelineEvents, selectedCaseId]);
  const caseDocs = useMemo(() => documents.filter((d) => d.caseId === selectedCaseId), [documents, selectedCaseId]);

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Briefcase className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">Case not found</p>
        <Button variant="outline" className="mt-4 gap-2" onClick={() => setCurrentView('cases')}>
          <ArrowLeft className="h-4 w-4" /> Back to Cases
        </Button>
      </div>
    );
  }

  const startEdit = () => {
    setEditData({ ...caseData });
    setEditing(true);
  };

  const saveEdit = () => {
    updateCase(caseData.id, editData);
    setEditing(false);
    toast.success('Case updated');
  };

  const handleAddTask = () => {
    const task: TaskItem = {
      id: uuidv4(),
      title: newTask.title || '',
      description: newTask.description || '',
      status: 'pending',
      priority: newTask.priority || 'medium',
      dueDate: newTask.dueDate,
      caseId: selectedCaseId!,
    };
    addTask(task);
    setNewTask({});
    setTaskDialog(false);
    toast.success('Task added');
  };

  const handleAddEvent = () => {
    const event: TimelineEvent = {
      id: uuidv4(),
      title: newEvent.title || '',
      description: newEvent.description || '',
      eventType: newEvent.eventType || 'hearing',
      eventDate: newEvent.eventDate || new Date().toISOString(),
      isCompleted: false,
      isMilestone: false,
      reminderSet: false,
      caseId: selectedCaseId!,
    };
    addTimelineEvent(event);
    setNewEvent({});
    setEventDialog(false);
    toast.success('Event added');
  };

  const handleAddDoc = () => {
    const doc: DocumentItem = {
      id: uuidv4(),
      name: newDoc.name || '',
      type: newDoc.type || 'Note',
      category: newDoc.category || 'General',
      content: newDoc.content || '',
      caseId: selectedCaseId!,
      createdAt: new Date().toISOString(),
    };
    addDocument(doc);
    setNewDoc({});
    setDocDialog(false);
    toast.success('Document added');
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
      case 'urgent': return 'bg-red-500/10 text-red-500';
      case 'high': return 'bg-orange-500/10 text-orange-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-green-500/10 text-green-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentView('cases')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{caseData.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {caseData.caseType} {caseData.caseNumber ? `• ${caseData.caseNumber}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-xs', statusColor(caseData.status))}>{caseData.status}</Badge>
          {!editing ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5" onClick={saveEdit}>
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({caseEvents.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({caseDocs.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({caseTasks.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={editData.title || ''} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Case Number</Label>
                    <Input value={editData.caseNumber || ''} onChange={(e) => setEditData({ ...editData, caseNumber: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={editData.status || 'active'} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priority</Label>
                    <Select value={editData.priority || 'medium'} onValueChange={(v) => setEditData({ ...editData, priority: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Court</Label>
                    <Input value={editData.courtName || ''} onChange={(e) => setEditData({ ...editData, courtName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Judge</Label>
                    <Input value={editData.judgeName || ''} onChange={(e) => setEditData({ ...editData, judgeName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Filing Date</Label>
                    <Input type="date" value={editData.filingDate?.split('T')[0] || ''} onChange={(e) => setEditData({ ...editData, filingDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Next Hearing</Label>
                    <Input type="date" value={editData.nextHearing?.split('T')[0] || ''} onChange={(e) => setEditData({ ...editData, nextHearing: e.target.value })} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Textarea value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={3} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <InfoRow icon={Briefcase} label="Case Type" value={caseData.caseType} />
                  <InfoRow icon={Hash} label="Case Number" value={caseData.caseNumber} />
                  <InfoRow icon={MapPin} label="Status" value={caseData.status} badge color={statusColor(caseData.status)} />
                  <InfoRow icon={Clock} label="Priority" value={caseData.priority} badge color={priorityColor(caseData.priority)} />
                  <InfoRow icon={Building} label="Court" value={caseData.courtName} />
                  <InfoRow icon={Gavel} label="Judge" value={caseData.judgeName} />
                  <InfoRow icon={Calendar} label="Filing Date" value={caseData.filingDate ? safeFormat(caseData.filingDate, 'dd MMM yyyy') : ''} />
                  <InfoRow icon={Calendar} label="Next Hearing" value={caseData.nextHearing ? safeFormat(caseData.nextHearing, 'dd MMM yyyy') : ''} />
                  <InfoRow icon={User} label="Client" value={caseData.clientName} />
                  <InfoRow icon={Phone} label="Client Phone" value={caseData.clientPhone} />
                  <InfoRow icon={Mail} label="Client Email" value={caseData.clientEmail} />
                  <InfoRow icon={Users} label="Opposing Party" value={caseData.opposingParty} />
                  {caseData.underSections && caseData.underSections.length > 0 && (
                    <div className="sm:col-span-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Gavel className="h-3.5 w-3.5" /> Sections
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {caseData.underSections.map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {caseData.description && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{caseData.description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Timeline Events</CardTitle>
                <Button size="sm" className="gap-1.5" onClick={() => setEventDialog(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {caseEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No events yet</p>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-3 pr-3">
                    {caseEvents.map((event) => (
                      <div key={event.id} className="flex gap-3 items-start">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full',
                            event.isCompleted ? 'bg-emerald-500/10' : 'bg-muted'
                          )}>
                            {event.isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="w-px h-full bg-border mt-1" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{event.title}</p>
                            <div className="flex items-center gap-1">
                              {event.isMilestone && <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500">Milestone</Badge>}
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteTimelineEvent(event.id)}>
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                          {event.description && <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{safeFormat(event.eventDate, 'dd MMM yyyy, h:mm a')}</p>
                        </div>
                      </div>
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
                <CardTitle className="text-sm">Documents</CardTitle>
                <Button size="sm" className="gap-1.5" onClick={() => setDocDialog(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {caseDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No documents yet</p>
              ) : (
                <div className="space-y-2">
                  {caseDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground">{doc.type} • {doc.category}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{safeFormat(doc.createdAt, 'dd MMM yyyy')}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Tasks</CardTitle>
                <Button size="sm" className="gap-1.5" onClick={() => setTaskDialog(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {caseTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No tasks yet</p>
              ) : (
                <div className="space-y-2">
                  {caseTasks.map((task) => (
                    <div key={task.id} className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border border-border/50',
                      task.status === 'completed' && 'opacity-60'
                    )}>
                      <button onClick={() => updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' })}>
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', task.status === 'completed' && 'line-through')}>{task.title}</p>
                        {task.dueDate && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">Due: {safeFormat(task.dueDate, 'dd MMM yyyy')}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={cn('text-[10px]', priorityColor(task.priority))}>{task.priority}</Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input value={newTask.title || ''} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={newTask.priority || 'medium'} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input type="date" value={newTask.dueDate?.split('T')[0] || ''} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTask}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Dialog */}
      <Dialog open={eventDialog} onOpenChange={setEventDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input value={newEvent.title || ''} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={newEvent.eventType || 'hearing'} onValueChange={(v) => setNewEvent({ ...newEvent, eventType: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hearing">Hearing</SelectItem>
                    <SelectItem value="filing">Filing</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="datetime-local" value={newEvent.eventDate?.split('T')[0] || ''} onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialog(false)}>Cancel</Button>
            <Button onClick={handleAddEvent}>Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Dialog */}
      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Document Name *</Label>
              <Input value={newDoc.name || ''} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={newDoc.type || 'Note'} onValueChange={(v) => setNewDoc({ ...newDoc, type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Petition">Petition</SelectItem>
                    <SelectItem value="Affidavit">Affidavit</SelectItem>
                    <SelectItem value="Written Statement">Written Statement</SelectItem>
                    <SelectItem value="Reply">Reply</SelectItem>
                    <SelectItem value="Vakalatnama">Vakalatnama</SelectItem>
                    <SelectItem value="Note">Note</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={newDoc.category || 'General'} onValueChange={(v) => setNewDoc({ ...newDoc, category: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Pleading">Pleading</SelectItem>
                    <SelectItem value="Evidence">Evidence</SelectItem>
                    <SelectItem value="Correspondence">Correspondence</SelectItem>
                    <SelectItem value="Court Order">Court Order</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Content</Label>
              <Textarea value={newDoc.content || ''} onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDoc}>Add Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, badge, color }: {
  icon: any; label: string; value?: string; badge?: boolean; color?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {badge ? (
          <Badge variant="outline" className={cn('text-xs mt-0.5', color)}>{value}</Badge>
        ) : (
          <p className="text-sm">{value}</p>
        )}
      </div>
    </div>
  );
}
