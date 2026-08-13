
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Printer, Save, Loader2, Bot, Sparkles, FileText, Download, Wand2, CheckCircle2, ListChecks, Target, BrainCircuit, BarChart, X, AlertTriangle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase"
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

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)

  useEffect(() => {
    if (profile) {
      if (profile.role === 'super_admin') {
        setInstitutionId(localStorage.getItem('selected_institution_id'))
      } else {
        setInstitutionId(profile.tenantId || null)
      }
    }
  }, [profile])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)
  
  useEffect(() => {
    if (institution?.currentTerm && !selectedTerm) {
      setSelectedTerm(institution.currentTerm)
    }
  }, [institution, selectedTerm])

  const isTeacher = profile?.role === 'teacher'
  const staffId = profile?.staffId

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
    const numValue = parseFloat(value) || 0;
    const max = field === 'ca' ? 30 : 70;
    
    if (numValue > max) {
      toast({ 
        variant: "destructive", 
        title: "Limit Exceeded", 
        description: `The maximum allowed mark for ${field === 'ca' ? 'CA' : 'Exams'} is ${max}.` 
      });
      return;
    }

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
      toast({ title: "Scores Finalized", description: `Academic records synchronized for ${students.length} students.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save Failed", description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAiGenerate = async () => {
    if (!selectedSubject || !selectedGrade) {
      toast({ variant: "destructive", title: "Selection Required", description: "Select grade and subject." })
      return
    }
    setAiLoading(true)
    try {
      const subName = subjects.find(s => s.id === selectedSubject)?.name || "Academic"
      const result = await generateExamQuestions({
        subject: subName,
        gradeLevel: selectedGrade,
        topic: "Term Review",
        count: 5,
        type: "Mixed"
      })
      setAiResult(result)
    } catch (e) {
      toast({ variant: "destructive", title: "AI Busy" })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Examination Center</h1>
          <p className="text-muted-foreground font-medium text-sm">Capturing results for <span className="text-accent font-bold uppercase">{selectedTerm || "Term cycle"}</span>.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none gap-2 h-11 rounded-xl" onClick={handleAiGenerate} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4 text-accent" />} AI Assistant
          </Button>
          <Button 
            className="flex-1 md:flex-none gap-2 bg-primary h-11 rounded-xl shadow-lg px-6" 
            onClick={handleSaveScores}
            disabled={isSaving || !selectedSubject || students.length === 0}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Batch
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="border-none shadow-md h-fit lg:col-span-1">
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
                  {classes.filter(c => !!c.id).map(c => (
                    <SelectItem key={c.id} value={c.id || c.name}>
                      {c.name || "Unnamed Class"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Subject</Label>
              <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedGrade}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.filter(s => !!s.id).map(s => (
                    <SelectItem key={s.id} value={s.id || s.name}>
                      {s.name || "Unnamed Subject"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
           <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
             <CardHeader className="border-b bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Score Registry</CardTitle>
                  <CardDescription className="text-xs">Recording assessments for 2026 Cycle.</CardDescription>
                </div>
                {selectedSubject && <Badge className="bg-primary/5 text-primary border-none text-[10px] font-bold uppercase px-3">Sync Active</Badge>}
             </CardHeader>
             <CardContent className="p-0">
                {!selectedGrade || !selectedSubject ? (
                  <div className="p-20 md:p-32 text-center text-muted-foreground space-y-4">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto opacity-20"><ClipboardList className="size-8" /></div>
                    <p className="italic text-sm">Select a grade and subject to record scores.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table className="min-w-[600px]">
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="py-4 font-bold">STUDENT NAME</TableHead>
                          <TableHead className="py-4 font-bold w-32 text-center">CA (30)</TableHead>
                          <TableHead className="py-4 font-bold w-32 text-center">EXAM (70)</TableHead>
                          <TableHead className="py-4 font-bold w-24 text-right px-6">TOTAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((stu: any) => {
                          const s = scores[stu.id] || { ca: "0", exam: "0" };
                          const total = (parseFloat(s.ca) || 0) + (parseFloat(s.exam) || 0);
                          
                          return (
                            <TableRow key={stu.id} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell className="font-bold text-primary px-6">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-bold shrink-0">{stu.firstName?.charAt(0)}{stu.lastName?.charAt(0)}</div>
                                  <span className="truncate">{stu.firstName} {stu.lastName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Input 
                                  type="number" 
                                  className="h-9 w-20 mx-auto rounded-lg bg-slate-50 border-none font-bold" 
                                  value={s.ca}
                                  onChange={(e) => handleScoreChange(stu.id, 'ca', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Input 
                                  type="number" 
                                  className="h-9 w-20 mx-auto rounded-lg bg-slate-50 border-none font-bold" 
                                  value={s.exam}
                                  onChange={(e) => handleScoreChange(stu.id, 'exam', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-right px-6">
                                <Badge className={`text-sm font-bold h-9 w-16 flex items-center justify-center ${total >= 50 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} border-none`}>
                                  {total}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
