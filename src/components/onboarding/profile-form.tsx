'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useProfileStore } from '@/store/profile-store'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Scale,
  Hash,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

/* ─── Practice Areas ─── */

const practiceAreas = [
  'Criminal',
  'Civil',
  'Family',
  'Corporate',
  'IP',
  'Tax',
  'Labor',
  'Constitutional',
]

/* ─── Form Field Config ─── */

interface FieldConfig {
  key: keyof ProfileFormData
  label: string
  placeholder: string
  icon: React.ReactNode
  type?: string
  required?: boolean
}

interface ProfileFormData {
  fullName: string
  email: string
  phone: string
  barCouncilNumber: string
  firmName: string
  city: string
  practiceArea: string
}

const formFields: FieldConfig[] = [
  { key: 'fullName', label: 'Full Name', placeholder: 'Adv. Rajesh Kumar', icon: <User className="size-4" />, required: true },
  { key: 'email', label: 'Email Address', placeholder: 'rajesh@example.com', icon: <Mail className="size-4" />, type: 'email', required: true },
  { key: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210', icon: <Phone className="size-4" />, type: 'tel' },
  { key: 'barCouncilNumber', label: 'Bar Council Registration No.', placeholder: 'BCI/1234/2015', icon: <Hash className="size-4" /> },
  { key: 'firmName', label: 'Firm / Company Name', placeholder: 'Kumar & Associates', icon: <Building2 className="size-4" /> },
  { key: 'city', label: 'City / Location', placeholder: 'New Delhi', icon: <MapPin className="size-4" /> },
]

/* ─── Main Component ─── */

export function ProfileForm() {
  const profile = useProfileStore((s) => s.profile)
  const setProfile = useProfileStore((s) => s.setProfile)
  const firestoreStatus = useProfileStore((s) => s.firestoreStatus)
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const hydratedAtRef = useRef(0)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    email: '',
    phone: '',
    barCouncilNumber: '',
    firmName: '',
    city: '',
    practiceArea: '',
  })
  const [step, setStep] = useState(0)

  // Mark as hydrated on mount
  useEffect(() => {
    setHydrated(true)
    hydratedAtRef.current = Date.now()
  }, [])

  // Show popup ONLY after Firestore has finished loading AND profile is incomplete
  // AND at least 2 seconds have passed since hydration (to let Firestore respond)
  useEffect(() => {
    if (!hydrated) return
    if (firestoreStatus !== 'loaded') return
    // Safety gate: wait at least 2s after hydration for Firestore to respond
    const elapsed = Date.now() - hydratedAtRef.current
    if (elapsed < 2000) {
      const timer = setTimeout(() => {
        if (!useProfileStore.getState().profile.isComplete) {
          setFormData({
            fullName: profile.fullName || '',
            email: profile.email || '',
            phone: profile.phone || '',
            barCouncilNumber: profile.barCouncilNumber || '',
            firmName: profile.firmName || '',
            city: profile.city || '',
            practiceArea: profile.practiceArea || '',
          })
          setOpen(true)
        }
      }, 2000 - elapsed)
      return () => clearTimeout(timer)
    }

    // At this point, Firestore has loaded (or failed — no data).
    // The profile in the store is the truth.
    if (profile.isComplete) {
      setOpen(false)
      return
    }

    // Profile is incomplete — show popup
    setFormData({
      fullName: profile.fullName || '',
      email: profile.email || '',
      phone: profile.phone || '',
      barCouncilNumber: profile.barCouncilNumber || '',
      firmName: profile.firmName || '',
      city: profile.city || '',
      practiceArea: profile.practiceArea || '',
    })
    setOpen(true)
  }, [hydrated, firestoreStatus, profile.isComplete, profile.fullName])

  const updateField = (key: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = useCallback(async () => {
    if (!formData.fullName.trim() || !formData.email.trim()) return

    setSubmitting(true)
    try {
      const profileData = {
        ...formData,
        isComplete: true,
        completedAt: new Date().toISOString(),
      }
      setProfile(profileData)

      // Fire CRM sync
      const user = useAuthStore.getState().user
      try {
        await fetch('/api/crm-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user?.uid || '',
            email: formData.email || user?.email || '',
            displayName: formData.fullName || user?.displayName || '',
            phoneNumber: formData.phone || user?.phoneNumber || '',
            photoURL: user?.photoURL || '',
            provider: user?.provider || 'profile-form',
            createdAt: new Date().toISOString(),
            source: 'aidraft-bond',
          }),
        })
      } catch { /* CRM sync is silent */ }

      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }, [formData, setProfile])

  const isPersonalValid = formData.fullName.trim() !== '' && formData.email.trim() !== ''
  const canSubmit = isPersonalValid

  if (!hydrated) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (canSubmit) setOpen(v) }}>
      <DialogContent
        className="sm:max-w-[520px] p-0 overflow-hidden"
        showCloseButton={canSubmit}
        onPointerDownOutside={(e) => { if (!canSubmit) e.preventDefault() }}
      >
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-primary/5 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="size-5 text-primary" />
              </div>
              Complete Your Profile
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1.5">
              {step === 0
                ? 'Tell us about yourself to personalize your experience'
                : 'Add your professional details to get started'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-4">
            <div className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
              step === 0 ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
            )}>
              <User className="size-3" />
              Personal
            </div>
            <div className="w-6 h-px bg-border" />
            <div className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
              step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              <Scale className="size-3" />
              Professional
            </div>
          </div>
        </div>

        <Separator />

        <div className="px-6 pb-2 max-h-[50vh] overflow-y-auto">
          {step === 0 ? (
            <div className="space-y-4 pt-4">
              {formFields.slice(0, 3).map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key} className="text-xs font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      {field.icon}
                    </div>
                    <Input
                      id={field.key}
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      value={formData[field.key]}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="pl-10 h-10 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {formFields.slice(3).map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key} className="text-xs font-medium">
                    {field.label}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      {field.icon}
                    </div>
                    <Input
                      id={field.key}
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      value={formData[field.key]}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="pl-10 h-10 text-sm"
                    />
                  </div>
                </div>
              ))}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Practice Area</Label>
                <Select value={formData.practiceArea} onValueChange={(v) => updateField('practiceArea', v)}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Select your primary practice area" />
                  </SelectTrigger>
                  <SelectContent>
                    {practiceAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.practiceArea && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                    <Scale className="size-3 mr-1" />
                    {formData.practiceArea} Law
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="px-6 pb-6 pt-4">
          <div className="flex items-center justify-between w-full">
            {step === 0 ? (
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive">*</span> Required fields
              </p>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setStep(0)} className="text-xs">
                Back
              </Button>
            )}

            {step === 0 ? (
              <Button onClick={() => setStep(1)} disabled={!isPersonalValid} className="gap-2 text-sm">
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="gap-2 text-sm min-w-[120px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
