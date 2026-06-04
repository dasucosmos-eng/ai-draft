'use client';

import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/data-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Receipt, Plus, Search, IndianRupee, Trash2, CheckCircle2, FileText } from 'lucide-react';
import { generatePDF, downloadPDF } from '@/lib/pdf-generator';

export function BillingView() {
  const invoices = useDataStore((s) => s.invoices);
  const addInvoice = useDataStore((s) => s.addInvoice);
  const deleteInvoice = useDataStore((s) => s.deleteInvoice);
  const updateInvoice = useDataStore((s) => s.updateInvoice);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newInv, setNewInv] = useState({
    description: '', amount: '', caseTitle: '', gstPercent: '18',
  });

  const filtered = useMemo(() => {
    if (!search) return invoices;
    return invoices.filter((inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.description?.toLowerCase().includes(search.toLowerCase()) ||
      inv.caseTitle?.toLowerCase().includes(search.toLowerCase())
    );
  }, [invoices, search]);

  const totalPending = useMemo(() => invoices.filter((i) => i.status === 'pending').reduce((sum, i) => sum + i.totalAmount, 0), [invoices]);
  const totalPaid = useMemo(() => invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0), [invoices]);

  const handleCreate = () => {
    const amount = parseFloat(newInv.amount);
    if (!amount || amount <= 0) { toast.error('Valid amount required'); return; }
    const gst = amount * (parseFloat(newInv.gstPercent) / 100);
    const invNum = `INV-${String(invoices.length + 1).padStart(4, '0')}`;
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);

    addInvoice({
      id: uuidv4(),
      invoiceNumber: invNum,
      description: newInv.description,
      amount,
      gstAmount: gst,
      totalAmount: amount + gst,
      status: 'pending',
      issuedDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
      caseTitle: newInv.caseTitle,
    });
    setNewInv({ description: '', amount: '', caseTitle: '', gstPercent: '18' });
    setCreateOpen(false);
    toast.success('Invoice created');
  };

  const handleMarkPaid = (id: string) => {
    updateInvoice(id, { status: 'paid', paidDate: new Date().toISOString() });
    toast.success('Marked as paid');
  };

  const handleDownloadInvoice = (inv: any) => {
    const content = `
INVOICE: ${inv.invoiceNumber}
Date: ${format(new Date(inv.issuedDate), 'dd MMM yyyy')}
Due Date: ${format(new Date(inv.dueDate), 'dd MMM yyyy')}

${inv.caseTitle ? `Case: ${inv.caseTitle}` : ''}
${inv.description ? `\n${inv.description}` : ''}

Amount: ₹${inv.amount.toLocaleString()}
GST (${inv.gstAmount > 0 ? '18%' : '0%'}): ₹${inv.gstAmount.toLocaleString()}
Total: ₹${inv.totalAmount.toLocaleString()}

Status: ${inv.status.toUpperCase()}
${inv.paidDate ? `Paid on: ${format(new Date(inv.paidDate), 'dd MMM yyyy')}` : ''}
    `.trim();
    const doc = generatePDF(content, `Invoice ${inv.invoiceNumber}`);
    downloadPDF(doc, `${inv.invoiceNumber}.pdf`);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'paid': return 'bg-emerald-500/10 text-emerald-500';
      case 'pending': return 'bg-amber-500/10 text-amber-500';
      case 'overdue': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{invoices.length} invoices</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pending</p>
            <p className="text-lg font-bold text-amber-500">₹{totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold text-emerald-500">₹{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-bold">₹{(totalPending + totalPaid).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No invoices</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((inv) => (
            <Card key={inv.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <IndianRupee className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">{inv.invoiceNumber}</span>
                      <Badge variant="outline" className={cn('text-[10px]', statusColor(inv.status))}>{inv.status}</Badge>
                    </div>
                    {inv.caseTitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{inv.caseTitle}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Issued: {format(new Date(inv.issuedDate), 'dd MMM yyyy')}</span>
                      <span>Due: {format(new Date(inv.dueDate), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">₹{inv.totalAmount.toLocaleString()}</p>
                  <div className="flex items-center gap-1">
                    {inv.status !== 'paid' && (
                      <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => handleMarkPaid(inv.id)}>
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadInvoice(inv)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { deleteInvoice(inv.id); toast.success('Deleted'); }}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Case Title</Label>
              <Input placeholder="e.g., Sharma vs State" value={newInv.caseTitle} onChange={(e) => setNewInv({ ...newInv, caseTitle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="Services rendered..." value={newInv.description} onChange={(e) => setNewInv({ ...newInv, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (₹) *</Label>
                <Input type="number" placeholder="0" value={newInv.amount} onChange={(e) => setNewInv({ ...newInv, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">GST %</Label>
                <Input type="number" value={newInv.gstPercent} onChange={(e) => setNewInv({ ...newInv, gstPercent: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
