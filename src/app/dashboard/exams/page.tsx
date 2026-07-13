
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Printer, Save, Loader2, CheckCircle2, User, Search, BookOpen, GraduationCap, Pencil, X, Camera, Upload, Check, Trophy, TrendingUp } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, getDocs, doc, setDoc, updateDoc } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const PRIMARY_GRADES = ["KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]
const JHS_GRADES = ["JHS 1", "JHS 2", "JHS 3"]
const SHS_GRADES = ["SHS 1", "SHS 2", "SHS 3"]

export default function ExaminationCenterPage() {
  const db = useFirestore()
  const { user, loading: authLoading } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  
  // Score Entry States
  const [classScores, setClassScores] = useState<Record<string, number>>({})
  const [examScores, setExamScores] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [loadingScores, setLoadingScores] = useState(false)

  // Individual Report States
  const [reportStudent, setReportStudent] = useState<any>(null)
  const [studentRecords, setStudentRecords] = useState<any[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)

  // Student Edit States
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    gender: "Male",
    gradeLevel: "Primary 1",
    studentId: "",
    parentName: "",
    parentPhone: "",
    photoUrl: ""
  })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  useEffect(() => {
    async function fetchExistingScores() {
      if (!db || !institutionId || !selectedSubject || !selectedGrade) return
      setLoadingScores(true)
      try {
        const q = query(
          collection(db, "exam_records"),
          where("institutionId", "==", institutionId),
          where("subjectId", "==", selectedSubject),
          where("gradeLevel", "==", selectedGrade),
          where("academicYear", "==", "2026"),
          where("term", "==", "Term 2")
        )
        const snap = await getDocs(q)
        const newClassScores: Record<string, number> = {}
        const newExamScores: Record<string, number> = {}
        snap.docs.forEach(d => {
          const data = d.data()
          newClassScores[data.studentId] = data.classScore
          newExamScores[data.studentId] = data.examScore
        })
        setClassScores(newClassScores)
        setExamScores(newExamScores)
      } catch (error) { console.error(error) } finally { setLoadingScores(false) }
    }
    fetchExistingScores()
  }, [db, institutionId, selectedSubject, selectedGrade])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId || !selectedGrade) return null;
    return query(collection(db, "students"), where("institutionId", "==", institutionId), where("gradeLevel", "==", selectedGrade));
  }, [db, institutionId, selectedGrade]);

  const subjectsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "subjects"), where("institutionId", "==", institutionId));
  }, [db, institutionId]);

  const { data: students, loading: studentsLoading } = useCollection(studentsQuery)
  const { data: subjects } = useCollection(subjectsQuery)

  const instRef = institutionId ? doc(db!, "institutions", institutionId) : null
  const { data: institution } = useDoc(instRef)

  const availableGrades = useMemo(() => {
    const category = institution?.gradeLevel || institution?.type || "Basic"
    if (category.toLowerCase().includes("primary") || category.toLowerCase().includes("basic")) return PRIMARY_GRADES
    if (category.toLowerCase().includes("jhs")) return JHS_GRADES
    if (category.toLowerCase().includes("shs")) return SHS_GRADES
    return [...PRIMARY_GRADES, ...JHS_GRADES, ...SHS_GRADES]
  }, [institution])

  const filteredSubjects = useMemo(() => {
    if (!selectedGrade) return subjects;
    return subjects.filter(s => s.gradeLevel === selectedGrade);
  }, [subjects, selectedGrade]);

  // Ranking / Position Logic
  const rankings = useMemo(() => {
    const totals = students.map(s => ({
      id: s.id,
      total: (classScores[s.id] || 0) + (examScores[s.id] || 0)
    })).sort((a, b) => b.total - a.total);
    
    const rankMap: Record<string, number> = {};
    totals.forEach((item, index) => {
      rankMap[item.id] = index + 1;
    });
    return rankMap;
  }, [students, classScores, examScores]);

  const handleScoreChange = (studentId: string, value: string, type: 'class' | 'exam') => {
    const num = parseFloat(value);
    const setter = type === 'class' ? setClassScores : setExamScores;
    const currentScores = type === 'class' ? classScores : examScores;
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setter(prev => ({ ...prev, [studentId]: num }));
    } else if (value === "") {
      const newScores = { ...currentScores };
      delete newScores[studentId];
      setter(newScores);
    }
  }

  const handleSaveAll = async () => {
    if (!db || !institutionId || !selectedSubject || !selectedGrade) return
    setIsSaving(true);
    try {
      const subjectObj = subjects.find(s => s.id === selectedSubject);
      const studentsToSave = students.filter(s => classScores[s.id] !== undefined || examScores[s.id] !== undefined);
      const promises = studentsToSave.map((student) => {
        const cScore = classScores[student.id] || 0;
        const eScore = examScores[student.id] || 0;
        const recordId = `${student.id}_${selectedSubject}_2026_Term2`;
        return setDoc(doc(db, "exam_records", recordId), {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          subjectId: selectedSubject,
          subjectName: subjectObj?.name || "Unknown",
          gradeLevel: selectedGrade,
          classScore: cScore,
          examScore: eScore,
          totalScore: cScore + eScore,
          term: "Term 2",
          academicYear: "2026",
          institutionId,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });
      await Promise.all(promises);
      toast({ title: "Scores Recorded", description: "Batch results synchronized." });
    } catch (error: any) { toast({ variant: "destructive", title: "Sync Failed", description: error.message }); } finally { setIsSaving(false); }
  }

  const fetchStudentRecords = async (student: any) => {
    if (!db || !institutionId || !student) return
    setLoadingRecords(true)
    setReportStudent(student)
    try {
      const q = query(collection(db, "exam_records"), where("studentId", "==", student.id), where("institutionId", "==", institutionId))
      const snap = await getDocs(q)
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setStudentRecords(records)
    } catch (e: any) { toast({ variant: "destructive", title: "Load Failed", description: "Academic history unreachable." }) } finally { setLoadingRecords(false) }
  }

  const handleEditClick = (student: any) => {
    setEditingStudent(student)
    setStudentForm({
      firstName: student.firstName || "", lastName: student.lastName || "", gender: student.gender || "Male",
      gradeLevel: student.gradeLevel || availableGrades[0], studentId: student.studentId || "",
      parentName: student.parentName || "", parentPhone: student.parentPhone || "", photoUrl: student.photoUrl || ""
    })
    setIsEditOpen(true)
  }

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !editingStudent) return
    setIsSaving(true)
    try {
      await updateDoc(doc(db, "students", editingStudent.id), studentForm)
      toast({ title: "Profile Updated", description: "Roster synchronized." })
      setIsEditOpen(false)
      if (reportStudent?.id === editingStudent.id) setReportStudent({ ...reportStudent, ...studentForm })
    } catch (error: any) { toast({ variant: "destructive", title: "Update Failed", description: error.message }) } finally { setIsSaving(false) }
  }

  const uniqueGrades = useMemo(() => Array.from(new Set(subjects.map(s => s.gradeLevel))).sort(), [subjects]);

  if (!institutionId && !authLoading) return <div className="p-20 text-center animate-pulse font-bold text-muted-foreground">Synchronizing Academic Node...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Examination Center</h1>
          <p className="text-muted-foreground">Capture results, track rankings, and generate terminal reports.</p>
        </div>
      </div>

      <Tabs defaultValue="entry" className="no-print">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="entry" className="rounded-lg gap-2"><ClipboardList className="size-4" /> Score Capture</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg gap-2"><GraduationCap className="size-4" /> Performance Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="md:col-span-1 border-none shadow-md">
              <CardHeader><CardTitle className="text-sm">Context</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Grade Node</Label>
                  <Select onValueChange={setSelectedGrade} value={selectedGrade}><SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>{uniqueGrades.map(grade => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject Module</Label>
                  <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedGrade}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>{filteredSubjects.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3 border-none shadow-md overflow-hidden">
              <CardHeader className="border-b bg-white flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Score Ledger</CardTitle>
                  <CardDescription>Position calculates automatically on save.</CardDescription>
                </div>
                <Button className="gap-2 bg-primary" onClick={handleSaveAll} disabled={isSaving || !selectedSubject}>
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Batch
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {!selectedGrade ? (
                  <div className="p-20 text-center opacity-20"><ClipboardList className="size-16 mx-auto mb-4" /><p>Select a node to begin.</p></div>
                ) : (studentsLoading || loadingScores) ? (
                  <div className="p-20 text-center"><Loader2 className="size-8 animate-spin mx-auto text-primary" /></div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Student Details</TableHead>
                        <TableHead className="w-24">Class (30)</TableHead>
                        <TableHead className="w-24">Exam (70)</TableHead>
                        <TableHead className="w-20">Total</TableHead>
                        <TableHead className="w-20 text-center">Rank</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((stu: any) => (
                        <TableRow key={stu.id}>
                          <TableCell className="font-bold text-primary">{stu.firstName} {stu.lastName}</TableCell>
                          <TableCell><Input type="number" value={classScores[stu.id] ?? ""} onChange={e => handleScoreChange(stu.id, e.target.value, 'class')} className="h-9 font-bold" /></TableCell>
                          <TableCell><Input type="number" value={examScores[stu.id] ?? ""} onChange={e => handleScoreChange(stu.id, e.target.value, 'exam')} className="h-9 font-bold" /></TableCell>
                          <TableCell className="font-bold text-accent">{(classScores[stu.id] || 0) + (examScores[stu.id] || 0)}</TableCell>
                          <TableCell className="text-center">
                             {rankings[stu.id] && <Badge variant="secondary" className="bg-primary/5 text-primary text-[10px]">{rankings[stu.id]}{rankings[stu.id] === 1 ? 'st' : rankings[stu.id] === 2 ? 'nd' : 'th'}</Badge>}
                          </TableCell>
                          <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleEditClick(stu)}><Pencil className="size-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="md:col-span-1 border-none shadow-md overflow-hidden">
               <div className="p-4 bg-white border-b"><div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input placeholder="Find student..." className="pl-9" /></div></div>
               <div className="divide-y max-h-[500px] overflow-y-auto">
                 {students.map((s: any) => (
                   <button key={s.id} onClick={() => fetchStudentRecords(s)} className={`w-full text-left p-4 hover:bg-slate-50 flex items-center gap-3 ${reportStudent?.id === s.id ? 'bg-primary/5 border-l-4 border-primary' : ''}`}>
                     <div className="size-8 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                       {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="size-4 opacity-20" />}
                     </div>
                     <span className="text-xs font-bold text-primary uppercase">{s.firstName} {s.lastName}</span>
                   </button>
                 ))}
               </div>
            </Card>
            <Card className="md:col-span-3 border-none shadow-md overflow-hidden">
              <CardHeader className="border-b bg-white flex flex-row items-center justify-between">
                <CardTitle>Terminal Report Preview</CardTitle>
                {reportStudent && <Button variant="outline" className="gap-2" onClick={() => window.print()}><Printer className="size-4" /> Print Report</Button>}
              </CardHeader>
              <CardContent className="p-8">
                 {!reportStudent ? (
                   <div className="h-64 flex flex-col items-center justify-center text-muted-foreground"><Trophy className="size-12 mb-4 opacity-10" /><p>Select a student to generate narrative.</p></div>
                 ) : (
                   <div className="space-y-8">
                     <div className="flex justify-between items-start border-b pb-6">
                        <div className="flex gap-4">
                          {institution?.logoUrl && <img src={institution.logoUrl} className="size-16 object-contain" />}
                          <div><h2 className="text-2xl font-bold text-primary">{reportStudent.firstName} {reportStudent.lastName}</h2><p className="text-sm font-bold text-muted-foreground uppercase">{reportStudent.studentId} • {reportStudent.gradeLevel}</p></div>
                        </div>
                        <Badge className="bg-accent text-accent-foreground px-4 py-1">Position: {rankings[reportStudent.id] || "---"}</Badge>
                     </div>
                     <Table>
                       <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead className="text-right">Class (30)</TableHead><TableHead className="text-right">Exam (70)</TableHead><TableHead className="text-right font-bold">Total</TableHead></TableRow></TableHeader>
                       <TableBody>
                         {studentRecords.map((r: any) => (
                           <TableRow key={r.id}><TableCell className="font-bold">{r.subjectName}</TableCell><TableCell className="text-right">{r.classScore}</TableCell><TableCell className="text-right">{r.examScore}</TableCell><TableCell className="text-right font-bold text-lg">{r.totalScore}</TableCell></TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </div>
                 )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reused Edit Dialog from Students Page for consistency */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}><DialogContent><form onSubmit={handleUpdateStudent}><DialogHeader><DialogTitle>Edit Academic Node</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>First Name</Label><Input value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} /></div><div className="space-y-2"><Label>Last Name</Label><Input value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} /></div></div>
          <div className="space-y-2"><Label>Student ID</Label><Input readOnly value={studentForm.studentId} className="bg-muted font-mono" /></div>
        </div>
        <DialogFooter><Button type="submit" disabled={isSaving} className="w-full">Authorize Changes</Button></DialogFooter></form></DialogContent></Dialog>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; max-width: none !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  )
}
