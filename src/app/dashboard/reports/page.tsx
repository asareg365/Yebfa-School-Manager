"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Loader2, 
  Printer, 
  Calculator, 
  Table as TableIcon, 
  BarChart, 
  TrendingUp, 
  User, 
  Search,
  CheckCircle2, 
  FileText,
  Save,
  Download,
  AlertCircle,
  X
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { calculateGrade, calculatePositions, calculateAttendanceSummary, DEFAULT_GRADING, determinePromotion } from "@/lib/academic-engine"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function StudentReportsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isComputing, setIsComputing] = useState(false)
  
  const [teacherRemark, setTeacherRemark] = useState("")
  const [headRemark, setHeadRemark] = useState("")

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
  const currentTerm = institution?.currentTerm || "Term 1"

  const classesQuery = useMemoFirebase(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const studentsQuery = useMemoFirebase(() => institutionId && selectedGrade ? query(collection(db, "students"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade)) : null, [db, institutionId, selectedGrade])
  const subjectsQuery = useMemoFirebase(() => institutionId ? query(collection(db, "subjects"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  
  const classExamsQuery = useMemoFirebase(() => institutionId && selectedGrade ? query(collection(db, "exam_records"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade), where("termId", "==", currentTerm)) : null, [db, institutionId, selectedGrade, currentTerm])
  const attendanceQuery = useMemoFirebase(() => institutionId && selectedStudentId ? query(collection(db, "attendance"), where("studentId", "==", selectedStudentId)) : null, [db, institutionId, selectedStudentId])

  const { data: classes = [] } = useCollection(classesQuery)
  const { data: students = [] } = useCollection(studentsQuery)
  const { data: subjects = [] } = useCollection(subjectsQuery)
  const { data: allClassExams = [] } = useCollection(classExamsQuery)
  const { data: studentAttendance = [] } = useCollection(attendanceQuery)

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase())
    )
  }, [students, studentSearch])

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId])

  const reportData = useMemo(() => {
    if (!selectedStudentId || allClassExams.length === 0) return null;

    const studentExams = allClassExams.filter((e: any) => e.studentId === selectedStudentId);
    const results = studentExams.map((e: any) => {
      const subject = subjects.find(s => s.id === e.subjectId);
      const gradeInfo = calculateGrade(e.totalScore);
      return {
        subject: subject?.name || "Subject",
        ca: e.classScore,
        exam: e.examScore,
        total: e.totalScore,
        grade: gradeInfo.grade,
        remark: gradeInfo.remark
      };
    });

    const totalMarks = results.reduce((acc, curr) => acc + curr.total, 0);
    const average = results.length > 0 ? totalMarks / results.length : 0;
    const overallGrade = calculateGrade(average);
    const failedCount = results.filter(r => r.total < 50).length;

    const studentAverages = Array.from(new Set(allClassExams.map((e: any) => e.studentId))).map(sid => {
      const sExams = allClassExams.filter((e: any) => e.studentId === sid);
      const total = sExams.reduce((acc, curr: any) => acc + curr.totalScore, 0);
      return { studentId: sid, average: sExams.length > 0 ? total / sExams.length : 0 };
    });
    const positions = calculatePositions(studentAverages);
    const attSummary = calculateAttendanceSummary(studentAttendance);

    return {
      results,
      totalMarks,
      average: parseFloat(average.toFixed(2)),
      overallGrade: overallGrade.grade,
      position: positions[selectedStudentId] || "N/A",
      attendance: attSummary,
      promotion: determinePromotion(average, failedCount)
    };
  }, [selectedStudentId, allClassExams, subjects, studentAttendance]);

  const handleSaveReport = async () => {
    if (!selectedStudentId || !reportData) return;
    setIsComputing(true);
    try {
      const reportId = `${selectedStudentId}_${currentTerm.replace(/\s+/g, '')}_2026`;
      await setDoc(doc(db, "final_reports", reportId), {
        tenantId: institutionId,
        studentId: selectedStudentId,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        termId: currentTerm,
        academicYear: "2026/2027",
        metrics: reportData,
        teacherRemark,
        headRemark,
        status: "Published",
        updatedAt: serverTimestamp()
      });
      toast({ title: "Report Published" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsComputing(false);
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Report Hub</h1>
          <p className="text-muted-foreground font-medium text-sm">Deterministic computation for <span className="text-accent font-bold uppercase">{currentTerm}</span>.</p>
        </div>
        <div className="flex flex-wrap gap-3 no-print w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-xl gap-2 text-xs font-bold uppercase" onClick={() => window.print()} disabled={!reportData}>
            <Printer className="size-4" /> Print
          </Button>
          <Button className="flex-1 md:flex-none bg-primary h-11 rounded-xl shadow-lg gap-2 text-xs font-bold uppercase" onClick={handleSaveReport} disabled={!reportData || isComputing}>
            {isComputing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 no-print">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-md rounded-3xl bg-white overflow-hidden h-fit">
            <CardHeader className="bg-slate-50 border-b p-6">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                 <Calculator className="size-4" /> Logic Context
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Grade Module</Label>
                  <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setSelectedStudentId(""); setStudentSearch(""); }}>
                     <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                     <SelectContent>
                        {classes.filter(c => c.id).map(c => (
                          <SelectItem key={c.id} value={c.name || c.id}>
                            {c.name || "Unnamed Class"}
                          </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
               
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Find Student</Label>
                  <div className="relative">
                     <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                     <Input 
                      placeholder="Search name..." 
                      className="pl-10 h-11 rounded-xl"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      disabled={!selectedGrade}
                     />
                     {showSuggestions && studentSearch.length >= 2 && (
                       <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl overflow-hidden">
                          <ScrollArea className="max-h-[200px]">
                            {filteredStudents.map(s => (
                              <button
                                key={s.id}
                                className="w-full text-left p-3 text-sm hover:bg-slate-50 border-b last:border-none flex flex-col"
                                onClick={() => {
                                  setSelectedStudentId(s.id);
                                  setStudentSearch(`${s.firstName} ${s.lastName}`);
                                  setShowSuggestions(false);
                                }}
                              >
                                <span className="font-bold">{s.firstName} {s.lastName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{s.admissionNumber}</span>
                              </button>
                            ))}
                          </ScrollArea>
                       </div>
                     )}
                  </div>
               </div>

               {reportData && (
                 <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-bold text-[9px] uppercase">Mean Average</span>
                      <span className="font-bold text-primary">{reportData.average}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-bold text-[9px] uppercase">Attendance</span>
                      <span className="font-bold text-primary">{reportData.attendance.percentage}%</span>
                    </div>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
           {!reportData ? (
             <Card className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-muted/5 p-12 text-center space-y-4">
                <TableIcon className="size-10 text-primary/10" />
                <p className="text-sm text-muted-foreground italic">Search for a student to compute academic data.</p>
             </Card>
           ) : (
             <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
               <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50 border-b p-6"><CardTitle className="text-lg">Performance Records</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
                      <Table className="min-w-[600px]">
                        <TableHeader className="bg-muted/10">
                          <TableRow>
                            <TableHead className="font-bold px-6">SUBJECT</TableHead>
                            <TableHead className="text-center font-bold">TOTAL</TableHead>
                            <TableHead className="text-center font-bold">GRADE</TableHead>
                            <TableHead className="text-right font-bold pr-6">REMARK</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.results.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-bold text-primary px-6">{r.subject}</TableCell>
                              <TableCell className="text-center font-bold">{r.total}</TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="font-bold">{r.grade}</Badge></TableCell>
                              <TableCell className="text-right pr-6"><span className="text-[10px] font-bold uppercase text-muted-foreground">{r.remark}</span></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
               </Card>

               <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-none shadow-md rounded-2xl bg-white p-6 space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Teacher's Remark</Label>
                    <Textarea 
                      placeholder="..." 
                      className="min-h-[80px] rounded-xl text-sm"
                      value={teacherRemark}
                      onChange={(e) => setTeacherRemark(e.target.value)}
                    />
                  </Card>
                  <Card className="border-none shadow-md rounded-2xl bg-white p-6 space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-accent">Head Teacher Remark</Label>
                    <Textarea 
                      placeholder="..." 
                      className="min-h-[80px] rounded-xl text-sm"
                      value={headRemark}
                      onChange={(e) => setHeadRemark(e.target.value)}
                    />
                  </Card>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  )
}
