'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import {
  Mail, Lock, Phone, ArrowRight, Eye, EyeOff, Scale, Shield,
  Sparkles, Loader2, CheckCircle2, ArrowLeft, Gavel, FileText,
  Search, Briefcase, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'

type AuthMethod = 'selection' | 'email' | 'phone' | 'signup'

function LegalDecoration() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
      <div className="absolute top-12 left-12 animate-pulse">
        <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Scale className="size-8 text-primary/40" />
        </div>
      </div>
      <div className="absolute top-32 right-16 animate-pulse" style={{ animationDelay: '1s' }}>
        <div className="size-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center">
          <Gavel className="size-6 text-primary/30" />
        </div>
      </div>
      <div className="absolute bottom-24 left-20 animate-pulse" style={{ animationDelay: '2s' }}>
        <div className="size-14 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
          <FileText className="size-7 text-primary/30" />
        </div>
      </div>
      <div className="absolute bottom-40 right-24 animate-pulse" style={{ animationDelay: '0.5s' }}>
        <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Search className="size-5 text-primary/40" />
        </div>
      </div>
      <div className="absolute top-48 left-1/3 animate-pulse" style={{ animationDelay: '1.5s' }}>
        <div className="size-8 rounded-lg bg-primary/6 border border-primary/10 flex items-center justify-center">
          <Briefcase className="size-4 text-primary/30" />
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative size-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center overflow-hidden">
            <img src="/aidraft-logo.png" alt="AI Draft" className="size-20 object-contain" />
          </div>
          <div className="absolute inset-[-16px] rounded-full border border-dashed border-primary/10 animate-spin" style={{ animationDuration: '20s' }} />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">AI Draft</h2>
        <p className="text-sm text-muted-foreground max-w-[240px] text-center leading-relaxed">
          India&apos;s AI-powered legal document drafting, research &amp; case management platform
        </p>
      </div>
    </div>
  )
}

const features = [
  { icon: Scale, label: 'AI Case Research', desc: 'Search 3M+ Indian judgments' },
  { icon: FileText, label: 'Smart Drafting', desc: 'Auto-generate legal documents' },
  { icon: Search, label: 'Precedent Finder', desc: 'Find relevant case law' },
  { icon: Briefcase, label: 'Case Management', desc: 'Track all your cases' },
]

function EmailAuthForm({ mode, onBack }: { mode: 'login' | 'signup'; onBack: () => void }) {
  const { loginWithEmail, signUpWithEmail, loading, error, setError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (mode === 'signup') {
      if (password !== confirmPassword) { setLocalError('Passwords do not match'); return }
      if (password.length < 6) { setLocalError('Password must be at least 6 characters'); return }
      await signUpWithEmail(email, password, name || undefined)
    } else {
      await loginWithEmail(email, password)
    }
  }, [mode, email, password, confirmPassword, name, loginWithEmail, signUpWithEmail])

  const displayError = localError || error

  return (
    <div className="space-y-5">
      <button onClick={() => { onBack(); setLocalError(null); setError(null) }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> Back to login options
      </button>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h3>
        <p className="text-sm text-muted-foreground mt-1">{mode === 'login' ? 'Sign in to access your legal workspace' : 'Start your AI-powered legal journey'}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Full Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rajesh Kumar" className="h-11 bg-card border-border rounded-lg text-sm" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lawyer@example.com" required className="h-11 pl-10 bg-card border-border rounded-lg text-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'login' ? 'Enter your password' : 'Min 6 characters'} required minLength={6} className="h-11 pl-10 pr-10 bg-card border-border rounded-lg text-sm" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        {mode === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required minLength={6} className="h-11 pl-10 bg-card border-border rounded-lg text-sm" />
            </div>
          </div>
        )}
        {displayError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <span className="shrink-0">!</span><span>{displayError}</span>
          </div>
        )}
        <Button type="submit" disabled={loading || !email || !password} className={cn('w-full h-11 text-sm font-semibold rounded-xl gap-2', 'bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75', 'text-primary-foreground shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25', 'transition-all duration-200')}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <>{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight className="size-4" /></>}
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button onClick={() => { setLocalError(null); setError(null); onBack() }} className="text-primary font-medium hover:underline">
          {mode === 'login' ? 'Sign Up' : 'Sign In'}
        </button>
      </p>
    </div>
  )
}

