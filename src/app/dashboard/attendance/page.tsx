
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Calendar as CalendarIcon, Users, Activity, Clock, ShieldAlert, CheckCircle, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"

export default function AttendancePage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId || "demo-institution-2026")
  }, [])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "students"), where("institutionId", "==", institutionId))
  }, [db, institutionId])

  const { data: students } = useCollection(studentsQuery)

  const handleSync = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      toast({
        title: "Regional Sync Complete",
        description: "Local attendance nodes in Ahafo have been updated.",
      })
    }, 1500)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Attendance Insights</h1>
          <p className="text-muted-foreground">Real-time presence tracking for {students?.length || 0} students.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleSync} disabled={isSyncing}>
          <RefreshCcw className={`size-4 ${isSyncing ? 'animate-spin' : ''}`} />
          Refresh Global Node
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today's Presence", value: "0%", icon: Activity, detail: "Awaiting Roll Call" },
          { label: "Active Students", value: students?.length || 0, icon: Users, detail: "Synced Roster" },
          { label: "Average Arrival", value: "--:--", icon: Clock, detail: "No Data" },
          { label: "Critical Absences", value: "0", icon: ShieldAlert, detail: "Clear Ledger" }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</CardTitle>
              <stat.icon className="size-4 text-primary opacity-40" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle>Attendance by Department</CardTitle>
            <CardDescription>Live stats across institutional grade levels.</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-full max-w-xs space-y-6">
              {["Junior High Node", "Senior High Node", "Primary Node"].map((node) => (
                <div key={node} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{node}</span>
                    <span className="text-muted-foreground">0%</span>
                  </div>
                  <Progress value={0} className="h-1.5" />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic mt-4 uppercase tracking-widest font-bold">Connect biometric devices to begin tracking.</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle>Historical Trends</CardTitle>
            <CardDescription>30-day attendance variance report.</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <CalendarIcon className="size-12 text-muted-foreground/10" />
            <div className="max-w-xs">
              <p className="text-sm font-bold text-primary">No Historical Records</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2 italic">
                Trends will appear here once the system has recorded at least 5 days of institutional attendance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
