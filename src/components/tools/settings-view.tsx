'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProfileStore } from '@/store/profile-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Settings, User, Building, MapPin, Briefcase, Stamp, Save, CheckCircle2, AtSign, Loader2, Check, X } from 'lucide-react';
import { apiCall } from '@/lib/api-client';

const practiceAreas = [
  'Civil Litigation', 'Criminal Law', 'Family Law', 'Corporate Law', 'Tax Law',
  'Constitutional Law', 'Intellectual Property', 'Labour Law', 'Real Estate',
  'Immigration', 'Cyber Law', 'Environmental Law', 'Consumer Protection', 'Other',
];

const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 30) return false;
  return USERNAME_REGEX.test(username);
}

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function SettingsView() {
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [editData, setEditData] = useState({ ...profile });
  const [saved, setSaved] = useState(false);

  // Username state
  const [usernameInput, setUsernameInput] = useState(profile.username || '');
  const [availability, setAvailability] = useState<AvailabilityStatus>('idle');
  const [availabilityReason, setAvailabilityReason] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync editData when profile changes externally
  useEffect(() => {
    setEditData({ ...profile });
  }, [profile.fullName, profile.email, profile.phone, profile.barCouncilNumber, profile.firmName, profile.city, profile.firmAddress, profile.practiceArea, profile.stampLine]);

  // Sync username input when profile.username changes externally
  useEffect(() => {
    setUsernameInput(profile.username || '');
  }, [profile.username]);

  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!isValidUsername(username)) {
      setAvailability('invalid');
      setAvailabilityReason('Username must be 3-30 characters, lowercase letters, numbers, and hyphens only.');
      return;
    }

    setAvailability('checking');
    setAvailabilityReason('');

    try {
      const result = await apiCall('/username-check', { username });
      if (result.available) {
        setAvailability('available');
        setAvailabilityReason(result.isCurrent ? 'This is your current username' : '');
      } else {
        setAvailability('taken');
        setAvailabilityReason(result.reason || 'Username is already taken');
      }
    } catch {
      setAvailability('invalid');
      setAvailabilityReason('Failed to check availability. Please try again.');
    }
  }, []);

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setUsernameInput(sanitized);
    setAvailability('idle');

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (sanitized && sanitized !== profile.username) {
      debounceTimer.current = setTimeout(() => {
        checkUsernameAvailability(sanitized);
      }, 500);
    } else if (!sanitized) {
      setAvailability('invalid');
    }
  };

  const handleSaveUsername = async () => {
    if (!usernameInput || !isValidUsername(usernameInput) || availability !== 'available') return;

    setSavingUsername(true);
    try {
      const result = await apiCall('/username-claim', { username: usernameInput });
      if (result.success) {
        updateProfile({ username: usernameInput });
        setAvailability('available');
        toast.success('Username saved successfully');
      } else {
        toast.error(result.error || 'Failed to save username');
        // Re-check availability
        checkUsernameAvailability(usernameInput);
      }
    } catch {
      toast.error('Failed to save username. Please try again.');
    } finally {
      setSavingUsername(false);
    }
  };

  const isUsernameChanged = usernameInput !== profile.username;
  const canSaveUsername = isUsernameChanged && usernameInput && isValidUsername(usernameInput) && availability === 'available' && !savingUsername;

  const handleSave = () => {
    updateProfile(editData);
    setSaved(true);
    toast.success('Profile saved');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your advocate profile and preferences.</p>
      </div>

      {/* Username Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AtSign className="h-4 w-4" /> Username
          </CardTitle>
          <CardDescription className="text-xs">Your unique public identifier on AI Draft Bond.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current username display */}
          {profile.username && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current username:</span>
              <span className="text-sm font-medium text-primary">@{profile.username}</span>
            </div>
          )}

          {/* Username input */}
          <div className="space-y-1.5">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <AtSign className="h-4 w-4" />
              </div>
              <Input
                value={usernameInput}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="your-username"
                className="pl-9 pr-10 h-9"
                maxLength={30}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {availability === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {availability === 'available' && isUsernameChanged && <Check className="h-4 w-4 text-emerald-500" />}
                {availability === 'taken' && <X className="h-4 w-4 text-red-500" />}
              </div>
            </div>

            {/* Availability indicator */}
            {availability === 'available' && isUsernameChanged && (
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <Check className="h-3 w-3" />
                {availabilityReason || 'Username is available'}
              </p>
            )}
            {availability === 'taken' && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <X className="h-3 w-3" />
                {availabilityReason}
              </p>
            )}
            {availability === 'invalid' && usernameInput && (
              <p className="text-xs text-amber-500">
                3-30 characters, letters, numbers, hyphens only. Must start and end with a letter or number.
              </p>
            )}

            <p className="text-[10px] text-muted-foreground">
              3-30 characters, letters, numbers, hyphens only
            </p>
          </div>

          <Button
            onClick={handleSaveUsername}
            disabled={!canSaveUsername}
            className="gap-2 min-w-[140px]"
            size="sm"
          >
            {savingUsername ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Username
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={editData.fullName} onChange={(e) => setEditData({ ...editData, fullName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bar Council Number</Label>
              <Input value={editData.barCouncilNumber} onChange={(e) => setEditData({ ...editData, barCouncilNumber: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building className="h-4 w-4" /> Firm Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Firm Name</Label>
              <Input value={editData.firmName} onChange={(e) => setEditData({ ...editData, firmName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={editData.city} onChange={(e) => setEditData({ ...editData, city: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Firm Address</Label>
            <Textarea value={editData.firmAddress} onChange={(e) => setEditData({ ...editData, firmAddress: e.target.value })} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Practice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Practice Area</Label>
            <Select value={editData.practiceArea} onValueChange={(v) => setEditData({ ...editData, practiceArea: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select practice area" /></SelectTrigger>
              <SelectContent>
                {practiceAreas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Stamp Line (for documents)</Label>
            <Input placeholder="e.g., Advocate for Petitioner" value={editData.stampLine} onChange={(e) => setEditData({ ...editData, stampLine: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2 min-w-[120px]">
          {saved ? <><CheckCircle2 className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save</>}
        </Button>
      </div>
    </div>
  );
}
