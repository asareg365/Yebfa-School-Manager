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
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { TrendingUp, Users, Wallet, GraduationCap, ArrowUpRight, ArrowDownRight, Loader2, BarChart3, PieChart as PieIcon, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function StrategicAnalyticsPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const studentsQuery = useMemo(() => institutionId ? query(collection(db!, "students"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const txnsQuery = useMemo(() => institutionId ? query(collection(db!, "transactions"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const attQuery = useMemo(() => institutionId ? query(collection(db!, "attendance"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: students, loading: sLoading } = useCollection(studentsQuery)
  const { data: txns, loading: tLoading } = useCollection(txnsQuery)
  const { data: attendance, loading: aLoading } = useCollection(attQuery)

  const enrollmentData = useMemo(() => {
    // Group by real grades from Firestore
    const gradeCounts: Record<string, number> = {};
    students.forEach((s: any) => {
      gradeCounts[s.gradeLevel] = (gradeCounts[s.gradeLevel] || 0) + 1;
    });
    return Object.entries(gradeCounts).map(([name, total]) => ({ name, total }));
  }, [students]);

  const totalRevenue = useMemo(() => {
    return txns.reduce((a, c: any) => a + (c.amount || 0), 0);
  }, [txns]);

  const COLORS = ['#1a1f2c', '#f59e0b', '#3b82f6', '#10b981']

  if (sLoading || tLoading || aLoading) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse">Aggregating Institutional Intelligence...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Strategic Intelligence Center</h1>
        <p className="text-muted-foreground">High-fidelity data visualization derived from live institutional records.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { title: "Net Revenue", value: `GH₵ ${totalRevenue.toLocaleString()}`, trend: "Live Total", icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
          { title: "Total Enrollment", value: students.length, trend: "Registry Count", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Attendance Logs", value: attendance.length, trend: "Historical Data", icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
          { title: "Faculty Registry", value: "---", trend: "Syncing...", icon: GraduationCap, color: "text-primary", bg: "bg-slate-50" }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-md bg-white hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">{stat.title}</CardDescription>
              <div className={`size-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`size-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{stat.value}</div>
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
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="size-4" /> Transaction Volume</CardTitle>
            <CardDescription>Frequency of financial interactions recorded.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
             <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground italic text-sm">
                Awaiting historical transaction trends...
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-none shadow-xl rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2"><PieIcon className="size-4" /> Gender Ratio</CardTitle></CardHeader>
          <CardContent className="pt-8">
            <div className="h-[250px] w-full">
               {students.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie data={[
                        { name: 'Male', value: students.filter((s:any) => s.gender === 'Male').length },
                        { name: 'Female', value: students.filter((s:any) => s.gender === 'Female').length }
                      ]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {COLORS.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                   </PieChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">No data available.</div>
               )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-xl rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg">System Events Hub</CardTitle>
            <CardDescription>Live auditing of institutional actions.</CardDescription>
          </CardHeader>
          <CardContent className="p-12 text-center text-muted-foreground italic text-sm">
             Awaiting system event stream for {localStorage.getItem('selected_institution_name')}...
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
