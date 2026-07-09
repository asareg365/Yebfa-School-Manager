
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Printer, Save, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function ExaminationCenterPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  
  // Separate states for Class Scores and Exam Scores
  const [classScores, setClassScores] = useState<Record<string, number>>({})
  const [examScores, setExamScores] = useState<Record<string, number>>({})
  
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

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
    if (!db || !institutionId || !selectedSubject || !selectedGrade) return;
    setIsSaving(true);
    
    try {
      const subjectObj = subjects.find(s => s.id === selectedSubject);
      
      // We only save records for students who have at least one score entered
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
      toast({ title: "Scores Recorded", description: "Examination and Class assessment data synchronized." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  const handlePrint = () => {
    window.print();
  }

  const uniqueGrades = useMemo(() => {
    const grades = new Set(subjects.map(s => s.gradeLevel));
    return Array.from(grades).sort();
  }, [subjects]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Examination Center</h1>
          <p className="text-muted-foreground">Capture and manage institutional class and exam results.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handlePrint} disabled={!selectedGrade}>
            <Printer className="size-4" /> Print Results
          </Button>
          <Button className="gap-2 bg-primary" onClick={handleSaveAll} disabled={isSaving || !selectedSubject || (Object.keys(classScores).length === 0 && Object.keys(examScores).length === 0)}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Batch Records
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4 no-print">
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
          <CardHeader className="border-b bg-white">
            <CardTitle>Score Capture Ledger</CardTitle>
            <CardDescription>Entering data for {selectedGrade || "..."} • {selectedSubject ? filteredSubjects.find(s => s.id === selectedSubject)?.name : "..."}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedGrade ? (
              <div className="p-20 text-center space-y-4">
                <ClipboardList className="size-12 text-primary/10 mx-auto" />
                <p className="text-sm font-bold text-muted-foreground">Select a grade and subject node to begin capture.</p>
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
                    <TableHead className="w-32">Class Score</TableHead>
                    <TableHead className="w-32">Exam Score</TableHead>
                    <TableHead className="w-24">Total</TableHead>
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
                          min="0" 
                          max="100" 
                          placeholder="0-30" 
                          value={classScores[stu.id] ?? ""} 
                          onChange={e => handleScoreChange(stu.id, e.target.value, 'class')}
                          className="h-9 font-bold"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
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

      {/* Print View */}
      <div className="hidden print:block bg-white p-10 space-y-8">
        <div className="flex justify-between items-start border-b-2 border-primary pb-6">
          <div className="flex items-center gap-4">
            <div className="size-16 bg-primary rounded-xl flex items-center justify-center text-white text-3xl font-bold">Y</div>
            <div>
              <h1 className="text-2xl font-bold text-primary uppercase">Yebfa School Manager</h1>
              <p className="text-sm text-muted-foreground font-bold tracking-widest uppercase">Academic Examination Report</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">Academic Year: 2026</p>
            <p className="text-sm font-bold">Term: 2</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
           <div className="p-4 bg-muted/20 rounded-lg">
             <p className="text-[10px] uppercase font-bold text-muted-foreground">Grade Level</p>
             <p className="text-lg font-bold text-primary">{selectedGrade}</p>
           </div>
           <div className="p-4 bg-muted/20 rounded-lg">
             <p className="text-[10px] uppercase font-bold text-muted-foreground">Subject</p>
             <p className="text-lg font-bold text-primary">{filteredSubjects.find(s => s.id === selectedSubject)?.name}</p>
           </div>
        </div>

        <Table className="border-t">
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Student Name</TableHead>
              <TableHead className="font-bold">ID</TableHead>
              <TableHead className="text-right font-bold">Class Score</TableHead>
              <TableHead className="text-right font-bold">Exam Score</TableHead>
              <TableHead className="text-right font-bold">Total (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((stu: any) => (
              <TableRow key={stu.id}>
                <TableCell className="font-bold">{stu.firstName} {stu.lastName}</TableCell>
                <TableCell className="font-mono">{stu.studentId}</TableCell>
                <TableCell className="text-right">{classScores[stu.id] ?? "N/A"}</TableCell>
                <TableCell className="text-right">{examScores[stu.id] ?? "N/A"}</TableCell>
                <TableCell className="text-right font-bold">{(classScores[stu.id] || 0) + (examScores[stu.id] || 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-20 flex justify-between">
           <div className="w-48 border-t border-primary pt-2 text-center">
              <p className="text-[10px] font-bold uppercase">Subject Teacher</p>
           </div>
           <div className="w-48 border-t border-primary pt-2 text-center">
              <p className="text-[10px] font-bold uppercase">Principal/Head</p>
           </div>
        </div>
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
