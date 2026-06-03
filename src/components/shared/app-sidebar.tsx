'use client'

import { memo } from 'react'
import { useAppStore, type ViewType } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Briefcase,
  UserPlus,
  FileText,
  FolderOpen,
  Search,
  Scale,
  IndianRupee,
  Users,
  Clock,
  Settings,
  Sparkles,
  Shield,
  Brain,
  Crown,
  Gavel,
  Scroll,
  Heart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import type { LucideIcon } from 'lucide-react'

/* ─── Navigation Config ─── */

interface NavItem {
  icon: LucideIcon
  label: string
  view: ViewType
  showBadge?: boolean
  aiBadge?: boolean
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard' },
  { icon: Briefcase, label: 'Cases', view: 'cases', showBadge: true },
  { icon: UserPlus, label: 'New Case / Intake', view: 'intake', aiBadge: true },
  { icon: FileText, label: 'AI Drafting', view: 'drafting' },
  { icon: FolderOpen, label: 'Documents', view: 'documents' },
  { icon: Search, label: 'Research', view: 'research' },
  { icon: Scale, label: 'Litigation', view: 'litigation' },
  {
    icon: Gavel,
    label: 'Execution',
    view: 'execution',
    aiBadge: true,
  },
  { icon: Scroll, label: 'Civil Suits', view: 'civil-original', aiBadge: true },
  { icon: Shield, label: 'Criminal Law', view: 'criminal', aiBadge: true },
  { icon: Heart, label: 'Family & MV', view: 'family', aiBadge: true },
  { icon: Shield, label: 'Defense Builder', view: 'defense-builder', aiBadge: true },
  { icon: Brain, label: 'Argument Analyzer', view: 'argument-analyzer', aiBadge: true },
  { icon: IndianRupee, label: 'Billing', view: 'billing' },
  { icon: Users, label: 'Clients', view: 'clients' },
  { icon: Crown, label: 'Pricing & Plans', view: 'pricing' },
  { icon: Clock, label: 'Timeline', view: 'timeline' },
]

const bottomItems: NavItem[] = [
  { icon: Settings, label: 'Settings', view: 'settings' },
]

/* ─── Sidebar Content (shared between desktop & mobile) ─── */

const SidebarContent = memo(function SidebarContent() {
  const currentView = useAppStore((s) => s.currentView)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const cases = useAppStore((s) => s.cases)

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view)
    setSidebarOpen(false)
  }

  const isActive = (view: ViewType) => currentView === view

  return (
    <div className="flex flex-col h-full sidebar-glow">
      {/* ── Logo Area ── */}
      <div className="relative z-10 flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <img
            src="/logo.png"
            alt="AI Draft"
            className="size-6 object-contain"
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-foreground leading-none">
            AI Draft
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            AI Legal Document Platform
          </p>
        </div>
      </div>

      <Separator className="opacity-60" />

      {/* ── Main Navigation ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 scrollbar-thin">
        <nav className="space-y-0.5" role="navigation" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = isActive(item.view)
            return (
              <Button
                key={item.view}
                variant="ghost"
                onClick={() => handleNavigate(item.view)}
                className={cn(
                  'w-full justify-start gap-3 h-10 px-3 text-sm font-medium',
                  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  'transition-colors duration-150',
                  active
                    ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                    : 'text-sidebar-foreground/70'
                )}
              >
                <item.icon className={cn('size-[18px] shrink-0', active && 'text-primary')} />
                <span className="truncate">{item.label}</span>

                {/* Case count badge */}
                {item.showBadge && cases.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] font-semibold"
                  >
                    {cases.length}
                  </Badge>
                )}

                {/* AI badge for intake */}
                {item.aiBadge && (
                  <Badge className="ml-auto h-5 px-1.5 text-[10px] font-bold bg-primary/15 text-primary border-primary/20 hover:bg-primary/20">
                    + AI
                  </Badge>
                )}
              </Button>
            )
          })}
        </nav>
      </div>

      <Separator className="opacity-60" />

      {/* ── Bottom Section ── */}
      <div className="px-3 py-3 space-y-1">
        {bottomItems.map((item) => {
          const active = isActive(item.view)
          return (
            <Button
              key={item.view}
              variant="ghost"
              onClick={() => handleNavigate(item.view)}
              className={cn(
                'w-full justify-start gap-3 h-10 px-3 text-sm font-medium',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                'transition-colors duration-150',
                active
                  ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                  : 'text-sidebar-foreground/70'
              )}
            >
              <item.icon className={cn('size-[18px] shrink-0', active && 'text-primary')} />
              <span>{item.label}</span>
            </Button>
          )
        })}

        {/* Powered by AI badge */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <Badge
            variant="outline"
            className="gap-1.5 text-[10px] font-medium px-2.5 py-1 bg-primary/5 border-primary/15 text-primary/80"
          >
            <Sparkles className="size-3" />
            Powered by AI
          </Badge>
        </div>
      </div>
    </div>
  )
})

/* ─── AppSidebar: Desktop (fixed) + Mobile (Sheet) ─── */

export function AppSidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)

  return (
    <>
      {/* Desktop: Fixed sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 w-[260px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground z-40"
        aria-label="Sidebar navigation"
      >
        <SidebarContent />
      </aside>

      {/* Mobile: Sheet sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[272px] max-w-[85vw] p-0 bg-sidebar text-sidebar-foreground border-sidebar-border"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
