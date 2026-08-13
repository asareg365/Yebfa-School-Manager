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
  Grid3X3,
  BookOpen,
  Sparkles,
  Bot,
  CheckCircle2,
  ShieldCheck,
  User,
  X,
  Save,
  Trash2,
  Lock,
  AlertTriangle,
  Coffee,
  Utensils
} from "lucide-react"
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { optimizeTimetable, TimetableOutput } from "@/ai/flows/optimize-timetable-flow"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

// GMT Greenwich Mean Time - Ghanaian Academic Cycle
const TIMES = [
  "08:00 AM", // Period 1
  "09:00 AM", // Period 2
  "10:00 AM", // SHORT BREAK (30 mins)
  "10:30 AM", // Period 3
  "11:30 AM", // Period 4
  "12:30 PM", // LUNCH BREAK (60 mins)
  "01:30 PM", // Period 5
  "02:30 PM"  // Period 6
]

const BREAKS: Record<string, { label: string, icon: any, duration: string }> = {
  "10:00 AM": { label: "Short Break", icon: Coffee, duration: "30 Mins" },
  "12:30 PM": { label: "Lunch Break", icon: Utensils, duration: "60 Mins" }
}

export default function TimetablePage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassId] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isManualOpen, setIsManualOpen] = useState(false)
  
  const [aiResult, setAiResult] = useState<TimetableOutput | null>(null)

  const [manualSlot, setManualSlot] = useState({
    day: "Monday",
    time: "08:00 AM",
    subjectId: "",
    subject: "",
    teacherId: "",
    teacher: "",
    isDoublePeriod: false
  })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)
  const isTeacher = profile?.role === 'teacher'
  const staffId = profile?.staffId

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)
  const currentTerm = institution?.currentTerm || "Term 1"

  const assignmentsQuery = useMemoFirebase(() => {
    if (!db || !institutionId || !isTeacher || !staffId) return null
    return query(collection(db, "teacher_assignments"), where("tenantId", "==", institutionId), where("teacherId", "==", staffId))
  }, [db, institutionId, isTeacher, staffId])
  
  const { data: assignments = [] } = useCollection(assignmentsQuery)
  const assignedClassIds = useMemo(() => new Set(assignments.map((a: any) => a.classId)), [assignments])

  const classesQuery = useMemoFirebase(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const subjectsQuery = useMemoFirebase(() => institutionId ? query(collection(db, "subjects"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const staffQuery = useMemoFirebase(() => institutionId ? query(collection(db, "staff"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  
  const termTimetablesQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "timetables"), 
          where("tenantId", "==", institutionId), 
          where("termId", "==", currentTerm))
      : null, 
    [db, institutionId, currentTerm]
  )

  const { data: allClasses = [] } = useCollection(classesQuery)
  const { data: subjects = [] } = useCollection(subjectsQuery)
  const { data: staff = [] } = useCollection(staffQuery)
  const { data: allTimetables = [], loading: tLoading } = useCollection(termTimetablesQuery)

  const classes = useMemo(() => isTeacher ? allClasses.filter(c => assignedClassIds.has(c.id)) : allClasses, [allClasses, isTeacher, assignedClassIds])
  const activeTimetable = useMemo(() => allTimetables.find((t: any) => t.classId === selectedClassId) || null, [allTimetables, selectedClassId])
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
        termId: currentTerm,
        context: "Prefer core subjects like Math and English in the morning. Adhere to GMT breaks."
      })
      setAiResult(res)
      toast({ title: "Optimized Schedule Ready", description: "Strategic periods have been mapped. Review and save to finalize." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Error", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTimetable = async (schedule: any[]) => {
    if (!institutionId || !selectedClassId) return
    setSaving(true)
    try {
      const timetableId = `${selectedClassId}_${currentTerm.replace(/\s+/g, '')}`
      await setDoc(doc(db, "timetables", timetableId), {
        tenantId: institutionId,
        institutionId,
        classId: selectedClassId,
        className: selectedClass?.name,
        termId: currentTerm,
        slots: schedule,
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      toast({ title: "Timetable Finalized", description: "Records synchronized with institutional hub." })
      setAiResult(null)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const checkSlotOccupied = (day: string, time: string, tId: string, currentClassOnly = false) => {
    if (BREAKS[time]) return { type: 'break', name: BREAKS[time].label };

    for (const tt of allTimetables) {
      if (currentClassOnly && tt.classId !== selectedClassId) continue;
      
      const slots = tt.slots || [];
      for (const s of slots) {
        const isTimeMatch = s.time === time;
        const isDoubleCover = s.isDoublePeriod && TIMES[TIMES.indexOf(s.time) + 1] === time;
        
        if (s.day === day && (isTimeMatch || isDoubleCover)) {
          if (tt.classId === selectedClassId) return { type: 'class', name: tt.className };
          if (s.teacherId === tId) return { type: 'teacher', name: s.teacher, className: tt.className };
        }
      }
    }
    return null;
  }

  const handleAddManualSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!institutionId || !selectedClassId || !manualSlot.subjectId || !manualSlot.teacherId) return
    
    if (BREAKS[manualSlot.time]) {
      toast({ variant: "destructive", title: "Institutional Break", description: "Teaching periods cannot be scheduled during breaks." });
      return;
    }

    const timeIdx = TIMES.indexOf(manualSlot.time);
    const slotsToCheck = [manualSlot.time];
    if (manualSlot.isDoublePeriod) {
      if (timeIdx === TIMES.length - 1) {
        toast({ variant: "destructive", title: "Invalid Duration", description: "Double periods cannot start at the final time slot." });
        return;
      }
      const nextTime = TIMES[timeIdx + 1];
      if (BREAKS[nextTime]) {
        toast({ variant: "destructive", title: "Break Conflict", description: "Double periods cannot overlap with scheduled breaks." });
        return;
      }
      slotsToCheck.push(nextTime);
    }

    for (const checkTime of slotsToCheck) {
      const conflict = checkSlotOccupied(manualSlot.day, checkTime, manualSlot.teacherId);
      if (conflict) {
        if (conflict.type === 'class') {
          toast({ variant: "destructive", title: "Slot Occupied", description: `This class already has a period at ${checkTime} on ${manualSlot.day}.` });
        } else if (conflict.type === 'teacher') {
          toast({ variant: "destructive", title: "Teacher Conflict", description: `${conflict.name} is already teaching ${conflict.className} at ${checkTime}.` });
        }
        return;
      }
    }

    setSaving(true)
    try {
      const currentSlots = activeTimetable?.slots || []
      const newSlots = [...currentSlots, manualSlot]
      
      const timetableId = `${selectedClassId}_${currentTerm.replace(/\s+/g, '')}`
      await setDoc(doc(db, "timetables", timetableId), {
        tenantId: institutionId,
        institutionId,
        classId: selectedClassId,
        className: selectedClass?.name,
        termId: currentTerm,
        slots: newSlots,
        updatedAt: serverTimestamp()
      }, { merge: true })

      toast({ title: "Slot Authorized", description: "Period successfully registered." })
      setIsManualOpen(false)
      setManualSlot({ day: "Monday", time: "08:00 AM", subjectId: "", subject: "", teacherId: "", teacher: "", isDoublePeriod: false })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed" })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSlot = async (day: string, time: string) => {
    if (!institutionId || !selectedClassId || !activeTimetable) return
    const newSlots = activeTimetable.slots.filter((s: any) => !(s.day === day && s.time === time))
    
    setSaving(true)
    try {
      const timetableId = `${selectedClassId}_${currentTerm.replace(/\s+/g, '')}`
      await setDoc(doc(db, "timetables", timetableId), {
        slots: newSlots,
        updatedAt: serverTimestamp()
      }, { merge: true })
      toast({ title: "Period Removed" })
    } catch (e) {
      toast({ variant: "destructive", title: "Action Failed" })
    } finally {
      setSaving(false)
    }
  }

  const getSlotData = (day: string, time: string) => {
    const source = aiResult?.schedule || activeTimetable?.slots || []
    const exact = source.find((s: any) => s.day === day && s.time === time)
    if (exact) return { ...exact, occupancy: 'primary' }
    
    const timeIndex = TIMES.indexOf(time)
    if (timeIndex > 0) {
      const prevTime = TIMES[timeIndex - 1]
      const prevSlot = source.find((s: any) => s.day === day && s.time === prevTime)
      if (prevSlot?.isDoublePeriod) {
        return { ...prevSlot, occupancy: 'extended' }
      }
    }
    return null
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Timetable Optimizer</h1>
          <p className="text-muted-foreground font-medium">GMT Ghanaian Academic Cycle • <span className="text-accent font-bold uppercase">{currentTerm}</span>.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => window.print()}>
            <Printer className="size-4" /> Print PDF
          </Button>
          {!isTeacher && (
            <Button 
              className="bg-primary h-11 rounded-xl shadow-lg gap-2" 
              onClick={handleOptimize}
              disabled={loading || !selectedClassId}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4 text-accent" />}
              AI Optimize
            </Button>
          )}
          {aiResult && !isTeacher && (
            <Button className="bg-green-600 hover:bg-green-700 h-11 rounded-xl shadow-lg gap-2" onClick={() => handleSaveTimetable(aiResult.schedule)} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Preview
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-6 no-print">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-primary text-primary-foreground p-8 shrink-0">
               <div className="flex items-center gap-3 mb-2">
                 <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><Grid3X3 className="size-5" /></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Grid Control</span>
               </div>
               <CardTitle className="text-2xl font-headline font-bold">Parameters</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label>Select Grade Module</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name || "Unnamed Class"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {(aiResult || activeTimetable) && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                   <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="size-3 text-green-600" /> Registry Status
                      </p>
                      <p className="text-xs font-medium text-slate-700 leading-relaxed italic">
                        {aiResult ? "AI Optimization Active" : "Institutional Record Verified"}
                      </p>
                   </div>
                   <div className="pt-4 border-t flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">GMT Node</span>
                      <Badge className="bg-primary text-white border-none text-[8px] font-bold uppercase">SYNCED</Badge>
                   </div>
                </div>
              )}

              {!isTeacher && (
                <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-11 rounded-xl border-dashed" disabled={loading || !selectedClassId}>
                       <Plus className="size-4 mr-2" /> Manual Period Allocation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md rounded-2xl">
                     <form onSubmit={handleAddManualSlot}>
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold font-headline">Manual Assignment</DialogTitle>
                          <DialogDescription>Assign instructional time within the GMT cycle. Breaks are strictly reserved.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-6">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5"><Label>Day</Label>
                                <Select value={manualSlot.day} onValueChange={v => setManualSlot({...manualSlot, day: v})}>
                                   <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                   <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-1.5"><Label>Time Slot</Label>
                                <Select value={manualSlot.time} onValueChange={v => setManualSlot({...manualSlot, time: v})}>
                                   <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                     {TIMES.map(t => (
                                       <SelectItem key={t} value={t} disabled={!!BREAKS[t]}>
                                         {t} {BREAKS[t] ? `(${BREAKS[t].label})` : ""}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                </Select>
                             </div>
                          </div>
                          <div className="space-y-1.5"><Label>Subject</Label>
                             <Select onValueChange={v => {
                               const sub = subjects.find(s => s.id === v);
                               setManualSlot({...manualSlot, subjectId: v, subject: sub?.name || "Unspecified"});
                             }}>
                                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choose Subject" /></SelectTrigger>
                                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name || "Unnamed Subject"}</SelectItem>)}</SelectContent>
                             </Select>
                          </div>
                          <div className="space-y-1.5"><Label>Teacher</Label>
                             <Select onValueChange={v => {
                               const st = staff.find(s => s.id === v);
                               setManualSlot({...manualSlot, teacherId: v, teacher: st ? `${st.firstName} ${st.lastName}` : "Unspecified"});
                             }}>
                                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choose Faculty" /></SelectTrigger>
                                <SelectContent>{staff.map(st => <SelectItem key={st.id} value={st.id}>{st.firstName} {st.lastName}</SelectItem>)}</SelectContent>
                             </Select>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                             <Checkbox id="double" checked={manualSlot.isDoublePeriod} onCheckedChange={v => setManualSlot({...manualSlot, isDoublePeriod: !!v})} />
                             <Label htmlFor="double" className="cursor-pointer">Double Period (60 + 60 mins)</Label>
                          </div>
                        </div>
                        <DialogFooter>
                           <Button type="submit" className="w-full h-12 rounded-xl bg-primary font-bold shadow-lg" disabled={saving}>
                              {saving ? <Loader2 className="size-4 mr-2" /> : "Authorize Assignment"}
                           </Button>
                        </DialogFooter>
                     </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {(!aiResult && !activeTimetable && !loading) ? (
            <Card className="border-none shadow-md h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 space-y-6 rounded-3xl bg-muted/5 border-2 border-dashed">
              <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center">
                <Calendar className="size-12 text-primary/20" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-xl font-bold text-primary/60 font-headline">Registry Context Required</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Select a grade level to load the current GMT schedule or activate AI optimization for strategic period placement.
                </p>
              </div>
            </Card>
          ) : loading ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center space-y-6 bg-white rounded-3xl shadow-xl">
               <div className="relative">
                  <Loader2 className="size-16 animate-spin text-primary" />
                  <Sparkles className="absolute -top-2 -right-2 size-6 text-accent animate-bounce" />
               </div>
               <div className="text-center space-y-2">
                  <p className="font-headline font-bold text-xl text-primary animate-pulse">Processing GMT Optimization...</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Integrating Breaks & Balancing Teacher Loads</p>
               </div>
            </div>
          ) : (
            <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b flex flex-col sm:flex-row items-center justify-between p-8 gap-4">
                 <div>
                    <CardTitle className="text-xl font-headline font-bold">Weekly Instructional Grid: {selectedClass?.name}</CardTitle>
                    <CardDescription>Academic Session 2026/2027 • Official GMT Registry</CardDescription>
                 </div>
                 <div className="flex items-center gap-3">
                    {aiResult && <Badge className="bg-accent text-accent-foreground font-bold uppercase text-[9px] px-3 animate-pulse">AI Preview Active</Badge>}
                    <Badge variant="outline" className="bg-white text-primary border-primary/20 font-bold uppercase text-[9px] px-3 shadow-sm">VERIFIED 2026</Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                 <table className="w-full border-collapse">
                    <thead>
                       <tr className="bg-muted/30">
                          <th className="p-6 border-r border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-40">Period Time</th>
                          {DAYS.map(day => <th key={day} className="p-6 border-b text-[10px] font-bold uppercase tracking-widest text-primary text-center">{day}</th>)}
                       </tr>
                    </thead>
                    <tbody>
                       {TIMES.map((time) => {
                         const breakData = BREAKS[time]
                         if (breakData) {
                           const BreakIcon = breakData.icon
                           return (
                             <tr key={time} className="bg-slate-100/50 border-b">
                               <td className="p-4 border-r text-[10px] font-black text-primary/40 uppercase bg-slate-200/50 text-center">
                                 <div className="flex flex-col items-center">
                                   <Clock className="size-3 mb-1" />
                                   {time}
                                 </div>
                               </td>
                               <td colSpan={5} className="p-4 text-center">
                                 <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/80 border shadow-sm">
                                   <BreakIcon className="size-4 text-accent" />
                                   <span className="text-xs font-black uppercase tracking-widest text-primary">{breakData.label}</span>
                                   <Badge variant="outline" className="text-[8px] font-bold border-accent/20 text-accent">{breakData.duration}</Badge>
                                 </div>
                               </td>
                             </tr>
                           )
                         }

                         return (
                           <tr key={time} className="group">
                              <td className="p-6 border-r border-b text-xs font-bold text-muted-foreground bg-slate-50/30">
                                 <div className="flex items-center gap-2"><Clock className="size-3" /> {time}</div>
                              </td>
                              {DAYS.map(day => {
                                const slot = getSlotData(day, time)
                                return (
                                  <td key={`${day}-${time}`} className="p-4 border-b group-hover:bg-slate-50/50 transition-colors relative">
                                     {slot ? (
                                       <div className={`p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] cursor-default shadow-sm ${slot.isDoublePeriod ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-100'} ${slot.occupancy === 'extended' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                          <div className="flex justify-between items-start mb-2">
                                             <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">
                                               {slot.occupancy === 'extended' ? 'CONT.' : slot.time}
                                             </span>
                                             {slot.isDoublePeriod && <Badge className="bg-primary text-white text-[7px] h-3 px-1 border-none">DOUBLE</Badge>}
                                          </div>
                                          <p className="font-bold text-primary text-xs mb-1 line-clamp-1">{slot.subject}</p>
                                          <div className="flex items-center justify-between gap-1.5">
                                             <div className="flex items-center gap-1 opacity-60">
                                                <User className="size-2.5" />
                                                <span className="text-[10px] font-bold truncate max-w-[80px]">{slot.teacher}</span>
                                             </div>
                                             {slot.occupancy === 'primary' && !isTeacher && !aiResult && (
                                                <button onClick={() => handleDeleteSlot(day, time)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded-md">
                                                   <Trash2 className="size-3.5" />
                                                </button>
                                             )}
                                          </div>
                                          {slot.occupancy === 'extended' && (
                                            <div className="absolute top-2 right-2">
                                               <Lock className="size-2.5 text-muted-foreground opacity-40" />
                                            </div>
                                          )}
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
                         )
                       })}
                    </tbody>
                 </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <div className="flex justify-center pt-8 no-print">
         <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
            <ShieldCheck className="size-3 text-green-600" /> Authorized Academic Grid • 2026 Registry Hub • GMT Node
         </p>
      </div>
    </div>
  )
}
