'use client'

import { PublicPageLayout } from '@/components/shared/public-page-layout'
import { RotateCcw, CreditCard, Clock, AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RefundPage() {
  return (
    <PublicPageLayout title="Refund & Cancellation">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-muted-foreground leading-relaxed">Last updated: May 30, 2025</p>
          <p className="text-muted-foreground leading-relaxed">
            At AI Draft, we want you to be completely satisfied with our AI-powered legal document platform. We understand that circumstances may change, and we have designed our refund and cancellation policy to be fair and transparent. Please review the following policies carefully before subscribing to any of our plans.
          </p>
        </div>

        {/* Cancellation Policy */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <XCircle className="size-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Subscription Cancellation</h2>
          </div>
          <div className="space-y-3 pl-11">
            <p className="text-sm text-muted-foreground leading-relaxed">
              You may cancel your AI Draft subscription at any time through your account settings or by contacting our support team at support@aidraft.bond. Upon cancellation, your subscription will remain active until the end of the current billing period. You will not be charged again after cancellation, and you will retain access to all features included in your plan until the expiration date.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For annual subscriptions, if you cancel before the end of the annual term, you will retain access to the Platform until the end of your paid period. No partial refunds are provided for unused months on annual plans unless the cancellation is due to a service issue on our part.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Team and enterprise plan administrators can cancel subscriptions from the team management dashboard. Upon cancellation, all team member accounts will be deactivated at the end of the current billing period. Individual team members who wish to continue using AI Draft can subscribe independently.
            </p>
          </div>
        </div>

        {/* Refund Policy */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <RotateCcw className="size-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Refund Policy</h2>
          </div>
          <div className="space-y-3 pl-11">
            <p className="text-sm text-muted-foreground leading-relaxed">
              We offer a 7-day money-back guarantee on all new subscriptions. If you are not satisfied with AI Draft within the first 7 days of your initial subscription, you may request a full refund. This guarantee applies to first-time subscribers only and covers the full subscription amount paid, including any applicable taxes.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              After the 7-day money-back guarantee period, refunds are evaluated on a case-by-case basis. Refund requests made after 7 days may be considered under the following circumstances: significant service outages affecting your use of the Platform for more than 24 consecutive hours, billing errors or duplicate charges, and documented technical issues that prevent core Platform functionality.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Refunds are not available for the following situations: change of mind after the 7-day guarantee period, failure to use the Platform or features included in your plan, dissatisfaction with AI-generated content (as users are responsible for reviewing and editing all AI output), account suspension due to Terms of Service violations, and expired subscriptions where the user did not cancel before renewal.
            </p>
          </div>
        </div>

        {/* Refund Process */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <CreditCard className="size-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Refund Process</h2>
          </div>
          <div className="space-y-3 pl-11">
            <p className="text-sm text-muted-foreground leading-relaxed">
              To request a refund, please email support@aidraft.bond with your registered email address, subscription details, and reason for the refund request. Our team will acknowledge your request within 24 business hours and process eligible refunds within 5-7 business days.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Refunds will be processed using the same payment method used for the original purchase. For credit card and UPI payments, refunds typically appear on your statement within 5-10 business days after processing. For net banking transfers, refunds may take 7-14 business days to reflect in your account.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You will receive an email confirmation once your refund has been processed, including the refund amount, processing date, and expected timeline for the amount to appear in your account. Please retain this confirmation for your records.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Clock className="size-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Refund Timeline</h2>
          </div>
          <div className="pl-11">
            <div className="rounded-lg border border-border bg-card/50 divide-y divide-border">
              {[
                { step: 'Refund Request Submitted', time: 'Day 0', desc: 'Email sent to support@aidraft.bond' },
                { step: 'Request Acknowledged', time: 'Within 24 hours', desc: 'Support team reviews and responds' },
                { step: 'Refund Approved / Denied', time: 'Within 3 business days', desc: 'Decision communicated via email' },
                { step: 'Refund Processed', time: 'Within 5-7 business days', desc: 'Amount credited to original payment method' },
                { step: 'Amount Reflected in Account', time: '5-14 business days', desc: 'Depends on your bank/payment provider' },
              ].map((item) => (
                <div key={item.step} className="flex items-start justify-between gap-4 p-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.step}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary whitespace-nowrap bg-primary/10 px-2 py-1 rounded-md">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Non-Refundable Items */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
              <AlertTriangle className="size-4 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Non-Refundable Items</h2>
          </div>
          <div className="space-y-3 pl-11">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The following are non-refundable: custom document templates created for specific clients or cases, enterprise setup fees for onboarding and configuration, charges for additional API calls beyond plan limits, and promotional or discounted subscriptions purchased during special offers (unless the offer explicitly stated a money-back guarantee).
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Need Help with a Refund?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have any questions about our refund and cancellation policy or need assistance with a refund request, our support team is here to help.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="h-10 px-5 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground hover:from-primary/90 hover:to-primary/75 shadow-md shadow-primary/15">
              <a href="mailto:support@aidraft.bond">
                Email Support
                <ArrowRight className="size-4 ml-2" />
              </a>
            </Button>
            <Button asChild variant="outline" className="h-10 px-5 text-sm rounded-xl">
              <a href="/contact/">Visit Contact Page</a>
            </Button>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  )
}
