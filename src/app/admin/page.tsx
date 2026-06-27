
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, School, Wallet, ShieldCheck, Activity, Plus, Search, Database, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { toast } from "@/hooks/use-toast"
import { collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function AdminPortal() {
  const { user, loading: authLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  
  const [provisioning, setProvisioning] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newSchool, setNewSchool] = useState({
    name: "",
    ownerEmail: "",
    type: "Secondary",
    location: "Goaso, Ahafo"
  })

  const isSuperAdmin = user?.email === 'asareg365@gmail.com' || user?.email === 'frankyeb@gmail.com'

  const institutionsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "institutions"), orderBy("createdAt", "desc"));
  }, [db]);

  const { data: institutions, loading: dataLoading } = useCollection(institutionsQuery)

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push("/dashboard")
    }
  }, [user, authLoading, isSuperAdmin, router])

  const handleManualProvision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || provisioning) return

    // Prevent Duplicates
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
      setIsDialogOpen(false)
      setNewSchool({ name: "", ownerEmail: "", type: "Secondary", location: "Goaso, Ahafo" })
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
    const docRef = doc(db, "institutions", id)
    try {
      await updateDoc(docRef, { status: "active" })
      toast({
        title: "Registration Approved",
        description: `${name} has been activated.`,
      })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Approval Failed", description: error.message })
    }
  }

  const handleDeleteSchool = (id: string, name: string) => {
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

  if (authLoading) return <div className="p-12 text-center font-headline font-bold">Verifying Global Credentials...</div>
  if (!isSuperAdmin) return null

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest">
            <ShieldCheck className="size-3" /> System Super Admin
          </div>
          <h1 className="text-4xl font-headline font-bold text-primary">Global Enterprise Hub</h1>
          <p className="text-muted-foreground text-sm">Strategic multi-tenant node management for Yebfa School Manager.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" asChild className="h-11">
            <Link href="/dashboard">To Institutional View</Link>
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 h-11">
                <Plus className="size-4" /> Provision New School
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleManualProvision}>
                <DialogHeader>
                  <DialogTitle>Provision Institution</DialogTitle>
                  <DialogDescription>Manually create a new school instance. This will bypass the review process.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">School Name</Label>
                    <Input id="name" required value={newSchool.name} onChange={(e) => setNewSchool({...newSchool, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Owner Email</Label>
                    <Input id="email" type="email" required value={newSchool.ownerEmail} onChange={(e) => setNewSchool({...newSchool, ownerEmail: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Input id="type" value={newSchool.type} onChange={(e) => setNewSchool({...newSchool, type: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loc">Location</Label>
                      <Input id="loc" value={newSchool.location} onChange={(e) => setNewSchool({...newSchool, location: e.target.value})} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={provisioning}>
                    {provisioning ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
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
            <Card key={stat.title} className="border-none shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className="size-4 text-primary opacity-50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-headline">{stat.value}</div>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-lg bg-white overflow-hidden">
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
            {institutions.length === 0 && !dataLoading ? (
              <div className="flex flex-col items-center justify-center text-center p-20 space-y-4">
                <div className="size-20 rounded-full bg-muted flex items-center justify-center">
                  <Database className="size-10 text-muted-foreground/20" />
                </div>
                <div className="max-w-sm">
                  <h3 className="text-lg font-bold text-primary">No Registered Tenants</h3>
                  <p className="text-sm text-muted-foreground">As of 2026, no school instances have been provisioned.</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>School Name</TableHead>
                    <TableHead>Owner / Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutions.map((inst: any) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-bold text-primary">
                        {inst.name}
                        {inst.status === 'pending_review' && <Badge className="ml-2 bg-amber-500">New</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{inst.ownerName || 'Unknown Owner'}</span>
                          <span className="text-[10px] text-muted-foreground">{inst.ownerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{inst.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase ${inst.status === 'active' ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>
                          {inst.status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-none uppercase text-[9px] font-bold">
                          {inst.subscriptionPlan || 'basic'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inst.status !== 'active' && (
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 h-8" onClick={() => handleApprove(inst.id, inst.name)}>
                              Approve
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                            onClick={() => handleDeleteSchool(inst.id, inst.name)}
                          >
                            <Trash2 className="size-4" />
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
