"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, School, Wallet, ShieldCheck, Activity, Plus, Search, Database, Trash2, Pencil, Loader2, CheckCircle2, ArrowRight, Layers, LogOut, KeyRound, AlertTriangle, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useUser, useFirestore, useCollection, useAuth } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { toast } from "@/hooks/use-toast"
import { collection, addDoc, serverTimestamp, query, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { signOut, updatePassword } from "firebase/auth"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AdminPortal() {
  const { user, loading: authLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  
  const [provisioning, setProvisioning] = useState(false)
  const [isProvisionDialogOpen, setIsProvisionDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false)
  const [updatingPass, setUpdatingPass] = useState(false)
  const [newPass, setNewPass] = useState("")
  const [selectedInstForEdit, setSelectedInstForEdit] = useState<any>(null)
  
  const [newSchool, setNewSchool] = useState({
    name: "",
    ownerEmail: "",
    type: "Secondary",
    gradeLevel: "Secondary",
    specificGrades: "SHS 1-3",
    location: "Goaso, Ahafo"
  })

  const [editSchoolForm, setEditSchoolForm] = useState({
    name: "",
    gradeLevel: "",
    location: ""
  })

  const isSuperAdmin = user?.email === 'asareg365@gmail.com' || user?.email === 'frankyeb@gmail.com'

  const institutionsQuery = useMemo(() => {
    if (!db || authLoading || !isSuperAdmin) return null;
    return query(collection(db, "institutions"));
  }, [db, isSuperAdmin, authLoading]);

  const { data: rawInstitutions, loading: dataLoading } = useCollection(institutionsQuery)

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
        description: "Super Admin signed out successfully.",
      })
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser || updatingPass) return
    setUpdatingPass(true)
    try {
      await updatePassword(auth.currentUser, newPass)
      toast({
        title: "Credential Updated",
        description: "Super Admin security password has been changed successfully.",
      })
      setNewPass("")
    } catch (error: any) {
      console.error(error)
      if (error.code === 'auth/requires-recent-login') {
        toast({
          variant: "destructive",
          title: "Security Verification Required",
          description: "For security, you must have signed in recently to change your password.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message || "An unexpected error occurred.",
        })
      }
    } finally {
      setUpdatingPass(false)
    }
  }

  const handleManualProvision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || provisioning) return

    setProvisioning(true)
    const data = {
      ...newSchool,
      subscriptionPlan: "premium",
      status: "active",
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, "institutions"), data)
      .then(() => {
        toast({
          title: "School Provisioned",
          description: `${newSchool.name} is now live.`,
        })
        setIsProvisionDialogOpen(false)
        setNewSchool({ name: "", ownerEmail: "", type: "Secondary", gradeLevel: "Secondary", specificGrades: "SHS 1-3", location: "Goaso, Ahafo" })
      })
      .catch(async (error: any) => {
        const permissionError = new FirestorePermissionError({
          path: 'institutions',
          operation: 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setProvisioning(false)
      })
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

  const handleEditClick = (inst: any) => {
    setSelectedInstForEdit(inst)
    setEditSchoolForm({
      name: inst.name,
      gradeLevel: inst.gradeLevel || inst.type || "",
      location: inst.location || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateInstitution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !selectedInstForEdit) return
    
    const docRef = doc(db, "institutions", selectedInstForEdit.id)
    updateDoc(docRef, { ...editSchoolForm, updatedAt: serverTimestamp() })
      .then(() => {
        toast({
          title: "Record Updated",
          description: `${editSchoolForm.name} registry details saved.`,
        })
        setIsEditDialogOpen(false)
      })
      .catch((error) => {
        console.error(error)
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Insufficient permissions to update this registry."
        })
      })
  }

  const handleDeleteSchool = (id: string, name: string) => {
    if (!db) return
    const docRef = doc(db, "institutions", id);
    deleteDoc(docRef)
      .then(() => {
        toast({
          title: "Instance Deprovisioned",
          description: `${name} has been removed from the ecosystem.`,
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

  const handleSelectInstitution = (id: string, name: string) => {
    localStorage.setItem('selected_institution_id', id);
    localStorage.setItem('selected_institution_name', name);
    toast({
      title: "Switching Context",
      description: `Entering ${name} dashboard...`,
    })
    router.push("/dashboard")
  }

  if (authLoading) return <div className="p-12 text-center font-headline font-bold text-primary animate-pulse">Synchronizing Global Credentials...</div>
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
          <p className="text-muted-foreground text-sm">Strategic multi-tenant management for Yebfa School Manager.</p>
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
                <DialogDescription>Choose an active institution to view its specific academic and financial data.</DialogDescription>
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
                  <DialogDescription>Manually create a new school instance.</DialogDescription>
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

      <div className="max-w-7xl mx-auto w-full">
        <Tabs defaultValue="registry" className="space-y-10">
          <TabsList className="bg-white border p-1 rounded-xl shadow-sm">
            <TabsTrigger value="registry" className="rounded-lg px-6 gap-2">
              <Database className="size-4" /> Institution Registry
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg px-6 gap-2">
              <KeyRound className="size-4" /> System Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registry" className="space-y-10">
            <div className="grid gap-6 md:grid-cols-4">
              {[
                { title: "Active Tenants", value: institutions.filter(i => i.status === 'active').length, icon: School, trend: "Global Registry" },
                { title: "Pending Reviews", value: institutions.filter(i => i.status !== 'active').length, icon: Users, trend: "Registration Queue" },
                { title: "Global Revenue", value: "GH₵---", icon: Wallet, trend: "Fiscal Year 2026" },
                { title: "System Health", value: "100%", icon: Activity, trend: "All Systems Online" }
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
                {dataLoading ? (
                  <div className="p-24 text-center">
                    <Loader2 className="size-8 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-sm text-muted-foreground">Synchronizing Global Ledger...</p>
                  </div>
                ) : institutions.length === 0 ? (
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
                                <button className="text-green-600 hover:bg-green-50 px-3 py-1 rounded border border-green-600 text-[10px] font-bold uppercase" onClick={() => handleApprove(inst.id, inst.name)}>
                                  Approve
                                </button>
                              )}
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-muted-foreground hover:text-primary h-8 w-8"
                                onClick={() => handleEditClick(inst)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-headline font-bold text-primary">Authorize Deprovisioning?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action will permanently remove <strong>{inst.name}</strong> from the global registry. This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl h-11">Reject Delete</AlertDialogCancel>
                                    <AlertDialogAction 
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-11"
                                      onClick={() => handleDeleteSchool(inst.id, inst.name)}
                                    >
                                      Accept Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="max-w-2xl animate-in slide-in-from-left-4 duration-500">
            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
              <CardHeader className="bg-primary text-primary-foreground p-8">
                <CardTitle className="text-2xl font-headline font-bold flex items-center gap-3">
                  <KeyRound className="size-6" /> System Credentials
                </CardTitle>
                <CardDescription className="text-primary-foreground/70">
                  Update the global Super Admin security password for your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleUpdatePassword} className="space-y-6">
                  <Alert className="bg-amber-50 border-amber-100 text-amber-900">
                    <AlertTriangle className="size-5 text-amber-600" />
                    <AlertTitle className="text-xs font-bold uppercase tracking-tight">Security Protocol</AlertTitle>
                    <AlertDescription className="text-xs leading-relaxed mt-1">
                      Firebase requires a <strong>recent login session</strong> to change passwords. If the update fails, please sign out and sign back in to refresh your global token.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Account Identifier</Label>
                      <Input id="adminEmail" readOnly value={user?.email || ""} className="bg-slate-50 font-mono text-sm border-none h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPass">New Security Password</Label>
                      <Input 
                        id="newPass" 
                        type="password" 
                        required 
                        placeholder="Enter new security sequence" 
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="h-11 font-bold"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={updatingPass || !newPass} className="w-full h-12 gap-2 bg-primary font-bold shadow-lg">
                    {updatingPass ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                    Authorize Password Update
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl">
          <form onSubmit={handleUpdateInstitution}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold text-primary">Edit Institution Registry</DialogTitle>
              <DialogDescription>Modify global metadata for this tenant instance.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input 
                  required 
                  value={editSchoolForm.name} 
                  onChange={(e) => setEditSchoolForm({...editSchoolForm, name: e.target.value})} 
                  className="h-11 rounded-xl" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade Level / Category</Label>
                  <Input 
                    required 
                    value={editSchoolForm.gradeLevel} 
                    onChange={(e) => setEditSchoolForm({...editSchoolForm, gradeLevel: e.target.value})} 
                    className="h-11 rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Location</Label>
                  <Input 
                    required 
                    value={editSchoolForm.location} 
                    onChange={(e) => setEditSchoolForm({...editSchoolForm, location: e.target.value})} 
                    className="h-11 rounded-xl" 
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="h-11 px-8 rounded-xl font-bold bg-primary shadow-lg shadow-primary/10">
                Authorize Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
