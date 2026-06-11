
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, Wallet, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useUser } from "@/firebase"

export default function Dashboard() {
  const { user, loading } = useUser()

  if (loading) return <div className="p-10 text-center">Loading dashboard...</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">Academic Overview</h1>
        <p className="text-muted-foreground">Welcome back, {user?.displayName || 'Administrator'}. Here's what's happening today.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Students", value: "--", icon: GraduationCap, label: "Syncing..." },
          { title: "Average Attendance", value: "--%", icon: Clock, label: "Syncing..." },
          { title: "Fee Collection", value: "GH₵--", icon: Wallet, label: "Syncing..." },
          { title: "Staff Members", value: "--", icon: Users, label: "Syncing..." }
        ].map((stat) => (
          <Card key={stat.title} className="overflow-hidden border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center">
                <stat.icon className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
            <CardDescription>Real-time attendance tracking across grade levels.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-t border-border/40 pt-6">
            <div className="w-full text-center space-y-4">
              <p className="text-sm text-muted-foreground italic">No attendance records found for this term.</p>
              <Progress value={0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>No events scheduled for the next 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex flex-col items-center justify-center text-center p-6 space-y-2 border-dashed border-2 border-muted rounded-lg">
              <p className="text-sm font-medium">Clear Calendar</p>
              <p className="text-xs text-muted-foreground">Add new events via the academic ledger.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
