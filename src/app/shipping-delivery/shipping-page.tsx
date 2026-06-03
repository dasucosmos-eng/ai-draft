'use client'

import { PublicPageLayout } from '@/components/shared/public-page-layout'
import { Monitor, Download, Mail, Zap, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react'

export function ShippingPage() {
  return (
    <PublicPageLayout title="Shipping & Delivery">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-muted-foreground leading-relaxed">Last updated: May 30, 2025</p>
          <p className="text-muted-foreground leading-relaxed">
            AI Draft is a fully digital platform — all our services, documents, and resources are delivered electronically. There are no physical products that require shipping. This page describes how you receive access to our services and any digital deliverables after purchase.
          </p>
        </div>

        {/* Digital Delivery */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Zap className="size-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Instant Digital Delivery</h2>
          </div>
          <div className="space-y-3 pl-11">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upon successful subscription purchase, your AI Draft account is activated immediately. There is no waiting period — you gain full access to all features included in your chosen plan right away. Your subscription is linked to your registered email address and phone number, and you can start using the platform from any device by logging in at aidraft.bond.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For team and enterprise subscriptions, all team member accounts are provisioned within 2 business hours of purchase. The account administrator will receive an email with setup instructions and can add team members directly from the admin dashboard. Our onboarding team is available to assist with initial setup and configuration at no additional cost.
            </p>
          </div>
        </div>

        {/* Document Delivery */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <FileText className="size-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">AI-Generated Documents</h2>
          </div>
          <div className="space-y-3 pl-11">
            <p className="text-sm text-muted-foreground leading-relaxed">
              All legal documents generated using our AI drafting tools are created in real-time and available for immediate download. You can preview documents on-screen, make edits using our built-in editor, and download them in multiple formats including PDF, DOCX, and plain text. There are no delays in document generation or delivery.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Drafted documents are saved to your account and can be accessed at any time from your Documents section. You can also share documents directly with clients via secure email links or download them for offline use. Each document includes a unique reference number for tracking and version management.
            </p>
          </div>
        </div>

        {/* Platform Access */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Monitor className="size-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Platform Access & Availability</h2>
          </div>
          <div className="space-y-3 pl-11">
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI Draft is accessible 24/7 through our web platform at aidraft.bond. We maintain a 99.9% uptime target and our infrastructure is designed for high availability. Scheduled maintenance windows, if any, are communicated at least 48 hours in advance via email and platform notifications.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The platform is fully responsive and works on all modern web browsers including Google Chrome, Mozilla Firefox, Microsoft Edge, and Safari. We recommend using the latest version of your preferred browser for the best experience. Mobile devices, tablets, and desktop computers are all supported.
            </p>
          </div>
        </div>

        {/* Email Delivery */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Mail className="size-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Email Communications</h2>
          </div>
          <div className="space-y-3 pl-11">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Transactional emails including account verification, subscription confirmations, password reset links, and billing receipts are delivered instantly to your registered email address. Please check your spam or junk folder if you do not receive expected emails within a few minutes.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Marketing and promotional communications are sent only to users who have opted in to receive them. You can manage your email preferences in your account settings or unsubscribe from marketing emails at any time using the unsubscribe link included in each email.
            </p>
          </div>
        </div>

        {/* Delivery Timeline */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Clock className="size-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Service Delivery Timeline</h2>
          </div>
          <div className="space-y-3 pl-11">
            <div className="rounded-lg border border-border bg-card/50 divide-y divide-border">
              {[
                { service: 'Account Activation', timeline: 'Instant', desc: 'Access within seconds of subscription purchase' },
                { service: 'AI Document Generation', timeline: 'Real-time', desc: 'Documents generated in 10-60 seconds depending on complexity' },
                { service: 'Case Research Results', timeline: 'Real-time', desc: 'Search results returned in 5-15 seconds' },
                { service: 'Team Account Setup', timeline: '2 Business Hours', desc: 'All team members provisioned within 2 hours' },
                { service: 'Custom Template Requests', timeline: '5 Business Days', desc: 'Custom document templates delivered within 5 working days' },
                { service: 'Enterprise Onboarding', timeline: '3 Business Days', desc: 'Full enterprise setup with dedicated support' },
              ].map((item) => (
                <div key={item.service} className="flex items-start justify-between gap-4 p-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.service}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary whitespace-nowrap bg-primary/10 px-2 py-1 rounded-md">{item.timeline}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Important Notes</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">All services are delivered digitally — no physical shipping is involved.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">Internet connection is required to access AI Draft services.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">Documents are stored securely in your account and accessible from any device.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">Delivery delays may occur during scheduled maintenance or unforeseen technical issues. We will notify affected users and work to resolve issues promptly.</p>
            </div>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  )
}
