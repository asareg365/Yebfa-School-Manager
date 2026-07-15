
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
    const grades = ["Primary 1", "Primary 2", "Primary 3"]
    return grades.map(g => ({
      name: g,
      total: students.filter((s: any) => s.gradeLevel === g).length
    }))
  }, [students])

  const revenueData = [
    { month: "Jan", amount: 12000 },
    { month: "Feb", amount: 15500 },
    { month: "Mar", amount: 11000 },
    { month: "Apr", amount: 18000 },
    { month: "May", amount: 22000 },
    { month: "Jun", amount: 19500 },
  ]

  const COLORS = ['#1a1f2c', '#f59e0b', '#3b82f6', '#10b981']

  if (sLoading || tLoading || aLoading) return <div className="p-24 text-center"><Loader2 className="size-10 animate-spin mx-auto text-primary" /><p className="mt-4 font-bold text-muted-foreground animate-pulse">Aggregating Global Intelligence...</p></div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Strategic Intelligence Center</h1>
        <p className="text-muted-foreground">High-fidelity data visualization for Term 2, 2026 operations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { title: "Net Revenue", value: "GH₵ ---", trend: "+12.5%", icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
          { title: "Total Enrollment", value: students.length, trend: "+4%", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Attendance Avg", value: "94.2%", trend: "-0.8%", icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
          { title: "Faculty Load", value: "1:22", trend: "Stable", icon: GraduationCap, color: "text-primary", bg: "bg-slate-50" }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">{stat.title}</CardDescription>
              <div className={`size-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`size-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{stat.value}</div>
              <div className="flex items-center gap-1.5 mt-1">
                 <span className={`text-[10px] font-bold ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-destructive'}`}>{stat.trend}</span>
                 <span className="text-[9px] text-muted-foreground uppercase font-medium">Vs Last Term</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="size-4" /> Enrollment by Grade</CardTitle>
            <CardDescription>Active student distribution across current modules.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="total" fill="#1a1f2c" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="size-4" /> Termly Revenue Flow</CardTitle>
            <CardDescription>Consolidated intake from fee collections in GH₵.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
             <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-none shadow-xl rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2"><PieIcon className="size-4" /> Gender Ratio</CardTitle></CardHeader>
          <CardContent className="pt-8">
            <div className="h-[250px] w-full">
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
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-xl rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg">Recent Strategic Actions</CardTitle>
            <CardDescription>Chronological audit of institutional governance.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                {[
                  { user: "Super Admin", action: "Ecosystem Sync", time: "2 hours ago", status: "Success" },
                  { user: "Accountant", action: "Term 2 Invoicing", time: "Yesterday", status: "Success" },
                  { user: "System", action: "Attendance Forecast", time: "2 days ago", status: "Audit Log" }
                ].map((log, i) => (
                  <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-[10px]">{log.user.charAt(0)}</div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-primary">{log.action}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">By {log.user} • {log.time}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-primary/50">{log.status}</Badge>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
