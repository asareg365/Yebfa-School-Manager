"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { generateStudentReportComments, GenerateStudentReportCommentsOutput } from "@/ai/flows/generate-student-report-comments"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Loader2, 
  Sparkles, 
  GraduationCap, 
  Copy, 
  Check, 
  Target, 
  Lightbulb, 
  ListChecks, 
  Database,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ClipboardList,
  User,
  Medal
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ReportsPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateStudentReportCommentsOutput | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [classPosition, setClassPosition] = useState("")
  const [behaviorNotes, setBehaviorNotes] = useState("")

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)
  
  const currentTerm = institution?.currentTerm || "Term 1"

  const classesQuery = useMemo(() => 
    institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  const studentsQuery = useMemo(() => 
    institutionId && selectedGrade ? query(collection(db, "students"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade)) : null, 
    [db, institutionId, selectedGrade]
  )
  const subjectsQuery = useMemo(() => 
    institutionId ? query(collection(db, "subjects"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  const examsQuery = useMemo(() => 
    institutionId && selectedStudentId ? query(collection(db, "exam_records"), where("studentId", "==", selectedStudentId), where("termId", "==", currentTerm)) : null, 
    [db, institutionId, selectedStudentId, currentTerm]
  )
  const attendanceQuery = useMemo(() => 
    institutionId && selectedStudentId ? query(collection(db, "attendance"), where("studentId", "==", selectedStudentId)) : null, 
    [db, institutionId, selectedStudentId]
  )

  const { data: classes = [] } = useCollection(classesQuery)
  const { data: students = [] } = useCollection(studentsQuery)
  const { data: subjects = [] } = useCollection(subjectsQuery)
  const { data: examRecords = [] } = useCollection(examsQuery)
  const { data: attendanceDocs = [] } = useCollection(attendanceQuery)

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId])

  const aggregatedMetrics = useMemo(() => {
    const totalDays = attendanceDocs.length
    const daysPresent = attendanceDocs.filter((a: any) => a.status === 'present').length
    const attendancePercent = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 100

    const examScores = examRecords.map((e: any) => {
      const subjectDoc = subjects.find(s => s.id === e.subjectId)
      const subjectName = subjectDoc?.name || "Academic Subject"
      return {
        name: subjectName,
        score: typeof e.totalScore === 'number' ? e.totalScore : 0
      }
    })

    return {
      attendancePercent,
      examScores: examScores.length > 0 ? examScores : [{ name: "General Studies", score: 0 }]
    }
  }, [attendanceDocs, examRecords, subjects])

  const handleGenerate = async () => {
    if (!selectedStudent) {
      toast({ variant: "destructive", title: "Selection Required", description: "Please select a student from the registry." })
      return
    }

    setLoading(true)
    setErrorMessage(null)
    try {
      const payload = {
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        subject: "General Academic Performance",
        gradeLevel: selectedGrade,
        examScores: aggregatedMetrics.examScores,
        attendancePercentage: aggregatedMetrics.attendancePercent,
        classPosition: classPosition || "Not specified",
        behaviorNotes: behaviorNotes || "Good overall participation and conduct."
      }

      const output = await generateStudentReportComments(payload)
      
      if (output.error) {
        setErrorMessage(output.error)
      } else {
        setResult(output)
        toast({ title: "Report Generated", description: "Qualitative narrative synchronized." })
      }
    } catch (error: any) {
      setErrorMessage(error.message || "An unexpected error occurred during processing.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (result && selectedStudent) {
      const text = `Official Academic Report: ${selectedStudent.firstName} ${selectedStudent.lastName}\n\nSummary: ${result.executiveSummary}\n\nNarrative: ${result.finalGradeNarrative}`
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: "Copied to Clipboard" })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">Pedagogical Narratives</h1>
        <p className="text-muted-foreground font-medium">Generating high-fidelity qualitative reports for <span className="text-accent font-bold uppercase">{currentTerm}</span>.</p>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 rounded-3xl p-8 border-2 animate-in slide-in-from-top-4">
          <div className="flex items-start gap-6">
            <div className="size-14 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="size-8 text-red-600" />
            </div>
            <div className="space-y-4">
              <AlertTitle className="text-xl font-bold font-headline">Institutional AI Setup Required</AlertTitle>
              <AlertDescription className="text-base leading-relaxed">
                <p>{errorMessage}</p>
                <div className="bg-white/50 p-6 rounded-2xl border border-red-100 space-y-4 mt-4 text-sm font-medium">
                  <p>Standard Troubleshooting:</p>
                  <ul className="list-disc ml-5">
                    <li>Verify Vertex AI enablement in Google Cloud Console.</li>
                    <li>Confirm <strong>MODELS.REPORTS</strong> registry settings.</li>
                  </ul>
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="border-none shadow-md overflow-hidden rounded-3xl bg-white">
            <CardHeader className="bg-primary/5 border-b p-6">
              <CardTitle className="flex items-center gap-2 text-primary font-headline">
                <Database className="size-5" />
                Narrative Context
              </CardTitle>
              <CardDescription>Interpret raw registry data into a qualitative performance draft.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Grade Module</Label>
                  <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setSelectedStudentId(""); }}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Student Name</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedGrade}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Student" /></SelectTrigger>
                    <SelectContent>
                      {students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Class Standing / Position</Label>
                  <div className="relative">
                     <Medal className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                     <Input 
                      placeholder="e.g. 1st of 35" 
                      className="pl-10 h-12 rounded-xl"
                      value={classPosition}
                      onChange={(e) => setClassPosition(e.target.value)}
                     />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Registry Verification</Label>
                  <div className="h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center px-4 gap-3">
                    <CheckCircle2 className={`size-4 ${selectedStudent ? 'text-green-600' : 'text-slate-300'}`} />
                    <span className="text-xs font-bold text-slate-500 uppercase">{selectedStudent ? "Context Synced" : "Waiting..."}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Behavioral & Effort Observations</Label>
                <Textarea 
                  placeholder="Mention soft skills, collaborative effort, or specific achievements..."
                  className="min-h-[120px] rounded-2xl border-slate-200 p-4 focus:ring-primary/20"
                  value={behaviorNotes}
                  onChange={(e) => setBehaviorNotes(e.target.value)}
                />
              </div>

              <Button 
                className="w-full h-16 gap-3 bg-primary hover:bg-primary/90 rounded-2xl shadow-xl text-lg font-bold"
                onClick={handleGenerate}
                disabled={loading || !selectedStudentId}
              >
                {loading ? <Loader2 className="size-6 animate-spin" /> : <Sparkles className="size-6 text-accent" />}
                Compute Qualitative Narrative
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!result ? (
            <Card className="border-none shadow-md min-h-[550px] flex flex-col items-center justify-center text-center p-12 space-y-6 rounded-3xl bg-muted/5 border-2 border-dashed">
              <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center">
                <ClipboardList className="size-12 text-primary/20" />
              </div>
              <div className="max-w-xs">
                <p className="font-bold text-xl text-primary/60 font-headline">Awaiting Registry Data</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Authorize the AI Pedagogical Analyst to translate quantitative marks and positions into a professional narrative for the guardian.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
                <CardHeader className="bg-primary text-primary-foreground p-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest">
                        <User className="size-3" /> Qualitative Assessment Synced
                      </div>
                      <CardTitle className="text-3xl font-headline font-bold">{selectedStudent?.firstName} {selectedStudent?.lastName}</CardTitle>
                      <CardDescription className="text-primary-foreground/70 font-medium">{selectedGrade} • {currentTerm} Official Narrative</CardDescription>
                    </div>
                    <Button variant="secondary" size="icon" onClick={handleCopy} className="bg-white/10 hover:bg-white/20 border-none text-white rounded-xl size-12">
                      {copied ? <Check className="size-6 text-green-400" /> : <Copy className="size-6" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10 bg-white">
                  <section>
                    <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <ListChecks className="size-4 text-primary" /> Growth Summary
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-700 font-medium">{result.executiveSummary}</p>
                  </section>

                  <section className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                    <h3 className="font-bold text-xs text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Medal className="size-4" /> Academic Character & Mastery
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 font-medium">{result.academicAnalysis}</p>
                  </section>

                  <div className="grid gap-8 md:grid-cols-2">
                    <section className="p-6 rounded-3xl bg-green-50/50 border border-green-100">
                      <h3 className="font-bold text-xs text-green-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Target className="size-4" /> Mastery Areas
                      </h3>
                      <ul className="space-y-3">
                        {result.keyStrengths?.map((s, i) => (
                          <li key={i} className="text-[11px] flex gap-3 text-slate-600 font-bold">
                            <span className="text-green-500">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section className="p-6 rounded-3xl bg-orange-50/50 border border-orange-100">
                      <h3 className="font-bold text-xs text-orange-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Lightbulb className="size-4" /> Growth Milestones
                      </h3>
                      <ul className="space-y-3">
                        {result.areasToImprove?.map((a, i) => (
                          <li key={i} className="text-[11px] flex gap-3 text-slate-600 font-bold">
                            <span className="text-orange-500">•</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <section className="p-8 rounded-3xl bg-primary/5 border border-primary/10 relative">
                    <div className="absolute top-4 right-4 opacity-5 text-primary"><Sparkles className="size-10" /></div>
                    <h3 className="font-bold text-xs uppercase tracking-widest text-primary mb-6">Final Parent-Friendly Narrative</h3>
                    <p className="text-sm italic text-slate-700 leading-relaxed font-medium">
                      "{result.finalGradeNarrative}"
                    </p>
                  </section>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
