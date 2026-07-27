
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Printer, Save, Loader2, Bot, Sparkles, FileText, Download, Wand2, CheckCircle2, ListChecks, Target, BrainCircuit, BarChart, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc, useUser } from "@/firebase"
import { collection, query, where, doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateExamQuestions, GenerateExamOutput } from "@/ai/flows/generate-exam-questions"

export default function ExaminationCenterPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<GenerateExamOutput | null>(null)

  const [scores, setScores] = useState<Record<string, { ca: string, exam: string }>>({})

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)
  const isTeacher = profile?.role === 'teacher'
  const staffId = profile?.staffId

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)
  
  useEffect(() => {
    if (institution?.currentTerm && !selectedTerm) {
      setSelectedTerm(institution.currentTerm)
    }
  }, [institution, selectedTerm])

  // Teacher Assignments Filter
  const assignmentsQuery = useMemo(() => 
    institutionId && isTeacher && staffId 
      ? query(collection(db, "teacher_assignments"), where("tenantId", "==", institutionId), where("teacherId", "==", staffId)) 
      : null, 
    [db, institutionId, isTeacher, staffId]
  )
  const { data: assignments = [] } = useCollection(assignmentsQuery)

  const assignedClassIds = useMemo(() => new Set(assignments.map((a: any) => a.classId)), [assignments])
  const assignedSubjectIds = useMemo(() => new Set(assignments.map((a: any) => a.subjectId)), [assignments])

  const classesQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "classes"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId || !selectedGrade) return null;
    return query(collection(db, "students"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade));
  }, [db, institutionId, selectedGrade]);

  const subjectsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "subjects"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const existingScoresQuery = useMemo(() => {
    if (!db || !institutionId || !selectedGrade || !selectedSubject || !selectedTerm) return null;
    return query(
      collection(db, "exam_records"),
      where("tenantId", "==", institutionId),
      where("gradeLevel", "==", selectedGrade),
      where("subjectId", "==", selectedSubject),
      where("termId", "==", selectedTerm)
    );
  }, [db, institutionId, selectedGrade, selectedSubject, selectedTerm]);

  const { data: allClasses = [] } = useCollection(classesQuery)
  const { data: students = [] } = useCollection(studentsQuery)
  const { data: allSubjects = [] } = useCollection(subjectsQuery)
  const { data: existingScores = [] } = useCollection(existingScoresQuery)

  const classes = useMemo(() => isTeacher ? allClasses.filter(c => assignedClassIds.has(c.id)) : allClasses, [allClasses, isTeacher, assignedClassIds])
  const subjects = useMemo(() => isTeacher ? allSubjects.filter(s => assignedSubjectIds.has(s.id)) : allSubjects, [allSubjects, isTeacher, assignedSubjectIds])

  useEffect(() => {
    if (existingScores.length > 0) {
      const map: Record<string, { ca: string, exam: string }> = {};
      existingScores.forEach((record: any) => {
        map[record.studentId] = {
          ca: record.classScore?.toString() || "0",
          exam: record.examScore?.toString() || "0"
        };
      });
      setScores(map);
    } else {
      setScores({});
    }
  }, [existingScores, selectedSubject, selectedTerm]);

  const handleScoreChange = (studentId: string, field: 'ca' | 'exam', value: string) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { ca: "0", exam: "0" }),
        [field]: value
      }
    }))
  }

  const handleSaveScores = async () => {
    if (!db || !institutionId || !selectedSubject || !selectedGrade || !selectedTerm) {
      toast({ variant: "destructive", title: "Selection Required", description: "Select grade, subject, and term to save scores." })
      return
    }

    setIsSaving(true)
    try {
      const batch = writeBatch(db)

      students.forEach(stu => {
        const studentScores = scores[stu.id] || { ca: "0", exam: "0" }
        const ca = parseFloat(studentScores.ca) || 0
        const exam = parseFloat(studentScores.exam) || 0
        const total = ca + exam
        
        const recordId = `${stu.id}_${selectedSubject}_${selectedTerm.replace(/\s+/g, '')}`
        const recordRef = doc(db, "exam_records", recordId)
        
        batch.set(recordRef, {
          tenantId: institutionId,
          institutionId,
          studentId: stu.id,
          studentName: `${stu.firstName} ${stu.lastName}`,
          subjectId: selectedSubject,
          gradeLevel: selectedGrade,
          termId: selectedTerm,
          classScore: ca,
          examScore: exam,
          totalScore: total,
          teacherId: staffId || null,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true })
      })

      await batch.commit()
      toast({ title: "Scores Finalized", description: `Academic records synchronized for ${students.length} students for ${selectedTerm}.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save Failed", description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAiGenerate = async () => {
    if (!selectedSubject || !selectedGrade) {
      toast({ variant: "destructive", title: "Selection Required", description: "Select grade and subject to authorize AI generation." })
      return
    }
    setAiLoading(true)
    try {
      const subName = subjects.find(s => s.id === selectedSubject)?.name || "Academic"
      const result = await generateExamQuestions({
        subject: subName,
        gradeLevel: selectedGrade,
        topic: "Term Review and Core Fundamentals",
        count: 5,
        type: "Mixed"
      })
      setAiResult(result)
      toast({ title: "AI Assessment Generated", description: "Balanced examination paper is ready." })
    } catch (e) {
      toast({ variant: "destructive", title: "AI Engine Busy", description: "Please ensure Vertex AI is enabled." })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Examination Center</h1>
          <p className="text-muted-foreground font-medium">Capturing results and generating assessments for <span className="text-accent font-bold uppercase">{selectedTerm || institution?.currentTerm || "..."}</span>.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 h-11 rounded-xl" onClick={handleAiGenerate} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4 text-accent" />} AI Assessment Assistant
          </Button>
          <Button 
            className="gap-2 bg-primary h-11 rounded-xl shadow-lg" 
            onClick={handleSaveScores}
            disabled={isSaving || !selectedSubject || students.length === 0}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Score Batch
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-md h-fit">
          <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exam Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Academic Term</Label>
              <Select onValueChange={setSelectedTerm} value={selectedTerm}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Term" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Grade Module</Label>
              <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Subject</Label>
              <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedGrade}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-6">
           {aiResult && (
             <Card className="border-none shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-500 rounded-3xl bg-white border-2 border-primary/5">
               <CardHeader className="bg-primary text-primary-foreground p-8 flex flex-row items-center justify-between shrink-0">
                 <div>
                   <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="size-4 text-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">AI Strategic Assessment</span>
                   </div>
                   <CardTitle className="text-2xl font-headline font-bold">Examination Paper & Scheme</CardTitle>
                   <CardDescription className="text-primary-foreground/70">Balanced for Bloom's Taxonomy & Grade Difficulty.</CardDescription>
                 </div>
                 <Button variant="secondary" size="icon" className="bg-white/10 text-white hover:bg-white/20 rounded-xl" onClick={() => setAiResult(null)}>
                    <X className="size-5" />
                 </Button>
               </CardHeader>
               
               <Tabs defaultValue="questions">
                 <TabsList className="bg-muted/30 px-8 py-2 border-b shrink-0 flex justify-start gap-4">
                   <TabsTrigger value="questions" className="gap-2 rounded-lg"><FileText className="size-4" /> Question Paper</TabsTrigger>
                   <TabsTrigger value="scheme" className="gap-2 rounded-lg"><ListChecks className="size-4" /> Marking Scheme</TabsTrigger>
                   <TabsTrigger value="analysis" className="gap-2 rounded-lg"><BrainCircuit className="size-4" /> Pedagogical Analysis</TabsTrigger>
                 </TabsList>

                 <TabsContent value="questions" className="p-8">
                    <div className="prose prose-slate max-w-none space-y-6">
                      {aiResult.questions.map((q: any) => (
                        <div key={q.id} className="p-6 rounded-2xl bg-slate-50 border relative group">
                          <div className="absolute top-4 right-4 flex gap-2">
                             <Badge variant="outline" className="text-[8px] bg-white">{q.difficulty}</Badge>
                             <Badge variant="secondary" className="text-[8px]">{q.marks} Marks</Badge>
                          </div>
                          <p className="font-bold text-primary mb-4">Q{q.id}. {q.question}</p>
                          {q.options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-4 mb-4">
                              {q.options.map((opt: string, idx: number) => (
                                <div key={idx} className="text-sm p-2 rounded-lg bg-white border flex items-center gap-3">
                                   <span className="text-[10px] font-bold text-muted-foreground uppercase">{String.fromCharCode(65 + idx)}</span>
                                   {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="hidden group-hover:block animate-in fade-in duration-300">
                             <p className="text-[10px] text-green-600 font-bold uppercase mt-2">Key: {q.correctAnswer}</p>
                             <p className="text-[10px] text-muted-foreground italic">{q.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                       <Button variant="outline" className="gap-2 rounded-xl h-11"><Printer className="size-4" /> Print Paper</Button>
                       <Button className="bg-primary gap-2 rounded-xl h-11 shadow-lg"><Download className="size-4" /> Export Document</Button>
                    </div>
                 </TabsContent>

                 <TabsContent value="scheme" className="p-8">
                    <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200">
                       <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                          <Target className="size-4" /> Points-Based Marking Criteria
                       </h4>
                       <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 font-medium">
                          {aiResult.markingScheme}
                       </div>
                    </div>
                 </TabsContent>

                 <TabsContent value="analysis" className="p-8 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                       <Card className="border-none shadow-sm bg-blue-50/50 border-blue-100 p-6 space-y-4">
                          <h4 className="text-xs font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                             <BrainCircuit className="size-4" /> Bloom's Taxonomy Analysis
                          </h4>
                          <p className="text-sm text-blue-800 leading-relaxed font-medium">{aiResult.assessmentAnalysis.bloomSummary}</p>
                       </Card>
                       <Card className="border-none shadow-sm bg-purple-50/50 border-purple-100 p-6 space-y-4">
                          <h4 className="text-xs font-bold text-purple-900 uppercase tracking-widest flex items-center gap-2">
                             <BarChart className="size-4" /> Difficulty Summary
                          </h4>
                          <p className="text-sm text-purple-800 leading-relaxed font-medium">{aiResult.assessmentAnalysis.difficultyBalance}</p>
                       </Card>
                    </div>
                 </TabsContent>
               </Tabs>
             </Card>
           )}

           <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
             <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Score Registry</CardTitle>
                  <CardDescription>Recording assessments for {selectedTerm || institution?.currentTerm}, 2026 Academic Cycle.</CardDescription>
                </div>
                {selectedSubject && <Badge className="bg-primary/5 text-primary border-none text-[10px] font-bold uppercase tracking-widest px-3">Sync Active</Badge>}
             </CardHeader>
             <CardContent className="p-0">
                {!selectedGrade || !selectedSubject ? (
                  <div className="p-32 text-center text-muted-foreground space-y-4">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto opacity-20"><ClipboardList className="size-8" /></div>
                    <p className="italic text-sm">Select a grade module, subject, and term context to record scores.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="py-4 font-bold whitespace-nowrap">STUDENT NAME</TableHead>
                          <TableHead className="py-4 font-bold w-32 whitespace-nowrap">CA (30)</TableHead>
                          <TableHead className="py-4 font-bold w-32 whitespace-nowrap">EXAM (70)</TableHead>
                          <TableHead className="py-4 font-bold w-24 text-right whitespace-nowrap">TOTAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((stu: any) => {
                          const s = scores[stu.id] || { ca: "0", exam: "0" };
                          const total = (parseFloat(s.ca) || 0) + (parseFloat(s.exam) || 0);
                          
                          return (
                            <TableRow key={stu.id} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell className="font-bold text-primary flex items-center gap-3 min-w-[200px]">
                                <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                  {(stu.firstName || "?").charAt(0)}{(stu.lastName || "?").charAt(0)}
                                </div>
                                <span className="truncate">{stu.firstName} {stu.lastName}</span>
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="30"
                                  className="h-9 rounded-lg bg-slate-50 border-none font-bold min-w-[80px]" 
                                  value={s.ca}
                                  onChange={(e) => handleScoreChange(stu.id, 'ca', e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="70"
                                  className="h-9 rounded-lg bg-slate-50 border-none font-bold min-w-[80px]" 
                                  value={s.exam}
                                  onChange={(e) => handleScoreChange(stu.id, 'exam', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge className={`text-sm font-bold h-9 px-4 rounded-lg min-w-16 flex items-center justify-center ${total >= 50 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} border-none`}>
                                  {total}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {students.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                              No student roster detected for this grade in your institutional registry.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}
