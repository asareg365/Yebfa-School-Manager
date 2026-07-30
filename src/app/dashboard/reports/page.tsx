
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
import { useFirestore, useCollection, useDoc, useUser } from "@/firebase"
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

  // Queries
  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const studentsQuery = useMemo(() => institutionId && selectedGrade ? query(collection(db, "students"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade)) : null, [db, institutionId, selectedGrade])
  const subjectsQuery = useMemo(() => institutionId ? query(collection(db, "subjects"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const classExamsQuery = useMemo(() => institutionId && selectedGrade ? query(collection(db, "exam_records"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade), where("termId", "==", currentTerm)) : null, [db, institutionId, selectedGrade, currentTerm])
  const attendanceQuery = useMemo(() => institutionId && selectedStudentId ? query(collection(db, "attendance"), where("studentId", "==", selectedStudentId)) : null, [db, institutionId, selectedStudentId])

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
      toast({ title: "Report Finalized", description: "Academic record has been locked and published." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setIsComputing(false);
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-primary tracking-tight">Student Report Hub</h1>
          <p className="text-muted-foreground text-sm md:text-base font-medium">Deterministic academic computation for <span className="text-accent font-bold uppercase">{currentTerm}</span>.</p>
        </div>
        <div className="flex flex-wrap gap-3 no-print">
          <Button variant="outline" className="flex-1 sm:flex-none h-11 rounded-xl gap-2 text-xs font-bold uppercase" onClick={() => window.print()} disabled={!reportData}>
            <Printer className="size-4" /> Print Preview
          </Button>
          <Button className="flex-1 sm:flex-none bg-primary h-11 rounded-xl shadow-lg gap-2 text-xs font-bold uppercase" onClick={handleSaveReport} disabled={!reportData || isComputing}>
            {isComputing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Publish Result
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
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Grade Module</Label>
                  <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setSelectedStudentId(""); setStudentSearch(""); }}>
                     <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                     <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
               
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Find Student</Label>
                  <div className="relative">
                     <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                     <Input 
                      placeholder="Type name or Registry ID..." 
                      className="pl-10 h-11 rounded-xl text-sm"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      disabled={!selectedGrade}
                     />
                     {studentSearch && (
                       <button onClick={() => setStudentSearch("")} className="absolute right-3 top-3 text-muted-foreground hover:text-primary">
                          <X className="size-4" />
                       </button>
                     )}

                     {studentSearch.length >= 2 && filteredStudents.length > 0 && (
                       <div className="absolute z-50 w-full mt-2 bg-white border border-border/40 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <ScrollArea className="max-h-[250px]">
                             <div className="p-2 space-y-1">
                                {filteredStudents.map(s => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedStudentId(s.id);
                                      setStudentSearch(`${s.firstName} ${s.lastName}`);
                                    }}
                                    className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${selectedStudentId === s.id ? 'bg-primary text-white' : 'hover:bg-slate-50'}`}
                                  >
                                    <div className="flex flex-col min-w-0">
                                      <span className="truncate">{s.firstName} {s.lastName}</span>
                                      <span className={`text-[9px] font-mono uppercase tracking-tighter mt-0.5 ${selectedStudentId === s.id ? 'text-accent' : 'text-muted-foreground group-hover:text-accent'}`}>{s.admissionNumber}</span>
                                    </div>
                                    {selectedStudentId === s.id && <CheckCircle2 className="size-4 shrink-0 text-accent" />}
                                  </button>
                                ))}
                             </div>
                          </ScrollArea>
                       </div>
                     )}
                  </div>
                  
                  <p className="text-[9px] text-muted-foreground italic font-medium px-1">
                    {studentSearch.length < 2 ? "Enter at least 2 characters to search." : `Found ${filteredStudents.length} matches.`}
                  </p>
               </div>

               {reportData && (
                 <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground uppercase font-bold text-[9px]">Class Position</span>
                      <Badge className="bg-primary text-white border-none h-5 px-2">{reportData.position}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground uppercase font-bold text-[9px]">Mean Average</span>
                      <span className="font-bold text-primary">{reportData.average}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground uppercase font-bold text-[9px]">Term Attendance</span>
                      <span className="font-bold text-primary">{reportData.attendance.percentage}%</span>
                    </div>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6 md:space-y-8">
           {!reportData ? (
             <Card className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-muted/5 p-6 md:p-12 text-center space-y-4">
                <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center">
                  <TableIcon className="size-8 text-primary/20" />
                </div>
                <div className="max-w-xs">
                   <h3 className="font-bold text-lg text-primary/60">Awaiting Search Input</h3>
                   <p className="text-xs text-muted-foreground leading-relaxed">Select a grade module and type the student's name in the "Find Student" box to authorize academic aggregation.</p>
                </div>
             </Card>
           ) : (
             <>
               <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50 border-b p-6"><CardTitle className="text-lg font-bold">Academic Performance Breakdown</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/20">
                          <TableRow>
                            <TableHead className="font-bold px-6">SUBJECT</TableHead>
                            <TableHead className="text-center font-bold">CA (30)</TableHead>
                            <TableHead className="text-center font-bold">EXAM (70)</TableHead>
                            <TableHead className="text-center font-bold">TOTAL</TableHead>
                            <TableHead className="text-center font-bold">GRADE</TableHead>
                            <TableHead className="text-right font-bold pr-6">REMARK</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.results.map((r, i) => (
                            <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell className="font-bold text-primary px-6 whitespace-nowrap">{r.subject}</TableCell>
                              <TableCell className="text-center font-medium">{r.ca}</TableCell>
                              <TableCell className="text-center font-medium">{r.exam}</TableCell>
                              <TableCell className="text-center font-bold text-primary">{r.total}</TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="font-bold border-primary/20 text-primary">{r.grade}</Badge></TableCell>
                              <TableCell className="text-right pr-6"><span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">{r.remark}</span></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
               </Card>

               <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-none shadow-md rounded-2xl bg-white p-6 space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Class Teacher's Observation</Label>
                    <Textarea 
                      placeholder="Enter qualitative remark..." 
                      className="min-h-[100px] rounded-xl text-sm border-slate-100"
                      value={teacherRemark}
                      onChange={(e) => setTeacherRemark(e.target.value)}
                    />
                  </Card>
                  <Card className="border-none shadow-md rounded-2xl bg-white p-6 space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-accent">Administrative Directive</Label>
                    <Textarea 
                      placeholder="Enter head teacher remark..." 
                      className="min-h-[100px] rounded-xl text-sm border-slate-100"
                      value={headRemark}
                      onChange={(e) => setHeadRemark(e.target.value)}
                    />
                    <div className="flex justify-between items-center pt-2">
                       <span className="text-[9px] font-bold uppercase text-muted-foreground">Promotion Decision</span>
                       <Badge className="bg-accent text-white uppercase text-[9px] font-bold px-3 border-none">{reportData.promotion}</Badge>
                    </div>
                  </Card>
               </div>

               <Card className="border-none shadow-md rounded-2xl bg-white p-6 overflow-hidden">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 mb-6"><BarChart className="size-4 text-primary" /> Performance Visualization Curve</CardTitle>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={reportData.results}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="subject" fontSize={9} tickLine={false} axisLine={false} hide={window.innerWidth < 640} />
                        <YAxis fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="total" fill="#1a1f2c" radius={[4, 4, 0, 0]} barSize={window.innerWidth < 640 ? 15 : 30} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
               </Card>
             </>
           )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-view, .print-view * { visibility: visible; }
          .print-view { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 40px; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
