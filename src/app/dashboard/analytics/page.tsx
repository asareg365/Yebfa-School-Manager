
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { 
  TrendingUp, 
  Users, 
  Wallet, 
  GraduationCap, 
  ArrowUpRight, 
  ArrowDownRight, 
  Loader2, 
  BarChart3, 
  PieChart as PieIcon, 
  Activity,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

export default function StrategicAnalyticsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const studentsQuery = useMemo(() => institutionId ? query(collection(db!, "students"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const txnsQuery = useMemo(() => institutionId ? query(collection(db!, "transactions"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const attQuery = useMemo(() => institutionId ? query(collection(db!, "attendance"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: students = [], loading: sLoading } = useCollection(studentsQuery)
  const { data: txns = [], loading: tLoading } = useCollection(txnsQuery)
  const { data: attendance = [], loading: aLoading } = useCollection(attQuery)

  const enrollmentData = useMemo(() => {
    const gradeCounts: Record<string, number> = {};
    students.forEach((s: any) => {
      const grade = s.gradeLevel || "Unassigned";
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    });
    return Object.entries(gradeCounts).map(([name, total]) => ({ name, total }));
  }, [students]);

  const totalRevenue = useMemo(() => {
    return txns.reduce((a, c: any) => a + (c.amount || 0), 0);
  }, [txns]);

  const COLORS = ['#1a1f2c', '#f59e0b', '#3b82f6', '#10b981']

  const handleExportCSV = () => {
    if (enrollmentData.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "Insufficient registry records to export." });
      return;
    }

    const header = "Grade Level,Student Count\n";
    const rows = enrollmentData.map(d => `"${d.name}",${d.total}`).join("\n");
    const csv = header + rows;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ysm_analytics_${institution?.schoolCode || 'hub'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({ title: "Export Authorized", description: "Intelligence breakdown downloaded successfully." });
  }

  const handlePrint = () => {
    window.print();
  }

  if (sLoading || tLoading || aLoading) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse">Aggregating Institutional Intelligence...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Strategic Intelligence Center</h1>
          <p className="text-muted-foreground">High-fidelity data visualization derived from live institutional records.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl gap-2 font-bold text-xs uppercase" onClick={handlePrint}>
            <Printer className="size-4" /> Print PDF
          </Button>
          <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2 px-6 font-bold text-xs uppercase" onClick={handleExportCSV}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div id="printable-analytics" className="space-y-8">
        <div className="hidden print:block mb-8">
           <div className="flex justify-between items-start border-b pb-6">
              <div className="flex items-center gap-4">
                 {institution?.logoUrl ? <img src={institution.logoUrl} className="size-16 object-contain" /> : <div className="size-16 bg-primary rounded-xl flex items-center justify-center text-white font-black text-2xl">Y</div>}
                 <div>
                    <h1 className="text-2xl font-headline font-black text-primary uppercase tracking-tight">{institution?.name || "System Hub"}</h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{institution?.location}</p>
                 </div>
              </div>
              <div className="text-right">
                 <h2 className="text-xl font-headline font-bold text-primary uppercase">EXECUTIVE SUMMARY</h2>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{institution?.currentTerm} • CYCLE 2026</p>
                 <p className="text-[9px] font-medium text-slate-400 mt-1">Audit Data Sync: {new Date().toLocaleString()}</p>
              </div>
           </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {[
            { title: "Net Revenue", value: `GH₵ ${totalRevenue.toLocaleString()}`, trend: "Live Total", icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
            { title: "Total Enrollment", value: students.length, trend: "Registry Count", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { title: "Attendance Logs", value: attendance.length, trend: "Historical Data", icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
            { title: "Registry Health", value: "Optimal", trend: "Sync Active", icon: ShieldCheck, color: "text-primary", bg: "bg-slate-50" }
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-md bg-white hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">{stat.title}</CardDescription>
                <div className={`size-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`size-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline truncate">{stat.value}</div>
                <div className="flex items-center gap-1.5 mt-1">
                   <span className="text-[9px] text-muted-foreground uppercase font-bold">{stat.trend}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="size-4" /> Enrollment by Grade</CardTitle>
              <CardDescription>Live student distribution across registered grade levels.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="h-[300px] w-full">
                {enrollmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enrollmentData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="total" fill="#1a1f2c" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">No enrollment data to visualize.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2"><PieIcon className="size-4" /> Gender Distribution</CardTitle>
              <CardDescription>Institutional demographic mapping.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="h-[300px] w-full">
                 {students.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie data={[
                          { name: 'Male', value: students.filter((s:any) => s.gender === 'Male').length },
                          { name: 'Female', value: students.filter((s:any) => s.gender === 'Female').length }
                        ]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>
                          {COLORS.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                     </PieChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">No gender data available.</div>
                 )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-center pt-8 px-4 text-center no-print">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
           <CheckCircle2 className="size-3 text-green-600" />
           Authorized Data Intelligence Sync • Node 2026 Registry Hub
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #printable-analytics, #printable-analytics * { visibility: visible; }
          #printable-analytics {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 30px;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
