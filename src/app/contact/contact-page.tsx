'use client'

import { useState } from 'react'
import { PublicPageLayout } from '@/components/shared/public-page-layout'
import { Send, Building, Phone, MapPin, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <PublicPageLayout title="Contact Us">
      <div className="space-y-8">
        {/* Business Identity */}
        <div className="rounded-xl border border-border bg-card/50 p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
              <img src="/aidraft-logo.png" alt="Ai Draft" className="size-9 object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Ai Draft</h2>
              <p className="text-sm text-muted-foreground">AI Legal Document Platform</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <Building className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Founder</p>
                <p className="text-base font-bold text-foreground">Prabhu Dasu Palli</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <Phone className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <a href="tel:+919858866667" className="text-base font-bold text-foreground hover:text-primary transition-colors">+91 98588 66667</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <Mail className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <a href="mailto:support@aidraft.bond" className="text-base font-bold text-foreground hover:text-primary transition-colors">support@aidraft.bond</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <MapPin className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Business Address</p>
                <p className="text-sm font-bold text-foreground leading-relaxed">
                  Gopalapuram, Ravulapalem Mandal,<br />
                  East Godavari District,<br />
                  Andhra Pradesh - 533274, India
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div className="space-y-3">
          <p className="text-muted-foreground leading-relaxed">
            Have a question about Ai Draft, need technical support, or want to learn more about our
            AI-powered legal document platform? We&apos;re here to help. Reach out through the form below
            and our team will get back to you promptly.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you&apos;re a practicing advocate, law firm, in-house counsel, or legal student — our
            dedicated support team is available to assist you with account setup, document drafting,
            case research, billing inquiries, and any other platform-related questions.
          </p>
        </div>

        {/* Contact Form */}
        <div className="rounded-xl border border-border bg-card/50 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Send Us a Message</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Fill out the form below and our team will respond within 24 business hours.
            </p>
          </div>

          {submitted ? (
            <div className="text-center py-10 space-y-3">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 mx-auto">
                <Send className="size-7 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Message Sent Successfully</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Thank you for reaching out. Our support team will review your message and get back to you
                within 24 hours at the email address you provided.
              </p>
              <Button variant="outline" onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', subject: '', message: '' }) }} className="mt-4">
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name" className="text-xs font-medium text-muted-foreground">Full Name *</Label>
                  <Input
                    id="contact-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                    className="h-11 bg-card border-border rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="text-xs font-medium text-muted-foreground">Email Address *</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="lawyer@example.com"
                    className="h-11 bg-card border-border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-subject" className="text-xs font-medium text-muted-foreground">Subject *</Label>
                <Input
                  id="contact-subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="How can we help?"
                  className="h-11 bg-card border-border rounded-lg text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message" className="text-xs font-medium text-muted-foreground">Message *</Label>
                <Textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your question or issue in detail..."
                  className="bg-card border-border rounded-lg text-sm resize-none"
                />
              </div>
              <Button type="submit" className="h-11 px-6 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground hover:from-primary/90 hover:to-primary/75 shadow-md shadow-primary/15">
                <Send className="size-4 mr-2" />
                Send Message
              </Button>
            </form>
          )}
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              { q: 'How do I reset my password?', a: 'Click on "Forgot Password" on the login page and enter your registered email address. You will receive a password reset link within a few minutes. If you don\'t see the email, check your spam folder.' },
              { q: 'Can I use Ai Draft on mobile devices?', a: 'Yes, Ai Draft is fully responsive and works on all mobile devices, tablets, and desktop browsers. You can draft documents, research cases, and manage your clients from anywhere.' },
              { q: 'Is my data secure on Ai Draft?', a: 'Absolutely. Ai Draft uses 256-bit encryption, SOC 2 compliant infrastructure, and all data is stored securely under Indian data protection laws. Your documents and case information are never shared with third parties.' },
              { q: 'Do you offer training or onboarding?', a: 'Yes, we offer free onboarding sessions for new users and team plans. Send us a message through the contact form above to schedule a personalized walkthrough of the platform.' },
            ].map((faq, i) => (
              <div key={i} className="rounded-lg border border-border bg-card/50 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicPageLayout>
  )
}
