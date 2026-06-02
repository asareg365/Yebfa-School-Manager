import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2.5 size-2 bg-accent rounded-full border-2 border-background" />
            </Button>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold">Greenwood Academy</span>
              <span className="text-xs text-muted-foreground">Term 2, 2024</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full transition-all duration-300">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}