"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Printer, Save, Loader2, Bot, Sparkles, FileText, Download, Wand2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, doc, setDoc, serverTimestamp } from "firebase/firestore"
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

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

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

  const { data: classes = [] } = useCollection(classesQuery)
  const { data: students = [] } = useCollection(studentsQuery)
  const { data: subjects = [] } = useCollection(subjectsQuery)

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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-headline font-bold text-primary">Examination Center</h1><p className="text-muted-foreground">Capture results and generate intelligent papers.</p></div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleAiGenerate} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4 text-accent" />} AI Paper Gen
          </Button>
          <Button className="gap-2 bg-primary" disabled={!selectedSubject}>
            <Save className="size-4" /> Save Score Batch
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-md h-fit">
          <CardHeader><CardTitle className="text-sm">Exam Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Grade</Label>
              <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                  {classes.length === 0 && <div className="p-2 text-center text-xs italic">Establish classes first</div>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Subject</Label>
              <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedGrade}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-6">
           {aiResult && (
             <Card className="border-none shadow-xl bg-primary text-primary-foreground overflow-hidden animate-in slide-in-from-top-4 duration-500">
               <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle className="text-lg">AI Generated Examination Paper</CardTitle>
                   <CardDescription className="text-primary-foreground/60">Ready for review and printing.</CardDescription>
                 </div>
                 <Sparkles className="size-6 opacity-30" />
               </CardHeader>
               <CardContent className="space-y-4 bg-white text-slate-800 p-8 m-2 rounded-2xl">
                  {aiResult.questions.map((q: any) => (
                    <div key={q.id} className="space-y-2 border-b pb-4 last:border-none">
                      <p className="font-bold">Q{q.id}. {q.question}</p>
                      {q.options && (
                        <div className="grid grid-cols-2 gap-2 text-sm italic ml-4">
                          {q.options.map((opt: string) => <div key={opt}>• {opt}</div>)}
                        </div>
                      )}
                      <p className="text-[10px] text-green-600 font-bold uppercase mt-2">Correct: {q.correctAnswer}</p>
                    </div>
                  ))}
               </CardContent>
               <div className="p-4 flex justify-end gap-3">
                 <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setAiResult(null)}>Discard</Button>
                 <Button className="bg-white text-primary hover:bg-white/90 gap-2"><Printer className="size-4" /> Print Paper</Button>
               </div>
             </Card>
           )}

           <Card className="border-none shadow-md overflow-hidden">
             <CardHeader className="border-b bg-muted/20"><CardTitle className="text-lg">Score Registry</CardTitle></CardHeader>
             <CardContent className="p-0">
                {!selectedGrade ? (
                  <div className="p-24 text-center text-muted-foreground opacity-20 italic">Select a grade module to record scores.</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30"><TableRow><TableHead>Student</TableHead><TableHead className="w-24">CA (30)</TableHead><TableHead className="w-24">Exam (70)</TableHead><TableHead className="w-20">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {students.map((stu: any) => (
                        <TableRow key={stu.id}>
                          <TableCell className="font-bold text-primary">{stu.firstName} {stu.lastName}</TableCell>
                          <TableCell><Input type="number" className="h-8" /></TableCell>
                          <TableCell><Input type="number" className="h-8" /></TableCell>
                          <TableCell className="font-bold text-accent">0</TableCell>
                        </TableRow>
                      ))}
                      {students.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No student roster detected for this grade.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                )}
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}
