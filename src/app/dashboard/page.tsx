'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, Wallet, Clock, Activity, ArrowUpRight, PlayCircle, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { collection, query, where } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"
import { generateDemoVideo } from "@/ai/flows/generate-demo-video"
import { toast } from "@/hooks/use-toast"

export default function Dashboard() {
  const { user, loading: authLoading } = useUser()
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const myInstitutionsQuery = useMemo(() => {
    if (!db || !user?.email) return null;
    return query(collection(db, "institutions"), where("ownerEmail", "==", user.email));
  }, [db, user?.email]);

  const { data: myInstitutions, loading: instLoading } = useCollection(myInstitutionsQuery);

  useEffect(() => {
    if (!authLoading && !instLoading && !institutionId && myInstitutions && myInstitutions.length > 0) {
      const first = myInstitutions[0];
      localStorage.setItem('selected_institution_id', first.id);
      localStorage.setItem('selected_institution_name', first.name);
      setInstitutionId(first.id);
      toast({
        title: "System Synchronized",
        description: `Connected to ${first.name} dashboard.`,
      });
    }
  }, [myInstitutions, institutionId, authLoading, instLoading]);

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "students"), where("institutionId", "==", institutionId))
  }, [db, institutionId])

  const staffQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "staff"), where("institutionId", "==", institutionId))
  }, [db, institutionId])

  const { data: students, loading: studentsLoading } = useCollection(studentsQuery)
  const { data: staff, loading: staffLoading } = useCollection(staffQuery)

  const handleGenerateVideo = async () => {
    setVideoLoading(true)
    try {
      const result = await generateDemoVideo()
      const win = window.open()
      if (win) {
        win.document.write(`<video controls autoplay src="${result.videoUrl}" style="width:100%; height:100%;"></video>`)
      }
      toast({ title: "Walkthrough Generated", description: "The AI cinematic walkthrough is ready." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Video Failed", description: error.message })
    } finally {
      setVideoLoading(false)
    }
  }

  if (authLoading || (institutionId && (studentsLoading || staffLoading))) return (
    <div className="p-10 text-center space-y-4">
      <Activity className="size-10 text-primary animate-spin mx-auto" />
      <p className="font-headline font-bold text-muted-foreground animate-pulse">Synchronizing Dashboard...</p>
    </div>
  )

  if (!institutionId && !instLoading) {
    return (
      <div className="p-12 text-center space-y-6">
        <div className="size-20 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Activity className="size-10 text-muted-foreground/30" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-headline">System Hub Offline</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">Please visit the Admin Hub to select or provision an active school instance.</p>
        </div>
        <Button asChild className="h-11 px-8"><Link href="/admin">Visit Admin Hub</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">Institutional Overview</h1>
          <p className="text-muted-foreground">Welcome, {user?.displayName || 'Administrator'}. Global system status: <span className="text-green-600 font-bold">Online</span></p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2" 
            onClick={handleGenerateVideo} 
            disabled={videoLoading}
          >
            {videoLoading ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
            AI Video Tour
          </Button>
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
          { title: "Student Roster", value: students?.length || 0, icon: GraduationCap, label: "Total Active Enrollment" },
          { title: "Presence Avg", value: "0%", icon: Clock, label: "Last 7 Business Days" },
          { title: "Fiscal Intake", value: `GH₵ ${(students?.length || 0) * 1200}`, icon: Wallet, label: "Current Term Collection" },
          { title: "Faculty", value: staff?.length || 0, icon: Users, label: "Verified Staff Members" }
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
              <CardTitle className="text-lg">Real-time Presence Hub</CardTitle>
              <CardDescription>Automated tracking across all grade modules.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0"><ArrowUpRight className="size-4" /></Button>
          </CardHeader>
          <CardContent className="h-[320px] flex flex-col items-center justify-center border-t pt-6 space-y-6">
            <div className="w-full max-w-md text-center space-y-4">
              <Activity className="size-16 text-muted-foreground/10 mx-auto" />
              <div>
                <p className="text-sm font-bold text-primary">Awaiting Attendance Data</p>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  No attendance records detected for the current session. Biometric and manual logs will populate here.
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
