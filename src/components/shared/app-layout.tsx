'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppStore } from '@/store/app-store';
import { useProfileStore } from '@/store/profile-store';
import { logout } from '@/lib/auth-store';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Menu, Bell, LogOut, Settings, CreditCard, Moon, Sun } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

// Lazy loaded views - Core
const DashboardView = lazy(() => import('@/components/dashboard/dashboard-view').then(m => ({ default: m.DashboardView })));
const CasesListView = lazy(() => import('@/components/cases/cases-list-view').then(m => ({ default: m.CasesListView })));
const CaseDetailView = lazy(() => import('@/components/cases/case-detail-view').then(m => ({ default: m.CaseDetailView })));
const AiIntakeView = lazy(() => import('@/components/intake/ai-intake-view').then(m => ({ default: m.AiIntakeView })));
const AiDraftingView = lazy(() => import('@/components/drafting/ai-drafting-view').then(m => ({ default: m.AiDraftingView })));
const DocumentsView = lazy(() => import('@/components/documents/documents-view').then(m => ({ default: m.DocumentsView })));
const AiResearchView = lazy(() => import('@/components/research/ai-research-view').then(m => ({ default: m.AiResearchView })));
const LitigationView = lazy(() => import('@/components/litigation/litigation-view').then(m => ({ default: m.LitigationView })));
const ClientsView = lazy(() => import('@/components/clients/clients-view').then(m => ({ default: m.ClientsView })));
const BillingView = lazy(() => import('@/components/billing/billing-view').then(m => ({ default: m.BillingView })));
const SettingsView = lazy(() => import('@/components/tools/settings-view').then(m => ({ default: m.SettingsView })));
const PricingView = lazy(() => import('@/components/tools/pricing-view').then(m => ({ default: m.PricingView })));

// Lazy loaded views - Civil Law
const OriginalSuitView = lazy(() => import('@/components/tools/original-suit-view').then(m => ({ default: m.OriginalSuitView })));
const WrittenStatementView = lazy(() => import('@/components/tools/written-statement-view').then(m => ({ default: m.WrittenStatementView })));
const AppealSuitView = lazy(() => import('@/components/tools/appeal-suit-view').then(m => ({ default: m.AppealSuitView })));
const RevisionCrpView = lazy(() => import('@/components/tools/revision-crp-view').then(m => ({ default: m.RevisionCrpView })));
const InjunctionView = lazy(() => import('@/components/tools/injunction-view').then(m => ({ default: m.InjunctionView })));
const TpActView = lazy(() => import('@/components/tools/tp-act-view').then(m => ({ default: m.TpActView })));
const WrittenArgumentsView = lazy(() => import('@/components/tools/written-arguments-view').then(m => ({ default: m.WrittenArgumentsView })));
const OrdersView = lazy(() => import('@/components/tools/orders-view').then(m => ({ default: m.OrdersView })));
const CounterAffidavitView = lazy(() => import('@/components/tools/counter-affidavit-view').then(m => ({ default: m.CounterAffidavitView })));
const DismissView = lazy(() => import('@/components/tools/dismiss-view').then(m => ({ default: m.DismissView })));

// Lazy loaded views - Execution
const ExecutionPetitionView = lazy(() => import('@/components/tools/execution-petition-view').then(m => ({ default: m.ExecutionPetitionView })));
const ExecutionApplicationView = lazy(() => import('@/components/tools/execution-application-view').then(m => ({ default: m.ExecutionApplicationView })));
const CivilArrestView = lazy(() => import('@/components/tools/civil-arrest-view').then(m => ({ default: m.CivilArrestView })));
const AttachmentsIaView = lazy(() => import('@/components/tools/attachments-ia-view').then(m => ({ default: m.AttachmentsIaView })));
const DecreeJudgementView = lazy(() => import('@/components/tools/decree-judgement-view').then(m => ({ default: m.DecreeJudgementView })));

// Lazy loaded views - Criminal Law
const CriminalAppealsView = lazy(() => import('@/components/tools/criminal-appeals-view').then(m => ({ default: m.CriminalAppealsView })));
const BailApplicationView = lazy(() => import('@/components/tools/bail-application-view').then(m => ({ default: m.BailApplicationView })));
const BailDismissedView = lazy(() => import('@/components/tools/bail-dismissed-view').then(m => ({ default: m.BailDismissedView })));
const AcquittalView = lazy(() => import('@/components/tools/acquittal-view').then(m => ({ default: m.AcquittalView })));
const ConvictionView = lazy(() => import('@/components/tools/conviction-view').then(m => ({ default: m.ConvictionView })));
const RemissionView = lazy(() => import('@/components/tools/remission-view').then(m => ({ default: m.RemissionView })));
const CrlmpView = lazy(() => import('@/components/tools/crlmp-view').then(m => ({ default: m.CrlmpView })));

