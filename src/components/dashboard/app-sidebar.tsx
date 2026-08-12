
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  LogOut,
  Settings,
  Wallet,
  FileText,
  School,
  ShieldCheck,
  Users,
  GraduationCap,
  Baby,
  Library,
  Package,
  Building2,
  MessageSquare,
  BarChart3,
  Calendar,
  Layers,
  UserCheck,
  Clock,
  Briefcase,
  FilePlus2,
  Bot,
  TrendingUp,
  Cpu,
  Flag,
  ChevronRight,
  User as UserIcon,
  BadgeCheck,
  IdCard
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useUser, useAuth, useFirestore, useDoc, useCollection } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { doc, query, collection, where } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

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

  // Fetch detailed staff info if role is staff to get the actual designation
  const staffRef = React.useMemo(() => profile?.staffId ? doc(db, "staff", profile.staffId) : null, [db, profile?.staffId]);
  const { data: staffData } = useDoc(staffRef);

  // Fetch detailed student info if role is student to get their ID
  const studentRef = React.useMemo(() => profile?.studentId ? doc(db, "students", profile.studentId) : null, [db, profile?.studentId]);
  const { data: studentData } = useDoc(studentRef);

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      router.push("/login")
      toast({
        title: "Session Terminated",
        description: "You have signed out successfully.",
      });
    }
  }

  // Define granular role permissions
  const isSuperAdmin = userRole === "super_admin"
  const isOwner = userRole === "school_owner"
  const isAdmin = userRole === "administrator"
  const isAccountant = userRole === "accountant"
  const isTeacher = userRole === "teacher"
  const isParent = userRole === "parent"
  const isStudent = userRole === "student"
  const isLibrarian = userRole === "librarian"

  const isStaff = isTeacher || isAdmin || isOwner || isAccountant || isLibrarian

  const navigation = React.useMemo(() => {
    if (isParent || isStudent) {
      return [
        { title: "Dashboard", url: "/dashboard/parent", icon: LayoutDashboard, visible: true },
        { title: "Announcements", url: "/dashboard/communication", icon: MessageSquare, visible: true },
        { title: "AI Academic Support", url: "/dashboard/academic/ai-assistant", icon: Bot, visible: true },
      ].filter(i => i.visible)
    }

    return [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboard, visible: !isTeacher },
      { title: "My Profile", url: "/dashboard/staff/profile", icon: UserIcon, visible: isStaff },
      {
        title: "AI Strategic Hub",
        url: "#",
        icon: Cpu,
        visible: isSuperAdmin || isOwner || isAdmin,
        items: [
          { title: "AI Administrator", url: "/dashboard/ai-admin", icon: Bot, visible: true },
          { title: "Strategic Insights", url: "/dashboard/academic/insights", icon: TrendingUp, visible: true },
          { title: "Behaviour Analysis", url: "/dashboard/academic/behaviour", icon: Flag, visible: true },
          { title: "AI Teacher Asst.", url: "/dashboard/academic/ai-assistant", icon: Bot, visible: true },
        ].filter(i => i.visible),
      },
      {
        title: "Admissions",
        url: "/dashboard/admissions",
        icon: FilePlus2,
        visible: isSuperAdmin || isOwner || isAdmin,
      },
      {
        title: "Academic Foundation",
        url: "#",
        icon: School,
        visible: isSuperAdmin || isOwner || isAdmin || isTeacher,
        items: [
          { title: "Academic Cycle", url: "/dashboard/academic?tab=cycle", visible: isSuperAdmin || isOwner || isAdmin },
          { title: "Classes & Sections", url: "/dashboard/academic?tab=classes", visible: isSuperAdmin || isOwner || isAdmin },
          { title: "Subjects Registry", url: "/dashboard/academic?tab=curriculum", visible: true },
          { title: "Weekly Timetable", url: "/dashboard/timetable", visible: true },
        ].filter(i => i.visible),
      },
      {
        title: "HR & Faculty",
        url: "#",
        icon: Briefcase,
        visible: (isSuperAdmin || isOwner || isAdmin || isAccountant) && !isTeacher,
        items: [
          { title: "Staff Directory", url: "/dashboard/staff", visible: true },
          { title: "Payroll Processor", url: "/dashboard/finance/payroll", visible: true },
        ].filter(i => i.visible),
      },
      {
        title: "Student Registry",
        url: "#",
        icon: GraduationCap,
        visible: isSuperAdmin || isOwner || isAdmin || isAccountant || isTeacher,
        items: [
          { title: "Active Enrollment", url: "/dashboard/students", visible: isSuperAdmin || isOwner || isAdmin || isTeacher },
          { title: "Personal Ledgers", url: "/dashboard/students/accounts", visible: isSuperAdmin || isOwner || isAdmin || isAccountant },
          { title: "Daily Attendance", url: "/dashboard/attendance", visible: isSuperAdmin || isOwner || isAdmin || isTeacher },
        ].filter(i => i.visible),
      },
      {
        title: "Guardian Database",
        url: "/dashboard/parents",
        icon: Users,
        visible: isSuperAdmin || isOwner || isAdmin,
      },
      {
        title: "Academic Analysis",
        url: "#",
        icon: FileText,
        visible: isSuperAdmin || isOwner || isAdmin || isTeacher,
        items: [
          { title: "Exams Hub", url: "/dashboard/exams", visible: true },
          { title: "Student Reports", url: "/dashboard/reports", visible: true },
          { title: "Strategic Analytics", url: "/dashboard/analytics", visible: true },
        ].filter(i => i.visible),
      },
      {
        title: "Finance & Treasury",
        url: "#",
        icon: Wallet,
        visible: isSuperAdmin || isOwner || isAccountant,
        items: [
          { title: "Fee Configuration", url: "/dashboard/finance/fees", visible: true },
          { title: "Invoicing & Billing", url: "/dashboard/finance/invoices", visible: true },
          { title: "Payment Hub", url: "/dashboard/finance/payments", visible: true },
          { title: "Expense Tracking", url: "/dashboard/finance/expenses", visible: true },
          { title: "Profit & Loss", url: "/dashboard/finance/p-and-l", visible: true },
          { title: "AI Solvency Forecast", url: "/dashboard/finance/forecast", visible: true },
        ].filter(i => i.visible),
      },
      {
        title: "Logistics Hub",
        url: "#",
        icon: Package,
        visible: isSuperAdmin || isOwner || isAdmin || isLibrarian,
        items: [
          { title: "Asset Inventory", url: "/dashboard/inventory", visible: isSuperAdmin || isOwner || isAdmin },
          { title: "Library Catalog", url: "/dashboard/library/books", visible: true },
          { title: "Transport Fleet", url: "/dashboard/transport", visible: isSuperAdmin || isOwner || isAdmin },
          { title: "Hostel Registry", url: "/dashboard/hostels", visible: isSuperAdmin || isOwner || isAdmin },
        ].filter(i => i.visible),
      },
      { title: "Communication", url: "/dashboard/communication", icon: MessageSquare, visible: true },
      { title: "Settings", url: "/dashboard/settings", icon: Settings, visible: isSuperAdmin || isOwner || isAdmin },
    ].filter(item => item.visible)
  }, [userRole, isSuperAdmin, isOwner, isAdmin, isAccountant, isTeacher, isParent, isStudent, isLibrarian, isStaff])

  if (!mounted) return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
       <SidebarHeader className="h-16 border-b flex items-center px-6" />
       <SidebarContent />
       <SidebarFooter className="border-t p-4 h-20" />
  </Sidebar>
  )

  const displayName = profile?.name || user?.displayName || user?.email || "Registry User";
  const displayID = staffData?.staffNumber || studentData?.admissionNumber || "";
  const displayDesignation = staffData?.designation || (isSuperAdmin ? "Super Admin" : userRole.replace('_', ' '));

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="h-16 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <School className="size-5" />
          </div>
          {state === "expanded" && (
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-headline font-bold text-lg tracking-tight text-white">Yebfa <span className="text-accent">|</span> Manager</span>
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">System 2026</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Hub Operations</SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.items ? (
                  <Collapsible asChild className="group/collapsible" defaultOpen={pathname.startsWith(item.url !== "#" ? item.url : "/dashboard")}>
                    <div className="flex flex-col">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title} className="text-white/80 hover:text-white">
                          {item.icon && <item.icon />}
                          <span className="font-medium">{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.url} className="text-white/60 hover:text-white data-[active=true]:text-accent">
                                <Link href={subItem.url}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ) : (
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title} className="text-white/80 hover:text-white data-[active=true]:text-accent">
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Ecosystem Management</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/admin"} tooltip="SaaS Command Center" className="text-accent hover:text-accent font-bold">
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
      <SidebarFooter className="border-t border-white/10 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-white/5 transition-colors h-auto py-3 relative group/logout" onClick={handleLogout}>
              <Avatar className="size-9 rounded-lg border border-white/20">
                <AvatarFallback className="rounded-lg bg-accent text-accent-foreground font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight ml-3">
                <div className="flex flex-col gap-0.5">
                   <span className="truncate font-bold text-white">{displayName}</span>
                   {displayID && <span className="text-[9px] font-mono font-bold text-accent uppercase tracking-tighter">{displayID}</span>}
                   <Badge variant="secondary" className="text-[8px] h-4 px-2 w-fit uppercase bg-white/10 text-white border-none font-black tracking-widest mt-1">
                      {displayDesignation}
                   </Badge>
                </div>
              </div>
              <div className="ml-auto flex flex-col items-center gap-1">
                <LogOut className="size-5 text-accent transition-transform group-hover/logout:scale-110" />
                {state === 'expanded' && <span className="text-[8px] font-bold uppercase text-accent">Logout</span>}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
