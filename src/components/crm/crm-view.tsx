'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  UserPlus,
  TrendingUp,
  Mail,
  Phone,
  Eye,
  RefreshCw,
  Search,
  Download,
  Cloud,
  CloudOff,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Globe,
  Smartphone,
  BadgeCheck,
  ChevronDown,
  Copy,
  ExternalLink,
  Database,
  ArrowUpRight,
  User,
  Calendar,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { toast } from 'sonner'
import { useCRMStore, type CRMUser } from '@/store/crm-store'

/* ─── Helpers ─── */

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return formatDateShort(dateStr)
  } catch {
    return '—'
  }
}

function getProviderIcon(provider: string) {
  const p = (provider || '').toLowerCase()
  if (p.includes('google')) return { icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Google' }
  if (p.includes('email') || p.includes('password')) return { icon: Mail, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Email' }
  if (p.includes('phone') || p.includes('otp')) return { icon: Smartphone, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Phone' }
  return { icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted', label: provider || 'Unknown' }
}

/* ─── Stats Cards ─── */

function StatsCards() {
  const stats = useCRMStore((s) => s.stats)
  const users = useCRMStore((s) => s.users)
  const crmConnected = useCRMStore((s) => s.crmConnected)

  const totalUsers = stats?.totalUsers ?? users.length
  const todaySignups = stats?.todaySignups ?? 0
  const weekSignups = stats?.weekSignups ?? 0
  const byProvider = stats?.byProvider || {}

  // Compute from users directly if stats not available
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString()
  const computedToday = todaySignups || users.filter(u => u.createdAt >= todayStart).length
  const computedWeek = weekSignups || users.filter(u => u.createdAt >= weekStart).length

  const googleCount = byProvider['google'] || byProvider['Google'] || users.filter(u => u.provider?.toLowerCase().includes('google')).length
  const emailCount = byProvider['email'] || byProvider['Email'] || users.filter(u => u.provider?.toLowerCase().includes('email')).length
  const phoneCount = byProvider['phone'] || byProvider['Phone'] || users.filter(u => u.provider?.toLowerCase().includes('phone')).length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className="py-4">
        <CardContent className="px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Users</p>
              <p className="text-xl font-bold text-foreground">{totalUsers}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-4 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="py-4 border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider">Today</p>
              <p className="text-xl font-bold text-emerald-600">+{computedToday}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="size-4 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="py-4">
        <CardContent className="px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">This Week</p>
              <p className="text-xl font-bold text-foreground">+{computedWeek}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Calendar className="size-4 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="py-4">
        <CardContent className="px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-blue-500 uppercase tracking-wider">Google</p>
              <p className="text-xl font-bold text-foreground">{googleCount}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Globe className="size-4 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="py-4">
        <CardContent className="px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider">Email</p>
              <p className="text-xl font-bold text-foreground">{emailCount}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Mail className="size-4 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="py-4">
        <CardContent className="px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-purple-500 uppercase tracking-wider">Phone</p>
              <p className="text-xl font-bold text-foreground">{phoneCount}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10">
              <Smartphone className="size-4 text-purple-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Export to CSV ─── */

function exportCSV(users: CRMUser[]) {
  const headers = ['Name', 'Email', 'Phone', 'Provider', 'Source', 'Signed Up', 'Last Login', 'Zoho ID']
  const rows = users.map(u => [
    u.displayName,
    u.email || '',
    u.phone || '',
    u.provider || '',
    u.source || '',
    u.createdAt ? formatDate(u.createdAt) : '',
    u.lastLoginAt ? formatDate(u.lastLoginAt) : '',
    u.zohoId || '',
  ])

  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aidraft-users-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV exported successfully')
}

/* ─── Main CRM View ─── */

export default function CRMView() {
  const users = useCRMStore((s) => s.users)
  const loading = useCRMStore((s) => s.loading)
  const error = useCRMStore((s) => s.error)
  const crmConnected = useCRMStore((s) => s.crmConnected)
  const lastFetched = useCRMStore((s) => s.lastFetched)
  const fetchUsers = useCRMStore((s) => s.fetchUsers)
  const fetchStats = useCRMStore((s) => s.fetchStats)

  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Fetch on mount
  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [])

  const handleRefresh = useCallback(async () => {
    await fetchUsers()
    await fetchStats()
    toast.success('CRM data refreshed from Zoho')
  }, [fetchUsers, fetchStats])

  // Filter users
  const filtered = useMemo(() => {
    let result = users
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(u =>
        u.displayName.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (u.provider || '').toLowerCase().includes(q)
      )
    }
    if (providerFilter !== 'all') {
      result = result.filter(u => u.provider?.toLowerCase() === providerFilter)
    }
    return result
  }, [users, search, providerFilter])

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-7 text-primary" />
            CRM — User Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all registered users — names, emails, phones, signups.
            Data synced from Zoho CRM automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {crmConnected ? (
            <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/20 px-3 py-1">
              <Cloud className="size-3.5" />
              Zoho Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <CloudOff className="size-3.5" />
              Local / Firestore
            </Badge>
          )}
        </div>
      </div>

      {/* ── Auto-sync Banner ── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-center gap-3">
          <BadgeCheck className="size-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Automatic CRM Sync Active</p>
            <p className="text-[10px] text-muted-foreground">
              Every user who signs up (Google, Email, or Phone) is automatically pushed to Zoho CRM Contacts.
              Phone numbers are also sent to WhatsApp marketing webhooks.
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 shrink-0" onClick={handleRefresh}>
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* ── Stats ── */}
      <StatsCards />

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <Filter className="size-3.5 mr-1.5" />
              <SelectValue placeholder="All Providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-9"
            disabled={users.length === 0}
            onClick={() => exportCSV(filtered)}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-9"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Last Fetched ── */}
      {lastFetched && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Clock className="size-3" />
          Last fetched: {formatDate(lastFetched)}
          <span className="text-muted-foreground/40">|</span>
          Showing {filtered.length} of {users.length} users
        </div>
      )}

      {/* ── Error State ── */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-600">CRM Sync Error</p>
              <p className="text-[10px] text-red-500/80 mt-0.5">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Loading State ── */}
      {loading && users.length === 0 && (
        <Card className="py-0 gap-0">
          <CardContent className="p-5 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-[200px]" />
                  <Skeleton className="h-3 w-[120px]" />
                </div>
                <Skeleton className="h-6 w-[60px] rounded-full" />
                <Skeleton className="h-3 w-[80px]" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Empty State ── */}
      {!loading && users.length === 0 && !error && (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
              <Users className="size-8 text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground">No Users Registered Yet</p>
            <p className="text-xs text-muted-foreground mt-2 max-w-md">
              When lawyers sign up on aidraft.bond (via Google, Email, or Phone), their data will
              automatically appear here — synced from Zoho CRM in real time.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRefresh}>
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
              <a
                href="https://www.zoho.com/crm/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Open Zoho CRM <ExternalLink className="size-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Users Table ── */}
      {!loading && users.length > 0 && (
        <Card className="py-0 gap-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Registered Users</CardTitle>
                <CardDescription>
                  {filtered.length} user{filtered.length !== 1 ? 's' : ''} found
                  {crmConnected ? ' — synced from Zoho CRM' : ' — from Firestore'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs">
                  <UserPlus className="size-3 text-emerald-500" />
                  {users.filter(u => {
                    const today = new Date()
                    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
                    return u.createdAt >= start
                  }).length} today
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5 text-xs">User</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Phone</TableHead>
                    <TableHead className="text-xs">Provider</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Source</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Signed Up</TableHead>
                    <TableHead className="text-xs hidden xl:table-cell">Time Ago</TableHead>
                    <TableHead className="text-xs pr-5">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => {
                    const prov = getProviderIcon(user.provider)
                    const isExpanded = expandedRow === user.id

                    return (
                      <>
                        <TableRow
                          key={user.id}
                          className={cn('cursor-pointer hover:bg-muted/50', isExpanded && 'bg-muted/50')}
                          onClick={() => setExpandedRow(isExpanded ? null : user.id)}
                        >
                          <TableCell className="pl-5">
                            <div className="flex items-center gap-2.5">
                              {user.photoURL ? (
                                <img src={user.photoURL} alt="" className="size-8 rounded-full object-cover" />
                              ) : (
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                  {user.firstName?.[0] || '?'}{user.lastName?.[0] || ''}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate max-w-[160px]">
                                  {user.displayName || 'Unknown'}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                                  {user.firstName} {user.lastName}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.email ? (
                              <div className="flex items-center gap-1.5">
                                <Mail className="size-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-foreground truncate max-w-[180px]">{user.email}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {user.phone ? (
                              <div className="flex items-center gap-1.5">
                                <Phone className="size-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-foreground">{user.phone}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-5"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigator.clipboard.writeText(user.phone || '')
                                    toast.success('Phone number copied')
                                  }}
                                >
                                  <Copy className="size-2.5 text-muted-foreground" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('gap-1 text-[10px] px-1.5', prov.bg, prov.color)}>
                              <prov.icon className="size-3" />
                              {prov.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-xs text-muted-foreground">{user.source || '—'}</span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-xs text-muted-foreground">{formatDateShort(user.createdAt)}</span>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <span className="text-xs text-muted-foreground">{timeAgo(user.createdAt)}</span>
                          </TableCell>
                          <TableCell className="pr-5">
                            {user.crmSynced ? (
                              <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-0.5">
                                <CheckCircle2 className="size-2.5" />
                                Synced
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Local
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                        {/* Expanded Row — full details */}
                        {isExpanded && (
                          <TableRow key={`${user.id}-expanded`} className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={8} className="px-5 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Full Name</p>
                                  <p className="text-xs font-medium text-foreground">{user.displayName || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Email Address</p>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs text-foreground">{user.email || '—'}</p>
                                    {user.email && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-5 shrink-0"
                                        onClick={() => {
                                          navigator.clipboard.writeText(user.email || '')
                                          toast.success('Email copied')
                                        }}
                                      >
                                        <Copy className="size-2.5 text-muted-foreground" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</p>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs text-foreground">{user.phone || '—'}</p>
                                    {user.phone && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-5 shrink-0"
                                        onClick={() => {
                                          navigator.clipboard.writeText(user.phone || '')
                                          toast.success('Phone copied')
                                        }}
                                      >
                                        <Copy className="size-2.5 text-muted-foreground" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Auth Provider</p>
                                  <p className="text-xs text-foreground capitalize">{user.provider || 'Unknown'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Source</p>
                                  <p className="text-xs text-foreground">{user.source || 'AI Draft Website'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Signup Date</p>
                                  <p className="text-xs text-foreground">{formatDate(user.createdAt)}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Firebase UID</p>
                                  <p className="text-[10px] font-mono text-muted-foreground">{user.uid || user.id || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Zoho ID</p>
                                  <p className="text-[10px] font-mono text-muted-foreground">{user.zohoId || '—'}</p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ── How It Works ── */}
      <Card className="py-0 gap-0">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="size-4 text-primary" />
            How the CRM Sync Works
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold">1</div>
                <p className="text-xs font-semibold text-foreground">User Signs Up</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Lawyer registers via Google OAuth, Email/Password, or Phone OTP. Auth handled by custom JWT + Firestore.
              </p>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 text-xs font-bold">2</div>
                <p className="text-xs font-semibold text-foreground">Auto-Push to Zoho</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                On every successful login, <code className="px-1 py-0.5 bg-muted rounded text-[10px]">crm-sync</code> Cloud Function pushes user data (name, email, phone, provider, UID) to Zoho CRM as Contact or Lead.
              </p>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">3</div>
                <p className="text-xs font-semibold text-foreground">View Here</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                This dashboard fetches all Contacts &amp; Leads from Zoho CRM, showing you every registered user in real time. Data also stored in Firestore as backup.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