function PhoneAuthForm({ onBack }: { onBack: () => void }) {
  const { sendPhoneOTP, verifyPhoneOTP, loading, error, phoneInProgress, setError, phoneSessionId, phoneOTP } = useAuthStore()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const otpSent = !!phoneSessionId

  const handleSendOTP = useCallback(async () => {
    if (!phoneNumber) return
    const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
    await sendPhoneOTP(formatted)
  }, [phoneNumber, sendPhoneOTP])

  const handleVerifyOTP = useCallback(async () => {
    if (!otp || otp.length !== 6) return
    await verifyPhoneOTP(otp)
  }, [otp, verifyPhoneOTP])

  return (
    <div className="space-y-5">
      <button onClick={() => { onBack(); setError(null) }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> Back to login options
      </button>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Phone Sign-In</h3>
        <p className="text-sm text-muted-foreground mt-1">{otpSent ? 'Enter the 6-digit code sent to your phone' : 'We\'ll send you a verification code via SMS'}</p>
      </div>
      {!otpSent ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+91 98765 43210" className="h-11 pl-10 bg-card border-border rounded-lg text-sm" />
            </div>
            <p className="text-[11px] text-muted-foreground">Include country code (e.g., +91 for India)</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <span className="shrink-0">!</span><span>{error}</span>
            </div>
          )}
          <Button onClick={handleSendOTP} disabled={loading || !phoneNumber || phoneNumber.length < 10} className={cn('w-full h-11 text-sm font-semibold rounded-xl gap-2', 'bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75', 'text-primary-foreground shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25', 'transition-all duration-200')}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <>Send OTP<ArrowRight className="size-4" /></>}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-center">
              <InputOTP value={otp} onChange={setOtp} maxLength={6} render={() => (
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="size-12 bg-card border-border rounded-lg" />
                  <InputOTPSeparator />
                  <InputOTPSlot index={1} className="size-12 bg-card border-border rounded-lg" />
                  <InputOTPSeparator />
                  <InputOTPSlot index={2} className="size-12 bg-card border-border rounded-lg" />
                  <InputOTPSeparator />
                  <InputOTPSlot index={3} className="size-12 bg-card border-border rounded-lg" />
                  <InputOTPSeparator />
                  <InputOTPSlot index={4} className="size-12 bg-card border-border rounded-lg" />
                  <InputOTPSeparator />
                  <InputOTPSlot index={5} className="size-12 bg-card border-border rounded-lg" />
                </InputOTPGroup>
              )} />
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <p className="text-xs text-muted-foreground">Code sent to <span className="text-foreground font-medium">{phoneNumber}</span></p>
            </div>
            <div className="text-center">
              <button onClick={handleSendOTP} disabled={loading} className="text-xs text-primary hover:underline">Resend Code</button>
            </div>
            {phoneOTP && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-emerald-700">Your verification code</p>
                <p className="text-2xl font-bold text-emerald-600 tracking-[0.3em] font-mono">{phoneOTP}</p>
                <p className="text-[9px] text-muted-foreground">Enter this code above to verify</p>
              </div>
            )}
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <span className="shrink-0">!</span><span>{error}</span>
            </div>
          )}
          <Button onClick={handleVerifyOTP} disabled={loading || otp.length !== 6} className={cn('w-full h-11 text-sm font-semibold rounded-xl gap-2', 'bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75', 'text-primary-foreground shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25', 'transition-all duration-200')}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <>Verify &amp; Sign In<ArrowRight className="size-4" /></>}
          </Button>
        </div>
      )}
      {!otpSent && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Phone className="size-4 text-primary mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">By signing in with your phone number, you agree to receive legal updates, tips, and offers via WhatsApp. You can opt out anytime.</p>
        </div>
      )}
    </div>
  )
}

