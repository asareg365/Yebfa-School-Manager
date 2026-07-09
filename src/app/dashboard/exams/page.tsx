
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Printer, Save, Loader2, CheckCircle2, User, Search, BookOpen, GraduationCap } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, getDocs } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ExaminationCenterPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  
  // Score Entry States
  const [classScores, setClassScores] = useState<Record<string, number>>({})
  const [examScores, setExamScores] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Individual Report States
  const [reportStudent, setReportStudent] = useState<any>(null)
  const [studentRecords, setStudentRecords] = useState<any[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  // Auto-resolve institution for school owners if missing
  useEffect(() => {
    async function resolveInst() {
      if (!institutionId && user?.email && db) {
        const q = query(collection(db, "institutions"), where("ownerEmail", "==", user.email))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const first = snap.docs[0]
          localStorage.setItem('selected_institution_id', first.id)
          localStorage.setItem('selected_institution_name', first.data().name)
          setInstitutionId(first.id)
        }
      }
    }
    resolveInst()
  }, [user, db, institutionId])

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

  const filteredSubjects = useMemo(() => {
    if (!selectedGrade) return subjects;
    return subjects.filter(s => s.gradeLevel === selectedGrade);
  }, [subjects, selectedGrade]);

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
    if (!db || !institutionId || !selectedSubject || !selectedGrade) {
      toast({ variant: "destructive", title: "Configuration Missing", description: "Select grade and subject before saving." })
      return
    }
    setIsSaving(true);
    
    try {
      const subjectObj = subjects.find(s => s.id === selectedSubject);
      const studentsToSave = students.filter(s => classScores[s.id] !== undefined || examScores[s.id] !== undefined);

      const promises = studentsToSave.map((student) => {
        const cScore = classScores[student.id] || 0;
        const eScore = examScores[student.id] || 0;
        
        return addDoc(collection(db, "exam_records"), {
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
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(promises);
      toast({ title: "Scores Recorded", description: "Data synchronized successfully." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  const fetchStudentRecords = async (student: any) => {
    if (!db || !institutionId || !student) return
    setLoadingRecords(true)
    setReportStudent(student)
    try {
      const q = query(
        collection(db, "exam_records"), 
        where("studentId", "==", student.id),
        where("institutionId", "==", institutionId)
      )
      const snap = await getDocs(q)
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setStudentRecords(records)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Load Failed", description: "Could not fetch academic history." })
    } finally {
      setLoadingRecords(false)
    }
  }

  const uniqueGrades = useMemo(() => {
    const grades = new Set(subjects.map(s => s.gradeLevel));
    return Array.from(grades).sort();
  }, [subjects]);

  if (!institutionId) return (
    <div className="p-20 text-center space-y-4">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="font-bold text-muted-foreground uppercase tracking-widest">Resolving Academic Node...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Examination Center</h1>
          <p className="text-muted-foreground">Capture grades and generate student report cards.</p>
        </div>
      </div>

      <Tabs defaultValue="entry" className="no-print">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="entry" className="rounded-lg gap-2">
            <ClipboardList className="size-4" /> Score Entry
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg gap-2">
            <GraduationCap className="size-4" /> Student Report Cards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="md:col-span-1 border-none shadow-md">
              <CardHeader><CardTitle className="text-sm">Filter Context</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Grade</Label>
                  <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                    <SelectTrigger><SelectValue placeholder="Grade Node" /></SelectTrigger>
                    <SelectContent>
                      {uniqueGrades.map(grade => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Subject</Label>
                  <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedGrade}>
                    <SelectTrigger><SelectValue placeholder="Subject Module" /></SelectTrigger>
                    <SelectContent>
                      {filteredSubjects.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3 border-none shadow-md overflow-hidden">
              <CardHeader className="border-b bg-white flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Score Capture Ledger</CardTitle>
                  <CardDescription>Entering data for {selectedGrade || "..."} • {selectedSubject ? filteredSubjects.find(s => s.id === selectedSubject)?.name : "..."}</CardDescription>
                </div>
                <Button className="gap-2 bg-primary" onClick={handleSaveAll} disabled={isSaving || !selectedSubject || (Object.keys(classScores).length === 0 && Object.keys(examScores).length === 0)}>
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save Batch
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {!selectedGrade ? (
                  <div className="p-20 text-center space-y-4">
                    <ClipboardList className="size-12 text-primary/10 mx-auto" />
                    <p className="text-sm font-bold text-muted-foreground">Select a grade node to begin capture.</p>
                  </div>
                ) : studentsLoading ? (
                  <div className="p-20 text-center"><Loader2 className="size-8 animate-spin mx-auto text-primary" /></div>
                ) : students.length === 0 ? (
                  <div className="p-20 text-center italic text-muted-foreground">No students enrolled in this grade node.</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Student Details</TableHead>
                        <TableHead className="w-32">Class Score (30%)</TableHead>
                        <TableHead className="w-32">Exam Score (70%)</TableHead>
                        <TableHead className="w-24">Total (%)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((stu: any) => (
                        <TableRow key={stu.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-mono font-bold text-muted-foreground">{stu.studentId}</span>
                              <span className="font-bold text-primary">{stu.firstName} {stu.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              placeholder="0-30" 
                              value={classScores[stu.id] ?? ""} 
                              onChange={e => handleScoreChange(stu.id, e.target.value, 'class')}
                              className="h-9 font-bold"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              placeholder="0-70" 
                              value={examScores[stu.id] ?? ""} 
                              onChange={e => handleScoreChange(stu.id, e.target.value, 'exam')}
                              className="h-9 font-bold"
                            />
                          </TableCell>
                          <TableCell className="font-bold text-primary">
                            {(classScores[stu.id] || 0) + (examScores[stu.id] || 0)}
                          </TableCell>
                          <TableCell>
                            {(classScores[stu.id] !== undefined || examScores[stu.id] !== undefined) ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1 border-none">
                                <CheckCircle2 className="size-3" /> Ready
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground italic">Pending</Badge>
                            )}
                          </TableCell>
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
            <Card className="md:col-span-1 border-none shadow-md">
              <CardHeader><CardTitle className="text-sm">Student Registry</CardTitle></CardHeader>
              <CardContent className="p-0">
                 <div className="px-4 pb-4">
                   <div className="relative">
                     <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                     <Input placeholder="Search student..." className="pl-9 h-9" />
                   </div>
                 </div>
                 <div className="divide-y max-h-[500px] overflow-y-auto">
                   {students.map((s: any) => (
                     <button 
                       key={s.id} 
                       onClick={() => fetchStudentRecords(s)}
                       className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${reportStudent?.id === s.id ? 'bg-primary/5 border-l-4 border-primary' : ''}`}
                     >
                       <p className="text-xs font-bold text-primary uppercase">{s.firstName} {s.lastName}</p>
                       <p className="text-[10px] text-muted-foreground">{s.gradeLevel} • {s.studentId}</p>
                     </button>
                   ))}
                 </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3 border-none shadow-md overflow-hidden">
              <CardHeader className="border-b bg-white flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Individual Performance Report</CardTitle>
                  <CardDescription>Detailed academic summary for Term 2, 2026.</CardDescription>
                </div>
                {reportStudent && (
                  <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                    <Printer className="size-4" /> Print Report Card
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0 min-h-[400px]">
                {!reportStudent ? (
                  <div className="p-20 text-center space-y-4">
                    <User className="size-12 text-primary/10 mx-auto" />
                    <p className="text-sm font-bold text-muted-foreground">Select a student to generate their report card.</p>
                  </div>
                ) : loadingRecords ? (
                  <div className="p-20 text-center"><Loader2 className="size-8 animate-spin mx-auto text-primary" /></div>
                ) : studentRecords.length === 0 ? (
                  <div className="p-20 text-center italic text-muted-foreground">No examination records found for this student.</div>
                ) : (
                  <div className="p-8 space-y-8">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-primary">{reportStudent.firstName} {reportStudent.lastName}</h2>
                        <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">{reportStudent.studentId} • {reportStudent.gradeLevel}</p>
                      </div>
                      <Badge className="bg-primary text-white text-[10px] uppercase px-3 py-1">Term 2, 2026</Badge>
                    </div>

                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-right">Class Score</TableHead>
                          <TableHead className="text-right">Exam Score</TableHead>
                          <TableHead className="text-right font-bold">Total (%)</TableHead>
                          <TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentRecords.map((rec: any) => (
                          <TableRow key={rec.id}>
                            <TableCell className="font-bold text-primary">{rec.subjectName}</TableCell>
                            <TableCell className="text-right">{rec.classScore}</TableCell>
                            <TableCell className="text-right">{rec.examScore}</TableCell>
                            <TableCell className="text-right font-bold text-lg">{rec.totalScore}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`font-bold ${rec.totalScore >= 80 ? 'text-green-600' : rec.totalScore >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                                {rec.totalScore >= 80 ? 'A' : rec.totalScore >= 70 ? 'B' : rec.totalScore >= 50 ? 'C' : 'D'}
                              </Badge>
                            </TableCell>
                          </TableRow>
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

      {/* Print View Wrapper */}
      <div className="hidden print:block bg-white p-12 space-y-10">
        <div className="flex justify-between items-start border-b-2 border-primary pb-8">
          <div className="flex items-center gap-6">
            <div className="size-20 bg-primary rounded-2xl flex items-center justify-center text-white text-4xl font-bold">Y</div>
            <div>
              <h1 className="text-3xl font-bold text-primary uppercase tracking-tighter">Yebfa School Manager</h1>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">Official Terminal Report</p>
            </div>
          </div>
          <div className="text-right font-bold">
            <p>Academic Year: 2026</p>
            <p>Term: 2</p>
            <p className="mt-2 text-[10px] text-muted-foreground uppercase">Ahafo Regional Hub</p>
          </div>
        </div>

        {reportStudent && (
          <>
            <div className="grid grid-cols-3 gap-10">
              <div className="p-6 bg-slate-50 rounded-2xl border">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Student Name</p>
                <p className="text-lg font-bold text-primary">{reportStudent.firstName} {reportStudent.lastName}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Student ID</p>
                <p className="text-lg font-mono font-bold text-accent">{reportStudent.studentId}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Grade Level</p>
                <p className="text-lg font-bold text-primary">{reportStudent.gradeLevel}</p>
              </div>
            </div>

            <Table className="border-t border-b">
              <TableHeader>
                <TableRow className="bg-slate-100">
                  <TableHead className="font-bold py-4">Academic Subject</TableHead>
                  <TableHead className="text-right font-bold">Class Work (30%)</TableHead>
                  <TableHead className="text-right font-bold">Examination (70%)</TableHead>
                  <TableHead className="text-right font-bold">Total Score (%)</TableHead>
                  <TableHead className="text-center font-bold">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentRecords.map((rec: any) => (
                  <TableRow key={rec.id} className="border-b">
                    <TableCell className="font-bold text-primary py-4">{rec.subjectName}</TableCell>
                    <TableCell className="text-right">{rec.classScore}</TableCell>
                    <TableCell className="text-right">{rec.examScore}</TableCell>
                    <TableCell className="text-right font-bold text-lg">{rec.totalScore}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-lg">
                        {rec.totalScore >= 80 ? 'A' : rec.totalScore >= 70 ? 'B' : rec.totalScore >= 50 ? 'C' : 'D'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="grid grid-cols-2 gap-10 pt-10">
              <div className="p-6 border-2 border-dashed rounded-2xl">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4">Class Teacher's Remarks</h4>
                <div className="h-20 border-b border-muted"></div>
              </div>
              <div className="p-6 border-2 border-dashed rounded-2xl">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4">Headteacher's Remarks</h4>
                <div className="h-20 border-b border-muted"></div>
              </div>
            </div>

            <div className="mt-20 flex justify-between">
               <div className="w-64 border-t-2 border-primary pt-3 text-center">
                  <p className="text-xs font-bold uppercase">Authorized Signature</p>
                  <p className="text-[9px] text-muted-foreground uppercase mt-1">Institutional Seal</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Date Generated</p>
                  <p className="font-bold">{new Date().toLocaleDateString()}</p>
               </div>
            </div>
          </>
        )}
      </div>

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
