
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
  School,
  ShieldCheck,
  Users,
  GraduationCap,
  Baby,
  Library,
  Box,
  Monitor,
  Package
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
import { useUser, useAuth, useFirestore, useDoc } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { doc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const [mounted, setMounted] = React.useState(false)
  const { user } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()

  const userProfileRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)
  const userRole = profile?.role || "guest"

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      router.push("/login")
    }
  }

  const isSuperAdmin = userRole === "super_admin"
  const isOwner = userRole === "school_owner"
  const isAdmin = userRole === "administrator"
  const isAccountant = userRole === "accountant"
  const isTeacher = userRole === "teacher"
  const isParent = userRole === "parent"
  const isLibrarian = userRole === "librarian"

  const navigation = React.useMemo(() => {
    if (isParent) {
      return [
        { title: "My Children", url: "/dashboard/parent", icon: Baby }
      ]
    }

    return [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboard, visible: true },
      {
        title: "Academic Hub",
        url: "#",
        icon: BookOpen,
        visible: isOwner || isAdmin || isTeacher,
        items: [
          { title: "Structure", url: "/dashboard/academic", visible: isOwner || isAdmin },
          { title: "Lesson Plans", url: "/dashboard/academic?tab=plans", visible: true },
          { title: "Tasks & HW", url: "/dashboard/academic?tab=tasks", visible: true },
        ].filter(i => i.visible),
      },
      {
        title: "Students",
        url: "#",
        icon: GraduationCap,
        visible: isOwner || isAdmin || isTeacher || isAccountant,
        items: [
          { title: "Directory", url: "/dashboard/students", visible: true },
          { title: "Exams & Grading", url: "/dashboard/exams", visible: isOwner || isAdmin || isTeacher },
          { title: "Ledgers", url: "/dashboard/students/accounts", visible: isOwner || isAccountant },
        ].filter(i => i.visible),
      },
      {
        title: "Library Hub",
        url: "#",
        icon: Library,
        visible: isOwner || isAdmin || isLibrarian,
        items: [
          { title: "Catalog", url: "/dashboard/library/books", visible: true },
          { title: "Transactions", url: "/dashboard/library/transactions", visible: true },
        ].filter(i => i.visible),
      },
      {
        title: "Inventory Hub",
        url: "/dashboard/inventory",
        icon: Package,
        visible: isOwner || isAdmin,
      },
      {
        title: "Financial Hub",
        url: "#",
        icon: Wallet,
        visible: isOwner || isAccountant,
        items: [
          { title: "Fee Items", url: "/dashboard/finance/fees", visible: true },
          { title: "Invoicing", url: "/dashboard/finance/invoices", visible: true },
          { title: "Payments", url: "/dashboard/finance/payments", visible: true },
          { title: "Expenses", url: "/dashboard/finance/expenses", visible: true },
          { title: "Payroll", url: "/dashboard/finance/payroll", visible: true },
          { title: "Profit & Loss", url: "/dashboard/finance/p-and-l", visible: true },
          { title: "AI Forecast", url: "/dashboard/finance/forecast", visible: true },
        ].filter(i => i.visible),
      },
      {
        title: "Faculty",
        url: "/dashboard/staff",
        icon: Users,
        visible: isOwner || isAdmin,
      },
      {
        title: "Operations",
        url: "/dashboard/attendance",
        icon: CheckCircle,
        visible: isOwner || isAdmin || isTeacher,
      },
      {
        title: "Configuration",
        url: "/dashboard/settings",
        icon: Settings,
        visible: isOwner || isAdmin,
      },
    ].filter(item => item.visible)
  }, [userRole, isOwner, isAdmin, isAccountant, isTeacher, isParent, isLibrarian])

  if (!mounted) return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
       <SidebarHeader className="h-16 border-b flex items-center px-6" />
       <SidebarContent />
       <SidebarFooter className="border-t p-4 h-20" />
    </Sidebar>
  )

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="h-16 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <School className="size-5" />
          </div>
          {state === "expanded" && (
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-headline font-bold text-lg tracking-tight">Yebfa Manager</span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">System 2026</span>
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
                  <Collapsible asChild className="group/collapsible" defaultOpen={pathname.startsWith(item.url !== "#" ? item.url : "/dashboard")}>
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

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 py-2">System Management</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/admin"} tooltip="Global Hub" className="text-accent hover:text-accent font-bold">
                  <Link href="/admin">
                    <ShieldCheck className="text-accent" />
                    <span>Super Admin Hub</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-accent/10 transition-colors" onClick={handleLogout}>
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                <div className="flex flex-col">
                   <span className="truncate font-semibold">{user?.displayName || "Administrator"}</span>
                   <Badge variant="secondary" className="text-[8px] h-3 px-1 w-fit uppercase bg-primary/10 text-primary border-none">{userRole.replace('_', ' ')}</Badge>
                </div>
              </div>
              <LogOut className="ml-auto size-4 opacity-50" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