// Lazy loaded views - Family & Personal
const HmopView = lazy(() => import('@/components/tools/hmop-view').then(m => ({ default: m.HmopView })));
const DopView = lazy(() => import('@/components/tools/dop-view').then(m => ({ default: m.DopView })));
const MvopView = lazy(() => import('@/components/tools/mvop-view').then(m => ({ default: m.MvopView })));
const SuccessionView = lazy(() => import('@/components/tools/succession-view').then(m => ({ default: m.SuccessionView })));
const GuardianOpView = lazy(() => import('@/components/tools/guardian-op-view').then(m => ({ default: m.GuardianOpView })));

// Lazy loaded views - Constitutional
const WritPetitionView = lazy(() => import('@/components/tools/writ-petition-view').then(m => ({ default: m.WritPetitionView })));

function ViewLoader() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function renderView(view: string) {
  switch (view) {
    // Core
    case 'dashboard': return <DashboardView />;
    case 'cases': return <CasesListView />;
    case 'case-detail': return <CaseDetailView />;
    case 'ai-intake': return <AiIntakeView />;
    case 'ai-drafting': return <AiDraftingView />;
    case 'documents': return <DocumentsView />;
    case 'ai-research': return <AiResearchView />;
    case 'litigation': return <LitigationView />;
    case 'clients': return <ClientsView />;
    case 'billing': return <BillingView />;
    case 'settings': return <SettingsView />;
    case 'pricing': return <PricingView />;

    // Civil Law
    case 'original-suit': return <OriginalSuitView />;
    case 'written-statement': return <WrittenStatementView />;
    case 'appeal-suit': return <AppealSuitView />;
    case 'revision-crp': return <RevisionCrpView />;
    case 'injunction': return <InjunctionView />;
    case 'tp-act': return <TpActView />;
    case 'written-arguments': return <WrittenArgumentsView />;
    case 'orders': return <OrdersView />;
    case 'counter-affidavit': return <CounterAffidavitView />;
    case 'dismiss': return <DismissView />;

    // Execution
    case 'execution-petition': return <ExecutionPetitionView />;
    case 'execution-application': return <ExecutionApplicationView />;
    case 'civil-arrest': return <CivilArrestView />;
    case 'attachments-ia': return <AttachmentsIaView />;
    case 'decree-judgement': return <DecreeJudgementView />;

    // Criminal Law
    case 'criminal-appeals': return <CriminalAppealsView />;
    case 'bail-application': return <BailApplicationView />;
    case 'bail-dismissed': return <BailDismissedView />;
    case 'acquittal': return <AcquittalView />;
    case 'conviction': return <ConvictionView />;
    case 'remission': return <RemissionView />;
    case 'crlmp': return <CrlmpView />;

    // Family & Personal
    case 'hmop': return <HmopView />;
    case 'dop': return <DopView />;
    case 'mvop': return <MvopView />;
    case 'succession': return <SuccessionView />;
    case 'guardian-op': return <GuardianOpView />;

    // Constitutional
    case 'writ-petition': return <WritPetitionView />;

    // Legacy fallbacks
    case 'execution': return <ExecutionPetitionView />;
    case 'civil-original': return <OriginalSuitView />;
    case 'criminal': return <CriminalAppealsView />;
    case 'family': return <HmopView />;
    case 'defense-builder': return <LitigationView />;
    case 'argument-analyzer': return <LitigationView />;

    default: return <DashboardView />;
  }
}

export function AppLayout() {
  const isMobile = useIsMobile();
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedCaseId = useAppStore((s) => s.setSelectedCaseId);
  const profile = useProfileStore((s) => s.profile);
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNav = (view: string) => {
    setCurrentView(view);
    setSelectedCaseId(null);
    if (isMobile) setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const initials = profile.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <AppSidebar onNav={handleNav} />}

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:px-6">
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-card border-border">
                <AppSidebar onNav={(v) => { handleNav(v); setSidebarOpen(false); }} />
              </SheetContent>
            </Sheet>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm max-w-[120px] truncate">
                    {profile.fullName || 'Advocate'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleNav('settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNav('pricing')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pricing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Suspense fallback={<ViewLoader />}>
            {renderView(currentView)}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
