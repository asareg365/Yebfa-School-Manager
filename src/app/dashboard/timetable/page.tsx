
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
  Utensils,
  Settings,
  PlusCircle,
  Timer
} from "lucide-react"
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, setDoc, serverTimestamp, deleteDoc, updateDoc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { optimizeTimetable, TimetableOutput } from "@/ai/flows/optimize-timetable-flow"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

const DEFAULT_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM", "02:30 PM"
]

const DEFAULT_BREAKS: Record<string, { label: string, type: 'coffee' | 'utensils', duration: string }> = {
  "10:00 AM": { label: "Short Break", type: 'coffee', duration: "30 Mins" },
  "12:30 PM": { label: "Lunch Break", type: 'utensils', duration: "60 Mins" }
}

const ICON_MAP = {
  coffee: Coffee,
  utensils: Utensils
}

export default function TimetablePage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassId] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  
  const [aiResult, setAiResult] = useState<TimetableOutput | null>(null)

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

  const timetableConfig = useMemo(() => institution?.timetableConfig || {
    slots: DEFAULT_SLOTS,
    breaks: DEFAULT_BREAKS
  }, [institution]);

  const TIMES = timetableConfig.slots;
  const BREAKS = timetableConfig.breaks;

  const [manualSlot, setManualSlot] = useState({
    day: "Monday",
    time: TIMES[0] || "08:00 AM",
    subjectId: "",
    subject: "",
    teacherId: "",
    teacher: "",
    isDoublePeriod: false
  })

  const [configForm, setConfigForm] = useState(timetableConfig);

  useEffect(() => {
    if (institution?.timetableConfig) {
      setConfigForm(institution.timetableConfig);
    }
  }, [institution?.timetableConfig]);

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
    if (!selectedClassId || !institutionId) return
    setLoading(true)
    try {
      const res = await optimizeTimetable({
        institutionId,
        classId: selectedClassId,
        gradeName: selectedClass?.name || "Class",
        termId: currentTerm
      })
      setAiResult(res)
      toast({ title: "Optimized Schedule Ready" })
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
      toast({ title: "Timetable Synchronized" })
      setAiResult(null)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed" })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!instRef) return;
    setSaving(true);
    try {
      await updateDoc(instRef, {
        timetableConfig: configForm,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Configuration Updated" });
      setIsConfigOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setSaving(false);
    }
  };

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

  const handleSlotPlaceholderClick = (day: string, time: string) => {
    if (isTeacher || BREAKS[time]) return;
    setManualSlot(prev => ({ ...prev, day, time }));
    setIsManualOpen(true);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Timetable Optimizer</h1>
          <p className="text-muted-foreground font-medium">Dynamic Grid • <span className="text-accent font-bold uppercase">{currentTerm}</span>.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => window.print()}>
            <Printer className="size-4" /> Print PDF
          </Button>
          {!isTeacher && (
            <>
              <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => setIsConfigOpen(true)}>
                <Settings className="size-4" /> Config Hub
              </Button>
              <Button 
                className="bg-primary h-11 rounded-xl shadow-lg gap-2" 
                onClick={handleOptimize}
                disabled={loading || !selectedClassId}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4 text-accent" />}
                AI Optimize
              </Button>
            </>
          )}
          {aiResult && !isTeacher && (
            <Button className="bg-green-600 hover:bg-green-700 h-11 rounded-xl shadow-lg gap-2" onClick={() => handleSaveTimetable(aiResult.schedule)} disabled={saving}>
              <Save className="size-4" /> Save Preview
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4 no-print">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-primary text-primary-foreground p-8 shrink-0">
               <CardTitle className="text-2xl font-headline font-bold">Parameters</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label>Select Grade Module</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                  <SelectContent>
                    {classes.filter(c => !!c.id).map(c => <SelectItem key={c.id} value={c.id || c.name || "unspecified"}>{c.name || "Unnamed Class"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {(aiResult || activeTimetable) && (
            <Card id="printable-timetable-grid" className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white print:shadow-none print:border print:rounded-none">
              <CardHeader className="bg-slate-50 border-b p-8 print:bg-white">
                 <CardTitle className="text-xl font-headline font-bold">Instructional Grid: {selectedClass?.name}</CardTitle>
                 <CardDescription>Academic Session 2026/2027 • Official Registry</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                 <table className="w-full border-collapse">
                    <thead>
                       <tr className="bg-muted/30">
                          <th className="p-6 border-r border-b text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-40">Period</th>
                          {DAYS.map(day => <th key={day} className="p-6 border-b text-[10px] font-bold uppercase tracking-widest text-primary text-center">{day}</th>)}
                       </tr>
                    </thead>
                    <tbody>
                       {TIMES.map((time) => {
                         const breakData = BREAKS[time]
                         if (breakData) {
                           return (
                             <tr key={time} className="bg-slate-100/50 border-b">
                               <td className="p-4 border-r text-[10px] font-black text-primary/40 text-center">{time}</td>
                               <td colSpan={5} className="p-4 text-center">
                                 <span className="text-xs font-black uppercase tracking-widest text-primary">{breakData.label} ({breakData.duration})</span>
                               </td>
                             </tr>
                           )
                         }

                         return (
                           <tr key={time} className="group">
                              <td className="p-6 border-r border-b text-xs font-bold text-muted-foreground bg-slate-50/30">{time}</td>
                              {DAYS.map(day => {
                                const slot = getSlotData(day, time)
                                return (
                                  <td 
                                    key={`${day}-${time}`} 
                                    className="p-4 border-b group-hover:bg-slate-50/50 transition-colors relative cursor-pointer"
                                    onClick={() => !slot && handleSlotPlaceholderClick(day, time)}
                                  >
                                     {slot ? (
                                       <div className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${slot.isDoublePeriod ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-100'} ${slot.occupancy === 'extended' ? 'opacity-60' : ''}`}>
                                          <p className="font-bold text-primary text-xs mb-1 line-clamp-1">{slot.subject}</p>
                                          <div className="flex items-center justify-between">
                                             <span className="text-[10px] font-bold text-muted-foreground truncate">{slot.teacher}</span>
                                             {slot.occupancy === 'primary' && !isTeacher && !aiResult && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSlot(day, time); }} className="text-destructive opacity-0 group-hover:opacity-100 p-1 no-print">
                                                   <Trash2 className="size-3" />
                                                </button>
                                             )}
                                          </div>
                                       </div>
                                     ) : (
                                       <div className="h-20 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 no-print">
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

      <style jsx global>{`
        @media print {
          #printable-timetable-grid {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            visibility: visible !important;
            display: block !important;
            z-index: 10000 !important;
          }

          body * {
            visibility: hidden;
          }

          #printable-timetable-grid, #printable-timetable-grid * {
            visibility: visible !important;
          }
        }
      `}</style>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl h-[80vh] flex flex-col">
          <DialogHeader className="p-8 bg-primary text-primary-foreground shrink-0">
             <DialogTitle className="text-2xl font-headline font-bold">Grid Infrastructure</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
             <div className="p-8 space-y-8">
                <section className="space-y-4">
                   <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">Time Slots</h4>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setConfigForm({...configForm, slots: [...configForm.slots, "00:00 AM"]})}>Add Slot</Button>
                   </div>
                   <div className="grid gap-3 sm:grid-cols-2">
                      {configForm.slots.map((s, i) => (
                        <div key={i} className="flex gap-2 items-center group">
                           <Input value={s} onChange={e => {
                              const newSlots = [...configForm.slots];
                              newSlots[i] = e.target.value;
                              setConfigForm({...configForm, slots: newSlots});
                            }} className="h-10 rounded-xl" />
                           <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setConfigForm({...configForm, slots: configForm.slots.filter((_, idx) => idx !== i)})}><Trash2 className="size-4" /></Button>
                        </div>
                      ))}
                   </div>
                </section>
             </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-slate-50 border-t">
             <Button className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl" onClick={handleSaveConfig} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                Synchronize Grid
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
