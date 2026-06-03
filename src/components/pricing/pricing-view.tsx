'use client'

import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Sparkles, Check, X, Zap, Crown, Building2,
  Shield, Server, Phone, Globe, ChevronRight, Star, ArrowRight, CreditCard, Lock,
  MessageSquare, Headphones, Clock, Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  useSubscriptionStore,
  PLANS,
  FEATURE_COMPARISON,
  type PlanType,
} from '@/store/subscription-store'
import { toast } from 'sonner'

/* ─── Helpers ─── */

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function CheckIcon({ available }: { available: boolean | string }) {
  if (available === false) return <X className="size-4 text-muted-foreground/40" />
  if (typeof available === 'string') return <span className="text-[11px] font-medium text-foreground">{available}</span>
  return <Check className="size-4 text-emerald-500" />
}

/* ─── Plan Card ─── */

function PlanCard({ plan, isCurrentPlan, onSelect }: { plan: typeof PLANS[number]; isCurrentPlan: boolean; onSelect: () => void }) {
  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-200 hover:shadow-lg',
      plan.highlighted && 'border-primary shadow-md shadow-primary/10 scale-[1.02]',
      isCurrentPlan && 'border-emerald-500/50 bg-emerald-500/5',
    )}>
      {plan.badge && (
        <div className="absolute top-0 right-0">
          <div className={cn(
            'px-3 py-1 text-[10px] font-bold rounded-bl-lg',
            plan.highlighted ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          )}>
            {plan.badge}
          </div>
        </div>
      )}
      <CardContent className="p-6 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {plan.id === 'free' && <Zap className="size-5 text-muted-foreground" />}
            {plan.id === 'pro' && <Crown className="size-5 text-primary" />}
            {plan.id === 'enterprise' && <Building2 className="size-5 text-amber-500" />}
            <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{plan.description}</p>
        </div>

        <div className="flex items-baseline gap-1">
          {plan.price === 0 ? (
            <span className="text-3xl font-bold text-foreground">Free</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-foreground">{formatINR(plan.price)}</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </>
          )}
        </div>
        {plan.price > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {formatINR(plan.yearlyPrice)}/year (save {formatINR(plan.price * 12 - plan.yearlyPrice)})
          </p>
        )}

        <Separator />

        <ul className="space-y-2.5">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={onSelect}
          disabled={isCurrentPlan}
          className={cn(
            'w-full rounded-xl h-11 text-sm font-semibold gap-2',
            isCurrentPlan
              ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20'
              : plan.highlighted
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border'
          )}
        >
          {isCurrentPlan ? (
            <><Check className="size-4" />Current Plan</>
          ) : (
            <><ArrowRight className="size-4" />{plan.price === 0 ? 'Current Plan' : 'Upgrade Now'}</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

/* ─── Why Upgrade / Value Props ─── */

function ValueProps() {
  const benefits = [
    {
      icon: Zap,
      title: 'Save 10+ Hours Weekly',
      description: 'AI drafts legal notices, petitions, affidavits, and contracts in seconds — not hours. Eliminate repetitive manual drafting.',
    },
    {
      icon: Shield,
      title: 'Citations & Case Law',
      description: 'Every AI output includes real citations from Indian Kanoon (3M+ cases). Research Supreme Court, High Court precedents instantly.',
    },
    {
      icon: MessageSquare,
      title: 'Win More Cases',
      description: 'Defense Builder, Argument Analyzer, and Cross-Examination Assistant strengthen your litigation strategy with AI intelligence.',
    },
    {
      icon: Headphones,
      title: 'Priority Support',
      description: 'Pro and Enterprise users get dedicated WhatsApp support with guaranteed response times from our legal tech team.',
    },
    {
      icon: Clock,
      title: 'GST-Ready Invoicing',
      description: 'Auto-generate GST-compliant invoices, track payments, and send WhatsApp reminders to clients for pending dues.',
    },
    {
      icon: Award,
      title: 'Trusted by 2500+ Lawyers',
      description: 'Join India\'s fastest-growing AI legal tech platform. Built by lawyers, for lawyers, with data security you can trust.',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Why Lawyers Choose AI Draft Pro</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {benefits.map((benefit) => (
          <Card key={benefit.title} className="group hover:shadow-sm transition-all hover:border-primary/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <benefit.icon className="size-4 text-primary" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">{benefit.title}</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{benefit.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ─── Payment Dialog ─── */

function PaymentDialog({ plan, open, onClose, onPlanActivated }: { plan: typeof PLANS[number]; open: boolean; onClose: () => void; onPlanActivated: (plan: PlanType) => void }) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  const finalAmount = billingCycle === 'monthly' ? plan.price : plan.yearlyPrice

  const handlePayment = useCallback(async () => {
    setLoading(true)
    try {
      // Step 1: Create Razorpay order from backend
      const orderRes = await fetch('/api/razorpay-create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          planId: plan.id,
          billingCycle,
        }),
      })
      const orderData = await orderRes.json()

      if (!orderData.success) {
        toast.error('Failed to create payment order. Please try again.')
        setLoading(false)
        return
      }

      // Step 2: Open Razorpay checkout
      // @ts-ignore - Razorpay script loaded dynamically
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'AI Draft',
        description: `${plan.name} Plan (${billingCycle})`,
        order_id: orderData.orderId,
        prefill: {
          name: '', // Will be populated from profile if available
          email: '',
          contact: '',
        },
        theme: {
          color: '#3b82f6',
        },
        handler: async function (response: any) {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await fetch('/api/razorpay-verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
                billingCycle,
              }),
            })
            const verifyData = await verifyRes.json()

            if (verifyData.success) {
              toast.success(`Payment successful! ${plan.name} plan activated.`)
              onPlanActivated(plan.id as PlanType)
              onClose()
            } else {
              toast.error('Payment verification failed. Please contact support.')
            }
          } catch {
            toast.error('Payment verification failed. Please contact support.')
          }
          setLoading(false)
        },
        modal: {
          ondismiss: function () {
            setLoading(false)
          },
        },
      }

      // @ts-ignore
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function () {
        toast.error('Payment failed. Please try again or use a different payment method.')
        setLoading(false)
      })
      rzp.open()
    } catch (err) {
      console.error('Payment error:', err)
      toast.error('Failed to initiate payment. Please try again.')
      setLoading(false)
    }
  }, [plan, billingCycle, finalAmount, onClose, onPlanActivated])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            Upgrade to {plan.name}
          </DialogTitle>
          <DialogDescription>
            Complete your payment to activate the {plan.name} plan with all features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Billing Cycle */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Billing Cycle</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  'p-3 rounded-lg border text-center transition-colors',
                  billingCycle === 'monthly'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <p className="text-sm font-semibold">{formatINR(plan.price)}</p>
                <p className="text-[10px] text-muted-foreground">Monthly</p>
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  'p-3 rounded-lg border text-center transition-colors relative',
                  billingCycle === 'yearly'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <Badge className="absolute -top-2 right-2 text-[9px] px-1.5">Save {formatINR(plan.price * 12 - plan.yearlyPrice)}</Badge>
                <p className="text-sm font-semibold">{formatINR(plan.yearlyPrice)}</p>
                <p className="text-[10px] text-muted-foreground">Yearly</p>
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{plan.name} Plan</span>
              <span className="font-semibold">{formatINR(finalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">GST (18%)</span>
              <span className="font-semibold">{formatINR(Math.round(finalAmount * 0.18))}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-primary">
                {formatINR(Math.round(finalAmount * 1.18))}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-[11px] text-muted-foreground font-medium">Pay securely via Razorpay</p>
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><CreditCard className="size-3" />Cards</span>
              <span>•</span>
              <span>UPI</span>
              <span>•</span>
              <span>Net Banking</span>
              <span>•</span>
              <span>Wallets</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handlePayment} disabled={loading} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? (
              <>
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Shield className="size-4" />
                Pay {formatINR(Math.round(finalAmount * 1.18))}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Main Pricing View ─── */

export default function PricingView() {
  const { plan: currentPlan, usageToday, usageLimit: maxUsage, setPlan: setCurrentPlan, getRemainingQueries: getRemainingUsage } = useSubscriptionStore()
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[number] | null>(null)
  const [showPayment, setShowPayment] = useState(false)

  const remainingUsage = getRemainingUsage()
  const usagePercent = maxUsage > 0 ? Math.round((usageToday / maxUsage) * 100) : 0

  const handleSelectPlan = useCallback((plan: typeof PLANS[number]) => {
    if (plan.price === 0) return
    setSelectedPlan(plan)
    setShowPayment(true)
  }, [])

  const handlePlanActivate = useCallback((plan: PlanType) => {
    setCurrentPlan(plan)
    toast.success(`Switched to ${PLANS.find(p => p.id === plan)?.name} plan`)
    setShowPayment(false)
  }, [setCurrentPlan])

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Crown className="size-7 text-primary" />
            Pricing & Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the right plan for your legal practice. All plans include AI-powered tools.
          </p>
        </div>
        <Badge className="gap-1.5 bg-primary/15 text-primary border-primary/20 px-3 py-1 self-start">
          <Sparkles className="size-3.5" />
          Current: {PLANS.find(p => p.id === currentPlan)?.name}
        </Badge>
      </div>

      {/* Usage Meter (for free plan) */}
      {currentPlan === 'free' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Today&apos;s AI Usage</span>
              </div>
              <span className={cn(
                'text-xs font-bold',
                remainingUsage <= 1 ? 'text-red-500' : remainingUsage <= 3 ? 'text-amber-500' : 'text-emerald-500'
              )}>
                {remainingUsage} of {maxUsage} remaining
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            {remainingUsage === 0 && (
              <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Daily limit reached. Upgrade to Pro for unlimited AI queries.</span>
                <Button size="sm" className="h-7 text-[10px] gap-1 bg-primary text-primary-foreground ml-auto shrink-0" onClick={() => handleSelectPlan(PLANS[1])}>
                  Upgrade<ChevronRight className="size-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={currentPlan === plan.id}
            onSelect={() => handleSelectPlan(plan)}
          />
        ))}
      </div>

      {/* Feature Comparison Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Feature Comparison</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Feature</th>
                  <th className="text-center py-2.5 px-3 text-muted-foreground font-medium w-24">Free</th>
                  <th className="text-center py-2.5 px-3 text-primary font-semibold w-24 bg-primary/5 rounded-t-lg">Pro</th>
                  <th className="text-center py-2.5 px-3 text-muted-foreground font-medium w-24">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map((feature, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-foreground">{feature.name}</td>
                    <td className="text-center py-2.5 px-3">
                      <div className="flex justify-center"><CheckIcon available={feature.free} /></div>
                    </td>
                    <td className="text-center py-2.5 px-3 bg-primary/5">
                      <div className="flex justify-center"><CheckIcon available={feature.pro} /></div>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <div className="flex justify-center"><CheckIcon available={feature.enterprise} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Why Upgrade */}
      <ValueProps />

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><Lock className="size-3.5" /><span>256-bit Encrypted</span></div>
        <div className="flex items-center gap-1.5"><Shield className="size-3.5" /><span>GDPR Compliant</span></div>
        <div className="flex items-center gap-1.5"><Server className="size-3.5" /><span>99.9% Uptime</span></div>
        <div className="flex items-center gap-1.5"><Phone className="size-3.5" /><span>WhatsApp Support</span></div>
        <div className="flex items-center gap-1.5"><Star className="size-3.5" /><span>Trusted by 2500+ Lawyers</span></div>
      </div>

      {/* Payment Dialog */}
      {selectedPlan && (
        <PaymentDialog
          plan={selectedPlan}
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onPlanActivated={handlePlanActivate}
        />
      )}
    </div>
  )
}
