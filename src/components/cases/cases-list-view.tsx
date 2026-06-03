'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type CaseItem } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  Search,
  Plus,
  Sparkles,
  Briefcase,
  Calendar,
  Clock,
  FileText,
  CheckSquare,
  ArrowUpDown,
  Eye,
  History,
  PenLine,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

/* ─── Animation ─── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

/* ─── Helpers ─── */

type FilterType = 'all' | 'active' | 'pending' | 'closed' | 'urgent'
type SortType = 'date' | 'priority' | 'type'

function getPriorityBorderColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent': return 'border-l-red-500'
    case 'high': return 'border-l-amber-500'
    case 'medium': return 'border-l-slate-400'
    case 'low': return 'border-l-emerald-500'
    default: return 'border-l-slate-400'
  }
}

function getPriorityBg(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent': return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'high': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'medium': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    case 'low': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

function getStatusBg(status: string): string {
  switch (status.toLowerCase()) {
    case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'closed': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

function getCaseTypeBg(caseType: string): string {
  switch (caseType.toLowerCase()) {
    case 'civil': return 'bg-sky-500/10 text-sky-500 border-sky-500/20'
    case 'criminal': return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'family': return 'bg-pink-500/10 text-pink-500 border-pink-500/20'
    case 'labour': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 'ip': return 'bg-violet-500/10 text-violet-500 border-violet-500/20'
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

function getDaysUntil(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ITEMS_PER_PAGE = 6

/* ─── Filter Config ─── */

const filterConfig: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Closed', value: 'closed' },
  { label: 'Urgent', value: 'urgent' },
]

/* ─── Main Component ─── */

export default function CasesListView() {
  const storeCases = useAppStore((s) => s.cases)
  const dataLoaded = useAppStore((s) => s.dataLoaded)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setSelectedCaseId = useAppStore((s) => s.setSelectedCaseId)

  const cases = storeCases

  // Show loading skeleton while Firestore data is being fetched
  if (!dataLoaded) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('date')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let result = [...cases]

    // Filter
    switch (filter) {
      case 'active':
        result = result.filter((c) => c.status === 'Active')
        break
      case 'pending':
        result = result.filter((c) => c.status === 'Pending')
        break
      case 'closed':
        result = result.filter((c) => c.status === 'Closed')
        break
      case 'urgent':
        result = result.filter((c) => c.priority === 'Urgent')
        break
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.caseNumber?.toLowerCase().includes(q) ||
          c.clientName?.toLowerCase().includes(q) ||
          c.courtName?.toLowerCase().includes(q) ||
          c.caseType.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      )
    }

    // Sort
    switch (sort) {
      case 'date':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
      case 'priority': {
        const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
        result.sort((a, b) => (order[a.priority.toLowerCase()] ?? 3) - (order[b.priority.toLowerCase()] ?? 3))
        break
      }
      case 'type':
        result.sort((a, b) => a.caseType.localeCompare(b.caseType))
        break
    }

    return result
  }, [cases, filter, sort, search])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Reset page when filter or search changes
  const handleFilterChange = (f: FilterType) => {
    setFilter(f)
    setPage(1)
  }

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleCaseClick = (id: string) => {
    setSelectedCaseId(id)
    setCurrentView('case-detail')
  }

  return (
    <motion.div
      className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Briefcase className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              All Cases
              <Badge variant="secondary" className="text-xs font-semibold">
                {filtered.length}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Manage and track all your legal matters</p>
          </div>
        </div>
        <Button className="gap-2 self-start" onClick={() => setCurrentView('intake')}>
          <Sparkles className="size-4" />
          New Case
        </Button>
      </motion.div>

      {/* ── Filters & Search Bar ── */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterConfig.map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(f.value)}
                className="h-8 text-xs"
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Search + Sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search cases..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Select value={sort} onValueChange={(v) => { setSort(v as SortType); setPage(1) }}>
              <SelectTrigger size="sm" className="w-[130px] h-8 text-xs">
                <ArrowUpDown className="size-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Recent</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="type">Case Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* ── Case List ── */}
      <motion.div variants={containerVariants} className="space-y-3">
        <AnimatePresence mode="popLayout">
          {paginated.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              {storeCases.length === 0 ? (
                <>
                  <Briefcase className="size-12 text-muted-foreground mb-4" />
                  <h3 className="text-base font-semibold text-foreground">No Cases Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">Create your first case to get started with AI-powered legal management.</p>
                  <Button className="mt-4 gap-2" onClick={() => setCurrentView('intake')}>
                    <Sparkles className="size-4" />
                    New Case Intake
                  </Button>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No cases match your filters</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => { setFilter('all'); setSearch(''); setPage(1) }}>
                    Clear Filters
                  </Button>
                </>
              )}
            </motion.div>
          ) : (
            paginated.map((c) => {
              const days = c.nextHearing ? getDaysUntil(c.nextHearing) : null
              return (
                <motion.div
                  key={c.id}
                  variants={itemVariants}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md border-l-4',
                      getPriorityBorderColor(c.priority),
                      'hover:border-l-4'
                    )}
                    onClick={() => handleCaseClick(c.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Left: Case Info */}
                        <div className="flex-1 min-w-0">
                          {/* Top row: Case number + Badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            {c.caseNumber && (
                              <span className="text-xs font-mono text-muted-foreground">{c.caseNumber}</span>
                            )}
                            <Badge className={cn('border text-[10px]', getPriorityBg(c.priority))}>
                              {c.priority}
                            </Badge>
                            <Badge className={cn('border text-[10px]', getStatusBg(c.status))}>
                              {c.status}
                            </Badge>
                            <Badge className={cn('border text-[10px]', getCaseTypeBg(c.caseType))}>
                              {c.caseType}
                            </Badge>
                            {c.subType && (
                              <span className="text-[11px] text-muted-foreground">{c.subType}</span>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">
                            {c.title}
                          </h3>

                          {/* Description */}
                          {c.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                              {c.description}
                            </p>
                          )}

                          {/* Meta row */}
                          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                            {c.clientName && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-foreground/80">{c.clientName}</span>
                              </span>
                            )}
                            {c.courtName && (
                              <span className="truncate max-w-[200px]">{c.courtName}</span>
                            )}
                          </div>
                        </div>

                        {/* Right: Hearing + Actions */}
                        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0 sm:min-w-[140px]">
                          {/* Hearing */}
                          {c.nextHearing && days !== null && (
                            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="size-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(c.nextHearing)}
                                </span>
                              </div>
                              <span className={cn(
                                'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                                days <= 0
                                  ? 'bg-red-500/10 text-red-500'
                                  : days <= 2
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-secondary text-muted-foreground'
                              )}>
                                {days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                              </span>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {c.tasksCount !== undefined && c.tasksCount > 0 && (
                              <span className="flex items-center gap-1">
                                <CheckSquare className="size-3" />
                                {c.tasksCount}
                              </span>
                            )}
                            {c.documentsCount !== undefined && c.documentsCount > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText className="size-3" />
                                {c.documentsCount}
                              </span>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={(e) => { e.stopPropagation(); handleCaseClick(c.id) }}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={(e) => { e.stopPropagation(); setSelectedCaseId(c.id); setCurrentView('timeline') }}
                            >
                              <History className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={(e) => { e.stopPropagation(); setCurrentView('drafting') }}
                            >
                              <PenLine className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <motion.div variants={itemVariants} className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={page === p ? 'default' : 'outline'}
                size="icon"
                className="size-8 text-xs"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
