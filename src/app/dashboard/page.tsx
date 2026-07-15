'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  GraduationCap, 
  Wallet, 
  Activity, 
  PlayCircle, 
  Loader2,
  Library,
  Bus,
  Home,
  Package,
  TrendingUp,
  FileText,
  CheckCircle2,
  ShieldCheck
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { collection, query, where } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"
import { generateDemoVideo } from "@/ai/flows/generate-demo-video"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function Dashboard() {
  const { user, loading: authLoading } = useUser()
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  // Core Data Queries
  const studentsQuery = useMemo(() => institutionId ? query(collection(db, "students"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const staffQuery = useMemo(() => institutionId ? query(collection(db, "staff"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const booksQuery = useMemo(() => institutionId ? query(collection(db, "library_books"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const hostelQuery = useMemo(() => institutionId ? query(collection(db, "hostels"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  // Lifecycle Data Queries
  const attQuery = useMemo(() => institutionId ? query(collection(db, "attendance"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const examQuery = useMemo(() => institutionId ? query(collection(db, "exam_records"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const invQuery = useMemo(() => institutionId ? query(collection(db, "invoices"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: students = [] } = useCollection(studentsQuery)
  const { data: staff = [] } = useCollection(staffQuery)
  const { data: books = [] } = useCollection(booksQuery)
  const { data: hostels = [] } = useCollection(hostelQuery)
  
  const { data: attendanceDocs = [] } = useCollection(attQuery)
  const { data: examDocs = [] } = useCollection(examQuery)
  const { data: invoiceDocs = [] } = useCollection(invQuery)

  // Real-time Lifecycle Calculations
  const attendanceProgress = useMemo(() => {
    if (students.length === 0 || attendanceDocs.length === 0) return 0;
    const uniqueStudentsToday = new Set(attendanceDocs.map((a: any) => a.studentId)).size;
    return Math.min(100, Math.round((uniqueStudentsToday / students.length) * 100));
  }, [students, attendanceDocs]);

  const assessmentProgress = useMemo(() => {
    if (students.length === 0 || examDocs.length === 0) return 0;
    const uniqueStudentsAssessed = new Set(examDocs.map((e: any) => e.studentId)).size;
    return Math.min(100, Math.round((uniqueStudentsAssessed / students.length) * 100));
  }, [students, examDocs]);

  const feeCycleProgress = useMemo(() => {
    if (invoiceDocs.length === 0) return 0;
    const totalBilled = invoiceDocs.reduce((a, c: any) => a + (c.totalAmount || 0), 0);
    const totalPaid = invoiceDocs.reduce((a, c: any) => a + (c.amountPaid || 0), 0);
    if (totalBilled === 0) return 0;
    return Math.min(100, Math.round((totalPaid / totalBilled) * 100));
  }, [invoiceDocs]);

  const totalBilledValue = useMemo(() => {
    return invoiceDocs.reduce((a, c: any) => a + (c.totalAmount || 0), 0);
  }, [invoiceDocs]);

  const handleGenerateVideo = async () => {
    setVideoLoading(true)
    try {
      const result = await generateDemoVideo()
      const win = window.open()
      if (win) {
        win.document.write(`<video controls autoplay src="${result.videoUrl}" style="width:100%; height:100%;"></video>`)
      }
      toast({ title: "Walkthrough Generated", description: "The AI cinematic walkthrough is ready." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Video Failed", description: error.message })
    } finally {
      setVideoLoading(false)
    }
  }

  if (authLoading) return (
    <div className="p-10 text-center space-y-4">
      <Activity className="size-10 text-primary animate-spin mx-auto" />
      <p className="font-headline font-bold text-muted-foreground animate-pulse">Synchronizing Dashboard...</p>
    </div>
  )

  if (!institutionId) {
    return (
      <div className="p-12 text-center space-y-6">
        <div className="size-20 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Activity className="size-10 text-muted-foreground/30" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-headline">System Hub Offline</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">Please visit the Admin Hub to select or provision an active school instance.</p>
        </div>
        <Button asChild className="h-11 px-8"><Link href="/admin">Visit Admin Hub</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-primary">System Pulse</h1>
          <p className="text-muted-foreground font-medium">Monitoring the 2026 academic lifecycle for {localStorage.getItem('selected_institution_name')}.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2 h-11 px-6 rounded-xl" 
            onClick={handleGenerateVideo} 
            disabled={videoLoading}
          >
            {videoLoading ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
            AI Virtual Tour
          </Button>
          <Button className="bg-primary h-11 px-8 rounded-xl shadow-lg shadow-primary/10" asChild>
            <Link href="/dashboard/analytics">Executive Reports</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Student Roster", value: students.length, icon: GraduationCap, label: "Active Enrollment", color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Faculty Size", value: staff.length, icon: Users, label: "Verified Staff", color: "text-purple-600", bg: "bg-purple-50" },
          { title: "Library Assets", value: books.length, icon: Library, label: "Cataloged Titles", color: "text-amber-600", bg: "bg-amber-50" },
          { title: "Hostel Status", value: `${hostels.reduce((a,c:any)=>a+(c.occupiedBeds || 0),0)}/${hostels.reduce((a,c:any)=>a+(c.capacity || 0),0)}`, icon: Home, label: "Bed Occupancy", color: "text-green-600", bg: "bg-green-50" }
        ].map((stat) => (
          <Card key={stat.title} className="overflow-hidden border-none shadow-md bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`size-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`size-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{stat.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-lg bg-white overflow-hidden rounded-3xl">
          <CardHeader className="border-b bg-slate-50/50 p-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-headline font-bold">Academic Lifecycle</CardTitle>
                <CardDescription>Termly synchronization and task completion tracking.</CardDescription>
              </div>
              <TrendingUp className="size-5 text-primary opacity-20" />
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-bold flex items-center gap-2"><CheckCircle2 className="size-4 text-green-600" /> Attendance Consistency</span>
                  <span className="text-muted-foreground">{attendanceProgress}% complete</span>
                </div>
                <Progress value={attendanceProgress} className="h-2 rounded-full" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-bold flex items-center gap-2"><FileText className="size-4 text-blue-600" /> Continuous Assessment</span>
                  <span className="text-muted-foreground">{assessmentProgress}% entries finalized</span>
                </div>
                <Progress value={assessmentProgress} className="h-2 rounded-full" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-bold flex items-center gap-2"><Wallet className="size-4 text-amber-600" /> Fee Collection Cycle</span>
                  <span className="text-muted-foreground">Target: GH₵ {totalBilledValue.toLocaleString()}</span>
                </div>
                <Progress value={feeCycleProgress} className="h-2 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-md bg-primary text-primary-foreground rounded-3xl overflow-hidden group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5" /> Institutional Safety
              </CardTitle>
              <CardDescription className="text-primary-foreground/60">Global audit active for system credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-2xl bg-white/10 space-y-3">
                 <div className="flex items-center justify-between text-xs"><span>Data Isolation</span><Badge className="bg-green-500/20 text-green-400 border-none">Verified</Badge></div>
                 <div className="flex items-center justify-between text-xs"><span>Role Access</span><Badge className="bg-blue-500/20 text-blue-400 border-none">Active</Badge></div>
                 <div className="flex items-center justify-between text-xs"><span>Audit Integrity</span><Badge className="bg-amber-500/20 text-amber-400 border-none">Synced</Badge></div>
              </div>
              <Button variant="secondary" className="w-full mt-6 h-12 rounded-xl font-bold bg-white text-primary group-hover:scale-[1.02] transition-transform" asChild>
                <Link href="/dashboard/logs">View Security Trail</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Logistics Hub</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors border cursor-pointer">
                  <div className="size-10 rounded-xl bg-orange-50 flex items-center justify-center"><Bus className="size-5 text-orange-600" /></div>
                  <div><p className="text-sm font-bold">Transport Fleet</p><p className="text-[10px] text-muted-foreground uppercase">Registry Operational</p></div>
               </div>
               <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors border cursor-pointer">
                  <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center"><Package className="size-5 text-blue-600" /></div>
                  <div><p className="text-sm font-bold">Asset Inventory</p><p className="text-[10px] text-muted-foreground uppercase">Depreciation Calculated</p></div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
