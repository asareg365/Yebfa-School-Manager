
'use client';

import { useEffect, useState } from 'react';
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
  const [hasNotifications, setHasNotifications] = useState(true);
  const [institutionName, setInstitutionName] = useState<string>("Institution Hub");

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Handle dynamic name updates from local storage
  useEffect(() => {
    const updateName = () => {
      const storedName = localStorage.getItem('selected_institution_name');
      if (storedName) {
        setInstitutionName(storedName);
      }
    };
    
    updateName();
    // Poll for changes to local storage to keep header in sync with auto-selection
    const interval = setInterval(updateName, 2000);
    return () => clearInterval(interval);
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students, staff, records..."
                className="w-80 pl-9 h-10 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {hasNotifications && (
                    <span className="absolute top-2 right-2.5 size-2 bg-accent rounded-full border-2 border-background" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b flex items-center justify-between">
                  <h4 className="font-bold text-sm">Notifications</h4>
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => setHasNotifications(false)}>Mark all read</Button>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="divide-y">
                    <div className="p-4 flex gap-3 hover:bg-muted/50 transition-colors">
                      <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Info className="size-4 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold">New Policy Updated</p>
                        <p className="text-[10px] text-muted-foreground">The 2026 Academic guidelines have been updated.</p>
                        <p className="text-[9px] font-medium text-primary">2 hours ago</p>
                      </div>
                    </div>
                    <div className="p-4 flex gap-3 hover:bg-muted/50 transition-colors">
                      <div className="size-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="size-4 text-orange-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold">Fee Overdue Alert</p>
                        <p className="text-[10px] text-muted-foreground">15 students are past the Term 2 deadline.</p>
                        <p className="text-[9px] font-medium text-primary">5 hours ago</p>
                      </div>
                    </div>
                    <div className="p-4 flex gap-3 hover:bg-muted/50 transition-colors">
                      <div className="size-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="size-4 text-green-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold">Sync Complete</p>
                        <p className="text-[10px] text-muted-foreground">Global node sync for Ahafo region finished.</p>
                        <p className="text-[9px] font-medium text-primary">Yesterday</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <div className="p-2 border-t text-center">
                  <Button variant="ghost" size="sm" className="w-full text-[10px]">View all activity</Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold truncate max-w-[150px]">{institutionName}</span>
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Live Node 2026</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full transition-all duration-300">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
