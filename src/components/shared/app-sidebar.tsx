'use client';

import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, Briefcase, FilePlus, Users, Files, Receipt,
  Scale, FileText, ArrowUpRight, RefreshCcw, Ban, Landmark, MessageSquare,
  Gavel, FileCheck, UserX, Paperclip, Reply, XCircle,
  ShieldCheck, ShieldX, CheckCircle, AlertTriangle, Clock, FileCode,
  Heart, AlertOctagon, Car, UsersRound, Baby,
  Scroll,
  Wand2, Search, Swords,
  Settings, CreditCard,
} from 'lucide-react';
import React from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: (NavSection | NavItem | 'separator')[] = [
  {
    title: 'CASE MANAGEMENT',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'cases', label: 'Cases', icon: Briefcase },
      { id: 'ai-intake', label: 'AI Intake', icon: FilePlus },
      { id: 'clients', label: 'Clients', icon: Users },
      { id: 'documents', label: 'Documents', icon: Files },
      { id: 'billing', label: 'Billing', icon: Receipt },
    ],
  },
  {
    title: 'CIVIL LAW',
    items: [
      { id: 'original-suit', label: 'Original Suit', icon: Scale },
      { id: 'written-statement', label: 'Written Statement', icon: FileText },
      { id: 'appeal-suit', label: 'Appeal Suit', icon: ArrowUpRight },
      { id: 'revision-crp', label: 'Revision/CRP', icon: RefreshCcw },
      { id: 'injunction', label: 'Injunction', icon: Ban },
      { id: 'tp-act', label: 'TP Act', icon: Landmark },
      { id: 'written-arguments', label: 'Written Arguments', icon: MessageSquare },
      { id: 'counter-affidavit', label: 'Counters', icon: Reply },
      { id: 'dismiss', label: 'Dismiss / Sist', icon: XCircle },
    ],
  },
  {
    title: 'EXECUTION',
    items: [
      { id: 'execution-petition', label: 'Execution Petition', icon: Gavel },
      { id: 'execution-application', label: 'Execution Application', icon: FileCheck },
      { id: 'civil-arrest', label: 'Civil Arrest', icon: UserX },
      { id: 'attachments-ia', label: 'Attachments/IA', icon: Paperclip },
    ],
  },
  {
    title: 'CRIMINAL LAW',
    items: [
      { id: 'criminal-appeals', label: 'Criminal Appeals', icon: ArrowUpRight },
      { id: 'bail-application', label: 'Bail Application', icon: ShieldCheck },
      { id: 'bail-dismissed', label: 'Bail Dismissed', icon: ShieldX },
      { id: 'acquittal', label: 'Acquittal', icon: CheckCircle },
      { id: 'conviction', label: 'Conviction', icon: AlertTriangle },
      { id: 'remission', label: 'Remission', icon: Clock },
      { id: 'crlmp', label: 'CRLMP', icon: FileCode },
    ],
  },
  {
    title: 'FAMILY & PERSONAL',
    items: [
      { id: 'hmop', label: 'HMOP/Divorce', icon: Heart },
      { id: 'dop', label: 'Domestic Violence', icon: AlertOctagon },
      { id: 'mvop', label: 'MVOP', icon: Car },
      { id: 'succession', label: 'Succession', icon: UsersRound },
      { id: 'guardian-op', label: 'Guardian OP', icon: Baby },
    ],
  },
  {
    title: 'CONSTITUTIONAL',
    items: [
      { id: 'writ-petition', label: 'Writ Petition', icon: Scroll },
    ],
  },
  {
    title: 'AI TOOLS',
    items: [
      { id: 'ai-drafting', label: 'AI Drafting', icon: Wand2, highlight: true },
      { id: 'ai-research', label: 'AI Research', icon: Search },
      { id: 'litigation', label: 'Litigation Tools', icon: Swords },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'pricing', label: 'Pricing', icon: CreditCard },
    ],
  },
];

interface AppSidebarProps {
  onNav: (view: string) => void;
}

export function AppSidebar({ onNav }: AppSidebarProps) {
  const currentView = useAppStore((s) => s.currentView);

  return (
    <aside className="sidebar-glow flex h-full w-64 flex-col border-r border-border bg-sidebar">
      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground tracking-tight">AI Draft Bond</span>
            <span className="text-[10px] text-muted-foreground">Legal Intelligence Platform</span>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Nav Items */}
        <ScrollArea className="flex-1 px-3 py-3 scrollbar-thin">
          <nav className="space-y-1">
            {navSections.map((section, sectionIdx) => {
              if ('id' in (section as any)) return null;

              const navSection = section as NavSection;

              return (
                <div key={sectionIdx} className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {navSection.title}
                  </p>
                  <div className="space-y-0.5">
                    {navSection.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => onNav(item.id)}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-all duration-150 text-left',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium shadow-sm'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                            item.highlight && !isActive && 'text-primary/70'
                          )}
                        >
                          <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive && 'text-primary')} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground text-center">
            © 2025 AI Draft Bond
          </p>
        </div>
      </div>
    </aside>
  );
}
