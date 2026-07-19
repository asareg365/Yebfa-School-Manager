"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Printer, Save, Loader2, Bot, Sparkles, FileText, Download, Wand2, CheckCircle2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { generateExamQuestions } from "@/ai/flows/generate-exam-questions"

export default function ExaminationCenterPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  const [scores, setScores] = useState<Record<string, { ca: string, exam: string }>>({})

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)
  
  const currentTerm = institution?.currentTerm || "Term 1"

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
    if (!db || !institutionId || !selectedGrade || !selectedSubject) return null;
    return query(
      collection(db, "exam_records"),
      where("tenantId", "==", institutionId),
      where("gradeLevel", "==", selectedGrade),
      where("subjectId", "==", selectedSubject),
      where("termId", "==", currentTerm)
    );
  }, [db, institutionId, selectedGrade, selectedSubject, currentTerm]);

  const { data: classes = [] } = useCollection(classesQuery)
  const { data: students = [] } = useCollection(studentsQuery)
  const { data: subjects = [] } = useCollection(subjectsQuery)
  const { data: existingScores = [] } = useCollection(existingScoresQuery)

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
  }, [existingScores, selectedSubject]);

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
    if (!db || !institutionId || !selectedSubject || !selectedGrade) {
      toast({ variant: "destructive", title: "Selection Required", description: "Select grade and subject to save scores." })
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
        
        const recordId = `${stu.id}_${selectedSubject}_${currentTerm.replace(/\s+/g, '')}`
        const recordRef = doc(db, "exam_records", recordId)
        
        batch.set(recordRef, {
          tenantId: institutionId,
          institutionId,
          studentId: stu.id,
          studentName: `${stu.firstName} ${stu.lastName}`,
          subjectId: selectedSubject,
          gradeLevel: selectedGrade,
          termId: currentTerm,
          classScore: ca,
          examScore: exam,
          totalScore: total,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true })
      })

      await batch.commit()
      toast({ title: "Scores Finalized", description: `Academic records synchronized for ${students.length} students for ${currentTerm}.` })
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
      toast({ title: "AI Generated Paper", description: "Examination questions are ready." })
    } catch (e) {
      toast({ variant: "destructive", title: "AI Engine Busy" })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Examination Center</h1>
          <p className="text-muted-foreground font-medium">Capture results for <span className="text-accent font-bold uppercase">{currentTerm}</span>.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 h-11 rounded-xl" onClick={handleAiGenerate} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4 text-accent" />} AI Paper Gen
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
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Exam Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Grade Module</Label>
              <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                  {classes.length === 0 && <div className="p-2 text-center text-xs italic">Establish classes first</div>}
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
             <Card className="border-none shadow-xl bg-primary text-primary-foreground overflow-hidden animate-in slide-in-from-top-4 duration-500 rounded-3xl">
               <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle className="text-lg">AI Generated Examination Paper</CardTitle>
                   <CardDescription className="text-primary-foreground/60">Ready for review and printing.</CardDescription>
                 </div>
                 <Sparkles className="size-6 opacity-30" />
               </CardHeader>
               <CardContent className="p-2">
                  <div className="bg-white text-slate-800 p-8 rounded-2xl max-h-[400px] overflow-y-auto">
                    {aiResult.questions.map((q: any) => (
                      <div key={q.id} className="space-y-2 border-b pb-4 mb-4 last:border-none last:mb-0">
                        <p className="font-bold">Q{q.id}. {q.question}</p>
                        {q.options && (
                          <div className="grid grid-cols-2 gap-2 text-sm italic ml-4">
                            {q.options.map((opt: string) => <div key={opt}>• {opt}</div>)}
                          </div>
                        )}
                        <p className="text-[10px] text-green-600 font-bold uppercase mt-2">Correct: {q.correctAnswer}</p>
                      </div>
                    ))}
                  </div>
               </CardContent>
               <div className="p-4 flex justify-end gap-3 border-t border-white/10">
                 <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setAiResult(null)}>Discard</Button>
                 <Button className="bg-white text-primary hover:bg-white/90 gap-2"><Printer className="size-4" /> Print Paper</Button>
               </div>
             </Card>
           )}

           <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
             <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Score Registry</CardTitle>
                  <CardDescription>Entering scores for {currentTerm}, 2026 Academic Cycle.</CardDescription>
                </div>
                {selectedSubject && <Badge className="bg-primary/5 text-primary border-none text-[10px] font-bold uppercase tracking-widest px-3">Sync Active</Badge>}
             </CardHeader>
             <CardContent className="p-0">
                {!selectedGrade || !selectedSubject ? (
                  <div className="p-32 text-center text-muted-foreground space-y-4">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto opacity-20"><ClipboardList className="size-8" /></div>
                    <p className="italic text-sm">Select a grade module and subject to record scores.</p>
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
                                  {stu.firstName.charAt(0)}{stu.lastName.charAt(0)}
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
