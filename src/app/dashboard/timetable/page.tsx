
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Loader2, 
  Download, 
  Printer, 
  Filter,
  Grid3X3,
  BookOpen
} from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const TIMES = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM"]

export default function TimetablePage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState("")

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const { data: classes } = useCollection(classesQuery)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Institutional Timetable</h1>
          <p className="text-muted-foreground">Managing instructional periods and faculty schedules.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl gap-2"><Printer className="size-4" /> Print PDF</Button>
          <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2"><Plus className="size-4" /> Add Period</Button>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="flex items-center gap-4 w-full md:w-auto">
               <Select value={selectedClass} onValueChange={setSelectedClass}>
                 <SelectTrigger className="w-full md:w-64 h-12 rounded-xl"><SelectValue placeholder="Select Class Grade" /></SelectTrigger>
                 <SelectContent>
                   {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                 </SelectContent>
               </Select>
               <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-white border"><Filter className="size-4" /></Button>
             </div>
             <div className="flex items-center gap-2">
               <Badge className="bg-primary/5 text-primary border-none text-[10px] font-bold py-1 px-3">TERM 2: 2026/2027</Badge>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
           {!selectedClass ? (
             <div className="p-32 text-center space-y-4">
                <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto text-primary/20"><Calendar className="size-10" /></div>
                <div className="max-w-xs mx-auto">
                  <h3 className="font-bold text-lg">Awaiting Grade Context</h3>
                  <p className="text-sm text-muted-foreground mt-2 italic">Select a class module to generate and view instructional period allocations.</p>
                </div>
             </div>
           ) : (
             <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="p-4 border-r border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32">Time / Day</th>
                    {DAYS.map(day => <th key={day} className="p-4 border-b text-[10px] font-bold uppercase tracking-widest text-primary">{day}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {TIMES.map((time, i) => (
                    <tr key={time}>
                      <td className="p-4 border-r border-b text-xs font-bold text-muted-foreground bg-slate-50/50">{time}</td>
                      {DAYS.map(day => (
                        <td key={`${day}-${time}`} className="p-2 border-b group hover:bg-slate-50 transition-colors">
                           <div className="min-h-[60px] rounded-xl border-2 border-dashed border-muted/50 flex flex-col items-center justify-center p-2 opacity-30 group-hover:opacity-100 group-hover:border-primary/20 transition-all">
                              <Plus className="size-4 text-muted-foreground mb-1" />
                              <span className="text-[10px] font-bold uppercase">Assign Period</span>
                           </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
             </table>
           )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase opacity-70">Instructional Hours</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-headline">0 / 40 hrs</div></CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase opacity-70">Conflict Status</CardTitle></CardHeader>
          <CardContent><Badge className="bg-green-500/10 text-green-600 border-none font-bold uppercase text-[9px]">All Clear</Badge></CardContent>
        </Card>
      </div>
    </div>
  )
}
