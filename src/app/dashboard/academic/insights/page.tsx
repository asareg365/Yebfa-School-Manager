"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Bot, 
  Sparkles, 
  Loader2, 
  TrendingDown, 
  AlertTriangle, 
  Wallet, 
  UserCheck, 
  ShieldAlert, 
  Search,
  Database,
  ArrowUpRight,
  Target,
  FileText,
  RefreshCw,
  Activity,
  History,
  CheckCircle2
} from "lucide-react"
import { analyzeAcademicRisk, AnalyzeRiskOutput } from "@/ai/flows/analyze-academic-risk"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export default function StrategicInsightsPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeRiskOutput | null>(null)

  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const studentsQuery = useMemo(() => institutionId && selectedGrade ? query(collection(db, "students"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade)) : null, [db, institutionId, selectedGrade])
  const examsQuery = useMemo(() => institutionId && selectedStudentId ? query(collection(db, "exam_records"), where("studentId", "==", selectedStudentId)) : null, [db, institutionId, selectedStudentId])
  const attendanceQuery = useMemo(() => institutionId && selectedStudentId ? query(collection(db, "attendance"), where("studentId", "==", selectedStudentId)) : null, [db, institutionId, selectedStudentId])
  const ledgerQuery = useMemo(() => institutionId && selectedStudentId ? query(collection(db, "student_ledger"), where("studentId", "==", selectedStudentId)) : null, [db, institutionId, selectedStudentId])

  const { data: classes = [] } = useCollection(classesQuery)
  const { data: students = [] } = useCollection(studentsQuery)
  const { data: examRecords = [] } = useCollection(examsQuery)
  const { data: attendanceDocs = [] } = useCollection(attendanceQuery)
  const { data: ledger = [] } = useCollection(ledgerQuery)

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId])

  const handleExecuteAnalysis = async () => {
    if (!selectedStudent) {
      toast({ variant: "destructive", title: "Missing Registry Context", description: "Select a student to authorize AI prediction." })
      return
    }

    setLoading(true)
    try {
      // Aggregate Data for AI
      const scores = examRecords.map((e: any) => e.totalScore).filter(s => typeof s === 'number')
      const totalDays = attendanceDocs.length
      const presentDays = attendanceDocs.filter((a: any) => a.status === 'present').length
      const attendancePercent = totalDays > 0 ? (presentDays / totalDays) * 100 : 100
      const balance = ledger.reduce((acc, curr: any) => curr.type === 'charge' ? acc + curr.amount : acc - curr.amount, 0)
      const payHistory = ledger.filter((l: any) => l.type === 'payment').length > 0 ? "Irregular" : "None" // Simplified logic

      const res = await analyzeAcademicRisk({
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        gradeLevel: selectedGrade,
        recentScores: scores.length > 0 ? scores : [70, 75], // Fallback if no scores
        attendancePercentage: Math.round(attendancePercent),
        feeBalance: balance,
        paymentFrequency: payHistory,
        behavioralNotes: "Student shows varied engagement levels across different subjects."
      })
      setResult(res)
      toast({ title: "Analysis Finalized", description: "Strategic risk vectors have been synchronized." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Error", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-red-600'
      case 'High': return 'bg-orange-500'
      case 'Moderate': return 'bg-amber-500'
      default: return 'bg-green-600'
    }
  }

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-red-50 text-red-700 border-red-200'
      case 'High': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'Moderate': return 'bg-amber-50 text-amber-700 border-amber-200'
      default: return 'bg-green-50 text-green-700 border-green-200'
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Strategic Student Insights</h1>
          <p className="text-muted-foreground font-medium">Predicting institutional risk factors using data-synced Vertex AI.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-primary text-primary-foreground p-8 shrink-0">
               <div className="flex items-center gap-3 mb-2">
                 <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><Database className="size-5" /></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Registry Synchronizer</span>
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

               {selectedStudent && (
                 <div className="p-4 rounded-2xl bg-slate-50 border space-y-3">
                    <div className="flex justify-between text-xs"><span>Current Attendance</span><span className="font-bold">{attendanceDocs.length > 0 ? Math.round((attendanceDocs.filter((a:any)=>a.status==='present').length / attendanceDocs.length)*100) : 100}%</span></div>
                    <div className="flex justify-between text-xs"><span>Ledger Balance</span><span className="font-bold text-destructive">GH₵ {ledger.reduce((a,c:any)=>c.type==='charge'?a+c.amount:a-c.amount, 0).toLocaleString()}</span></div>
                 </div>
               )}

               <Button 
                onClick={handleExecuteAnalysis} 
                disabled={loading || !selectedStudentId} 
                className="w-full h-16 text-lg font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20 gap-3"
               >
                 {loading ? <Loader2 className="size-6 animate-spin" /> : <Sparkles className="size-6 text-accent" />}
                 Execute Risk Prediction
               </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!result ? (
            <Card className="border-none shadow-md h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 space-y-6 rounded-3xl bg-muted/5 border-2 border-dashed">
              <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center">
                <ShieldAlert className="size-12 text-primary/20" />
              </div>
              <div className="max-sm">
                <h3 className="text-xl font-bold text-primary/60 font-headline">System Ready for Analysis</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Authorize a deep-dive analysis to predict dropout probability, academic trends, and financial risks for the selected student.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <Card className="border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
                  <CardHeader className="bg-primary text-primary-foreground p-8">
                     <div className="flex justify-between items-start">
                        <div className="space-y-2">
                           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest text-accent">
                              <Activity className="size-3" /> Predictive Intelligence Sync
                           </div>
                           <CardTitle className="text-3xl font-headline font-bold">Institutional Pulse: {selectedStudent?.firstName}</CardTitle>
                           <CardDescription className="text-primary-foreground/70">Strategic Risk Vectors & Recommended Interventions</CardDescription>
                        </div>
                        <Bot className="size-12 opacity-20" />
                     </div>
                  </CardHeader>
                  <CardContent className="p-8 md:p-10 space-y-10">
                     <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[
                          { title: "Dropout Risk", metric: result.dropoutRisk, icon: AlertTriangle },
                          { title: "Academic Stability", metric: { level: result.academicDecline.status, narrative: result.academicDecline.narrative }, icon: TrendingDown },
                          { title: "Attendance Health", metric: result.attendanceIssues, icon: UserCheck },
                          { title: "Solvency Risk", metric: result.feeDefaultRisk, icon: Wallet }
                        ].map((risk, i) => (
                          <div key={i} className={`p-5 rounded-2xl border flex flex-col gap-3 ${getRiskBg(risk.metric.level as string)}`}>
                             <div className="flex justify-between items-center">
                                <risk.icon className="size-5 opacity-60" />
                                <Badge className={`${getRiskColor(risk.metric.level as string)} text-white border-none text-[8px] font-bold uppercase`}>{risk.metric.level}</Badge>
                             </div>
                             <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{risk.title}</p>
                             </div>
                          </div>
                        ))}
                     </div>

                     <section className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2">
                          <FileText className="size-4 text-primary" /> Performance Narrative
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-700 font-medium bg-slate-50 p-6 rounded-2xl border italic">
                          "{result.executiveSummary}"
                        </p>
                     </section>

                     <div className="grid gap-8 md:grid-cols-2">
                        <section className="space-y-4">
                           <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                             <Target className="size-4 text-primary" /> Strategic Interventions
                           </h3>
                           <div className="grid gap-3">
                              {result.strategicInterventions.map((step, i) => (
                                <div key={i} className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs font-bold text-primary">
                                   <span className="text-accent">{i+1}.</span>
                                   {step}
                                </div>
                              ))}
                           </div>
                        </section>
                        <section className="space-y-4">
                           <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                             <History className="size-4 text-primary" /> Predictive Detail
                           </h3>
                           <div className="p-6 rounded-2xl border bg-slate-50 space-y-6">
                              <div className="space-y-2">
                                 <p className="text-[10px] font-bold uppercase text-muted-foreground">Dropout Context</p>
                                 <p className="text-xs text-slate-600 leading-relaxed font-medium">{result.dropoutRisk.narrative}</p>
                              </div>
                              <div className="space-y-2">
                                 <p className="text-[10px] font-bold uppercase text-muted-foreground">Financial Context</p>
                                 <p className="text-xs text-slate-600 leading-relaxed font-medium">{result.feeDefaultRisk.narrative}</p>
                              </div>
                           </div>
                        </section>
                     </div>

                     <div className="pt-8 border-t flex justify-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
                           <CheckCircle2 className="size-3 text-green-600" /> Authorized Academic Analysis • Global Ecosystem 2026
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
