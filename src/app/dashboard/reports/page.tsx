"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { generateStudentReportComments, GenerateStudentReportCommentsOutput } from "@/ai/flows/generate-student-report-comments"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Sparkles, 
  User, 
  GraduationCap, 
  Copy, 
  Check, 
  Target, 
  Lightbulb, 
  ListChecks, 
  Database,
  Search,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ReportsPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateStudentReportCommentsOutput | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Selection states
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  // Queries
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
    institutionId && selectedStudentId ? query(collection(db, "exam_records"), where("studentId", "==", selectedStudentId)) : null, 
    [db, institutionId, selectedStudentId]
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

  // Calculated Metrics for AI
  const aggregatedMetrics = useMemo(() => {
    const totalDays = attendanceDocs.length
    const daysPresent = attendanceDocs.filter((a: any) => a.status === 'present').length
    const attendancePercent = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 100

    const examScores = examRecords.map((e: any) => {
      // Find subject name from ID
      const subjectName = subjects.find(s => s.id === e.subjectId)?.name || "Academic Subject"
      return {
        name: subjectName,
        score: typeof e.totalScore === 'number' ? e.totalScore : 0
      }
    })

    return {
      attendancePercent,
      examScores
    }
  }, [attendanceDocs, examRecords, subjects])

  const [behaviorNotes, setBehaviorNotes] = useState("")

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
        behaviorNotes: behaviorNotes || "Good overall participation and conduct."
      }

      const output = await generateStudentReportComments(payload)
      setResult(output)
      toast({ title: "Report Generated", description: "Data-synced performance narrative is ready." })
    } catch (error: any) {
      console.error("AI Generation Error:", error)
      const msg = error.message || "An unexpected error occurred."
      setErrorMessage(msg)
      toast({ 
        variant: "destructive", 
        title: "Generation Failed", 
        description: msg.includes('403') || msg.includes('Access is blocked') 
          ? "Institutional AI access is restricted. Please check your API configuration." 
          : "Could not process registry data at this time." 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (result && selectedStudent) {
      const text = `Official Academic Report: ${selectedStudent.firstName} ${selectedStudent.lastName}\n\nSummary: ${result.executiveSummary}\n\nNarrative: ${result.finalGradeNarrative}`
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 overflow-y-auto max-h-full pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">Academic Narratives</h1>
        <p className="text-muted-foreground">Generating comprehensive reports synced with live attendance and exam records.</p>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 rounded-2xl animate-in slide-in-from-top-2">
          <AlertCircle className="size-4" />
          <AlertTitle className="font-bold">System Configuration Required</AlertTitle>
          <AlertDescription className="text-sm">
            {errorMessage.includes('403') || errorMessage.includes('blocked') ? (
              <div className="space-y-2">
                <p>The AI service returned a "403 Forbidden" error. This usually means the <strong>Generative Language API</strong> is not enabled for your project.</p>
                <ol className="list-decimal ml-4 space-y-1 mt-2 font-medium">
                  <li>Go to the Google Cloud Console.</li>
                  <li>Enable the <strong>Generative Language API</strong>.</li>
                  <li>Ensure your API Key has permission to access this service.</li>
                </ol>
              </div>
            ) : errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="border-none shadow-md overflow-hidden rounded-2xl">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Database className="size-5" />
                Registry Data Sync
              </CardTitle>
              <CardDescription>Select a student to pull academic and presence history.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Grade Module</Label>
                  <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setSelectedStudentId(""); }}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      {classes.length === 0 && <div className="p-2 text-center text-xs italic">No classes registered</div>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Student Name</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedGrade}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choose Student" /></SelectTrigger>
                    <SelectContent>
                      {students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                      {students.length === 0 && selectedGrade && <div className="p-2 text-center text-xs italic">No students in this grade</div>}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedStudent && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-muted-foreground">Attendance Logs</span>
                     <Badge variant="secondary" className="font-bold">{aggregatedMetrics.attendancePercent}%</Badge>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-muted-foreground">Exam Records Found</span>
                     <Badge variant="secondary" className="font-bold">{aggregatedMetrics.examScores.length} Subjects</Badge>
                   </div>
                   <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                     <RefreshCw className="size-2.5 animate-spin-slow" /> Data synchronized with live institutional vault.
                   </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qualitative Observations</Label>
                <Textarea 
                  placeholder="Mention participation, soft skills, or specific projects..."
                  className="min-h-[120px] rounded-xl border-slate-200"
                  value={behaviorNotes}
                  onChange={(e) => setBehaviorNotes(e.target.value)}
                />
              </div>

              <Button 
                className="w-full h-14 gap-2 bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-95"
                onClick={handleGenerate}
                disabled={loading || !selectedStudentId}
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
                Generate Comprehensive Report
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!result ? (
            <Card className="border-none shadow-md min-h-[500px] flex flex-col items-center justify-center text-center p-12 space-y-4 rounded-3xl bg-muted/5 border-2 border-dashed">
              <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center">
                <GraduationCap className="size-12 text-primary/20" />
              </div>
              <div className="max-w-xs">
                <p className="font-bold text-xl text-primary/60">Awaiting Selection</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Link a student from the registry to automatically compute performance narratives.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
                <CardHeader className="bg-primary text-primary-foreground p-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest">
                        <Check className="size-3" /> Official Assessment
                      </div>
                      <CardTitle className="text-2xl font-headline">{selectedStudent?.firstName} {selectedStudent?.lastName}</CardTitle>
                      <CardDescription className="text-primary-foreground/70">{selectedGrade} • Performance Report Draft</CardDescription>
                    </div>
                    <Button variant="secondary" size="icon" onClick={handleCopy} className="bg-white/10 hover:bg-white/20 border-none text-white rounded-xl">
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8 bg-white">
                  <section>
                    <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <ListChecks className="size-4 text-primary" /> Executive Summary
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-700">{result.executiveSummary}</p>
                  </section>

                  <div className="grid gap-6 md:grid-cols-2">
                    <section className="p-5 rounded-2xl bg-green-50/50 border border-green-100">
                      <h3 className="font-bold text-xs text-green-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Target className="size-4" /> Key Strengths
                      </h3>
                      <ul className="space-y-3">
                        {result.keyStrengths.map((s, i) => (
                          <li key={i} className="text-xs flex gap-3 text-slate-600">
                            <span className="text-green-500 font-bold shrink-0">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section className="p-5 rounded-2xl bg-orange-50/50 border border-orange-100">
                      <h3 className="font-bold text-xs text-orange-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Lightbulb className="size-4" /> Growth Targets
                      </h3>
                      <ul className="space-y-3">
                        {result.areasToImprove.map((a, i) => (
                          <li key={i} className="text-xs flex gap-3 text-slate-600">
                            <span className="text-orange-500 font-bold shrink-0">•</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <section className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                    <h3 className="font-bold text-xs uppercase tracking-widest text-primary mb-4">Official Narratives</h3>
                    <p className="text-sm italic text-slate-600 leading-relaxed indent-4">
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
