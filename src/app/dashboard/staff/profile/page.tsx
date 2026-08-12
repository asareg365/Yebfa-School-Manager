'use client';

/**
 * @fileOverview Staff Personnel Portal.
 * Allows faculty to view and manage their personal institutional data.
 */

import { useMemo, useState, useRef } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Briefcase, 
  Wallet, 
  Calendar, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Loader2, 
  Clock,
  IdCard,
  Building2,
  AlertCircle,
  Camera,
  Upload,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";

export default function StaffProfilePage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const [uploading, setUploading] = useState(false);
  const [showSalary, setShowSalary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user]);
  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  const isStaff = profile?.role && ['teacher', 'administrator', 'school_owner', 'accountant', 'librarian'].includes(profile.role);

  const staffRef = useMemo(() => 
    profile?.staffId ? doc(db, "staff", profile.staffId) : null
  , [db, profile?.staffId]);

  const { data: staff, loading: staffLoading } = useDoc(staffRef);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !staffRef) return;

    if (file.size > 800000) {
      toast({ variant: "destructive", title: "File Too Large", description: "Profile photo must be under 800KB." });
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        await updateDoc(staffRef, {
          photoURL: base64,
          updatedAt: serverTimestamp()
        });
        toast({ title: "Photo Updated", description: "Your digital portrait has been synchronized." });
      } catch (err) {
        toast({ variant: "destructive", title: "Upload Failed" });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (authLoading || profileLoading || (profile?.staffId && staffLoading)) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-headline font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Syncing Personal Registry...</p>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="p-12 text-center space-y-6">
        <AlertCircle className="size-20 text-destructive/20 mx-auto" />
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-2xl font-bold font-headline text-primary">Personnel View Restricted</h2>
          <p className="text-sm text-muted-foreground">This portal hub is strictly for institutional faculty. Students and guardians should use their respective dashboards.</p>
        </div>
      </div>
    );
  }

  if (!profile?.staffId || !staff) {
    return (
      <div className="p-12 text-center space-y-6">
        <div className="size-20 bg-muted rounded-full flex items-center justify-center mx-auto">
          <User className="size-10 text-muted-foreground/30" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-2xl font-bold font-headline text-primary">Registry Link Not Found</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your portal account is not yet linked to an institutional staff record. Please contact your administrator to verify your identity in the Staff Registry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">My Faculty Profile</h1>
        <p className="text-muted-foreground font-medium">Personal institutional records and compensation details verified for 2026.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <div className="h-32 bg-primary relative">
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 p-2 bg-white rounded-full shadow-2xl">
                <div 
                  className="size-32 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white overflow-hidden cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                   {staff.photoURL ? (
                     <img src={staff.photoURL} className="w-full h-full object-cover" alt="Avatar" />
                   ) : (
                     <User className="size-16 text-primary/10" />
                   )}
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      {uploading ? <Loader2 className="size-6 text-white animate-spin" /> : <Camera className="size-6 text-white" />}
                   </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
              </div>
            </div>
            <CardContent className="pt-20 pb-8 text-center space-y-4">
              <div>
                <Badge variant="outline" className="mb-2 text-[10px] font-bold uppercase text-green-600 bg-green-50 border-green-200">
                  {staff.status || 'Active'}
                </Badge>
                <h2 className="text-2xl font-headline font-bold text-primary">{staff.firstName} {staff.lastName}</h2>
                <p className="font-mono text-xs font-bold text-accent uppercase tracking-widest">{staff.staffNumber}</p>
              </div>
              <div className="pt-4 border-t flex flex-col gap-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="size-4 text-muted-foreground" />
                  <span className="font-semibold text-slate-700">{staff.designation}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="font-medium text-slate-600 truncate">{profile?.institutionName || "Academic Hub"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-accent text-accent-foreground rounded-3xl overflow-hidden">
             <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                   <CardDescription className="text-accent-foreground/60 text-[10px] font-bold uppercase tracking-widest">Monthly Compensation</CardDescription>
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-white/10 text-white/50 hover:text-white"
                    onClick={() => setShowSalary(!showSalary)}
                   >
                     {showSalary ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                   </Button>
                </div>
                <CardTitle className="text-3xl font-headline font-bold">
                  {showSalary ? `GH₵ ${staff.salary?.toLocaleString() || "0.00"}` : "••••••••"}
                </CardTitle>
             </CardHeader>
             <CardContent>
                <p className="text-[10px] uppercase font-bold opacity-70">Base Net Salary • Cycle 2026</p>
             </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b p-8">
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" /> Institutional Registry Data
              </CardTitle>
              <CardDescription>Verified faculty credentials stored in the secure multi-tenant ecosystem.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Primary Contact</p>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Phone className="size-4 text-primary/40" />
                    <span className="text-sm font-bold text-primary">{staff.phone}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">System Identity Email</p>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                    <Mail className="size-4 text-primary/40" />
                    <span className="text-sm font-bold text-primary truncate">{staff.email || profile?.email}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Appointment Date</p>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Calendar className="size-4 text-primary/40" />
                    <span className="text-sm font-bold text-primary">
                      {staff.employmentDate || "---"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Security Clearance</p>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <ShieldCheck className="size-4 text-green-600/40" />
                    <span className="text-sm font-bold text-green-700 uppercase">Verified Personnel</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex gap-4">
                <IdCard className="size-8 text-primary/20 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-primary uppercase">Security Protocol</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Your data is isolated within the institutional vault. Compensation details and private identifiers are only visible to you and authorized school administrators.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center pt-8">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
               <ShieldCheck className="size-3 text-green-600" /> Authorized Personnel Audit • 2026 Registry Hub
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
