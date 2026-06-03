'use client'

import Link from 'next/link'
import { Scale } from 'lucide-react'

const footerLinks = {
  Platform: [
    { label: 'AI Document Drafting', href: '/' },
    { label: 'Case Research', href: '/' },
    { label: 'Client Management', href: '/' },
    { label: 'Pricing & Plans', href: '/' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy-policy/' },
    { label: 'Terms & Conditions', href: '/terms-conditions/' },
    { label: 'Refund & Cancellation', href: '/refund-cancellation/' },
    { label: 'Shipping & Delivery', href: '/shipping-delivery/' },
  ],
  Support: [
    { label: 'Contact Us', href: '/contact/' },
    { label: 'Help Center', href: '/' },
    { label: 'Checkout', href: '/checkout/' },
  ],
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/20 overflow-hidden">
                <img src="/aidraft-logo.png" alt="Ai Draft" className="size-6 object-contain" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Ai Draft</h3>
                <p className="text-[11px] text-muted-foreground">AI Legal Document Platform</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              India&apos;s leading AI-powered legal document drafting, research and case management platform trusted by 2500+ legal professionals.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} AI Draft. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scale className="size-3" />
            <span>Built for Indian Legal Professionals</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
