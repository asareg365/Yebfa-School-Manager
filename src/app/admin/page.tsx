
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, School, Wallet, ShieldCheck, Activity, Plus, Search, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useUser } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "@/hooks/use-toast"

export default function AdminPortal() {
  const { user, loading } = useUser()
  const router = useRouter()

  const isSuperAdmin = user?.email === 'asareg365@gmail.com' || user?.email === 'frankyeb@gmail.com'

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push("/dashboard")
    }
  }, [user, loading, isSuperAdmin, router])

  const handleProvisionSchool = () => {
    toast({
      title: "Global Provisioning Active",
      description: "Initializing a new secure multi-tenant node for the requested institution...",
    })
  }

  if (loading) return <div className="p-12 text-center font-headline font-bold">Verifying Global Credentials...</div>
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
          >
            <Plus className="size-4" /> Provision New School
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full space-y-10">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { title: "Active Tenants", value: "0", icon: School, trend: "Awaiting Data Sync" },
            { title: "Total Users", value: "0", icon: Users, trend: "System Initialized" },
            { title: "Global Revenue", value: "GH₵0.00", icon: Wallet, trend: "Fiscal Year 2026" },
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
                <CardTitle className="font-headline font-bold text-xl">Institution Registry</CardTitle>
                <CardDescription>Management of multi-tenant instance deployments.</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input placeholder="Search registry..." className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-[400px] flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="size-20 rounded-full bg-muted flex items-center justify-center">
              <Database className="size-10 text-muted-foreground/20" />
            </div>
            <div className="max-w-sm">
              <h3 className="text-lg font-bold text-primary">No Registered Tenants</h3>
              <p className="text-sm text-muted-foreground">
                As of 2026, no school instances have been provisioned in this security context. Use the provision button above to begin.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
