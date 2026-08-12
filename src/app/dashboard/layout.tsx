'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useAuth } from "@/firebase";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Bell, Search, Loader2, Info, AlertTriangle, Clock, Trash2, X, CheckCircle2, AlertCircle, Activity, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import Link from 'next/link';
import { doc, collection, query, where, orderBy, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';

const IDLE_TIMEOUT = 180000; // 3 minutes (Strategic Security window)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user]);
  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  // Durable Tenant Resolution logic for multi-role dashboard
  const institutionId = useMemo(() => {
    if (profileLoading || !profile) return null;
    if (profile.role === 'super_admin') {
      return typeof window !== 'undefined' ? localStorage.getItem('selected_institution_id') : null;
    }
    return profile.tenantId || null;
  }, [profile, profileLoading]);

  const institutionName = useMemo(() => {
    if (profile?.role === 'super_admin') {
      return typeof window !== 'undefined' ? localStorage.getItem('selected_institution_name') || "Super Admin Node" : "Super Admin Node";
    }
    return profile?.institutionName || "Registry Hub";
  }, [profile]);

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId]);
  const { data: institution, loading: instLoading } = useDoc(instRef);

  const notificationsQuery = useMemo(() => {
    if (!db || !institutionId || profileLoading || !profile) return null;
    return query(
      collection(db, "notifications"),
      where("tenantId", "==", institutionId),
      orderBy("createdAt", "desc")
    );
  }, [db, institutionId, profileLoading, profile]);

  const { data: notifications = [] } = useCollection(notificationsQuery);

  const handleLogout = useCallback(async () => {
    if (auth) {
      // Strategic Context Perme: Remove stale institution IDs to prevent phantom redirections
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selected_institution_id');
        localStorage.removeItem('selected_institution_name');
      }
      await signOut(auth);
      router.push('/login');
      toast({
        title: "Session Terminated",
        description: "You have been signed out due to inactivity.",
      });
    }
  }, [auth, router]);

  const resetTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(handleLogout, IDLE_TIMEOUT);
  }, [handleLogout]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetTimer]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const trialDaysLeft = useMemo(() => {
    if (!institution?.createdAt) return null;
    const start = new Date(institution.createdAt.toMillis());
    const diff = differenceInDays(new Date(), start);
    return Math.max(0, 30 - diff);
  }, [institution]);

  // Subscription information is only visible to users who manage
  // the school's subscription/account.
  // Teachers, parents, students and other staff should not see it.
  const canManageSubscription =
    profile?.role === 'super_admin' ||
    profile?.role === 'school_owner' ||
    profile?.role === 'administrator' ||
    profile?.role === 'head_teacher';

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleClearAll = async () => {
    if (!institutionId || !notificationsQuery) return;
    try {
      const batch = writeBatch(db);
      const snap = await getDocs(notificationsQuery);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      toast({ title: "Notifications Cleared" });
    } catch (error) {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="size-4 text-orange-600" />;
      case 'success': return <CheckCircle2 className="size-4 text-green-600" />;
      case 'error': return <AlertCircle className="size-4 text-destructive" />;
      default: return <Info className="size-4 text-blue-600" />;
    }
  };

  if (authLoading || profileLoading || (institutionId && instLoading)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="font-headline font-bold text-lg animate-pulse uppercase tracking-widest text-xs text-primary">Synchronizing Institutional Hub...</p>
      </div>
    );
  }

  if (!user || !profile) return null;

  // CRITICAL: Prevent dashboard access if institution doc is missing (deleted)
  if (profile.role !== 'super_admin' && !institution && !instLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/30 p-12 text-center space-y-6">
        <div className="size-20 bg-muted rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="size-10 text-destructive/40" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-2xl font-bold font-headline text-primary">System Hub Offline</h2>
          <p className="text-muted-foreground leading-relaxed">Your institution's registry node has been deactivated or archived. Access to academic and financial data is restricted.</p>
        </div>
        <Button onClick={handleLogout} className="h-12 px-8 rounded-xl font-bold shadow-lg">Return to Gateway</Button>
      </div>
    );
  }

  // Safe property access to prevent 500 error during SSR
  const isTrial = institution?.subscriptionPlan?.toLowerCase()?.includes('trial') ?? false;
  
  const userDisplayName =
    profile?.name ||
    user?.displayName ||
    user?.email ||
    "Registry User";

  return (
    <SidebarProvider className="print-provider h-screen overflow-hidden">
      <div className="no-print h-full overflow-y-auto border-r bg-sidebar shrink-0">
        <AppSidebar />
      </div>
      <SidebarInset className="bg-background print-inset flex flex-col h-screen w-full overflow-hidden">
      {canManageSubscription && isTrial && trialDaysLeft !== null && (
          <div className={`no-print py-2 px-4 md:px-6 flex items-center justify-between transition-colors shrink-0 ${trialDaysLeft <= 7 ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest truncate">
              {trialDaysLeft <= 7 ? <AlertTriangle className="size-3 md:size-4" /> : <Clock className="size-3 md:size-4" />}
              <span className="hidden xs:inline">Institutional Trial:</span> {trialDaysLeft} days left
            </div>
            <Button size="sm" variant="ghost" className="h-6 md:h-7 text-[9px] md:text-[10px] font-bold uppercase bg-white/20 hover:bg-white/30 text-white border-none px-2" asChild>
              <Link href="/dashboard/settings?tab=subscription">Upgrade</Link>
            </Button>
          </div>
        )}
        <header className="no-print flex h-16 shrink-0 items-center justify-between px-4 md:px-6 border-b border-border/40 bg-background/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-2 md:gap-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4 hidden xs:block" />
            <div className="flex flex-col">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">Authenticated As</span>
               <span className="text-xs md:text-sm font-bold text-primary truncate max-w-[120px] md:max-w-[250px]">{userDisplayName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative transition-transform active:scale-95 shrink-0">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-2 right-2.5 size-2 bg-accent rounded-full border-2 border-background" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 p-0 shadow-2xl border-none rounded-xl" align="end">
                <div className="p-4 border-b flex items-center justify-between">
                  <h4 className="font-bold text-sm">Notifications Hub</h4>
                  {notifications.length > 0 && (
                    <Button variant="ghost" className="h-7 text-[10px] font-bold uppercase text-muted-foreground hover:text-destructive" onClick={handleClearAll}>
                      Clear All
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[400px]">
                  {notifications.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                      <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <Bell className="size-6 text-muted-foreground/30" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">No active alerts</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notif: any) => (
                        <div key={notif.id} className="p-4 flex gap-3 hover:bg-muted/50 transition-colors group relative">
                          <div className={`size-8 rounded-full ${notif.type === 'alert' ? 'bg-orange-100' : notif.type === 'success' ? 'bg-green-100' : notif.type === 'error' ? 'bg-red-100' : 'bg-blue-100'} flex items-center justify-center shrink-0`}>
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="space-y-1 pr-8 flex-1">
                            <p className="text-xs font-bold">{notif.title}</p>
                            <p className="text-[10px] text-muted-foreground leading-snug">{notif.description}</p>
                            <p className="text-[9px] font-medium text-primary">
                              {notif.createdAt ? formatDistanceToNow(notif.createdAt.toMillis(), { addSuffix: true }) : 'Just now'}
                            </p>
                          </div>
                          <button onClick={(e) => handleDeleteNotification(notif.id, e)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded-md text-destructive">
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              className="hidden sm:flex h-9 rounded-xl gap-2 font-bold text-xs uppercase border-primary text-primary hover:bg-primary/5 transition-all"
            >
              <LogOut className="size-3.5" /> Sign Out
            </Button>

            <div className="flex flex-col text-right border-l pl-4 border-border/40">
              <span className="text-xs md:text-sm font-black truncate max-w-[120px] md:max-w-[180px] text-primary uppercase tracking-tighter">{institutionName}</span>
              <div className="flex items-center justify-end gap-1">
              {canManageSubscription && (
                <Badge
                  variant="outline"
                  className="text-[7px] md:text-[8px] h-3.5 md:h-4 px-1 md:px-1.5 font-bold uppercase tracking-tighter bg-primary/5"
                >
                  {institution?.subscriptionPlan || 'Trial'}
                </Badge>
              )}
                 <span className="hidden xs:inline text-[9px] text-muted-foreground uppercase font-black tracking-tighter">NODE 2026</span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-10 relative scroll-smooth overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-0 pb-24">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
