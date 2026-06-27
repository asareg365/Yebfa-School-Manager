
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, School, Wallet, ShieldCheck, Activity, Plus, Search, Database, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "@/hooks/use-toast"
import { collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc } from "firebase/firestore"

export default function AdminPortal() {
  const { user, loading: authLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const [provisioning, setProvisioning] = useState(false)

  const isSuperAdmin = user?.email === 'asareg365@gmail.com' || user?.email === 'frankyeb@gmail.com'

  const institutionsQuery = query(collection(db, "institutions"), orderBy("createdAt", "desc"))
  const { data: institutions, loading: dataLoading } = useCollection(institutionsQuery)

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push("/dashboard")
    }
  }, [user, authLoading, isSuperAdmin, router])

  const handleProvisionSchool = async () => {
    if (!db || provisioning) return
    setProvisioning(true)
    
    try {
      const demoSchools = ["Greenwood Academy", "Sunshine International", "Ahafo Tech Institute", "Valley View College"]
      const randomSchool = demoSchools[Math.floor(Math.random() * demoSchools.length)]
      
      await addDoc(collection(db, "institutions"), {
        name: randomSchool,
        ownerEmail: `admin@${randomSchool.toLowerCase().replace(/\s/g, "")}.com`,
        type: "Secondary",
        location: "Goaso, Ahafo",
        subscriptionPlan: "premium",
        createdAt: serverTimestamp()
      })

      toast({
        title: "School Provisioned",
        description: `${randomSchool} has been added to the global node.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Provisioning Failed",
        description: error.message
      })
    } finally {
      setProvisioning(false)
    }
  }

  const handleDeleteSchool = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, "institutions", id))
      toast({
        title: "Instance Deprovisioned",
        description: `${name} has been removed from the registry.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message
      })
    }
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
          <p className="text-muted-foreground">Strategic multi-tenant node management for Yebfa School Manager.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard">To Institutional View</Link>
          </Button>
          <Button 
            className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
            onClick={handleProvisionSchool}
            disabled={provisioning}
          >
            {provisioning ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Provision New School
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full space-y-10">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { title: "Active Tenants", value: institutions.length, icon: School, trend: "Global Registry" },
            { title: "Total Users", value: "---", icon: Users, trend: "Across All Nodes" },
            { title: "Global Revenue", value: "GH₵---", icon: Wallet, trend: "Fiscal Year 2026" },
            { title: "System Health", value: "100%", icon: Activity, trend: "All Nodes Online" }
          ].map((stat) => (
            <Card key={stat.title} className="border-none shadow-md bg-white">
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

        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-headline font-bold text-xl text-primary">Institution Registry</CardTitle>
                <CardDescription>Management of multi-tenant instance deployments.</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input placeholder="Search registry..." className="pl-9" />
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
                  <p className="text-sm text-muted-foreground">
                    As of 2026, no school instances have been provisioned. Use the provision button above to begin.
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>School Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Owner Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutions.map((inst: any) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-bold text-primary">{inst.name}</TableCell>
                      <TableCell>{inst.type}</TableCell>
                      <TableCell>{inst.location}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{inst.ownerEmail}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-none uppercase text-[9px] font-bold">
                          {inst.subscriptionPlan}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteSchool(inst.id, inst.name)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
