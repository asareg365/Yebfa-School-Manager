
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, School, Wallet, ShieldCheck, Activity, Plus, Search, Database, Trash2, Pencil, Loader2, CheckCircle2, ArrowRight, Layers, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import { useUser, useFirestore, useCollection, useAuth } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { toast } from "@/hooks/use-toast"
import { collection, addDoc, serverTimestamp, query, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function AdminPortal() {
  const { user, loading: authLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  
  const [provisioning, setProvisioning] = useState(false)
  const [isProvisionDialogOpen, setIsProvisionDialogOpen] = useState(false)
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false)
  const [newSchool, setNewSchool] = useState({
    name: "",
    ownerEmail: "",
    type: "Secondary",
    gradeLevel: "Secondary",
    specificGrades: "SHS 1-3",
    location: "Goaso, Ahafo"
  })

  const isSuperAdmin = user?.email === 'asareg365@gmail.com' || user?.email === 'frankyeb@gmail.com'

  const institutionsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "institutions"));
  }, [db]);

  const { data: rawInstitutions, loading: dataLoading } = useCollection(institutionsQuery)

  // Sort institutions client-side
  const institutions = useMemo(() => {
    return [...rawInstitutions].sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || Date.now();
      const dateB = b.createdAt?.toMillis?.() || Date.now();
      return dateB - dateA;
    });
  }, [rawInstitutions]);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [user, authLoading, isSuperAdmin, router])

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      router.push("/login")
      toast({
        title: "Session Terminated",
        description: "Super Admin node signed out successfully.",
      })
    }
  }

  const handleManualProvision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || provisioning) return

    const existing = institutions.find(inst => inst.ownerEmail.toLowerCase() === newSchool.ownerEmail.toLowerCase())
    if (existing) {
      toast({
        variant: "destructive",
        title: "Duplicate Found",
        description: `An institution with the owner email ${newSchool.ownerEmail} already exists.`,
      })
      return
    }

    setProvisioning(true)
    const data = {
      ...newSchool,
      subscriptionPlan: "premium",
      status: "active",
      createdAt: serverTimestamp()
    }

    try {
      await addDoc(collection(db, "institutions"), data)
      toast({
        title: "School Provisioned",
        description: `${newSchool.name} is now live.`,
      })
      setIsProvisionDialogOpen(false)
      setNewSchool({ name: "", ownerEmail: "", type: "Secondary", gradeLevel: "Secondary", specificGrades: "SHS 1-3", location: "Goaso, Ahafo" })
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: 'institutions',
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setProvisioning(false)
    }
  }

  const handleApprove = async (id: string, name: string) => {
    if (!db) return
    const docRef = doc(db, "institutions", id)
    updateDoc(docRef, { status: "active" })
      .then(() => {
        toast({
          title: "Registration Approved",
          description: `${name} has been activated.`,
        })
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: { status: "active" }
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  const handleDeleteSchool = (id: string, name: string) => {
    if (!db) return
    const docRef = doc(db, "institutions", id);
    deleteDoc(docRef)
      .then(() => {
        toast({
          title: "Instance Deprovisioned",
          description: `${name} has been removed.`,
        })
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  const handleEditSchool = (name: string) => {
    toast({
      title: "Edit Mode",
      description: `Opening configuration portal for ${name}...`,
    })
  }

  const handleSelectInstitution = (id: string, name: string) => {
    localStorage.setItem('selected_institution_id', id);
    localStorage.setItem('selected_institution_name', name);
    toast({
      title: "Switching Context",
      description: `Entering ${name} dashboard node...`,
    })
    router.push("/dashboard")
  }

  if (authLoading) return <div className="p-12 text-center font-headline font-bold text-primary">Synchronizing Global Credentials...</div>
  if (!isSuperAdmin) return null

  const activeInstitutions = institutions.filter(i => i.status === 'active')

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest">
            <ShieldCheck className="size-3" /> System Super Admin
          </div>
          <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Global Enterprise Hub</h1>
          <p className="text-muted-foreground text-sm">Strategic multi-tenant node management for Yebfa School Manager.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            className="h-11 gap-2 text-muted-foreground hover:text-destructive transition-colors font-bold" 
            onClick={handleLogout}
          >
            <LogOut className="size-4" /> Sign Out
          </Button>
          
          <Dialog open={isSelectDialogOpen} onOpenChange={setIsSelectDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11 border-primary/20 bg-white">
                To Institutional View
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-none shadow-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-bold text-primary">Select Institution</DialogTitle>
                <DialogDescription>Choose an active node to view its specific academic and financial data.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[300px] mt-4">
                <div className="space-y-2 pr-4">
                  {activeInstitutions.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm italic">No active institutions provisioned.</p>
                  ) : (
                    activeInstitutions.map((inst) => (
                      <Button
                        key={inst.id}
                        variant="ghost"
                        className="w-full justify-between h-14 group hover:bg-primary/5 border border-transparent hover:border-primary/10 rounded-xl px-4"
                        onClick={() => handleSelectInstitution(inst.id, inst.name)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-primary">{inst.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{inst.location}</span>
                        </div>
                        <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    ))
                  )}
                </div>
              </ScrollArea>
              <DialogFooter className="pt-4 border-t mt-4">
                <Button variant="ghost" size="sm" onClick={() => setIsSelectDialogOpen(false)}>Close Registry</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isProvisionDialogOpen} onOpenChange={setIsProvisionDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 h-11 shadow-lg shadow-accent/20">
                <Plus className="size-4" /> Provision New School
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-none shadow-2xl">
              <form onSubmit={handleManualProvision}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline font-bold text-primary">Provision Institution</DialogTitle>
                  <DialogDescription>Manually create a new school instance. This will bypass the global review process.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">School Name</Label>
                    <Input id="name" required value={newSchool.name} onChange={(e) => setNewSchool({...newSchool, name: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Owner Email</Label>
                    <Input id="email" type="email" required value={newSchool.ownerEmail} onChange={(e) => setNewSchool({...newSchool, ownerEmail: e.target.value})} className="h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Category</Label>
                      <Input id="type" value={newSchool.gradeLevel} onChange={(e) => setNewSchool({...newSchool, gradeLevel: e.target.value, type: e.target.value})} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loc">Location</Label>
                      <Input id="loc" value={newSchool.location} onChange={(e) => setNewSchool({...newSchool, location: e.target.value})} className="h-11" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={provisioning} className="h-11 px-8 gap-2">
                    {provisioning ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Confirm Provisioning
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full space-y-10">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { title: "Active Tenants", value: institutions.filter(i => i.status === 'active').length, icon: School, trend: "Global Registry" },
            { title: "Pending Reviews", value: institutions.filter(i => i.status !== 'active').length, icon: Users, trend: "Registration Queue" },
            { title: "Global Revenue", value: "GH₵---", icon: Wallet, trend: "Fiscal Year 2026" },
            { title: "System Health", value: "100%", icon: Activity, trend: "All Nodes Online" }
          ].map((stat) => (
            <Card key={stat.title} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.title}</CardTitle>
                <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center">
                  <stat.icon className="size-4 text-primary opacity-50" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">{stat.value}</div>
                <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tight">{stat.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
          <CardHeader className="bg-white border-b px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-headline font-bold text-xl text-primary">Institution Registry</CardTitle>
                <CardDescription>Management of multi-tenant instance deployments across the network.</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input placeholder="Search registry..." className="pl-9 h-10 border-muted-foreground/20" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {institutions.length === 0 && !dataLoading ? (
              <div className="flex flex-col items-center justify-center text-center p-24 space-y-4">
                <div className="size-24 rounded-full bg-muted/30 flex items-center justify-center">
                  <Database className="size-10 text-muted-foreground/20" />
                </div>
                <div className="max-w-sm">
                  <h3 className="text-xl font-bold text-primary">No Registered Tenants</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">As of 2026, no school instances have been provisioned or requested.</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-bold py-4">School Details</TableHead>
                    <TableHead className="font-bold py-4">Owner / Email</TableHead>
                    <TableHead className="font-bold py-4">Grade Levels</TableHead>
                    <TableHead className="font-bold py-4">Status</TableHead>
                    <TableHead className="font-bold py-4">Plan</TableHead>
                    <TableHead className="text-right font-bold py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutions.map((inst: any) => (
                    <TableRow key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-bold text-primary">
                        <div className="flex flex-col">
                          <span className="font-bold">{inst.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{inst.location}</span>
                        </div>
                        {inst.status === 'pending_review' && <Badge className="mt-1 bg-accent text-white border-none text-[9px]">NEW REQUEST</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{inst.ownerName || 'Unknown Owner'}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{inst.ownerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-primary uppercase">{inst.gradeLevel || inst.type}</span>
                          <span className="text-[10px] text-muted-foreground italic">{inst.specificGrades || "All Grades"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 ${inst.status === 'active' ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>
                          {inst.status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-none uppercase text-[9px] font-bold px-2 py-0.5">
                          {inst.subscriptionPlan || 'basic'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inst.status !== 'active' && (
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 h-8 px-3 text-[11px] font-bold uppercase tracking-tight" onClick={() => handleApprove(inst.id, inst.name)}>
                              Approve
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-primary h-8 w-8"
                            onClick={() => handleEditSchool(inst.name)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive h-8 w-8"
                            onClick={() => handleDeleteSchool(inst.id, inst.name)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
