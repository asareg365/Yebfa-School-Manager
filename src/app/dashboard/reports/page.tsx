
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
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
  X,
  GraduationCap,
  ChevronDown,
  ShieldCheck
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

  const classesQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  
  const studentsQuery = useMemoFirebase(() => 
    institutionId ? query(
      collection(db, "students"), 
      where("tenantId", "==", institutionId)
    ) : null, 
    [db, institutionId]
  )
  
  const subjectsQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "subjects"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  
  const classExamsQuery = useMemoFirebase(() => 
    institutionId && selectedGrade ? query(
      collection(db, "exam_records"), 
      where("tenantId", "==", institutionId), 
      where("gradeLevel", "==", selectedGrade), 
      where("termId", "==", currentTerm)
    ) : null, 
    [db, institutionId, selectedGrade, currentTerm]
  )
  
  const attendanceQuery = useMemoFirebase(() => 
    institutionId && selectedStudentId ? query(
      collection(db, "attendance"), 
      where("studentId", "==", selectedStudentId)
    ) : null, 
    [db, institutionId, selectedStudentId]
  )

  const { data: classes = [] } = useCollection(classesQuery)
  const { data: students = [], loading: sLoading } = useCollection(studentsQuery)
  const { data: subjects = [] } = useCollection(subjectsQuery)
  const { data: allClassExams = [] } = useCollection(classExamsQuery)
  const { data: studentAttendance = [] } = useCollection(attendanceQuery)

  const filteredStudentsSuggestions = useMemo(() => {
    if (!studentSearch.trim()) return [];
    return students.filter(s => 
      `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase())
    ).slice(0, 10);
  }, [students, studentSearch])

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId])

  const reportData = useMemo(() => {
    if (!selectedStudentId || allClassExams.length === 0) return null;

    const studentExams = allClassExams.filter((e: any) => e.studentId === selectedStudentId);
    if (studentExams.length === 0) return null;

    const results = studentExams.map((e: any) => {
      const subject = subjects.find(s => s.id === e.subjectId);
      const gradeInfo = calculateGrade(e.totalScore || 0);
      return {
        subject: subject?.name || e.subjectId || "Subject",
        ca: e.classScore || 0,
        exam: e.examScore || 0,
        total: e.totalScore || 0,
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
      const total = sExams.reduce((acc, curr: any) => acc + (curr.totalScore || 0), 0);
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
    if (!selectedStudentId || !reportData || !institutionId) return;
    setIsComputing(true);
    try {
      const reportId = `${selectedStudentId}_${currentTerm.replace(/\s+/g, '')}_2026`;
      await setDoc(doc(db, "final_reports", reportId), {
        tenantId: institutionId,
        institutionId,
        studentId: selectedStudentId,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        termId: currentTerm,
        academicYear: "2026/2027",
        metrics: reportData,
        teacherRemark,
        headRemark,
        status: "Published",
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Report Published", description: "Identity Hub synchronized." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsComputing(false);
    }
  }

  const handlePrint = () => {
    window.print();
  }

  const handleSelectStudent = (s: any) => {
    setSelectedStudentId(s.id);
    setSelectedGrade(s.gradeLevel || "");
    setStudentSearch(`${s.firstName} ${s.lastName}`);
    setShowSuggestions(false);
    toast({ title: "Identity Verified", description: "Mapping performance metrics..." });
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Report Hub</h1>
          <p className="text-muted-foreground font-medium text-sm">Deterministic computation for <span className="text-accent font-bold uppercase">{currentTerm}</span>.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-xl gap-2 text-xs font-bold uppercase" onClick={handlePrint} disabled={!reportData}>
            <Printer className="size-4" /> Print PDF
          </Button>
          <Button className="flex-1 md:flex-none bg-primary h-11 rounded-xl shadow-lg gap-2 text-xs font-bold uppercase px-8" onClick={handleSaveReport} disabled={!reportData || isComputing}>
            {isComputing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Publish Result
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 no-print">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden h-fit">
            <CardHeader className="bg-slate-50 border-b p-6">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                 <Calculator className="size-4" /> Strategic Context
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="space-y-2 relative">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Find Student (Global)</Label>
                  <div className="relative">
                     <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                     <Input 
                      placeholder="Name or ID..." 
                      className="pl-10 h-11 rounded-xl bg-white"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                     />
                     {showSuggestions && studentSearch.length >= 1 && (
                       <div className="absolute z-50 w-full mt-1 bg-white border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <ScrollArea className="max-h-[250px]">
                            <div className="p-2 space-y-1">
                              {filteredStudentsSuggestions.length > 0 ? (
                                filteredStudentsSuggestions.map(s => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border border-transparent ${selectedStudentId === s.id ? 'bg-primary/5 border-primary/10' : 'hover:bg-slate-50'}`}
                                    onClick={() => handleSelectStudent(s)}
                                  >
                                    <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center font-bold text-primary text-[10px]">{s.firstName?.charAt(0)}{s.lastName?.charAt(0)}</div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-sm text-primary truncate">{s.firstName} {s.lastName}</span>
                                      <span className="text-[9px] text-muted-foreground font-mono font-bold">{s.admissionNumber} • {s.gradeLevel}</span>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="p-8 text-center text-xs text-muted-foreground italic">No students match search.</div>
                              )}
                            </div>
                          </ScrollArea>
                       </div>
                     )}
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Grade Module</Label>
                  <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setSelectedStudentId(""); setStudentSearch(""); }}>
                     <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                     <SelectContent>
                        {classes.filter(c => !!c.id).map(c => (
                          <SelectItem key={c.id} value={c.name || c.id || "unspecified"}>
                            {c.name || "Unnamed Class"}
                          </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>

               {reportData && (
                 <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-bold text-[9px] uppercase">Mean Average</span>
                      <span className="font-bold text-primary">{reportData.average}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-bold text-[9px] uppercase">Class Position</span>
                      <span className="font-bold text-accent">{reportData.position}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-primary/10">
                      <span className="text-muted-foreground font-bold text-[9px] uppercase">Promotion</span>
                      <Badge className="bg-green-600 text-white border-none text-[8px] font-bold uppercase h-5">{reportData.promotion}</Badge>
                    </div>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
           {!reportData ? (
             <Card className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] bg-muted/5 p-12 text-center space-y-6">
                <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center text-primary/20">
                  <TableIcon className="size-10" />
                </div>
                <div className="max-w-xs mx-auto">
                   <h3 className="text-xl font-bold font-headline text-primary/60 uppercase">Awaiting Computation</h3>
                   <p className="text-sm text-muted-foreground mt-2 leading-relaxed italic">Search for an active student in the registry to determine terminal performance metrics.</p>
                </div>
             </Card>
           ) : (
             <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
               <Card id="printable-report-card" className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white print:shadow-none print:border print:rounded-none">
                  <CardHeader className="bg-slate-50 border-b p-8 flex flex-col sm:flex-row items-center justify-between gap-6 print:bg-white print:border-b-2">
                    <div className="flex items-center gap-4">
                       <div className="size-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/10 print:shadow-none">
                          <GraduationCap className="size-8" />
                       </div>
                       <div>
                          <CardTitle className="text-2xl font-headline font-bold text-primary">{selectedStudent?.firstName} {selectedStudent?.lastName}</CardTitle>
                          <CardDescription className="font-bold uppercase tracking-tighter text-accent">{selectedStudent?.admissionNumber} • {selectedGrade}</CardDescription>
                       </div>
                    </div>
                    <div className="text-right">
                       <Badge variant="outline" className="text-[10px] font-bold uppercase px-4 py-1.5 rounded-full border-primary/20 text-primary bg-white shadow-sm print:shadow-none">{currentTerm} • 2026/2027</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
                      <Table className="min-w-[700px]">
                        <TableHeader className="bg-muted/10 print:bg-slate-50">
                          <TableRow>
                            <TableHead className="font-bold px-8 py-5 text-primary uppercase text-[10px] tracking-widest">Instructional Area</TableHead>
                            <TableHead className="text-center font-bold text-primary uppercase text-[10px] tracking-widest">CA (30)</TableHead>
                            <TableHead className="text-center font-bold text-primary uppercase text-[10px] tracking-widest">Exam (70)</TableHead>
                            <TableHead className="text-center font-bold text-primary uppercase text-[10px] tracking-widest">Total</TableHead>
                            <TableHead className="text-center font-bold text-primary uppercase text-[10px] tracking-widest">Grade</TableHead>
                            <TableHead className="text-right font-bold pr-8 text-primary uppercase text-[10px] tracking-widest">Remark</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.results.map((r, i) => (
                            <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-b last:border-none">
                              <TableCell className="font-bold text-primary px-8 py-4">{r.subject}</TableCell>
                              <TableCell className="text-center font-medium text-slate-600">{r.ca}</TableCell>
                              <TableCell className="text-center font-medium text-slate-600">{r.exam}</TableCell>
                              <TableCell className="text-center font-black text-primary">{r.total}</TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="font-bold bg-white">{r.grade}</Badge></TableCell>
                              <TableCell className="text-right pr-8"><span className="text-[10px] font-black uppercase text-accent tracking-tighter">{r.remark}</span></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
               </Card>

               <div className="grid gap-6 md:grid-cols-2 no-print">
                  <Card className="border-none shadow-xl rounded-[2rem] bg-white p-8 space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                       <User className="size-3.5" /> Class Teacher's Narrative
                    </Label>
                    <Textarea 
                      placeholder="Provide qualitative feedback on growth..." 
                      className="min-h-[120px] rounded-2xl text-sm bg-slate-50 border-none italic font-medium"
                      value={teacherRemark}
                      onChange={(e) => setTeacherRemark(e.target.value)}
                    />
                  </Card>
                  <Card className="border-none shadow-xl rounded-[2rem] bg-white p-8 space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                       <ShieldCheck className="size-3.5" /> Head Teacher's Authorization
                    </Label>
                    <Textarea 
                      placeholder="Official closing remarks..." 
                      className="min-h-[120px] rounded-2xl text-sm bg-slate-50 border-none italic font-medium"
                      value={headRemark}
                      onChange={(e) => setHeadRemark(e.target.value)}
                    />
                  </Card>
               </div>

               <div className="hidden print:grid grid-cols-2 gap-8 pt-8">
                  <div className="space-y-4">
                     <p className="text-[10px] font-bold uppercase text-primary">Class Teacher's Remark</p>
                     <div className="p-4 border rounded-xl min-h-[80px] text-xs italic text-slate-600">
                        {teacherRemark || "Awaiting teacher narrative..."}
                     </div>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-bold uppercase text-accent">Head Teacher's Authorization</p>
                     <div className="p-4 border rounded-xl min-h-[80px] text-xs italic text-slate-600">
                        {headRemark || "Authorized by registry node."}
                     </div>
                  </div>
               </div>
               
               <div className="flex justify-center pt-6 no-print">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
                    <CheckCircle2 className="size-3 text-green-600" /> Authorized Registry Computation • 2026 Academic Hub
                  </p>
               </div>
             </div>
           )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          #printable-report-card {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: visible !important;
            display: block !important;
            z-index: 10000 !important;
          }

          body * {
            visibility: hidden;
          }

          #printable-report-card, #printable-report-card *, .print-only-block, .print-only-block * {
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  )
}
