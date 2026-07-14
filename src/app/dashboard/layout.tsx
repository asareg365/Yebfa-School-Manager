'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from "@/firebase";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Bell, Search, Loader2, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [hasNotifications, setHasNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [institutionName, setInstitutionName] = useState<string>("Institution Hub");

  useEffect(() => {
    const isCleared = localStorage.getItem('notifications_cleared_v1') === 'true';
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
        },
        {
          id: '2',
          title: 'Fee Overdue Alert',
          description: '15 students are past the Term 2 deadline.',
          time: '5 hours ago',
          type: 'warning',
          icon: AlertTriangle,
          color: 'bg-orange-100 text-orange-600'
        },
        {
          id: '3',
          title: 'Sync Complete',
          description: 'Global sync for Ahafo region finished.',
          time: 'Yesterday',
          type: 'success',
          icon: CheckCircle2,
          color: 'bg-green-100 text-green-600'
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

  const handleMarkAllRead = useCallback(() => {
    setHasNotifications(false);
  }, []);

  const handleClearAll = useCallback(() => {
    setNotifications([]);
    setHasNotifications(false);
    localStorage.setItem('notifications_cleared_v1', 'true');
  }, []);

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

  return (
    <SidebarProvider className="print:block">
      <div className="print:hidden">
        <AppSidebar />
      </div>
      <SidebarInset className="bg-background print:m-0 print:shadow-none print:block">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-md z-40 print:hidden">
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
                  <div className="flex gap-2">
                    {notifications.length > 0 && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[10px] h-6 px-2 text-muted-foreground hover:text-primary" 
                          onClick={handleMarkAllRead}
                        >
                          Mark all read
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[10px] h-6 px-2 text-destructive hover:bg-destructive/10" 
                          onClick={handleClearAll}
                        >
                          Clear
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                      <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <Bell className="size-6 text-muted-foreground/30" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="p-4 flex gap-3 hover:bg-muted/50 transition-colors">
                          <div className={`size-8 rounded-full ${notif.color} flex items-center justify-center shrink-0`}>
                            <notif.icon className="size-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold">{notif.title}</p>
                            <p className="text-[10px] text-muted-foreground">{notif.description}</p>
                            <p className="text-[9px] font-medium text-primary">{notif.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="p-2 border-t text-center">
                  <Button variant="ghost" size="sm" className="w-full text-[10px]">View all activity</Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold truncate max-w-[180px] text-primary">{institutionName}</span>
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Live System 2026</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300 print:p-0 print:max-w-none print:m-0 print:block">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}