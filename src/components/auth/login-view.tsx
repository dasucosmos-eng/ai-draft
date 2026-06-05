'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { googleAuth, emailSignup, emailSignin, phoneSendOtp, phoneVerifyOtp } from '@/lib/auth-store';
import { Mail, Phone, Lock, User, Loader2, ArrowRight, Scale, Shield } from 'lucide-react';

export function LoginView() {
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [otp, setOtp] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      await googleAuth();
    } catch (err: any) {
      console.error('[Google Auth]', err);
      toast.error(err?.message || 'Failed to start Google authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        if (!displayName) {
          toast.error('Please enter your name');
          setLoading(false);
          return;
        }
        await emailSignup(email, password, displayName);
        toast.success('Account created successfully!');
      } else {
        await emailSignin(email, password);
        toast.success('Welcome back!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Authentication failed');
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      await phoneSendOtp(phoneNumber);
      setOtpSent(true);
      toast.success('OTP sent successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await phoneVerifyOtp(phoneNumber, otp);
      toast.success('Phone verified successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'OTP verification failed');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo & Title */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4 flex items-center justify-center gap-3"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Scale className="h-8 w-8 text-primary" />
            </div>
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AI Draft Bond
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-Powered Legal Platform for Indian Advocates
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign in to your account</CardTitle>
            <CardDescription>
              Choose your preferred authentication method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="google" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="google" className="text-xs">
                  Google
                </TabsTrigger>
                <TabsTrigger value="email" className="text-xs">
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="text-xs">
                  Phone
                </TabsTrigger>
              </TabsList>

              {/* Google Tab */}
              <TabsContent value="google">
                <Button
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full gap-2 h-11 bg-white text-gray-800 hover:bg-gray-100"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </Button>
                <div className="mt-4 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Secure authentication via Google OAuth
                  </p>
                </div>
              </TabsContent>

              {/* Email Tab */}
              <TabsContent value="email">
                <div className="space-y-3">
                  <AnimatePresence mode="wait">
                    {isSignup && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="space-y-1.5 pb-1">
                          <Label htmlFor="displayName" className="text-xs">Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="displayName"
                              placeholder="Your full name"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="pl-9 h-10"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="advocate@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 h-10"
                        onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleEmailAuth}
                    disabled={loading}
                    className="w-full h-10 gap-2"
                    size="lg"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {isSignup ? 'Create Account' : 'Sign In'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <button
                    onClick={() => setIsSignup(!isSignup)}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                  >
                    {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </button>
                </div>
              </TabsContent>

              {/* Phone Tab */}
              <TabsContent value="phone">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-9 h-10"
                        disabled={otpSent}
                      />
                    </div>
                  </div>

                  {!otpSent ? (
                    <Button
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="w-full h-10 gap-2"
                      size="lg"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Send OTP
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="otp" className="text-xs">Enter OTP</Label>
                        <Input
                          id="otp"
                          type="text"
                          maxLength={6}
                          placeholder="6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="h-10 text-center tracking-[0.5em] font-mono"
                          onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                        />
                      </div>
                      <Button
                        onClick={handleVerifyOtp}
                        disabled={loading}
                        className="w-full h-10 gap-2"
                        size="lg"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Verify OTP
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <button
                        onClick={() => { setOtpSent(false); setOtp(''); setSessionId(''); }}
                        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                      >
                        Change phone number
                      </button>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center text-xs text-muted-foreground"
        >
          By signing in, you agree to our{' '}
          <a href="/terms-conditions/" className="text-primary hover:underline">Terms</a> and{' '}
          <a href="/privacy-policy/" className="text-primary hover:underline">Privacy Policy</a>
        </motion.p>
      </motion.div>
      {/* Hidden reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container" className="hidden" />
    </div>
  );
}
