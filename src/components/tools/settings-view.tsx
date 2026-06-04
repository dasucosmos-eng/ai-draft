'use client';

import { useState } from 'react';
import { useProfileStore } from '@/store/profile-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Settings, User, Building, MapPin, Briefcase, Stamp, Save, CheckCircle2 } from 'lucide-react';

const practiceAreas = [
  'Civil Litigation', 'Criminal Law', 'Family Law', 'Corporate Law', 'Tax Law',
  'Constitutional Law', 'Intellectual Property', 'Labour Law', 'Real Estate',
  'Immigration', 'Cyber Law', 'Environmental Law', 'Consumer Protection', 'Other',
];

export function SettingsView() {
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [editData, setEditData] = useState({ ...profile });
  const [saved, setSaved] = useState(false);

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
