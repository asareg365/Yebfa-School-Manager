
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, School, Wallet, ShieldCheck, Globe, Activity, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { useUser } from "@/firebase"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminPortal() {
  const { user, loading } = useUser()
  const router = useRouter()

  // Simplified super admin check for MVP
  const isSuperAdmin = user?.email === 'asareg365@gmail.com' || user?.email === 'frankyeb@gmail.com'

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push("/dashboard")
    }
  }, [user, loading, isSuperAdmin, router])

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
          <p className="text-muted-foreground">Overview across all school instances and multi-tenant nodes.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard"><ArrowLeft className="mr-2 size-4" /> To Institutional View</Link>
          </Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Plus className="size-4" /> Provision New School
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full space-y-10">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { title: "Active Tenants", value: "148", icon: School, trend: "+12 this month" },
            { title: "Total Users", value: "85.2k", icon: Users, trend: "+5.4% YoY" },
            { title: "Global Revenue", value: "GH₵4.2M", icon: Wallet, trend: "Recurring (Annual)" },
            { title: "System Health", value: "99.98%", icon: Activity, trend: "Live (US-Central)" }
          ].map((stat) => (
            <Card key={stat.title} className="border-none shadow-md bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className="size-4 text-primary opacity-50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-headline">{stat.value}</div>
                <p className="text-[10px] text-green-600 font-medium mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-headline font-bold text-xl">Recent Institution Provisioning</CardTitle>
                <CardDescription>Live tracking of multi-tenant instance deployments.</CardDescription>
              </div>
              <Button variant="ghost" className="text-xs text-primary underline">Export Audit Log</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Greenwood Academy", plan: "Premium", loc: "Accra", status: "Active" },
                  { name: "Ridge Preparatory", plan: "Enterprise", loc: "Kumasi", status: "Active" },
                  { name: "Sunset High", plan: "Basic", loc: "Cape Coast", status: "Trial" },
                  { name: "Volta Tech Institute", plan: "Premium", loc: "Ho", status: "Pending Migration" }
                ].map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold">{row.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/5 text-primary text-[10px] uppercase">{row.plan}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.loc}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${row.status === 'Active' ? 'bg-green-500' : 'bg-orange-400'}`} />
                        <span className="text-xs font-medium">{row.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Audit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ArrowLeft(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}
