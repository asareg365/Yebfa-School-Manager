"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Calendar as CalendarIcon, Users } from "lucide-react"

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Attendance Insights</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today's Attendance", value: "94%", trend: "+2%" },
          { label: "Total Students Present", value: "842", trend: "Normal" },
          { label: "Late Arrivals", value: "12", trend: "-5" },
          { label: "Authorized Absences", value: "8", trend: "+1" }
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance by Class</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {["SHS 1", "SHS 2", "SHS 3", "JHS 1"].map((cls) => (
              <div key={cls} className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>{cls}</span>
                  <span>92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Flagged Absences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8 space-y-4">
              <Users className="size-12 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">No students have been flagged for consecutive absences this week.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}