function GoogleSignInButton() {
  const { loginWithGoogle, loading, error } = useAuthStore()
  return (
    <div className="space-y-3">
      <button onClick={loginWithGoogle} disabled={loading} className={cn('w-full flex items-center justify-center gap-3 p-3.5 rounded-xl transition-all duration-200', 'bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/10', 'hover:bg-gray-50 dark:hover:bg-white/[0.1] hover:shadow-md', 'disabled:opacity-50 disabled:cursor-not-allowed')}>
        <svg className="size-5 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{loading ? 'Signing in...' : 'Continue with Google'}</span>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </button>
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <span className="shrink-0 mt-0.5">!</span><span className="break-words">{error}</span>
        </div>
      )}
    </div>
  )
}

export default function LoginView() {
  const { loading, error, clearError } = useAuthStore()
  const [method, setMethod] = useState<AuthMethod>('selection')
  const initRef = useRef(false)

  // restoreSession is called from page.tsx; no need to call again here
  // Just clear errors when switching methods
  const switchMethod = useCallback((m: AuthMethod) => {
    clearError()
    setMethod(m)
  }, [clearError])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <LegalDecoration />
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-background via-background/80 to-transparent">
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <feature.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{feature.label}</p>
                  <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 lg:w-[45%] flex flex-col">
        <div className="shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/20 overflow-hidden">
              <img src="/aidraft-logo.png" alt="AI Draft" className="size-6 object-contain" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">AI Draft</h1>
              <p className="text-[11px] text-muted-foreground">AI Legal Document Platform</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-6">
          <div className="w-full max-w-[400px]">
            {method === 'selection' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Get Started</h2>
                  <p className="text-sm text-muted-foreground">Access AI-powered legal tools trusted by 1000+ legal professionals across India</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {['RK', 'AS', 'PV', 'DM'].map((initials, i) => (
                      <div key={i} className="flex size-7 items-center justify-center rounded-full bg-primary/15 border-2 border-background text-[9px] font-bold text-primary">{initials}</div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">2,500+</span> lawyers joined this month</p>
                </div>
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">sign in with</span>
                  <Separator className="flex-1" />
                </div>
                <GoogleSignInButton />
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">or continue with</span>
                  <Separator className="flex-1" />
                </div>
                <button onClick={() => switchMethod('email')} className={cn('w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200', 'bg-card border border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5', 'group')}>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Mail className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Email &amp; Password</p>
                    <p className="text-xs text-muted-foreground">Sign in with your email address</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                <button onClick={() => switchMethod('phone')} className={cn('w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200', 'bg-card border border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5', 'group')}>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Phone className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">Phone Number</p>
                      <Badge className="h-4 px-1.5 text-[9px] font-bold bg-green-500/15 text-green-400 border-green-500/20 hover:bg-green-500/20">WhatsApp</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Sign in with OTP + get WhatsApp updates</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                <div className="text-center">
                  <button onClick={() => switchMethod('signup')} className="text-sm text-primary font-medium hover:underline">Create a new account</button>
                </div>
                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Shield className="size-3" /><span>SOC 2 Compliant</span></div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Lock className="size-3" /><span>256-bit Encrypted</span></div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Sparkles className="size-3" /><span>AI Powered</span></div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/60 px-4">
                  <span>By continuing, you agree to our</span>
                  <a href="/terms-conditions/" className="text-primary/70 hover:text-primary hover:underline">Terms of Service</a>
                  <span>and</span>
                  <a href="/privacy-policy/" className="text-primary/70 hover:text-primary hover:underline">Privacy Policy</a>
                  <span>.</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/40 px-4">
                  <a href="/contact/" className="hover:text-primary/70 hover:underline">Contact Us</a>
                  <span>·</span>
                  <a href="/shipping-delivery/" className="hover:text-primary/70 hover:underline">Shipping & Delivery</a>
                  <span>·</span>
                  <a href="/refund-cancellation/" className="hover:text-primary/70 hover:underline">Refund Policy</a>
                </div>
              </div>
            )}
            {method === 'email' && <EmailAuthForm mode="login" onBack={() => switchMethod('selection')} />}
            {method === 'signup' && <EmailAuthForm mode="signup" onBack={() => switchMethod('selection')} />}
            {method === 'phone' && <PhoneAuthForm onBack={() => switchMethod('selection')} />}
          </div>
        </div>
      </div>
    </div>
  )
}
