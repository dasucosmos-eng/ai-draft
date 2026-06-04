'use client';

import { useState, useMemo } from 'react';
import { useClientsStore } from '@/store/clients-store';
import { useDataStore } from '@/store/data-store';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { generatePDF, downloadPDF } from '@/lib/pdf-generator';
import { DocumentViewer } from '@/components/shared/document-viewer';
import {
  Users, Plus, Search, Phone, Mail, MapPin, Building, MoreVertical,
  Eye, Trash2, Edit, User, FileText, Download, Copy, X, FileDown, Pencil, Save
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Client } from '@/lib/types';

export function ClientsView() {
  const clients = useClientsStore((s) => s.clients);
  const addClient = useClientsStore((s) => s.addClient);
  const updateClient = useClientsStore((s) => s.updateClient);
  const deleteClient = useClientsStore((s) => s.deleteClient);
  const cases = useDataStore((s) => s.cases);
  const documents = useDataStore((s) => s.documents);

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState<Partial<Client>>({});
  const [editClient, setEditClient] = useState<Partial<Client>>({});
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [docViewerOpen, setDocViewerOpen] = useState(false);
  const [docViewerTitle, setDocViewerTitle] = useState('');
  const [docViewerContent, setDocViewerContent] = useState('');

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const clientCases = useMemo(() => {
    if (!selectedClient) return [];
    return cases.filter((c) => {
      // Match by caseIds array (if populated) or by clientName
      if (selectedClient.caseIds?.includes(c.id)) return true;
      // Fallback: match by name (handles cases created before caseIds linking)
      if (c.clientName && selectedClient.name &&
          c.clientName.toLowerCase() === selectedClient.name.toLowerCase()) return true;
      return false;
    });
  }, [cases, selectedClient]);

  const clientDocs = useMemo(() => {
    if (!selectedClient) return [];
    return documents.filter((d) => d.caseId && clientCases.some((c) => c.id === d.caseId));
  }, [documents, selectedClient, clientCases]);

  const handleCreate = () => {
    if (!newClient.name?.trim()) { toast.error('Name is required'); return; }
    const client: Client = {
      id: uuidv4(),
      name: newClient.name || '',
      email: newClient.email || '',
      phone: newClient.phone || '',
      address: newClient.address || '',
      alternatePhone: newClient.alternatePhone || '',
      category: newClient.category || 'individual',
      company: newClient.company || '',
      notes: newClient.notes || '',
      tags: [],
      fees: [],
      activities: [],
      importantDates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addClient(client);
    setNewClient({});
    setCreateOpen(false);
    toast.success('Client added');
  };

  const handleSave = () => {
    if (!selectedClient || !editClient.name) return;
    updateClient(selectedClient.id, editClient);
    setEditMode(false);
    setSelectedClient({ ...selectedClient, ...editClient });
    toast.success('Client updated');
  };

  const handleDownloadPDF = (docName: string, content: string) => {
    const doc = generatePDF(content, docName);
    downloadPDF(doc, `${docName.toLowerCase().replace(/ /g, '-')}.pdf`);
    toast.success('PDF downloaded');
  };

  const handleDownloadDOC = (docName: string, content: string) => {
    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${docName}</title><style>body{font-family:Times New Roman,serif;font-size:12pt;line-height:1.6;margin:1in;}h1{font-size:16pt;font-weight:bold;}h2{font-size:14pt;font-weight:bold;}</style></head><body>${content.replace(/\n/g, '<br>')}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docName.toLowerCase().replace(/ /g, '-')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('DOC downloaded');
  };

  const handleViewDoc = (doc: { name: string; content: string }) => {
    setDocViewerTitle(doc.name);
    setDocViewerContent(doc.content || '');
    setDocViewerOpen(true);
  };

  const handleSaveDocContent = (content: string) => {
    setDocViewerContent(content);
    // Find and update the document in the store
    const doc = documents.find(d => d.name === docViewerTitle);
    if (doc) {
      const { updateDocument } = useDataStore.getState();
      updateDocument(doc.id, { content });
      toast.success('Document saved to Firestore');
    }
  };

  const handleCopyDoc = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Clients
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clients.length} total clients</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients by name, email, phone, company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No clients found</p>
            <p className="text-xs text-muted-foreground mt-1">Add a new client to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((c) => (
            <Card key={c.id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => {
                      setSelectedClient(c);
                      setEditClient({ ...c });
                      setEditMode(false);
                      setActiveTab('info');
                      setDetailOpen(true);
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <span className="text-sm font-semibold text-primary">{c.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">{c.name}</h3>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                          {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {c.category && <Badge variant="outline" className="text-[10px] capitalize">{c.category}</Badge>}
                          {c.company && <Badge variant="secondary" className="text-[10px]">{c.company}</Badge>}
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
                      <DropdownMenuItem onClick={() => { setSelectedClient(c); setEditClient({ ...c }); setEditMode(false); setActiveTab('info'); setDetailOpen(true); }}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedClient(c); setEditClient({ ...c }); setEditMode(true); setActiveTab('info'); setDetailOpen(true); }}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => {
                        // BUG #10 FIX: Add confirmation before permanent delete
                        if (!window.confirm(`Delete client "${c.name}"? This action cannot be undone.`)) return;
                        deleteClient(c.id); toast.success('Client deleted');
                      }}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input placeholder="Full name" value={newClient.name || ''} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input placeholder="+91 ..." value={newClient.phone || ''} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="email@example.com" value={newClient.email || ''} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={newClient.category || 'individual'} onValueChange={(v) => setNewClient({ ...newClient, category: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="ngo">NGO</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company</Label>
                <Input placeholder="Company name" value={newClient.company || ''} onChange={(e) => setNewClient({ ...newClient, company: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Textarea placeholder="Address" value={newClient.address || ''} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder="Any notes..." value={newClient.notes || ''} onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Add Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog with Tabs */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-lg font-semibold text-primary">
                    {selectedClient?.name.charAt(0).toUpperCase() || 'C'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{selectedClient?.name}</p>
                  {selectedClient?.category && <Badge variant="outline" className="text-[10px] capitalize mt-0.5">{selectedClient.category}</Badge>}
                </div>
              </div>
              {!editMode && selectedClient && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditMode(true)}>
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="cases">Cases ({clientCases.length})</TabsTrigger>
                <TabsTrigger value="documents">Docs ({clientDocs.length})</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4">
                <ScrollArea className="max-h-[50vh]">
                  <div className="space-y-4">
                    {editMode ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Name *</Label>
                            <Input value={editClient.name || ''} onChange={(e) => setEditClient({ ...editClient, name: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Category</Label>
                            <Select value={editClient.category || 'individual'} onValueChange={(v) => setEditClient({ ...editClient, category: v })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="individual">Individual</SelectItem>
                                <SelectItem value="corporate">Corporate</SelectItem>
                                <SelectItem value="government">Government</SelectItem>
                                <SelectItem value="ngo">NGO</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Phone</Label>
                            <Input value={editClient.phone || ''} onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Email</Label>
                            <Input value={editClient.email || ''} onChange={(e) => setEditClient({ ...editClient, email: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Alt. Phone</Label>
                            <Input value={editClient.alternatePhone || ''} onChange={(e) => setEditClient({ ...editClient, alternatePhone: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Company</Label>
                            <Input value={editClient.company || ''} onChange={(e) => setEditClient({ ...editClient, company: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Address</Label>
                          <Textarea value={editClient.address || ''} onChange={(e) => setEditClient({ ...editClient, address: e.target.value })} rows={2} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Notes</Label>
                          <Textarea value={editClient.notes || ''} onChange={(e) => setEditClient({ ...editClient, notes: e.target.value })} rows={3} />
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedClient.phone && <InfoRow icon={Phone} label="Phone" value={selectedClient.phone} />}
                        {selectedClient.alternatePhone && <InfoRow icon={Phone} label="Alt. Phone" value={selectedClient.alternatePhone} />}
                        {selectedClient.email && <InfoRow icon={Mail} label="Email" value={selectedClient.email} />}
                        {selectedClient.company && <InfoRow icon={Building} label="Company" value={selectedClient.company} />}
                        {selectedClient.address && <InfoRow icon={MapPin} label="Address" value={selectedClient.address} className="sm:col-span-2" />}
                        {selectedClient.notes && (
                          <div className="sm:col-span-2 mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Notes</p>
                            <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedClient.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="cases" className="mt-4">
                <ScrollArea className="max-h-[50vh]">
                  {clientCases.length > 0 ? (
                    <div className="space-y-2">
                      {clientCases.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                          <div>
                            <p className="text-sm font-medium">{c.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px]">{c.caseType}</Badge>
                              <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">No cases linked to this client</div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <ScrollArea className="max-h-[50vh]">
                  {clientDocs.length > 0 ? (
                    <div className="space-y-2">
                      {clientDocs.map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border hover:border-primary/20 transition-colors">
                          <button className="flex items-center gap-2 min-w-0 flex-1 text-left" onClick={() => handleViewDoc(d)}>
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{d.name}</p>
                              <p className="text-[10px] text-muted-foreground">{d.category} • {new Date(d.createdAt).toLocaleDateString()}</p>
                            </div>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDoc(d)} title="View & Edit">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyDoc(d.content || '')} title="Copy">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadPDF(d.name, d.content || '')} title="Download PDF">
                              <FileDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadDOC(d.name, d.content || '')} title="Download DOC">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">No documents linked to this client</div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="fees" className="mt-4">
                <ScrollArea className="max-h-[50vh]">
                  {selectedClient.fees && selectedClient.fees.length > 0 ? (
                    <div className="space-y-2">
                      {selectedClient.fees.map((fee: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                          <div>
                            <p className="text-sm font-medium">{fee.description || `Fee Entry ${i + 1}`}</p>
                            <p className="text-xs text-muted-foreground">{fee.date || ''}</p>
                          </div>
                          <Badge variant="outline">₹{(fee.amount || 0).toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">No fee records</div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDetailOpen(false); setEditMode(false); }}>
              {editMode ? 'Cancel' : 'Close'}
            </Button>
            {editMode && <Button onClick={handleSave}>Save Changes</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      <DocumentViewer
        open={docViewerOpen}
        onOpenChange={setDocViewerOpen}
        title={docViewerTitle}
        content={docViewerContent}
        onSave={handleSaveDocContent}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, className }: { icon: any; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className || ''}`}>
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm truncate">{value}</p>
      </div>
    </div>
  );
}
