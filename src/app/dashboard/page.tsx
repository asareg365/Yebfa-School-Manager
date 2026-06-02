import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, TrendingUp, DollarSign, Calendar, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

const stats = [
  {
    title: "Total Students",
    value: "1,248",
    change: "+12% from last term",
    icon: GraduationCap,
    trend: "up"
  },
  {
    title: "Average Attendance",
    value: "94.2%",
    change: "+2% this month",
    icon: Clock,
    trend: "up"
  },
  {
    title: "Fee Collection",
    value: "$42,500",
    change: "85% collected",
    icon: DollarSign,
    trend: "neutral"
  },
  {
    title: "Staff Members",
    value: "86",
    change: "Active status",
    icon: Users,
    trend: "neutral"
  }
]

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">Academic Overview</h1>
        <p className="text-muted-foreground">Welcome back, Administrator. Here's what's happening at your school today.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white">
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
              <p className="text-xs text-muted-foreground mt-1">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
            <CardDescription>Daily attendance overview across all grades.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-t border-border/40 pt-6">
            <div className="w-full space-y-4">
              {['Grade 10', 'Grade 11', 'Grade 12', 'Grade 9'].map((grade) => (
                <div key={grade} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{grade}</span>
                    <span className="text-muted-foreground">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Key dates for the next 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { event: "Mid-Term Exams", date: "Oct 12", type: "academic" },
                { event: "Staff Meeting", date: "Oct 14", type: "admin" },
                { event: "Sports Day", date: "Oct 16", type: "social" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center size-12 rounded-lg bg-accent/10 text-accent font-bold">
                    <span className="text-xs uppercase leading-none">Oct</span>
                    <span className="text-lg leading-none">{12 + i * 2}</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{item.event}</p>
                    <p className="text-xs text-muted-foreground">Whole School</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">{item.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}