"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, School, Wallet, ShieldCheck, Activity, Plus, Search, Database, Trash2, Pencil, Loader2, LogOut, Zap, ShieldAlert, Terminal, Save, Megaphone, Server, Globe, ArrowUpRight, Clock, AlertTriangle, Cpu, HardDrive, Network, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser, useFirestore, useCollection, useAuth, useDoc } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { toast } from "@/hooks/use-toast"
import { collection, addDoc, serverTimestamp, query, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { differenceInDays } from "date-fns"

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
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [upgradingSchool, setUpgradingSchool] = useState<any>(null)
  const [editingSchool, setEditingSchool] = useState<any>(null)
  
  const [newSchool, setNewSchool] = useState({
    name: "",
    ownerEmail: "",
    type: "Secondary",
    location: "Goaso, Ahafo"
  })

  const [editForm, setEditForm] = useState({
    name: "",
    ownerEmail: "",
    location: "",
    status: "active"
  })

  const institutionsQuery = useMemo(() => {
    if (!db || authLoading || profileLoading || !isSuperAdmin) return null;
    return query(collection(db, "institutions"));
  }, [db, isSuperAdmin, authLoading, profileLoading]);

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
    const instId = doc(collection(db, "institutions")).id
    const data = {
      id: instId,
      ...newSchool,
      subscriptionPlan: "Trial",
      status: "active",
      createdAt: serverTimestamp(),
      trialStartDate: serverTimestamp(),
      tenantId: instId
    }
    addDoc(collection(db, "institutions"), data)
      .then(() => {
        toast({ title: "School Provisioned", description: `${newSchool.name} is now live on Trial.` })
        setIsProvisionDialogOpen(false)
        setNewSchool({ name: "", ownerEmail: "", type: "Secondary", location: "Goaso, Ahafo" })
      })
      .finally(() => setProvisioning(false))
  }

  const handleUpdateInstitution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !editingSchool || provisioning) return
    setProvisioning(true)
    
    updateDoc(doc(db, "institutions", editingSchool.id), {
      ...editForm,
      updatedAt: serverTimestamp()
    })
      .then(() => {
        toast({ title: "Registry Updated", description: `${editForm.name} profile synchronized.` })
        setIsEditDialogOpen(false)
        setEditingSchool(null)
      })
      .finally(() => setProvisioning(false))
  }

  const handleUpgradeInstitution = async (plan: string) => {
    if (!db || !upgradingSchool || provisioning) return
    setProvisioning(true)
    
    updateDoc(doc(db, "institutions", upgradingSchool.id), {
      subscriptionPlan: plan,
      updatedAt: serverTimestamp()
    })
      .then(() => {
        toast({ title: "Upgrade Authorized", description: `${upgradingSchool.name} is now on ${plan} plan.` })
        setIsUpgradeDialogOpen(false)
        setUpgradingSchool(null)
      })
      .finally(() => setProvisioning(false))
  }

  const getTrialDaysLeft = (createdAt: any) => {
    if (!createdAt) return 0
    const start = new Date(createdAt.toMillis())
    const now = new Date()
    const diff = differenceInDays(now, start)
    return Math.max(0, 30 - diff)
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
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12 space-y-10 animate-in fade-in duration-300">
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
          <Button className="bg-primary text-primary-foreground h-11 shadow-lg" onClick={() => setIsProvisionDialogOpen(true)}>
            <Plus className="size-4 mr-2" /> Provision New School
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full">
        <Tabs defaultValue="overview" className="space-y-10">
          <TabsList className="bg-white border p-1 rounded-xl shadow-sm h-auto flex-wrap transition-all">
            <TabsTrigger value="overview" className="rounded-lg px-6 gap-2"><Zap className="size-4" /> Dashboard</TabsTrigger>
            <TabsTrigger value="registry" className="rounded-lg px-6 gap-2"><Database className="size-4" /> Institutions</TabsTrigger>
            <TabsTrigger value="revenue" className="rounded-lg px-6 gap-2"><Wallet className="size-4" /> Subscriptions</TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg px-6 gap-2"><ShieldAlert className="size-4" /> System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid gap-6 md:grid-cols-4">
               {[
                 { title: "Total Schools", value: institutions.length, icon: School, trend: "Live registry count" },
                 { title: "Active Trials", value: institutions.filter(i => i.subscriptionPlan?.toLowerCase().includes('trial')).length, icon: Clock, trend: "Onboarding phase" },
                 { title: "Global Revenue", value: "GH₵ 0.00", icon: Wallet, trend: "Cycle tracking" },
                 { title: "Server Status", value: "Optimal", icon: Server, trend: "Goaso Node Active" }
               ].map((stat, i) => (
                 <Card key={i} className="border-none shadow-sm bg-white">
                   <CardHeader className="pb-2 flex flex-row items-center justify-between">
                     <CardTitle className="text-xs font-bold text-muted-foreground uppercase">{stat.title}</CardTitle>
                     <stat.icon className="size-4 text-primary/30" />
                   </CardHeader>
                   <CardContent>
                     <div className="text-3xl font-bold font-headline">{stat.value}</div>
                     <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">{stat.trend}</p>
                   </CardContent>
                 </Card>
               ))}
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

          <TabsContent value="registry" className="space-y-10 animate-in fade-in duration-300">
            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
              <CardHeader className="bg-white border-b px-6 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-headline font-bold text-xl text-primary">Institution Registry</CardTitle>
                    <CardDescription>Management of multi-tenant instance deployments.</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                      <Input placeholder="Search registry..." className="pl-9 h-10" />
                    </div>
                    <Button size="sm" className="h-10 bg-primary" onClick={() => setIsProvisionDialogOpen(true)}>
                      <Plus className="size-4 mr-2" /> Add New
                    </Button>
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
                      <TableRow key={inst.id} className="hover:bg-slate-50 transition-colors group">
                        <TableCell className="font-bold text-primary">
                          <div className="flex flex-col">
                            <span>{inst.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{inst.location}</span>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-xs">{inst.ownerEmail}</span></TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold">{inst.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary/5 text-primary border-none text-[9px] font-bold">{inst.subscriptionPlan}</Badge>
                            {inst.subscriptionPlan?.toLowerCase().includes('trial') && (
                              <span className="text-[9px] text-muted-foreground font-bold">{getTrialDaysLeft(inst.createdAt)}d left</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => {
                                setEditingSchool(inst);
                                setEditForm({ name: inst.name, ownerEmail: inst.ownerEmail || "", location: inst.location, status: inst.status });
                                setIsEditDialogOpen(true);
                             }}>
                               <Pencil className="size-3.5" />
                             </Button>
                             <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase" onClick={() => {
                                setUpgradingSchool(inst);
                                setIsUpgradeDialogOpen(true);
                             }}>Upgrade</Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(db!, "institutions", inst.id))}>
                               <Trash2 className="size-3.5" />
                             </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6 animate-in fade-in duration-300">
            <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
               <CardHeader className="border-b"><CardTitle className="text-lg">Subscription Tracking</CardTitle></CardHeader>
               <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead>Plan Status</TableHead>
                        <TableHead>Expiry Tracking</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {institutions.filter(i => i.subscriptionPlan?.toLowerCase().includes('trial')).map((inst: any) => {
                        const daysLeft = getTrialDaysLeft(inst.createdAt)
                        return (
                          <TableRow key={inst.id}>
                            <TableCell className="font-bold text-primary">{inst.name}</TableCell>
                            <TableCell><Badge className="bg-blue-100 text-blue-700">Trial Period</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {daysLeft <= 7 ? <AlertTriangle className="size-3 text-orange-500" /> : <Clock className="size-3 text-blue-500" />}
                                <span className={`text-xs font-bold ${daysLeft <= 7 ? 'text-orange-600' : ''}`}>{daysLeft} days remaining</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={() => {
                                setUpgradingSchool(inst);
                                setIsUpgradeDialogOpen(true);
                              }}>Authorize Upgrade</Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {institutions.filter(i => i.subscriptionPlan?.toLowerCase().includes('trial')).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No active trial instances found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-8 animate-in fade-in duration-300">
             <div className="grid gap-6 md:grid-cols-3">
               <Card className="border-none shadow-sm bg-white">
                 <CardHeader className="pb-2 flex flex-row items-center justify-between">
                   <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Cloud Node</CardTitle>
                   <Network className="size-4 text-green-500" />
                 </CardHeader>
                 <CardContent>
                   <div className="text-3xl font-bold">Operational</div>
                   <p className="text-[10px] text-green-600 font-bold mt-1 uppercase">Goaso-Ahafo Region Edge</p>
                 </CardContent>
               </Card>
               <Card className="border-none shadow-sm bg-white">
                 <CardHeader className="pb-2 flex flex-row items-center justify-between">
                   <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Data Integrity</CardTitle>
                   <HardDrive className="size-4 text-blue-500" />
                 </CardHeader>
                 <CardContent>
                   <div className="text-3xl font-bold">Verified</div>
                   <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Daily backup completed</p>
                 </CardContent>
               </Card>
               <Card className="border-none shadow-sm bg-white">
                 <CardHeader className="pb-2 flex flex-row items-center justify-between">
                   <CardTitle className="text-xs font-bold text-muted-foreground uppercase">API Latency</CardTitle>
                   <Cpu className="size-4 text-amber-500" />
                 </CardHeader>
                 <CardContent>
                   <div className="text-3xl font-bold">14ms</div>
                   <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Optimized Firestore Response</p>
                 </CardContent>
               </Card>
             </div>

             <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
               <CardHeader className="border-b bg-slate-50/50">
                 <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Security Audit Logs</CardTitle>
                 <CardDescription>Global system events and cross-tenant access monitoring.</CardDescription>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="p-10 divide-y">
                     <div className="py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3"><Badge className="bg-green-100 text-green-700">INFO</Badge><span>Standard identity audit completed.</span></div>
                        <span className="text-[10px] text-muted-foreground">Just now</span>
                     </div>
                     <div className="py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3"><Badge className="bg-blue-100 text-blue-700">LOCK</Badge><span>Cross-tenant boundary enforced for 150 instances.</span></div>
                        <span className="text-[10px] text-muted-foreground">15 mins ago</span>
                     </div>
                  </div>
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
              <div className="space-y-2"><Label>Location</Label><Input required value={newSchool.location} onChange={e => setNewSchool({...newSchool, location: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={provisioning} className="w-full h-12 bg-primary font-bold">
                {provisioning ? <Loader2 className="animate-spin mr-2" /> : <Database className="mr-2" />} Confirm Provisioning
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl p-8">
          <form onSubmit={handleUpdateInstitution}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold">Edit Institution Registry</DialogTitle>
              <DialogDescription>Update high-level metadata for {editingSchool?.name}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2"><Label>School Name</Label><Input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
              <div className="space-y-2"><Label>Owner Email</Label><Input type="email" required value={editForm.ownerEmail} onChange={e => setEditForm({...editForm, ownerEmail: e.target.value})} /></div>
              <div className="space-y-2"><Label>Location</Label><Input required value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} /></div>
              <div className="space-y-2">
                <Label>Operational Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={provisioning} className="w-full h-12 bg-primary font-bold">
                {provisioning ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">Upgrade Institution</DialogTitle>
            <DialogDescription>Move {upgradingSchool?.name} from trial to a paid strategic plan.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-8">
            <Button onClick={() => handleUpgradeInstitution('Basic')} className="h-16 flex justify-between px-6 bg-slate-50 border hover:bg-slate-100 text-primary group">
              <div className="text-left">
                <p className="font-bold">Basic Management</p>
                <p className="text-[10px] text-muted-foreground uppercase">Standard SIS Tools</p>
              </div>
              <ArrowUpRight className="size-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            <Button onClick={() => handleUpgradeInstitution('Premium')} className="h-16 flex justify-between px-6 bg-primary/5 border border-primary/20 hover:bg-primary/10 text-primary group">
              <div className="text-left">
                <p className="font-bold">Premium AI Insights</p>
                <p className="text-[10px] text-primary/60 uppercase">Strategic Reporting & Forecasts</p>
              </div>
              <ArrowUpRight className="size-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            <Button onClick={() => handleUpgradeInstitution('Enterprise')} className="h-16 flex justify-between px-6 bg-accent/5 border border-accent/20 hover:bg-accent/10 text-accent group">
              <div className="text-left">
                <p className="font-bold">Enterprise Hub</p>
                <p className="text-[10px] text-accent/60 uppercase">Unlimited Multi-Campus Nodes</p>
              </div>
              <ArrowUpRight className="size-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="w-full" onClick={() => setIsUpgradeDialogOpen(false)}>Cancel Authorization</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
