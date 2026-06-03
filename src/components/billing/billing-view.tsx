'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAppStore, type InvoiceItem } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  IndianRupee,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Send,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowUpRight,
  MessageSquare,
  Receipt,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'

/* ─── Types ─── */

interface LineItem {
  id: string
  description: string
  amount: number
}

interface NewInvoiceForm {
  caseId: string
  clientName: string
  caseTitle: string
  lineItems: LineItem[]
  dueDate: string
  notes: string
  gstPercent: number
}

const GST_RATE = 18

/* ─── Helper ─── */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 gap-1">
          <CheckCircle2 className="size-3" />
          Paid
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 gap-1">
          <Clock className="size-3" />
          Pending
        </Badge>
      )
    case 'overdue':
      return (
        <Badge className="bg-red-500/15 text-red-600 border-red-500/20 hover:bg-red-500/20 gap-1">
          <AlertTriangle className="size-3" />
          Overdue
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground gap-1">
          <XCircle className="size-3" />
          Cancelled
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

/* ─── Main Component ─── */

export default function BillingView() {
  const invoices = useAppStore((s) => s.invoices)
  const setInvoices = useAppStore((s) => s.setInvoices)
  const cases = useAppStore((s) => s.cases)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<InvoiceItem | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'invoices' | 'reminders' | 'analytics'>('invoices')

  const displayInvoices = invoices

  // Form state
  const [form, setForm] = useState<NewInvoiceForm>({
    caseId: '',
    clientName: '',
    caseTitle: '',
    lineItems: [{ id: '1', description: '', amount: 0 }],
    dueDate: '',
    notes: '',
    gstPercent: GST_RATE,
  })

  // ── Computed Stats ──
  const stats = useMemo(() => {
    const paid = displayInvoices.filter((i) => i.status === 'paid')
    const pending = displayInvoices.filter((i) => i.status === 'pending')
    const overdue = displayInvoices.filter((i) => i.status === 'overdue')

    const totalRevenue = paid.reduce((sum, i) => sum + i.totalAmount, 0)
    const pendingAmount = pending.reduce((sum, i) => sum + i.totalAmount, 0)
    const pendingCount = pending.length
    const overdueAmount = overdue.reduce((sum, i) => sum + i.totalAmount, 0)
    const overdueCount = overdue.length

    return { totalRevenue, pendingAmount, pendingCount, overdueAmount, overdueCount }
  }, [displayInvoices])

  // ── Form Handlers ──
  const addLineItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: String(Date.now()), description: '', amount: 0 },
      ],
    }))
  }, [])

  const removeLineItem = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
    }))
  }, [])

  const updateLineItem = useCallback(
    (id: string, field: 'description' | 'amount', value: string | number) => {
      setForm((prev) => ({
        ...prev,
        lineItems: prev.lineItems.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        ),
      }))
    },
    []
  )

  const subtotal = useMemo(
    () => form.lineItems.reduce((sum, item) => sum + item.amount, 0),
    [form.lineItems]
  )
  const gstAmount = Math.round(subtotal * (form.gstPercent / 100))
  const total = subtotal + gstAmount

  const handleGenerateInvoice = useCallback(async () => {
    if (!form.caseTitle.trim() || form.lineItems.every((i) => !i.description.trim())) {
      toast.error('Please fill in case title and at least one line item')
      return
    }

    setIsGenerating(true)
    try {
      // Simulate invoice generation delay
      await new Promise((resolve) => setTimeout(resolve, 1200))

      const newInvoice: InvoiceItem = {
        id: `inv-${String(displayInvoices.length + 1).padStart(3, '0')}`,
        invoiceNumber: `LEX-2025-${String(displayInvoices.length + 1).padStart(3, '0')}`,
        description: form.notes || form.lineItems.map((i) => i.description).join(', '),
        amount: subtotal,
        gstAmount,
        totalAmount: total,
        status: 'pending',
        issuedDate: new Date().toISOString().split('T')[0],
        dueDate: form.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        caseTitle: form.caseTitle || form.clientName,
      }

      const updatedInvoices = [...invoices, newInvoice]
      setInvoices(updatedInvoices)

      setForm({
        caseId: '',
        clientName: '',
        caseTitle: '',
        lineItems: [{ id: '1', description: '', amount: 0 }],
        dueDate: '',
        notes: '',
        gstPercent: GST_RATE,
      })
      setDialogOpen(false)
      toast.success(`Invoice ${newInvoice.invoiceNumber} generated successfully!`)
    } catch {
      toast.error('Failed to generate invoice')
    } finally {
      setIsGenerating(false)
    }
  }, [form, displayInvoices.length, subtotal, gstAmount, total, invoices, setInvoices])

  const handleMarkPaid = useCallback(
    (id: string) => {
      const updated = invoices.map((inv) =>
        inv.id === id
          ? { ...inv, status: 'paid', paidDate: new Date().toISOString().split('T')[0] }
          : inv
      )
      setInvoices(updated)
      toast.success('Invoice marked as paid')
    },
    [invoices, setInvoices]
  )

  const handleSendReminder = useCallback((invoiceNumber: string) => {
    toast.success(`Payment reminder sent for ${invoiceNumber} via WhatsApp`)
  }, [])

  const handleDownload = useCallback((invoiceNumber: string) => {
    toast.success(`Downloading ${invoiceNumber}...`)
  }, [])

  // ── Revenue Chart data (derived from invoices) ──
  const monthlyRevenueData = useMemo(() => {
    const monthMap: Record<string, number> = {}
    invoices.forEach(inv => {
      if (inv.issuedDate && (inv.status === 'paid' || inv.status === 'pending')) {
        const month = new Date(inv.issuedDate).toLocaleDateString('en-IN', { month: 'short' })
        monthMap[month] = (monthMap[month] || 0) + inv.totalAmount
      }
    })
    return Object.entries(monthMap)
      .map(([month, amount]) => ({ month, amount }))
      .slice(-6)
  }, [invoices])
  const maxRevenue = monthlyRevenueData.length > 0 ? Math.max(...monthlyRevenueData.map((d) => d.amount)) : 1

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <IndianRupee className="size-7 text-primary" />
            Billing & Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            GST-ready automated invoicing with real-time payment tracking
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" />
          New Invoice
        </Button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <Card className="py-5">
          <CardContent className="px-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats.totalRevenue)}
                </p>
                {invoices.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <TrendingUp className="size-3" />
                    <span>{invoices.filter(i => i.status === 'paid').length} paid invoices</span>
                  </div>
                )}
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10">
                <CreditCard className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="py-5">
          <CardContent className="px-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pending Payments
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats.pendingAmount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingCount} invoice{stats.pendingCount !== 1 ? 's' : ''} pending
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10">
                <Clock className="size-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="py-5 border-red-500/30 bg-red-500/5">
          <CardContent className="px-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-500 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Overdue
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.overdueAmount)}
                </p>
                <p className="text-xs text-red-500/80">
                  {stats.overdueCount} invoice{stats.overdueCount !== 1 ? 's' : ''} overdue
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle className="size-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Empty State (when no invoices) ── */}
      {invoices.length === 0 && activeTab === 'invoices' && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Receipt className="size-7 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">No Invoices Yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Create your first invoice to start tracking payments and revenue.
            </p>
            <Button
              className="mt-4 gap-2"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="size-4" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1 border-b border-border pb-px">
        {(['invoices', 'reminders', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'invoices' && 'Invoices'}
            {tab === 'reminders' && 'Payment Reminders'}
            {tab === 'analytics' && 'Revenue Analytics'}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && invoices.length > 0 && (
        <Card className="py-0 gap-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Invoice Ledger</CardTitle>
                <CardDescription>
                  {displayInvoices.length} invoices • This billing period
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit gap-1.5 text-xs">
                <Receipt className="size-3" />
                FY 2025-26
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ScrollArea className="max-h-[480px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5 text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs">Case</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Description</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">GST</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Due Date</TableHead>
                    <TableHead className="text-xs pr-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="group">
                      <TableCell className="pl-5">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {invoice.invoiceNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-foreground max-w-[180px] truncate block">
                          {invoice.caseTitle || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
                          {invoice.description || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell">
                        {formatCurrency(invoice.gstAmount)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {formatCurrency(invoice.totalAmount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {formatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => setViewInvoice(invoice)}
                              >
                                <Eye className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Invoice</TooltipContent>
                          </Tooltip>
                          {(invoice.status === 'overdue' || invoice.status === 'pending') && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-amber-500 hover:text-amber-600"
                                  onClick={() => handleSendReminder(invoice.invoiceNumber)}
                                >
                                  <Send className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Send Reminder</TooltipContent>
                            </Tooltip>
                          )}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-emerald-500 hover:text-emerald-600"
                                  onClick={() => handleMarkPaid(invoice.id)}
                                >
                                  <CheckCircle2 className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark Paid</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => handleDownload(invoice.invoiceNumber)}
                              >
                                <Download className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download PDF</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Reminders Tab */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          {displayInvoices
            .filter((i) => i.status === 'overdue' || i.status === 'pending')
            .length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
                  <CheckCircle2 className="size-7 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-foreground">All Clear!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No pending or overdue invoices at the moment
                </p>
              </CardContent>
            </Card>
          ) : (
            displayInvoices
              .filter((i) => i.status === 'overdue' || i.status === 'pending')
              .map((invoice) => (
                <Card
                  key={invoice.id}
                  className={cn(
                    'py-0 gap-0',
                    invoice.status === 'overdue' && 'border-red-500/30 bg-red-500/5'
                  )}
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-lg mt-0.5',
                          invoice.status === 'overdue'
                            ? 'bg-red-500/10'
                            : 'bg-amber-500/10'
                        )}
                      >
                        {invoice.status === 'overdue' ? (
                          <AlertTriangle className="size-5 text-red-500" />
                        ) : (
                          <Clock className="size-5 text-amber-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {invoice.invoiceNumber}
                          </span>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                          {invoice.caseTitle}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>Due: {formatDate(invoice.dueDate)}</span>
                          <span>•</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(invoice.totalAmount)}
                          </span>
                          {invoice.status === 'overdue' && (
                            <>
                              <span>•</span>
                              <span className="text-red-500 font-medium">
                                {Math.ceil(
                                  (Date.now() - new Date(invoice.dueDate).getTime()) /
                                    86400000
                                )}{' '}
                                days overdue
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs border-green-500/30 text-green-600 hover:bg-green-500/10"
                        onClick={() => handleSendReminder(invoice.invoiceNumber)}
                      >
                        <MessageSquare className="size-3.5" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => handleMarkPaid(invoice.id)}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Mark Paid
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && invoices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card className="py-0 gap-0">
            <CardHeader className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    Monthly Revenue
                  </CardTitle>
                  <CardDescription>Last 6 months performance</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1 text-xs">
                  <ArrowUpRight className="size-3 text-emerald-500" />
                  Revenue Data
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-end gap-3 h-48">
                {monthlyRevenueData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">No revenue data yet</p>
                  </div>
                ) : monthlyRevenueData.map((data, index) => {
                  const heightPercent = (data.amount / maxRevenue) * 100
                  const isHighest = data.amount === maxRevenue
                  return (
                    <div
                      key={data.month}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {formatCurrency(data.amount)}
                      </span>
                      <div className="w-full relative" style={{ height: '140px' }}>
                        <div
                          className={cn(
                            'absolute bottom-0 w-full rounded-t-md transition-all duration-700 ease-out',
                            isHighest
                              ? 'bg-primary shadow-sm shadow-primary/30'
                              : 'bg-primary/25 hover:bg-primary/40'
                          )}
                          style={{
                            height: `${heightPercent}%`,
                            transitionDelay: `${index * 100}ms`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {data.month}
                      </span>
                    </div>
                  )
                })}
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Collected
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">
                    {formatCurrency(stats.pendingAmount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Pending
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(stats.overdueAmount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    At Risk
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Breakdown */}
          <Card className="py-0 gap-0">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Invoice Breakdown
              </CardTitle>
              <CardDescription>Status distribution for this period</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-5">
              {(() => {
                const paid = displayInvoices.filter((i) => i.status === 'paid').length
                const pending = displayInvoices.filter((i) => i.status === 'pending').length
                const overdue = displayInvoices.filter((i) => i.status === 'overdue').length
                const cancelled = displayInvoices.filter((i) => i.status === 'cancelled').length
                const total = displayInvoices.length || 1

                return (
                  <>
                    {/* Visual bars */}
                    <div className="space-y-3">
                      <StatusRow
                        label="Paid"
                        count={paid}
                        total={total}
                        color="bg-emerald-500"
                        textColor="text-emerald-600"
                      />
                      <StatusRow
                        label="Pending"
                        count={pending}
                        total={total}
                        color="bg-amber-500"
                        textColor="text-amber-600"
                      />
                      <StatusRow
                        label="Overdue"
                        count={overdue}
                        total={total}
                        color="bg-red-500"
                        textColor="text-red-600"
                      />
                      <StatusRow
                        label="Cancelled"
                        count={cancelled}
                        total={total}
                        color="bg-muted-foreground"
                        textColor="text-muted-foreground"
                      />
                    </div>

                    <Separator />

                    {/* GST Summary */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        GST Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-secondary/50 p-3 text-center">
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrency(
                              displayInvoices.reduce((s, i) => s + i.gstAmount, 0)
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Total GST Collected</p>
                        </div>
                        <div className="rounded-lg bg-secondary/50 p-3 text-center">
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrency(
                              displayInvoices.reduce((s, i) => s + i.amount, 0)
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Taxable Value</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Quick Stats */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Quick Stats
                      </h4>
                      <div className="space-y-2">
                        <StatRow label="Avg. Invoice Value" value={formatCurrency(
                          displayInvoices.reduce((s, i) => s + i.totalAmount, 0) / (displayInvoices.length || 1)
                        )} />
                        <StatRow label="Highest Invoice" value={formatCurrency(
                          Math.max(...displayInvoices.map((i) => i.totalAmount))
                        )} />
                        <StatRow label="Collection Rate" value={`${Math.round(
                          (displayInvoices.filter((i) => i.status === 'paid').length / (displayInvoices.length || 1)) * 100
                        )}%`} />
                      </div>
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── New Invoice Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              Generate New Invoice
            </DialogTitle>
            <DialogDescription>
              Create a GST-compliant invoice. Fill in the details and line items below.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 py-2">
              {/* Client / Case Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Client Name</Label>
                  <Input
                    placeholder="e.g., Rajesh Kumar"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Case Title</Label>
                  <Select
                    value={form.caseId}
                    onValueChange={(value) => {
                      const selectedCase = cases.find((c) => c.id === value)
                      setForm({
                        ...form,
                        caseId: value,
                        caseTitle: selectedCase?.title || '',
                        clientName: selectedCase?.clientName || form.clientName,
                      })
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a case..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.length > 0 ? (
                        cases.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="manual" disabled>
                          No cases in system
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!form.caseId && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Case Title (Manual)</Label>
                  <Input
                    placeholder="e.g., Sharma v. Gupta - Property Dispute"
                    value={form.caseTitle}
                    onChange={(e) => setForm({ ...form, caseTitle: e.target.value })}
                  />
                </div>
              )}

              {/* GST Rate */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">GST Rate</Label>
                <Select
                  value={String(form.gstPercent)}
                  onValueChange={(value) => setForm({ ...form, gstPercent: Number(value) })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider">
                    Line Items
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={addLineItem}
                  >
                    <Plus className="size-3" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.lineItems.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder={`Item ${index + 1} description`}
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(item.id, 'description', e.target.value)
                          }
                          className="text-xs"
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          placeholder="₹ Amount"
                          value={item.amount || ''}
                          onChange={(e) =>
                            updateLineItem(item.id, 'amount', Number(e.target.value) || 0)
                          }
                          className="text-xs text-right"
                        />
                      </div>
                      {form.lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-red-500 mt-0.5"
                          onClick={() => removeLineItem(item.id)}
                        >
                          <XCircle className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    GST ({form.gstPercent}%)
                  </span>
                  <span className="font-semibold">{formatCurrency(gstAmount)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-lg text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="text-xs"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Notes</Label>
                <Textarea
                  placeholder="Additional notes or payment instructions..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="text-xs min-h-[60px] resize-none"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-2 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleGenerateInvoice}
              disabled={isGenerating}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
            >
              {isGenerating ? (
                <>
                  <Skeleton className="size-3.5 rounded-full bg-primary-foreground/30" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="size-3.5" />
                  Generate Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Invoice Dialog ── */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              {viewInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>Invoice details</DialogDescription>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Case
                  </p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {viewInvoice.caseTitle || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Status
                  </p>
                  <div className="mt-1">{getStatusBadge(viewInvoice.status)}</div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Issued
                  </p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {formatDate(viewInvoice.issuedDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Due Date
                  </p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {formatDate(viewInvoice.dueDate)}
                  </p>
                </div>
              </div>
              {viewInvoice.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Description
                    </p>
                    <p className="text-sm text-foreground mt-0.5">{viewInvoice.description}</p>
                  </div>
                </>
              )}
              <Separator />
              <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Base Amount</span>
                  <span className="font-semibold">{formatCurrency(viewInvoice.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">GST</span>
                  <span className="font-semibold">{formatCurrency(viewInvoice.gstAmount)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">Total</span>
                  <span className="font-bold text-lg text-primary">
                    {formatCurrency(viewInvoice.totalAmount)}
                  </span>
                </div>
              </div>
              {viewInvoice.paidDate && (
                <p className="text-xs text-emerald-600 text-center">
                  Paid on {formatDate(viewInvoice.paidDate)}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewInvoice(null)} className="text-xs">
              Close
            </Button>
            <Button
              className="gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => handleDownload(viewInvoice?.invoiceNumber || '')}
            >
              <Download className="size-3.5" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Sub-Components ─── */

function StatusRow({
  label,
  count,
  total,
  color,
  textColor,
}: {
  label: string
  count: number
  total: number
  color: string
  textColor: string
}) {
  const percent = Math.round((count / total) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className={cn('text-xs font-semibold', textColor)}>
          {count} ({percent}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  )
}
