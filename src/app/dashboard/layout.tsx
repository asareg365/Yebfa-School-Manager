'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Bell, Search, Loader2, Info, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";
import Link from 'next/link';
import { doc } from 'firebase/firestore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [hasNotifications, setHasNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [institutionName, setInstitutionName] = useState<string>("Institution Hub");
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id');
    setInstitutionId(storedId);
  }, []);

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId]);
  const { data: institution } = useDoc(instRef);

  useEffect(() => {
    const isCleared = localStorage.getItem('notifications_cleared_v2') === 'true';
    if (!isCleared) {
      const initial = [
        {
          id: '1',
          title: 'New Policy Updated',
          description: 'The 2026 Academic guidelines have been updated.',
          time: '2 hours ago',
          type: 'info',
          icon: Info,
          color: 'bg-blue-100 text-blue-600'
        }
      ];
      setNotifications(initial);
      setHasNotifications(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const updateName = () => {
      const storedName = localStorage.getItem('selected_institution_name');
      if (storedName && storedName !== institutionName) {
        setInstitutionName(storedName);
      }
    };
    
    updateName();
    const interval = setInterval(updateName, 2000);
    return () => clearInterval(interval);
  }, [institutionName]);

  const trialDaysLeft = useMemo(() => {
    if (!institution?.createdAt) return null;
    const start = new Date(institution.createdAt.toMillis());
    const diff = differenceInDays(new Date(), start);
    return Math.max(0, 30 - diff);
  }, [institution]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-headline font-bold text-lg animate-pulse">Establishing Secure Session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isTrial = institution?.subscriptionPlan?.toLowerCase().includes('trial');

  return (
    <SidebarProvider className="print-provider h-screen overflow-hidden">
      <div className="no-print h-full overflow-y-auto border-r bg-sidebar shrink-0">
        <AppSidebar />
      </div>
      <SidebarInset className="bg-background print-inset flex flex-col min-h-0 w-full overflow-hidden">
        {isTrial && trialDaysLeft !== null && (
          <div className={`no-print py-2 px-6 flex items-center justify-between transition-colors shrink-0 ${trialDaysLeft <= 7 ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              {trialDaysLeft <= 7 ? <AlertTriangle className="size-4" /> : <Clock className="size-4" />}
              Institutional Trial: {trialDaysLeft} days remaining
            </div>
            <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold uppercase bg-white/20 hover:bg-white/30 text-white border-none" asChild>
              <Link href="/dashboard/settings?tab=subscription">Upgrade Now</Link>
            </Button>
          </div>
        )}
        <header className="no-print flex h-16 shrink-0 items-center justify-between px-6 border-b border-border/40 bg-background/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students, staff, records..."
                className="w-80 pl-9 h-10 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative transition-transform active:scale-95">
                  <Bell className="h-5 w-5" />
                  {hasNotifications && notifications.length > 0 && (
                    <span className="absolute top-2 right-2.5 size-2 bg-accent rounded-full border-2 border-background" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 shadow-2xl border-none rounded-xl" align="end">
                <div className="p-4 border-b flex items-center justify-between">
                  <h4 className="font-bold text-sm">Notifications</h4>
                </div>
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                      <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <Bell className="size-6 text-muted-foreground/30" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">No active alerts</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="p-4 flex gap-3 hover:bg-muted/50 transition-colors group relative">
                          <div className={`size-8 rounded-full ${notif.color} flex items-center justify-center shrink-0`}>
                            <notif.icon className="size-4" />
                          </div>
                          <div className="space-y-1 pr-4">
                            <p className="text-xs font-bold">{notif.title}</p>
                            <p className="text-[10px] text-muted-foreground leading-snug">{notif.description}</p>
                            <p className="text-[9px] font-medium text-primary">{notif.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold truncate max-w-[180px] text-primary">{institutionName}</span>
              <div className="flex items-center justify-end gap-1">
                 <Badge variant="outline" className="text-[8px] h-4 px-1.5 font-bold uppercase tracking-tighter bg-primary/5">{institution?.subscriptionPlan || 'Trial'}</Badge>
                 <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Live 2026</span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative scroll-smooth">
          <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-0 pb-20">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
