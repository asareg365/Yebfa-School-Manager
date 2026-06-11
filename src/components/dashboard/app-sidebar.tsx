
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Settings,
  CheckCircle,
  Wallet,
  FileText,
  School
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useUser, useAuth } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"

const navigation = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Academic Ledger",
    url: "#",
    icon: BookOpen,
    items: [
      { title: "Student Directory", url: "/dashboard/students" },
      { title: "Staff Roster", url: "/dashboard/staff" },
      { title: "Curriculum Planning", url: "/dashboard/academic" },
    ],
  },
  {
    title: "Daily Operations",
    url: "#",
    icon: CheckCircle,
    items: [
      { title: "Attendance Insights", url: "/dashboard/attendance" },
      { title: "Daily Logs", url: "/dashboard/logs" },
    ],
  },
  {
    title: "Financial Hub",
    url: "#",
    icon: Wallet,
    items: [
      { title: "Fee Management", url: "/dashboard/finance/fees" },
      { title: "Payroll Processor", url: "/dashboard/finance/payroll" },
      { title: "Expense Tracker", url: "/dashboard/finance/expenses" },
      { title: "AI Forecasts", url: "/dashboard/finance/forecast" },
    ],
  },
  {
    title: "AI Narratives",
    url: "/dashboard/reports",
    icon: FileText,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const [isMounted, setIsMounted] = React.useState(false)
  const { user } = useUser()
  const auth = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      router.push("/login")
    }
  }

  if (!isMounted) {
    return (
      <Sidebar collapsible="icon" className="border-r border-border/40">
        <SidebarHeader className="h-16 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <School className="size-5" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent />
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="h-16 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <School className="size-5" />
          </div>
          {state === "expanded" && (
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-headline font-bold text-lg tracking-tight">Yebfa</span>
              <span className="text-xs text-muted-foreground font-medium">School Manager</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2">General</SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.items ? (
                  <Collapsible asChild className="group/collapsible">
                    <div className="flex flex-col">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                <Link href={subItem.url}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ) : (
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-accent/10 transition-colors" onClick={handleLogout}>
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={user?.photoURL || ""} />
                <AvatarFallback className="rounded-lg">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                <span className="truncate font-semibold">{user?.displayName || "User"}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <LogOut className="ml-auto size-4 opacity-50" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
