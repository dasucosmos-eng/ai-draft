'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore, type CaseItem, type TaskItem, type InvoiceItem, type TimelineEvent } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  Briefcase,
  Scale,
  CheckSquare,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Calendar,
  Gavel,
  FilePlus,
  Search,
  Receipt,
  TrendingUp,
  Activity,
  CircleDot,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

/* ─── Animation Variants ─── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

/* ─── Helpers ─── */

function safeNum(value: unknown): number {
  if (typeof value === 'number' && isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.-]/g, ''))
    return isFinite(n) ? n : 0
  }
  return 0
}

function formatCurrency(amount: number | unknown): string {
  const num = safeNum(amount)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDate(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== 'string') return 'N/A'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== 'string') return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getDaysUntil(dateStr: unknown): number {
  if (!dateStr || typeof dateStr !== 'string') return Infinity
  const now = new Date()
  const target = new Date(dateStr)
  if (isNaN(target.getTime())) return Infinity
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function getPriorityColor(priority: unknown): string {
  const p = typeof priority === 'string' ? priority.toLowerCase() : ''
  switch (p) {
    case 'urgent': return 'text-red-500'
    case 'high': return 'text-amber-500'
    case 'medium': return 'text-slate-400'
    case 'low': return 'text-emerald-500'
    default: return 'text-slate-400'
  }
}

function getPriorityBg(priority: unknown): string {
  const p = typeof priority === 'string' ? priority.toLowerCase() : ''
  switch (p) {
    case 'urgent': return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'high': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'medium': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    case 'low': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

function getTaskStatusColor(status: unknown): string {
  const s = typeof status === 'string' ? status.toLowerCase() : ''
  switch (s) {
    case 'completed': return 'text-emerald-500'
    case 'in progress': return 'text-amber-500'
    case 'pending': return 'text-slate-400'
    case 'scheduled': return 'text-sky-500'
    default: return 'text-slate-400'
  }
}

function getTaskStatusIcon(status: unknown): string {
  const s = typeof status === 'string' ? status.toLowerCase() : ''
  switch (s) {
    case 'completed': return '✓'
    case 'in progress': return '◐'
    case 'pending': return '○'
    case 'scheduled': return 'Scheduled'
    default: return '○'
  }
}

function getInvoiceStatusBadge(status: unknown) {
  const s = typeof status === 'string' ? status.toLowerCase() : ''
  switch (s) {
    case 'paid': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 border text-[11px]">Paid</Badge>
    case 'pending': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 border text-[11px]">Pending</Badge>
    case 'overdue': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 border text-[11px]">Overdue</Badge>
    default: return <Badge variant="outline" className="text-[11px]">{String(status ?? '')}</Badge>
  }
}

/* ─── Stat Card ─── */

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  trend?: string
  trendColor?: string
  className?: string
}

function StatCard({ icon, label, value, trend, trendColor = 'text-emerald-500', className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            {icon}
          </div>
          {trend && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
              <TrendingUp className="size-3" />
              {trend}
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Empty State Card ─── */

function EmptyStateCard({ icon: Icon, title, description, action, onAction }: {
  icon: React.ElementType; title: string; description: string; action: string; onAction: () => void
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted mb-3">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 mb-3">{description}</p>
        <Button variant="outline" size="sm" className="text-xs" onClick={onAction}>{action}</Button>
      </CardContent>
    </Card>
  )
}

/* ─── Main Component ─── */

export default function DashboardView() {
  const cases = useAppStore((s) => s.cases)
  const tasks = useAppStore((s) => s.tasks)
  const timeline = useAppStore((s) => s.timelineEvents)
  const invoices = useAppStore((s) => s.invoices)
  const dataLoaded = useAppStore((s) => s.dataLoaded)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setSelectedCaseId = useAppStore((s) => s.setSelectedCaseId)

  // Show loading skeleton while Firestore data is being fetched
  if (!dataLoaded) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const stats = useMemo(() => {
    try {
      const activeCases = cases.filter((c) => c.status === 'Active').length
      const todayHearings = timeline.filter((e) => {
        const d = getDaysUntil(e.eventDate)
        return e.eventType === 'Hearing' && d <= 1 && d >= 0 && !e.isCompleted
      }).length
      const pendingTasks = tasks.filter((t) => t.status !== 'Completed').length
      const pendingPayments = invoices
        .filter((i) => i.status !== 'Paid')
        .reduce((sum, i) => sum + safeNum(i.totalAmount), 0)
      return { activeCases, todayHearings, pendingTasks, pendingPayments }
    } catch (e) {
      console.error('[Dashboard] stats error:', e)
      return { activeCases: 0, todayHearings: 0, pendingTasks: 0, pendingPayments: 0 }
    }
  }, [cases, tasks, timeline, invoices])

  const priorityBreakdown = useMemo(() => {
    const counts = { urgent: 0, high: 0, medium: 0, low: 0 }
    cases.forEach((c) => {
      const p = (c.priority || '').toLowerCase()
      if (p in counts) counts[p as keyof typeof counts]++
    })
    const total = cases.length || 1
    return {
      ...counts,
      total,
      urgentPct: Math.round((counts.urgent / total) * 100),
      highPct: Math.round((counts.high / total) * 100),
      mediumPct: Math.round((counts.medium / total) * 100),
      lowPct: Math.round((counts.low / total) * 100),
    }
  }, [cases])

  const upcomingHearings = useMemo(() => {
    return cases
      .filter((c) => c.nextHearing && c.status !== 'Closed')
      .sort((a, b) => new Date(a.nextHearing!).getTime() - new Date(b.nextHearing!).getTime())
      .slice(0, 5)
  }, [cases])

  const recentActivity = useMemo(() => {
    return [...timeline]
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
      .slice(0, 5)
  }, [timeline])

  const taskOverview = useMemo(() => {
    return tasks.slice(0, 5)
  }, [tasks])

  const revenueOverview = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, i) => sum + safeNum(i.totalAmount), 0)
    const paid = invoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + safeNum(i.totalAmount), 0)
    const pending = invoices.filter((i) => i.status === 'Pending').reduce((sum, i) => sum + safeNum(i.totalAmount), 0)
    const overdue = invoices.filter((i) => i.status === 'Overdue').reduce((sum, i) => sum + safeNum(i.totalAmount), 0)
    return { totalRevenue, paid, pending, overdue }
  }, [invoices])

  // Dynamic AI insights based on actual user data
  const aiInsights = useMemo(() => {
    const insights: { icon: React.ElementType; text: string; type: 'warning' | 'success' | 'danger' | 'info'; caseId?: string }[] = []

    // Check for urgent cases with upcoming hearings
    const urgentHearings = cases.filter(c => {
      if (!c.nextHearing || c.status === 'Closed') return false
      const days = getDaysUntil(c.nextHearing)
      return days <= 2 && days >= 0 && c.priority === 'Urgent'
    })
    urgentHearings.forEach(c => {
      insights.push({
        icon: AlertTriangle,
        text: `Urgent: ${c.title} hearing ${getDaysUntil(c.nextHearing!) <= 0 ? 'today' : 'tomorrow'}`,
        type: 'danger',
        caseId: c.id,
      })
    })

    // Check for overdue invoices
    const overdueInvoices = invoices.filter(i => i.status === 'Overdue')
    overdueInvoices.forEach(i => {
      insights.push({
        icon: AlertTriangle,
        text: `Overdue invoice ${i.invoiceNumber || 'N/A'} — ${formatCurrency(i.totalAmount)}`,
        type: 'warning',
      })
    })

    // Check for pending urgent tasks
    const urgentTasks = tasks.filter(t => t.priority === 'Urgent' && t.status !== 'Completed')
    urgentTasks.slice(0, 2).forEach(t => {
      insights.push({
        icon: CheckCircle2,
        text: `Urgent task: ${t.title}`,
        type: 'warning',
      })
    })

    // Check for completed items
    const completedToday = tasks.filter(t => t.status === 'Completed')
    if (completedToday.length > 0) {
      insights.push({
        icon: CheckCircle2,
        text: `${completedToday.length} task(s) completed`,
        type: 'success',
      })
    }

    return insights
  }, [cases, invoices, tasks])

  const handleCaseClick = (caseId: string) => {
    setSelectedCaseId(caseId)
    setCurrentView('case-detail')
  }

  const hasData = cases.length > 0 || tasks.length > 0 || timeline.length > 0 || invoices.length > 0

  return (
    <motion.div
      className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Litigation Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button
          className="gap-2 self-start"
          onClick={() => setCurrentView('intake')}
        >
          <Sparkles className="size-4" />
          AI Case Intake
        </Button>
      </motion.div>

      {/* ── Welcome Empty State (when no cases) ── */}
      {cases.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Briefcase className="size-10 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-foreground">Welcome to AI Draft</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Start by creating your first case using AI-powered intake. All your data is private and secure.
              </p>
              <Button className="mt-4 gap-2" onClick={() => setCurrentView('intake')}>
                <Sparkles className="size-4" />
                Create Your First Case
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Top Stats Row ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<Briefcase className="size-5 text-primary" />}
          label="Active Cases"
          value={stats.activeCases}
          trend={hasData ? `${cases.length} total` : undefined}
        />
        <StatCard
          icon={<Scale className="size-5 text-primary" />}
          label="Today's Hearings"
          value={stats.todayHearings}
          trendColor="text-sky-500"
        />
        <StatCard
          icon={<CheckSquare className="size-5 text-primary" />}
          label="Pending Tasks"
          value={stats.pendingTasks}
          trend={hasData ? `${tasks.length} total` : undefined}
          trendColor="text-amber-500"
        />
        <StatCard
          icon={<IndianRupee className="size-5 text-primary" />}
          label="Pending Payments"
          value={formatCurrency(stats.pendingPayments)}
          trend={hasData ? `${invoices.filter(i => i.status === 'Overdue').length} overdue` : undefined}
          trendColor="text-red-500"
        />
      </motion.div>

      {/* ── AI Intelligence Panel (only when insights exist) ── */}
      {aiInsights.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-500/30 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-500/5 dark:to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Sparkles className="size-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">AI Legal Intelligence</CardTitle>
                  <CardDescription className="text-xs">Real-time insights &amp; alerts for your practice</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {aiInsights.map((insight, idx) => (
                  <button
                    key={idx}
                    onClick={() => insight.caseId && handleCaseClick(insight.caseId)}
                    className={cn(
                      'flex items-start gap-3 rounded-lg p-3 text-left transition-colors',
                      'bg-background/60 hover:bg-background border border-transparent hover:border-border',
                      'cursor-pointer group'
                    )}
                  >
                    <insight.icon
                      className={cn(
                        'size-4 mt-0.5 shrink-0',
                        insight.type === 'danger' && 'text-red-500',
                        insight.type === 'warning' && 'text-amber-500',
                        insight.type === 'success' && 'text-emerald-500',
                        insight.type === 'info' && 'text-sky-500',
                      )}
                    />
                    <span className="text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                      {insight.text}
                    </span>
                    <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0 ml-auto" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Empty Quick Actions (when no data) ── */}
      {!hasData && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Get Started</CardTitle>
              <CardDescription>Create your first items to see your dashboard come alive</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <EmptyStateCard
                  icon={Briefcase}
                  title="No Cases"
                  description="Create your first case with AI"
                  action="New Case"
                  onAction={() => setCurrentView('intake')}
                />
                <EmptyStateCard
                  icon={FileText}
                  title="No Documents"
                  description="Upload or draft documents"
                  action="Go to Documents"
                  onAction={() => setCurrentView('documents')}
                />
                <EmptyStateCard
                  icon={CheckSquare}
                  title="No Tasks"
                  description="Tasks will appear as you work"
                  action="View Timeline"
                  onAction={() => setCurrentView('timeline')}
                />
                <EmptyStateCard
                  icon={Receipt}
                  title="No Invoices"
                  description="Generate invoices from your cases"
                  action="Go to Billing"
                  onAction={() => setCurrentView('billing')}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Two Column Layout ── */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Upcoming Hearings */}
            {upcomingHearings.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gavel className="size-4 text-primary" />
                        <CardTitle className="text-base">Upcoming Hearings</CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentView('litigation')}>
                        View All <ArrowUpRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {upcomingHearings.map((c) => {
                        const days = c.nextHearing ? getDaysUntil(c.nextHearing) : null
                        return (
                          <div
                            key={c.id}
                            className={cn(
                              'flex items-center gap-3 rounded-lg p-3 transition-colors cursor-pointer',
                              'bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border'
                            )}
                            onClick={() => handleCaseClick(c.id)}
                          >
                            <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 px-2.5 py-2 min-w-[52px] shrink-0">
                              <Calendar className="size-3.5 text-primary mb-1" />
                              <span className="text-xs font-bold text-primary leading-none">
                                {c.nextHearing ? new Date(c.nextHearing).toLocaleDateString('en-IN', { day: 'numeric' }) : '--'}
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                {c.nextHearing ? new Date(c.nextHearing).toLocaleDateString('en-IN', { month: 'short' }) : ''}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground truncate">{c.courtName || ''}</span>
                                {c.nextHearing && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(c.nextHearing)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={cn('border text-[10px]', getPriorityBg(c.priority))}>
                                {c.priority}
                              </Badge>
                              {days !== null && (
                                <span className={cn(
                                  'text-[11px] font-medium',
                                  days <= 0 ? 'text-red-500' : days <= 2 ? 'text-amber-500' : 'text-muted-foreground'
                                )}>
                                  {days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Activity className="size-4 text-primary" />
                      <CardTitle className="text-base">Recent Activity</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="relative space-y-0">
                      {recentActivity.map((event, idx) => (
                        <div key={event.id} className="flex gap-3 pb-4 last:pb-0">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              'flex size-7 items-center justify-center rounded-full shrink-0 border-2',
                              event.isMilestone
                                ? 'border-primary bg-primary/10'
                                : event.isCompleted
                                  ? 'border-emerald-500 bg-emerald-500/10'
                                  : 'border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800'
                            )}>
                              <CircleDot className={cn(
                                'size-3',
                                event.isMilestone ? 'text-primary' : event.isCompleted ? 'text-emerald-500' : 'text-slate-400'
                              )} />
                            </div>
                            {idx < recentActivity.length - 1 && (
                              <div className="w-px flex-1 bg-border mt-1" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <p className={cn('text-sm', event.isCompleted ? 'text-muted-foreground' : 'text-foreground font-medium')}>
                              {event.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(event.eventDate)}
                              </span>
                              <Badge variant="outline" className="text-[10px] h-4">
                                {event.eventType}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4 md:space-y-6">
            {/* Case Priority Breakdown */}
            {cases.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Case Priority</CardTitle>
                    <CardDescription>Breakdown by urgency level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {([
                        { label: 'Urgent', count: priorityBreakdown.urgent, pct: priorityBreakdown.urgentPct, color: 'bg-red-500', textColor: 'text-red-500' },
                        { label: 'High', count: priorityBreakdown.high, pct: priorityBreakdown.highPct, color: 'bg-amber-500', textColor: 'text-amber-500' },
                        { label: 'Medium', count: priorityBreakdown.medium, pct: priorityBreakdown.mediumPct, color: 'bg-slate-400', textColor: 'text-slate-400' },
                        { label: 'Low', count: priorityBreakdown.low, pct: priorityBreakdown.lowPct, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
                      ] as const).map((item) => (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className={cn('font-semibold', item.textColor)}>{item.count}</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              className={cn('h-full rounded-full', item.color)}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.pct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' as const, delay: 0.2 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Cases</span>
                      <span className="text-lg font-bold">{priorityBreakdown.total}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Task Overview */}
            {taskOverview.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Task Overview</CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentView('timeline')}>
                        View All <ArrowUpRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {taskOverview.map((task) => (
                        <div key={task.id} className="flex items-start gap-2.5 py-1.5">
                          <div className={cn('mt-0.5 text-sm', getTaskStatusColor(task.status))}>
                            {getTaskStatusIcon(task.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground leading-snug truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn('text-[11px] font-medium', getTaskStatusColor(task.status))}>
                                {task.status}
                              </span>
                              {task.dueDate && (
                                <>
                                  <span className="text-muted-foreground text-[10px]">•</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {formatDate(task.dueDate)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Revenue Overview */}
            {invoices.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="size-4 text-primary" />
                        <CardTitle className="text-base">Revenue Overview</CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentView('billing')}>
                        <ArrowUpRight className="size-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="rounded-lg bg-primary/5 p-3">
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                        <p className="text-xl font-bold text-primary mt-0.5">
                          {formatCurrency(revenueOverview.totalRevenue)}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Collected</p>
                          <p className="text-sm font-semibold text-emerald-500">{formatCurrency(revenueOverview.paid)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Pending</p>
                          <p className="text-sm font-semibold text-amber-500">{formatCurrency(revenueOverview.pending)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Overdue</p>
                          <p className="text-sm font-semibold text-red-500">{formatCurrency(revenueOverview.overdue)}</p>
                        </div>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Invoices</p>
                      {invoices.slice(0, 3).map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between py-1.5">
                          <div className="min-w-0 flex-1 mr-3">
                            <p className="text-sm text-foreground truncate">{String(inv.invoiceNumber ?? '')}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{String(inv.description ?? '')}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold">{formatCurrency(inv.totalAmount)}</span>
                            {getInvoiceStatusBadge(inv.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Frequently used tools &amp; shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: FilePlus, label: 'New Case Intake', sublabel: 'AI-powered', view: 'intake' as const, accent: 'bg-primary/10 text-primary' },
                { icon: FileText, label: 'Draft Document', sublabel: 'AI drafting', view: 'drafting' as const, accent: 'bg-sky-500/10 text-sky-500' },
                { icon: Search, label: 'Research Precedents', sublabel: 'Legal research', view: 'research' as const, accent: 'bg-violet-500/10 text-violet-500' },
                { icon: Receipt, label: 'Generate Invoice', sublabel: 'Billing', view: 'billing' as const, accent: 'bg-emerald-500/10 text-emerald-500' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => setCurrentView(action.view)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all',
                    'border border-transparent hover:border-border',
                    'bg-secondary/30 hover:bg-secondary/60 cursor-pointer',
                    'group'
                  )}
                >
                  <div className={cn('flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110', action.accent)}>
                    <action.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-[11px] text-muted-foreground">{action.sublabel}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
