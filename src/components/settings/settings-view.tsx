'use client'

import { useState, useEffect } from 'react'
import { useProfileStore } from '@/store/profile-store'
import { useAuthStore } from '@/lib/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Settings,
  User,
  Building2,
  Bell,
  Shield,
  Globe,
  Palette,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Save,
  Sparkles,
  Key,
  Languages,
  MessageSquare,
  Calendar,
  CheckCircle2,
} from 'lucide-react'

export default function SettingsView() {
  const profile = useProfileStore((s) => s.profile)
  const setProfile = useProfileStore((s) => s.setProfile)
  const user = useAuthStore((s) => s.user)
  const [saved, setSaved] = useState(false)
  const [courtTypes, setCourtTypes] = useState('district,high_court')
  const [language, setLanguage] = useState('english')
  const [aiDrafing, setAiDrafing] = useState(true)
  const [aiResearch, setAiResearch] = useState(true)
  const [aiDocumentAnalysis, setAiDocumentAnalysis] = useState(true)
  const [aiChat, setAiChat] = useState(true)
  const [voiceInput, setVoiceInput] = useState(false)
  const [whatsappReminders, setWhatsappReminders] = useState(false)
  const [emailReminders, setEmailReminders] = useState(true)
  const [courtReminders, setCourtReminders] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [compactMode, setCompactMode] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Derive values from profile store (with fallbacks)
  const lawyerName = profile.fullName || user?.displayName || ''
  const email = profile.email || user?.email || ''
  const phone = profile.phone || user?.phoneNumber || ''
  const barNumber = profile.barCouncilNumber || ''
  const firmName = profile.firmName || ''
  const address = profile.city || ''

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="size-6 text-primary" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your AI Draft workspace and preferences
          </p>
        </div>
        <Button
          onClick={handleSave}
          className={saved
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 gap-2'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 gap-2'
          }
        >
          {saved ? (
            <>
              <CheckCircle2 className="size-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="text-xs sm:text-sm gap-1.5">
            <User className="size-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs sm:text-sm gap-1.5">
            <Sparkles className="size-3.5" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm gap-1.5">
            <Bell className="size-3.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs sm:text-sm gap-1.5">
            <Palette className="size-3.5" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          {/* Profile completion status */}
          {profile.isComplete && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Profile completed on {profile.completedAt ? new Date(profile.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
          )}

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="size-4 text-primary" />
                Lawyer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={lawyerName}
                      onChange={(e) => setProfile({ fullName: e.target.value })}
                      className="pl-9 bg-background"
                      placeholder="Adv. Rajesh Kumar"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Bar Council Number</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={barNumber}
                      onChange={(e) => setProfile({ barCouncilNumber: e.target.value })}
                      className="pl-9 bg-background"
                      placeholder="BCI/1234/2015"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={email}
                      onChange={(e) => setProfile({ email: e.target.value })}
                      type="email"
                      className="pl-9 bg-background"
                      placeholder="rajesh@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={phone}
                      onChange={(e) => setProfile({ phone: e.target.value })}
                      className="pl-9 bg-background"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs text-muted-foreground">City / Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      value={address}
                      onChange={(e) => setProfile({ city: e.target.value })}
                      className="pl-9 bg-background"
                      placeholder="New Delhi"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Firm Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Firm Name</Label>
                  <Input
                    value={firmName}
                    onChange={(e) => setProfile({ firmName: e.target.value })}
                    className="bg-background"
                    placeholder="Kumar & Associates"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Primary Court Types</Label>
                  <Select value={courtTypes} onValueChange={setCourtTypes}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="district">District Courts</SelectItem>
                      <SelectItem value="high_court">High Court</SelectItem>
                      <SelectItem value="district,high_court">District + High Court</SelectItem>
                      <SelectItem value="supreme">Supreme Court</SelectItem>
                      <SelectItem value="all">All Courts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                Subscription & Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">Solo Plan</p>
                    <Badge variant="outline" className="text-primary border-primary/30 text-xs">Active</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ₹1,999/month — AI drafting, research, document analysis, unlimited cases
                  </p>
                </div>
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 text-sm">
                  Upgrade
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                AI Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'AI Document Drafting', desc: 'Generate legal notices, petitions, affidavits, and contracts using AI', value: aiDrafing, setter: setAiDrafing },
                { label: 'AI Legal Research', desc: 'Search and analyze case law, precedents, and legal provisions', value: aiResearch, setter: setAiResearch },
                { label: 'AI Document Analysis', desc: 'Extract key information, risks, and clauses from uploaded documents', value: aiDocumentAnalysis, setter: setAiDocumentAnalysis },
                { label: 'AI Chat Assistant', desc: 'Conversational AI for legal queries and case assistance', value: aiChat, setter: setAiChat },
                { label: 'Voice-to-Text Input', desc: 'Convert voice notes to structured legal text', value: voiceInput, setter: setVoiceInput },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={item.value} onCheckedChange={item.setter} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Languages className="size-4 text-primary" />
                Language & Localization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Primary AI Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-background">
                    <Globe className="size-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                    <SelectItem value="tamil">Tamil</SelectItem>
                    <SelectItem value="telugu">Telugu</SelectItem>
                    <SelectItem value="bengali">Bengali</SelectItem>
                    <SelectItem value="marathi">Marathi</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  AI will generate documents and respond in the selected language
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Multilingual Client Communication</p>
                  <p className="text-xs text-muted-foreground">AI automatically detects and responds in client&apos;s language</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                AI Safety & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                  <Shield className="size-3.5" />
                  Legal Disclaimer
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All AI-generated content includes mandatory disclaimer: &quot;AI-generated draft. Advocate review required before filing.&quot; This cannot be disabled.
                </p>
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-foreground">Hallucination Warning</p>
                  <p className="text-xs text-muted-foreground">Warn when AI confidence is low or citations may be inaccurate</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-foreground">Citation Verification</p>
                  <p className="text-xs text-muted-foreground">AI cross-references cited judgments before including them</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                Notification Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Mail className="size-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates via email</p>
                  </div>
                </div>
                <Switch checked={emailReminders} onCheckedChange={setEmailReminders} />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <MessageSquare className="size-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">WhatsApp Reminders</p>
                    <p className="text-xs text-muted-foreground">Send hearing reminders and updates via WhatsApp</p>
                  </div>
                </div>
                <Switch checked={whatsappReminders} onCheckedChange={setWhatsappReminders} />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Calendar className="size-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Court Date Reminders</p>
                    <p className="text-xs text-muted-foreground">Get notified before hearings (1 day, 3 days, 1 week before)</p>
                  </div>
                </div>
                <Switch checked={courtReminders} onCheckedChange={setCourtReminders} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Reminder Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {['1 hour before', '1 day before', '3 days before', '1 week before', 'Deadline day'].map((schedule) => (
                  <Badge
                    key={schedule}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 border-primary/20 text-primary py-1.5 px-3"
                  >
                    {schedule}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Palette className="size-4 text-primary" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Use dark theme across the application</p>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Compact Mode</p>
                  <p className="text-xs text-muted-foreground">Reduce spacing for more content density</p>
                </div>
                <Switch checked={compactMode} onCheckedChange={setCompactMode} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Data & Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-foreground">Case Data Encryption</p>
                  <p className="text-xs text-muted-foreground">All case data is encrypted at rest</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-delete Drafts</p>
                  <p className="text-xs text-muted-foreground">Automatically delete unsaved drafts after 30 days</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="pt-2">
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-sm">
                  Export All Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
