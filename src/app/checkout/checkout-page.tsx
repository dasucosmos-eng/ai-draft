'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PublicPageLayout } from '@/components/shared/public-page-layout'
import { SiteFooter } from '@/components/shared/site-footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Check, ArrowRight, Shield, Zap, Crown, Building, CreditCard,
  Lock, IndianRupee, Sparkles, ArrowLeft, FileText, Search,
  Briefcase, Users,
} from 'lucide-react'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    price: 999,
    yearlyPrice: 8999,
    description: 'Perfect for individual advocates and freelancers starting their AI journey.',
    features: [
      '50 AI document drafts per month',
      'Basic case research (100 queries)',
      '5 client profiles',
      '2GB document storage',
      'Email support',
      'Standard document templates',
    ],
    popular: false,
    cta: 'Get Started',
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: Crown,
    price: 2499,
    yearlyPrice: 22499,
    description: 'For practicing advocates and small law firms with active caseloads.',
    features: [
      '200 AI document drafts per month',
      'Advanced case research (500 queries)',
      '50 client profiles',
      '20GB document storage',
      'Priority support (24/7)',
      'Premium document templates',
      'Client portal access',
      'Billing & invoicing tools',
    ],
    popular: true,
    cta: 'Start Free Trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building,
    price: 5999,
    yearlyPrice: 53999,
    description: 'For large law firms and legal departments with team collaboration needs.',
    features: [
      'Unlimited AI document drafts',
      'Unlimited case research',
      'Unlimited client profiles',
      '100GB document storage',
      'Dedicated account manager',
      'Custom document templates',
      'Team collaboration tools',
      'Advanced analytics & reports',
      'API access',
      'Custom integrations',
    ],
    popular: false,
    cta: 'Contact Sales',
  },
]

export function CheckoutPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const selected = plans.find((p) => p.id === selectedPlan)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
                <span className="text-xs">Back to AI Draft</span>
              </Button>
            </Link>
          </div>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 border border-primary/20 overflow-hidden">
              <Sparkles className="size-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">AI Draft</span>
          </Link>
          <div className="w-[120px]" />
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Choose Your Plan</h1>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              Select the plan that best fits your legal practice. All plans include a 7-day money-back guarantee.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className={`text-sm ${billingCycle === 'monthly' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Monthly</span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-primary' : 'bg-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm ${billingCycle === 'yearly' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                Yearly
              </span>
              {billingCycle === 'yearly' && (
                <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px]">
                  Save 25%
                </Badge>
              )}
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {plans.map((plan) => {
              const price = billingCycle === 'monthly' ? plan.price : plan.yearlyPrice / 12
              return (
                <Card
                  key={plan.id}
                  className={`relative cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 ${
                    selectedPlan === plan.id
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : plan.popular
                        ? 'border-primary/30'
                        : 'border-border'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-3 shadow-md">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                        <plan.icon className="size-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                    <div className="mt-3">
                      <div className="flex items-baseline gap-1">
                        <IndianRupee className="size-4 text-foreground" />
                        <span className="text-3xl font-bold text-foreground">{Math.round(price)}</span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Billed as <IndianRupee className="inline size-3" />{plan.yearlyPrice.toLocaleString('en-IN')}/year
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      className={`w-full h-10 text-sm font-semibold rounded-xl ${
                        selectedPlan === plan.id
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/15'
                          : 'bg-gradient-to-r from-primary to-primary/85 text-primary-foreground hover:from-primary/90 hover:to-primary/75 shadow-md shadow-primary/15'
                      }`}
                    >
                      {selectedPlan === plan.id ? 'Selected' : plan.cta}
                      {selectedPlan === plan.id && <Check className="size-4 ml-1" />}
                    </Button>
                    <Separator />
                    <ul className="space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="size-3.5 text-primary mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Payment Section */}
          {selected && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="size-5 text-primary" />
                    Complete Your Purchase
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Your subscription starts immediately after payment. 7-day money-back guarantee included.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Order Summary */}
                  <div className="rounded-lg border border-border bg-card/50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Plan</span>
                      <span className="text-sm font-medium text-foreground">{selected.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Billing</span>
                      <span className="text-sm font-medium text-foreground capitalize">{billingCycle}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Total</span>
                      <span className="text-lg font-bold text-primary flex items-center gap-1">
                        <IndianRupee className="size-4" />
                        {billingCycle === 'monthly'
                          ? selected.price.toLocaleString('en-IN')
                          : selected.yearlyPrice.toLocaleString('en-IN')}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Payment Form */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Full Name *</Label>
                        <Input placeholder="Your full name" className="h-11 bg-card border-border rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Email Address *</Label>
                        <Input type="email" placeholder="lawyer@example.com" className="h-11 bg-card border-border rounded-lg text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Phone Number *</Label>
                      <Input type="tel" placeholder="+91 98765 43210" className="h-11 bg-card border-border rounded-lg text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Card Number *</Label>
                      <div className="relative">
                        <Input placeholder="4242 4242 4242 4242" className="h-11 bg-card border-border rounded-lg text-sm pr-12" />
                        <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Expiry Date *</Label>
                        <Input placeholder="MM / YY" className="h-11 bg-card border-border rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">CVV *</Label>
                        <Input placeholder="123" className="h-11 bg-card border-border rounded-lg text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Pay Button */}
                  <Button className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground hover:from-primary/90 hover:to-primary/75 shadow-lg shadow-primary/20 gap-2">
                    <Lock className="size-4" />
                    Pay <IndianRupee className="size-4" />
                    {billingCycle === 'monthly'
                      ? selected.price.toLocaleString('en-IN')
                      : selected.yearlyPrice.toLocaleString('en-IN')}
                    <ArrowRight className="size-4" />
                  </Button>

                  {/* Security Badges */}
                  <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Shield className="size-3" />256-bit SSL</span>
                    <span className="flex items-center gap-1"><Lock className="size-3" />PCI DSS Compliant</span>
                    <span className="flex items-center gap-1"><Check className="size-3" />7-day Guarantee</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Features summary */}
          <div className="max-w-4xl mx-auto mt-12">
            <h2 className="text-xl font-bold text-foreground text-center mb-8">What&apos;s Included in Every Plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: FileText, title: 'AI Document Drafting', desc: 'Generate legal documents instantly with AI' },
                { icon: Search, title: 'Case Research', desc: 'Search across 3M+ Indian judgments' },
                { icon: Briefcase, title: 'Case Management', desc: 'Track and organize all your cases' },
                { icon: Users, title: 'Client Portal', desc: 'Manage clients and share documents' },
              ].map((feature) => (
                <div key={feature.title} className="rounded-lg border border-border bg-card/50 p-4 text-center space-y-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 mx-auto">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
