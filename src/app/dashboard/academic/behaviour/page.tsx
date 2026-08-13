"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Bot, 
  Sparkles, 
  Loader2, 
  ShieldAlert, 
  Search,
  Database,
  ArrowUpRight,
  Target,
  FileText,
  RefreshCw,
  Activity,
  History,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  MessageSquare,
  Users,
  Flag
} from "lucide-react"
import { analyzeBehaviour, BehaviourOutput } from "@/ai/flows/analyze-behaviour-flow"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function BehaviourAnalysisPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BehaviourOutput | null>(null)

  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [teacherContext, setTeacherContext] = useState("")

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const studentsQuery = useMemo(() => institutionId && selectedGrade ? query(collection(db, "students"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade)) : null, [db, institutionId, selectedGrade])
  const examsQuery = useMemo(() => institutionId && selectedStudentId ? query(collection(db, "exam_records"), where("studentId", "==", selectedStudentId)) : null, [db, institutionId, selectedStudentId])
  const attendanceQuery = useMemo(() => institutionId && selectedStudentId ? query(collection(db, "attendance"), where("studentId", "==", selectedStudentId)) : null, [db, institutionId, selectedStudentId])
  const disciplineQuery = useMemo(() => institutionId && selectedStudentId ? query(collection(db, "discipline_records"), where("studentId", "==", selectedStudentId)) : null, [db, institutionId, selectedStudentId])

  const { data: classes = [] } = useCollection(classesQuery)
  const { data: students = [] } = useCollection(studentsQuery)
  const { data: examRecords = [] } = useCollection(examsQuery)
  const { data: attendanceDocs = [] } = useCollection(attendanceQuery)
  const { data: disciplineRecords = [] } = useCollection(disciplineQuery)

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId])

  const handleRunAnalysis = async () => {
    if (!selectedStudent) {
      toast({ variant: "destructive", title: "Missing Registry Context", description: "Select a student to authorize behavioural analysis." })
      return
    }

    setLoading(true)
    try {
      // Aggregate Data for AI
      const scores = examRecords.map((e: any) => e.totalScore).filter(s => typeof s === 'number')
      const totalDays = attendanceDocs.length
      const presentDays = attendanceDocs.filter((a: any) => a.status === 'present').length
      const attendancePercent = totalDays > 0 ? (presentDays / totalDays) * 100 : 100
      
      const incidents = disciplineRecords.map((d: any) => ({
        date: d.date || "N/A",
        category: d.category || "General",
        severity: d.severity || "Minor",
        description: d.description || ""
      }))

      const res = await analyzeBehaviour({
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        gradeLevel: selectedGrade,
        attendancePercentage: Math.round(attendancePercent),
        recentScores: scores.length > 0 ? scores : [75, 80], // Fallback for demo
        disciplineIncidents: incidents,
        teacherContext: teacherContext
      })
      
      setResult(res)
      toast({ title: "Analysis Synchronized", description: "Strategic behavioural markers have been computed." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Error", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Critical': case 'At-Risk': return 'text-red-600 bg-red-50 border-red-100'
      case 'Concerning': return 'text-orange-600 bg-orange-50 border-orange-100'
      case 'Stable': return 'text-blue-600 bg-blue-50 border-blue-100'
      default: return 'text-green-600 bg-green-50 border-green-100'
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Immediate': return 'bg-red-600'
      case 'Elevated': return 'bg-orange-500'
      default: return 'bg-blue-600'
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Behaviour Analysis</h1>
          <p className="text-muted-foreground font-medium">Predicting socio-emotional risks and intervention requirements using Vertex AI.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-primary text-primary-foreground p-8 shrink-0">
               <div className="flex items-center gap-3 mb-2">
                 <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><BrainCircuit className="size-5" /></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Predictive Parameters</span>
               </div>
               <CardTitle className="text-2xl font-headline font-bold">Target Context</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Grade Module</Label>
                  <Select value={selectedGrade} onValueChange={v => { setSelectedGrade(v); setSelectedStudentId(""); }}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.name || c.id}>
                          {c.name || "Unnamed Class"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Student Identity</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedGrade}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Student" /></SelectTrigger>
                    <SelectContent>
                      {students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qualitative Observations</Label>
                  <Textarea 
                    placeholder="Mention specific classroom dynamics or social changes..." 
                    className="min-h-[120px] rounded-xl"
                    value={teacherContext}
                    onChange={e => setTeacherContext(e.target.value)}
                  />
               </div>

               {selectedStudent && (
                 <div className="p-4 rounded-2xl bg-slate-50 border space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase"><span>Discipline Logs</span><span className="text-primary">{disciplineRecords.length} Incidents</span></div>
                    <div className="flex justify-between text-[10px] font-bold uppercase"><span>Presence</span><span className="text-primary">{attendanceDocs.length > 0 ? Math.round((attendanceDocs.filter((a:any)=>a.status==='present').length / attendanceDocs.length)*100) : 100}%</span></div>
                 </div>
               )}

               <Button 
                onClick={handleRunAnalysis} 
                disabled={loading || !selectedStudentId} 
                className="w-full h-16 text-lg font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20 gap-3"
               >
                 {loading ? <Loader2 className="size-6 animate-spin" /> : <Sparkles className="size-6 text-accent" />}
                 Authorize Analysis
               </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!result ? (
            <Card className="border-none shadow-md h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 space-y-6 rounded-3xl bg-muted/5 border-2 border-dashed">
              <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center">
                <Flag className="size-12 text-primary/20" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-xl font-bold text-primary/60 font-headline">Awaiting Behavioral Roster</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Authorize a deep-dive analysis to correlate discipline records with academic trends and identify intervention needs.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-primary text-primary-foreground p-8">
                     <div className="flex justify-between items-start">
                        <div className="space-y-2">
                           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest text-accent">
                              <Activity className="size-3" /> Behavioural Intelligence Sync
                           </div>
                           <CardTitle className="text-3xl font-headline font-bold">Conduct Pulse: {selectedStudent?.firstName}</CardTitle>
                           <CardDescription className="text-primary-foreground/70">Strategic Behavioural Mapping & Psychological Vectors</CardDescription>
                        </div>
                        <Bot className="size-12 opacity-20" />
                     </div>
                  </CardHeader>
                  <CardContent className="p-8 md:p-10 space-y-10">
                     <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <div className={`p-6 rounded-2xl border flex flex-col gap-4 ${getStatusColor(result.behaviouralAnalysis.status)}`}>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Health Status</span>
                              <Badge className="bg-white/50 border-none font-bold text-[8px] uppercase">{result.behaviouralAnalysis.status}</Badge>
                           </div>
                           <div className="text-3xl font-bold font-headline">{result.behaviouralAnalysis.score}/100</div>
                        </div>
                        <div className={`p-6 rounded-2xl border bg-white flex flex-col gap-4`}>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Intervention Urgency</span>
                              <Badge className={`${getUrgencyBadge(result.interventionMap.urgency)} text-white border-none font-bold text-[8px] uppercase`}>{result.interventionMap.urgency}</Badge>
                           </div>
                           <div className="text-sm font-bold text-primary">Strategic Priority Level</div>
                        </div>
                     </div>

                     <section className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2">
                          <FileText className="size-4 text-primary" /> Professional Narrative
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-700 font-medium bg-slate-50 p-6 rounded-2xl border italic">
                          "{result.behaviouralAnalysis.narrative}"
                        </p>
                     </section>

                     <div className="grid gap-8 md:grid-cols-2">
                        <section className="space-y-4">
                           <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                             <Target className="size-4 text-primary" /> Strategic Interventions
                           </h3>
                           <div className="grid gap-3">
                              {result.interventionMap.recommendedActions.map((action, i) => (
                                <div key={i} className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs font-bold text-primary">
                                   <span className="text-accent">{i+1}.</span>
                                   {action}
                                </div>
                              ))}
                           </div>
                        </section>
                        <section className="space-y-4">
                           <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                             <BrainCircuit className="size-4 text-primary" /> Counseling Directives
                           </h3>
                           <div className="p-6 rounded-2xl border bg-slate-50 space-y-4">
                              {result.interventionMap.counselingGoals.map((goal, i) => (
                                <div key={i} className="flex items-start gap-3">
                                   <div className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                                   <p className="text-xs text-slate-600 leading-relaxed font-medium">{goal}</p>
                                </div>
                              ))}
                           </div>
                        </section>
                     </div>

                     <div className="pt-8 border-t flex justify-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
                           <CheckCircle2 className="size-3 text-green-600" /> Authorized Behavioural Audit • Guidance Hub 2026
                        </p>
                     </div>
                  </CardContent>
               </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
