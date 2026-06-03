'use client'

import { useState, useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Plus,
  Filter,
  Gavel,
  FileText,
  Phone,
  Bell,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const eventTypeIcons: Record<string, React.ReactNode> = {
  hearing: <Gavel className="size-4" />,
  filing: <FileText className="size-4" />,
  deadline: <AlertTriangle className="size-4" />,
  communication: <Phone className="size-4" />,
  task: <CheckCircle2 className="size-4" />,
  reminder: <Bell className="size-4" />,
}

const eventTypeColors: Record<string, string> = {
  hearing: 'bg-red-500/10 text-red-400 border-red-500/20',
  filing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  deadline: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  communication: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  task: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  reminder: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  other: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

const priorityColors: Record<string, string> = {
  urgent: 'text-red-400',
  high: 'text-amber-400',
  medium: 'text-blue-400',
  low: 'text-emerald-400',
}

function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function TimelineView() {
  const { cases, timelineEvents } = useAppStore()
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Demo data if store is empty
  const demoEvents = useMemo(() => {
    if (timelineEvents.length > 0) return timelineEvents
    const now = new Date()
    return [
      { id: '1', title: 'Hearing: Sharma v. Gupta - Property Injunction', description: 'High Court of Delhi, Court Room 12. Argue on maintainability and urgency grounds.', eventType: 'hearing', eventDate: new Date(now.getTime() + 86400000).toISOString(), isCompleted: false, isMilestone: true },
      { id: '2', title: 'Filing Deadline: Bail Application for Agarwal', description: 'Anticipatory bail application under Section 438 CrPC must be filed before Sessions Court.', eventType: 'deadline', eventDate: new Date(now.getTime() + 2 * 86400000).toISOString(), isCompleted: false, isMilestone: true },
      { id: '3', title: 'Submit Affidavit: Verma v. Mehta', description: 'Affidavit-in-chief with supporting documents for cheque bounce case.', eventType: 'filing', eventDate: new Date(now.getTime() + 5 * 86400000).toISOString(), isCompleted: false, isMilestone: false },
      { id: '4', title: 'Client Meeting: Sunita Agarwal', description: 'Review termination settlement offer from TechMahindra. Discuss negotiation strategy.', eventType: 'communication', eventDate: new Date(now.getTime() + 3 * 86400000).toISOString(), isCompleted: false, isMilestone: false },
      { id: '5', title: 'Hearing: Devi v. Devi - Mutual Consent Divorce', description: 'Family Court Dwarka. Second motion hearing. Both parties to confirm consent.', eventType: 'hearing', eventDate: new Date(now.getTime() + 7 * 86400000).toISOString(), isCompleted: false, isMilestone: true },
      { id: '6', title: 'File Consumer Complaint: Rathore v. Samsung', description: 'File amended complaint before Consumer Commission Gurugram with additional evidence.', eventType: 'filing', eventDate: new Date(now.getTime() + 4 * 86400000).toISOString(), isCompleted: false, isMilestone: false },
      { id: '7', title: 'Deadline: Reply to Opposition in Property Dispute', description: 'File written statement reply to Gupta\'s counter-affidavit. Limitation: 30 days from service.', eventType: 'deadline', eventDate: new Date(now.getTime() + 10 * 86400000).toISOString(), isCompleted: false, isMilestone: true },
      { id: '8', title: 'Hearing Completed: Bail Hearing Agarwal', description: 'Sessions Court Patiala House. Arguments heard. Order reserved.', eventType: 'hearing', eventDate: new Date(now.getTime() - 2 * 86400000).toISOString(), isCompleted: true, isMilestone: true },
      { id: '9', title: 'Document Filing: Evidence List Verma Case', description: 'Filed list of witnesses and documents under Order 16 Rule 1 CPC.', eventType: 'filing', eventDate: new Date(now.getTime() - 5 * 86400000).toISOString(), isCompleted: true, isMilestone: false },
      { id: '10', title: 'Reminder: GST Filing Due', description: 'Quarterly GST return filing for legal services. Due date approaching.', eventType: 'reminder', eventDate: new Date(now.getTime() + 12 * 86400000).toISOString(), isCompleted: false, isMilestone: false },
    ]
  }, [timelineEvents])

  const filteredEvents = useMemo(() => {
    return demoEvents
      .filter((e) => filterType === 'all' || e.eventType === filterType)
      .filter((e) => {
        if (filterPriority === 'all') return true
        if (filterPriority === 'urgent') return getDaysUntil(e.eventDate) <= 2 && !e.isCompleted
        if (filterPriority === 'this-week') {
          const days = getDaysUntil(e.eventDate)
          return days >= 0 && days <= 7 && !e.isCompleted
        }
        if (filterPriority === 'overdue') return getDaysUntil(e.eventDate) < 0 && !e.isCompleted
        return true
      })
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
  }, [demoEvents, filterType, filterPriority])

  const upcomingCount = demoEvents.filter(e => !e.isCompleted && getDaysUntil(e.eventDate) >= 0).length
  const overdueCount = demoEvents.filter(e => !e.isCompleted && getDaysUntil(e.eventDate) < 0).length
  const thisWeekCount = demoEvents.filter(e => {
    const d = getDaysUntil(e.eventDate)
    return !e.isCompleted && d >= 0 && d <= 7
  }).length

  // Calendar generation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }, [currentMonth])

  const eventDates = useMemo(() => {
    const dates: Record<string, number> = {}
    demoEvents.forEach(e => {
      const date = new Date(e.eventDate)
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      dates[key] = (dates[key] || 0) + 1
    })
    return dates
  }, [demoEvents])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="size-6 text-primary" />
            Timeline & Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified view of all hearings, deadlines, filings, and reminders
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="size-4" />
          Add Event
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Clock className="size-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{upcomingCount}</p>
              <p className="text-xs text-muted-foreground">Upcoming Events</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="size-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{thisWeekCount}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="size-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overdueCount}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="size-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{demoEvents.filter(e => e.isCompleted).length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">
                {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-xs text-muted-foreground font-medium py-1">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} />
                const key = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${day}`
                const eventCount = eventDates[key] || 0
                const isToday = day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()
                return (
                  <div
                    key={day}
                    className={cn(
                      'relative text-xs py-1.5 rounded-lg cursor-default transition-colors',
                      isToday && 'bg-primary/15 text-primary font-bold',
                      !isToday && 'hover:bg-secondary'
                    )}
                  >
                    {day}
                    {eventCount > 0 && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {Array.from({ length: Math.min(eventCount, 3) }).map((_, j) => (
                          <div key={j} className="size-1 rounded-full bg-primary" />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Event List */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base font-semibold text-foreground">
                All Events
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <Filter className="size-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="hearing">Hearings</SelectItem>
                    <SelectItem value="filing">Filings</SelectItem>
                    <SelectItem value="deadline">Deadlines</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                    <SelectItem value="reminder">Reminders</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <Clock className="size-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="urgent">Next 2 Days</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="size-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No events matching your filters</p>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const daysUntil = getDaysUntil(event.eventDate)
                  const isOverdue = daysUntil < 0 && !event.isCompleted
                  const isUrgent = daysUntil >= 0 && daysUntil <= 2 && !event.isCompleted

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-xl border transition-all hover:border-primary/20',
                        event.isCompleted
                          ? 'bg-secondary/20 border-border opacity-60'
                          : isOverdue
                          ? 'bg-red-500/5 border-red-500/20'
                          : isUrgent
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-card border-border hover:bg-secondary/30'
                      )}
                    >
                      {/* Status Icon */}
                      <div className={cn(
                        'mt-0.5 size-9 rounded-lg flex items-center justify-center shrink-0 border',
                        eventTypeColors[event.eventType] || eventTypeColors.other,
                        event.isCompleted && 'opacity-50'
                      )}>
                        {event.isCompleted ? (
                          <CheckCircle2 className="size-4 text-emerald-400" />
                        ) : (
                          eventTypeIcons[event.eventType] || <Circle className="size-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm font-medium text-foreground leading-tight',
                            event.isCompleted && 'line-through'
                          )}>
                            {event.title}
                          </p>
                          {event.isMilestone && (
                            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                              Milestone
                            </Badge>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0">
                            {event.eventType}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatEventDate(event.eventDate)}
                          </span>
                          {!event.isCompleted && (
                            <span className={cn(
                              'text-[11px] font-medium flex items-center gap-1',
                              isOverdue && 'text-red-400',
                              isUrgent && 'text-amber-400',
                              daysUntil > 2 && daysUntil <= 7 && 'text-blue-400',
                              daysUntil > 7 && 'text-emerald-400'
                            )}>
                              {isOverdue
                                ? `${Math.abs(daysUntil)} days overdue`
                                : daysUntil === 0
                                ? 'Today'
                                : daysUntil === 1
                                ? 'Tomorrow'
                                : `In ${daysUntil} days`
                              }
                              <ArrowRight className="size-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestion Banner */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-lg">✨</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AI Calendar Assistant</p>
              <p className="text-xs text-muted-foreground">
                AI Draft can auto-schedule deadlines based on court rules and filing dates.
                It also sends reminders via email and WhatsApp.
              </p>
            </div>
          </div>
          <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 gap-2 text-sm">
            Enable Auto-Scheduling
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
