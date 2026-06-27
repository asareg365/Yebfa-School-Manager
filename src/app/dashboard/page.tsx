
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, Wallet, Clock, Activity, ArrowUpRight, TrendingUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { collection, query, where } from "firebase/firestore"

export default function Dashboard() {
  const { user, loading: authLoading } = useUser()
  const db = useFirestore()
  const institutionId = "demo-institution-2026"

  const studentsQuery = query(collection(db, "students"), where("institutionId", "==", institutionId))
  const { data: students } = useCollection(studentsQuery)

  const staffQuery = query(collection(db, "staff"), where("institutionId", "==", institutionId))
  const { data: staff } = useCollection(staffQuery)

  if (authLoading) return (
    <div className="p-10 text-center space-y-4">
      <Activity className="size-10 text-primary animate-spin mx-auto" />
      <p className="font-headline font-bold text-muted-foreground animate-pulse">Synchronizing Academic Node...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">Institutional Overview</h1>
          <p className="text-muted-foreground">Welcome, {user?.displayName || 'Administrator'}. Global node status: <span className="text-green-600 font-bold">Online</span></p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/logs">System Logs</Link>
          </Button>
          <Button size="sm" className="bg-primary" asChild>
            <Link href="/dashboard/students">Enroll Student</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Student Roster", value: students.length, icon: GraduationCap, label: "Total Active Enrollment" },
          { title: "Presence Avg", value: "0%", icon: Clock, label: "Last 7 Business Days" },
          { title: "Fiscal Intake", value: "GH₵ 0.00", icon: Wallet, label: "Current Term Collection" },
          { title: "Faculty Node", value: staff.length, icon: Users, label: "Verified Staff Members" }
        ].map((stat) => (
          <Card key={stat.title} className="overflow-hidden border-none shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center">
                <stat.icon className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-md bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Real-time Presence Trend</CardTitle>
              <CardDescription>Automated tracking across all grade modules.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0"><ArrowUpRight className="size-4" /></Button>
          </CardHeader>
          <CardContent className="h-[320px] flex flex-col items-center justify-center border-t pt-6 space-y-6">
            <div className="w-full max-w-md text-center space-y-4">
              <Activity className="size-16 text-muted-foreground/10 mx-auto" />
              <div>
                <p className="text-sm font-bold text-primary">Awaiting Roll Call Data</p>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  No attendance vectors detected for the current session. Biometric and manual logs will populate here.
                </p>
              </div>
              <Progress value={0} className="h-1.5 w-full bg-muted" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-none shadow-md bg-white overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Institutional Calendar</CardTitle>
            <CardDescription>Upcoming milestones for Term 2, 2026.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[280px] flex flex-col items-center justify-center text-center p-8 space-y-4 bg-muted/5">
              <div className="size-14 rounded-full bg-background border flex items-center justify-center shadow-sm">
                <Clock className="size-6 text-muted-foreground/30" />
              </div>
              <div className="max-w-xs">
                <p className="text-sm font-bold text-primary">Schedule Synchronized</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-2 uppercase tracking-tight">
                  No academic events detected for the next cycle. Plan your curriculum to populate the timeline.
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-4 font-bold h-8 text-[10px]" asChild>
                <Link href="/dashboard/academic">Manage Curriculum</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
