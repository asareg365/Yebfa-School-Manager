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
  BookOpen,
  Sparkles,
  Bot,
  Zap,
  CheckCircle2,
  ShieldCheck,
  MoreVertical,
  X
} from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { optimizeTimetable, TimetableOutput } from "@/ai/flows/optimize-timetable-flow"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const TIMES = ["08:00 AM", "09:00 AM", "11:00 AM", "01:00 PM", "02:00 PM"]

export default function TimetablePage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassId] = useState("")
  const [loading, setLoading] = useState(false)
  const [aiResult, setAiResult] = useState<TimetableOutput | null>(null)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const { data: classes = [] } = useCollection(classesQuery)

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId])

  const handleOptimize = async () => {
    if (!selectedClassId || !institutionId) {
      toast({ variant: "destructive", title: "Grade Selection Required", description: "Select a class to authorize AI optimization." })
      return
    }

    setLoading(true)
    try {
      const res = await optimizeTimetable({
        institutionId,
        classId: selectedClassId,
        gradeName: selectedClass?.name || "Class",
        context: "Prefer math in the morning. Ensure teachers have at least 1 hour gap between long sessions."
      })
      setAiResult(res)
      toast({ title: "Timetable Optimized", description: "Strategic instructional periods have been mapped." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Error", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const getSlot = (day: string, timePrefix: string) => {
    if (!aiResult) return null
    return aiResult.schedule.find(s => s.day === day && s.time.startsWith(timePrefix))
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Timetable Optimizer</h1>
          <p className="text-muted-foreground font-medium">AI-driven instructional period allocation and faculty workload balancing.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => window.print()}>
            <Printer className="size-4" /> Print Registry
          </Button>
          <Button 
            className="bg-primary h-11 rounded-xl shadow-lg gap-2" 
            onClick={handleOptimize}
            disabled={loading || !selectedClassId}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-accent" />}
            Authorize AI Optimization
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-primary text-primary-foreground p-8 shrink-0">
               <div className="flex items-center gap-3 mb-2">
                 <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><Bot className="size-5" /></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Scheduler Parameters</span>
               </div>
               <CardTitle className="text-2xl font-headline font-bold">Grade Context</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label>Target Grade Module</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {aiResult && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                   <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="size-3 text-green-600" /> Optimization Report
                      </p>
                      <p className="text-xs font-medium text-slate-700 leading-relaxed italic">
                        "{aiResult.optimizationReport.workloadBalance}"
                      </p>
                   </div>
                   <div className="pt-4 border-t flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Conflict Status</span>
                      <Badge className="bg-green-600 text-white border-none text-[8px] font-bold uppercase">Optimal</Badge>
                   </div>
                </div>
              )}

              <div className="pt-4">
                <Button variant="outline" className="w-full h-11 rounded-xl border-dashed" disabled={loading}>
                   <Plus className="size-4 mr-2" /> Manual Slot Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!aiResult && !loading ? (
            <Card className="border-none shadow-md h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 space-y-6 rounded-3xl bg-muted/5 border-2 border-dashed">
              <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center">
                <Calendar className="size-12 text-primary/20" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-xl font-bold text-primary/60 font-headline">Awaiting Grade Authorization</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Select a grade module to activate the AI Optimizer. The system will automatically build a balanced schedule based on teacher availability and subject load.
                </p>
              </div>
            </Card>
          ) : loading ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center space-y-6">
               <div className="relative">
                  <Loader2 className="size-16 animate-spin text-primary" />
                  <Sparkles className="absolute -top-2 -right-2 size-6 text-accent animate-bounce" />
               </div>
               <div className="text-center space-y-2">
                  <p className="font-headline font-bold text-xl text-primary animate-pulse">Computing Optimal Schedule...</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Balancing Teacher Workload & Subject Density</p>
               </div>
            </div>
          ) : (
            <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between p-8">
                 <div>
                    <CardTitle className="text-xl font-headline font-bold">Weekly Instructional Grid: {selectedClass?.name}</CardTitle>
                    <CardDescription>Academic Session 2026/2027 • Term 2 Registry</CardDescription>
                 </div>
                 <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white text-primary border-primary/20 font-bold uppercase text-[9px] px-3">Synced 2026</Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                 <table className="w-full border-collapse">
                    <thead>
                       <tr className="bg-muted/30">
                          <th className="p-6 border-r border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-40">Time Period</th>
                          {DAYS.map(day => <th key={day} className="p-6 border-b text-[10px] font-bold uppercase tracking-widest text-primary text-center">{day}</th>)}
                       </tr>
                    </thead>
                    <tbody>
                       {TIMES.map((time, i) => (
                         <tr key={time} className="group">
                            <td className="p-6 border-r border-b text-xs font-bold text-muted-foreground bg-slate-50/30">
                               <div className="flex items-center gap-2"><Clock className="size-3" /> {time}</div>
                            </td>
                            {DAYS.map(day => {
                              const slot = getSlot(day, time.substring(0, 2))
                              return (
                                <td key={`${day}-${time}`} className="p-4 border-b group-hover:bg-slate-50/50 transition-colors">
                                   {slot ? (
                                     <div className={`p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] cursor-default shadow-sm ${slot.isDoublePeriod ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-100'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                           <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">{slot.time}</span>
                                           {slot.isDoublePeriod && <Badge className="bg-primary text-white text-[7px] h-3 px-1 border-none">DOUBLE</Badge>}
                                        </div>
                                        <p className="font-bold text-primary text-xs mb-1 line-clamp-1">{slot.subject}</p>
                                        <div className="flex items-center gap-1.5 opacity-60">
                                           <User className="size-2.5" />
                                           <span className="text-[10px] font-bold truncate max-w-[80px]">{slot.teacher}</span>
                                        </div>
                                     </div>
                                   ) : (
                                     <div className="h-20 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="size-4 text-muted-foreground/30" />
                                     </div>
                                   )}
                                </td>
                              )
                            })}
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">{children}</label>
}
