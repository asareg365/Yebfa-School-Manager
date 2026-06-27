
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, GraduationCap, ClipboardList, Plus, Search, Calendar, BookCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function AcademicPage() {
  const handleAction = (title: string) => {
    toast({
      title: `${title} Active`,
      description: `Accessing institutional ${title.toLowerCase()} node for Term 2, 2026...`,
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Academic Ledger</h1>
          <p className="text-muted-foreground">Manage curriculum, examination schedules, and grading schemes.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => handleAction("Export Syllabi")}>
            <Calendar className="size-4" /> Term Calendar
          </Button>
          <Button className="gap-2 bg-primary" onClick={() => handleAction("New Subject")}>
            <Plus className="size-4" /> Add Subject
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { title: "Curriculum Map", icon: BookOpen, desc: "Review and edit subject syllabi for Term 2, 2026.", count: "12 Subjects" },
          { title: "Exam Scheduler", icon: GraduationCap, desc: "Coordinate mid-term and final examination dates.", count: "Next: June 15" },
          { title: "Grading Schema", icon: ClipboardList, desc: "Standardize grading across all institutional grade levels.", count: "Active: GH-WAEC" }
        ].map((item) => (
          <Card 
            key={item.title}
            className="cursor-pointer hover:border-primary/40 transition-all hover:shadow-lg bg-white border-none shadow-md group"
            onClick={() => handleAction(item.title)}
          >
            <CardHeader>
              <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <item.icon className="size-6 text-primary group-hover:text-white" />
              </div>
              <CardTitle className="mt-4">{item.title}</CardTitle>
              <CardDescription>{item.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-bold uppercase tracking-widest">{item.count}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Departmental Syllabus Registry</CardTitle>
              <CardDescription>Live tracking of curriculum completion status.</CardDescription>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search curriculum..." className="pl-9 h-10 bg-slate-50 border-none" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-16 flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center">
            <BookCheck className="size-10 text-primary/30" />
          </div>
          <div className="max-w-sm">
            <h3 className="text-xl font-bold text-primary">Syllabus Node Synchronized</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed italic">
              Academic records are currently being synchronized with regional nodes. Active course materials will populate here shortly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
