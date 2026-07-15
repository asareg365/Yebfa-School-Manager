"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, School, Wallet, ShieldCheck, Activity, Plus, Search, Database, Trash2, Pencil, Loader2, CheckCircle2, ArrowRight, LogOut, KeyRound, AlertTriangle, BarChart3, LineChart, Server, Globe, Megaphone, Zap, ShieldAlert, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUser, useFirestore, useCollection, useAuth, useDoc } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { toast } from "@/hooks/use-toast"
import { collection, addDoc, serverTimestamp, query, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts"

const REVENUE_DATA = [
  { month: "Jan", revenue: 45000, schools: 12 },
  { month: "Feb", revenue: 52000, schools: 15 },
  { month: "Mar", revenue: 61000, schools: 18 },
  { month: "Apr", revenue: 58000, schools: 22 },
  { month: "May", revenue: 75000, schools: 28 },
  { month: "Jun", revenue: 89000, schools: 35 },
]

export default function AdminPortal() {
  const { user, loading: authLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  
  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile, loading: profileLoading } = useDoc(userProfileRef)
  
  const isSuperAdmin = profile?.role === 'super_admin'

  const [provisioning, setProvisioning] = useState(false)
  const [isProvisionDialogOpen, setIsProvisionDialogOpen] = useState(false)
  
  const [newSchool, setNewSchool] = useState({
    name: "",
    ownerEmail: "",
    type: "Secondary",
    gradeLevel: "Secondary",
    specificGrades: "SHS 1-3",
    location: "Goaso, Ahafo"
  })

  const institutionsQuery = useMemo(() => {
    if (!db || authLoading || !isSuperAdmin) return null;
    return query(collection(db, "institutions"));
  }, [db, isSuperAdmin, authLoading]);

  const { data: rawInstitutions = [] } = useCollection(institutionsQuery)

  const institutions = useMemo(() => {
    return [...rawInstitutions].sort((a: any, b: any) => {
      const dateA = a.createdAt?.toMillis?.() || Date.now();
      const dateB = b.createdAt?.toMillis?.() || Date.now();
      return dateB - dateA;
    });
  }, [rawInstitutions]);

  useEffect(() => {
    if (!authLoading && !profileLoading && user && profile && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [user, authLoading, profileLoading, profile, isSuperAdmin, router])

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      router.push("/login")
      toast({ title: "Session Terminated", description: "Super Admin signed out successfully." })
    }
  }

  const handleManualProvision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || provisioning) return
    setProvisioning(true)
    const data = {
      ...newSchool,
      subscriptionPlan: "trial for 30days",
      status: "active",
      createdAt: serverTimestamp(),
      tenantId: doc(collection(db, "institutions")).id
    }
    addDoc(collection(db, "institutions"), data)
      .then(() => {
        toast({ title: "School Provisioned", description: `${newSchool.name} is now live.` })
        setIsProvisionDialogOpen(false)
        setNewSchool({ name: "", ownerEmail: "", type: "Secondary", gradeLevel: "Secondary", specificGrades: "SHS 1-3", location: "Goaso, Ahafo" })
      })
      .finally(() => setProvisioning(false))
  }

  const handleDeleteSchool = (id: string, name: string) => {
    if (!db) return
    deleteDoc(doc(db, "institutions", id))
      .then(() => toast({ title: "Instance Deprovisioned", description: `${name} removed.` }))
  }

  const handleSelectInstitution = (id: string, name: string) => {
    localStorage.setItem('selected_institution_id', id);
    localStorage.setItem('selected_institution_name', name);
    router.push("/dashboard")
  }

  if (authLoading || profileLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="font-headline font-bold text-primary animate-pulse uppercase tracking-widest text-xs">Synchronizing Global SaaS Hub...</p>
      </div>
    </div>
  )

  if (!isSuperAdmin) return null

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest">
            <ShieldCheck className="size-3" /> System Super Admin
          </div>
          <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">SaaS Command Center</h1>
          <p className="text-muted-foreground text-sm">Strategic ecosystem management and global usage analytics.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="h-11 gap-2 font-bold" onClick={handleLogout}>
            <LogOut className="size-4" /> Sign Out
          </Button>
          <Button className="bg-accent text-accent-foreground h-11 shadow-lg" onClick={() => setIsProvisionDialogOpen(true)}>
            <Plus className="size-4 mr-2" /> Provision New School
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full">
        <Tabs defaultValue="overview" className="space-y-10">
          <TabsList className="bg-white border p-1 rounded-xl shadow-sm h-auto flex-wrap">
            <TabsTrigger value="overview" className="rounded-lg px-6 gap-2"><Zap className="size-4" /> Dashboard</TabsTrigger>
            <TabsTrigger value="registry" className="rounded-lg px-6 gap-2"><Database className="size-4" /> Institutions</TabsTrigger>
            <TabsTrigger value="revenue" className="rounded-lg px-6 gap-2"><Wallet className="size-4" /> Subscriptions</TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg px-6 gap-2"><ShieldAlert className="size-4" /> System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid gap-6 md:grid-cols-4">
               {[
                 { title: "Total Schools", value: institutions.length, icon: School, trend: "+4 this month" },
                 { title: "Active Users", value: "1,242", icon: Users, trend: "+12% usage" },
                 { title: "Global Revenue", value: "GH₵ 89,400", icon: Wallet, trend: "Target: 100k" },
                 { title: "Server Status", value: "99.9%", icon: Server, trend: "Goaso Node" }
               ].map((stat, i) => (
                 <Card key={i} className="border-none shadow-sm bg-white">
                   <CardHeader className="pb-2 flex flex-row items-center justify-between">
                     <CardTitle className="text-xs font-bold text-muted-foreground uppercase">{stat.title}</CardTitle>
                     <stat.icon className="size-4 text-primary/30" />
                   </CardHeader>
                   <CardContent>
                     <div className="text-3xl font-bold font-headline">{stat.value}</div>
                     <p className="text-[10px] text-green-600 font-bold mt-1">{stat.trend}</p>
                   </CardContent>
                 </Card>
               ))}
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <Card className="border-none shadow-md bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Growth & Revenue (2026)</CardTitle>
                  <CardDescription>Termly performance across all tenants.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={REVENUE_DATA}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1a1f2c" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#1a1f2c" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="revenue" stroke="#1a1f2c" fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Institutional Distribution</CardTitle>
                  <CardDescription>Schools onboarded per month.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={REVENUE_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="schools" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-md bg-primary text-primary-foreground overflow-hidden">
               <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle className="text-xl">Ecosystem Broadcast</CardTitle>
                   <CardDescription className="text-primary-foreground/60">Dispatch global notifications to all school dashboards.</CardDescription>
                 </div>
                 <Megaphone className="size-10 opacity-20" />
               </CardHeader>
               <CardContent className="space-y-4">
                  <Input placeholder="Global Message Title" className="bg-white/10 border-white/20 placeholder:text-white/40 h-12" />
                  <div className="flex gap-4">
                    <Button className="bg-accent text-accent-foreground font-bold h-12 px-8">Authorize Push</Button>
                    <Button variant="ghost" className="h-12">Target Specific Region</Button>
                  </div>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registry" className="space-y-10">
            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
              <CardHeader className="bg-white border-b px-6 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-headline font-bold text-xl text-primary">Institution Registry</CardTitle>
                    <CardDescription>Management of multi-tenant instance deployments.</CardDescription>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input placeholder="Search registry..." className="pl-9 h-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {institutions.map((inst: any) => (
                      <TableRow key={inst.id}>
                        <TableCell className="font-bold text-primary">
                          <div className="flex flex-col">
                            <span>{inst.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{inst.location}</span>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-xs">{inst.ownerEmail}</span></TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold">{inst.status}</Badge></TableCell>
                        <TableCell><Badge className="bg-primary/5 text-primary border-none text-[9px] font-bold">{inst.subscriptionPlan}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                             <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase" onClick={() => handleSelectInstitution(inst.id, inst.name)}>Enter</Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSchool(inst.id, inst.name)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
               <Card className="border-none shadow-md bg-white">
                 <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Total SaaS MRR</CardDescription></CardHeader>
                 <CardContent><div className="text-3xl font-bold font-headline text-primary">GH₵ 12,400</div></CardContent>
               </Card>
               <Card className="border-none shadow-md bg-white">
                 <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Churn Rate</CardDescription></CardHeader>
                 <CardContent><div className="text-3xl font-bold font-headline text-green-600">0.8%</div></CardContent>
               </Card>
               <Card className="border-none shadow-md bg-white">
                 <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Pending Renewals</CardTrigger></CardHeader>
                 <CardContent><div className="text-3xl font-bold font-headline text-amber-600">14 Schools</div></CardContent>
               </Card>
            </div>
            <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
               <CardHeader className="border-b"><CardTitle className="text-lg">Subscription Billing Ledger</CardTitle></CardHeader>
               <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Institution</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {institutions.slice(0, 5).map((inst: any) => (
                        <TableRow key={inst.id}>
                          <TableCell className="font-mono text-[10px] text-muted-foreground uppercase">SUB-{inst.id.substring(0, 6)}</TableCell>
                          <TableCell className="font-bold text-sm">{inst.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[9px] uppercase">{inst.subscriptionPlan}</Badge></TableCell>
                          <TableCell className="font-bold text-xs">GH₵ 1,299</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">Today</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
             <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-md bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Globe className="size-4 text-blue-600" /> Node Deployment</CardTitle>
                    <CardDescription>Status of regional institutional partitions.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="flex justify-between items-center text-sm"><span>Ahafo Cluster (Goaso)</span><Badge className="bg-green-600">Operational</Badge></div>
                     <div className="flex justify-between items-center text-sm"><span>Greater Accra Node</span><Badge className="bg-green-600">Operational</Badge></div>
                     <div className="flex justify-between items-center text-sm"><span>Ashanti Cluster</span><Badge variant="outline" className="animate-pulse">Scaling...</Badge></div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><ShieldAlert className="size-4 text-primary" /> Global Audit Log</CardTitle>
                    <CardDescription>Real-time security events across ecosystem.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                     <div className="divide-y max-h-[160px] overflow-y-auto">
                        <div className="p-3 text-[10px] font-mono text-muted-foreground"><span className="text-green-600">[SYNC]</span> Hub Node synchronized with Firebase auth state</div>
                        <div className="p-3 text-[10px] font-mono text-muted-foreground"><span className="text-blue-600">[INFO]</span> New Institution provisioned in Ahafo cluster</div>
                        <div className="p-3 text-[10px] font-mono text-muted-foreground"><span className="text-amber-600">[WARN]</span> Failed login attempt from unauthorized domain</div>
                     </div>
                  </CardContent>
                </Card>
             </div>
             
             <Card className="border-none shadow-md bg-slate-900 text-white rounded-2xl overflow-hidden">
                <CardHeader className="bg-white/5 p-6 border-b border-white/10">
                   <div className="flex items-center gap-2 text-green-400"><Terminal className="size-4" /><span className="text-xs font-bold uppercase tracking-widest">System Console</span></div>
                </CardHeader>
                <CardContent className="p-6 font-mono text-[11px] space-y-1">
                   <p className="text-white/40">Initializing ecosystem audit v2.0.26...</p>
                   <p className="text-green-400">STATUS: ALL NODES OPTIMAL</p>
                   <p className="text-white/60">Multi-tenant isolation layer: ACTIVE</p>
                   <p className="text-white/60">Firestore Security Rules version: 2026.1</p>
                   <p className="text-white/60">Ghana Region latency: 24ms</p>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isProvisionDialogOpen} onOpenChange={setIsProvisionDialogOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl p-8">
          <form onSubmit={handleManualProvision}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold">Manual Provisioning</DialogTitle>
              <DialogDescription>Bypass registration to create a pre-paid institutional node.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2"><Label>Institution Name</Label><Input required value={newSchool.name} onChange={e => setNewSchool({...newSchool, name: e.target.value})} /></div>
              <div className="space-y-2"><Label>Owner Email</Label><Input type="email" required value={newSchool.ownerEmail} onChange={e => setNewSchool({...newSchool, ownerEmail: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={provisioning} className="w-full h-12 bg-primary font-bold">
                {provisioning ? <Loader2 className="animate-spin mr-2" /> : <Database className="mr-2" />} Confirm Provisioning
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
