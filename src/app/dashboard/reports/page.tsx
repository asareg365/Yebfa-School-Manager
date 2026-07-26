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
  CheckCircle2, 
  FileText,
  Save,
  Download,
  AlertCircle
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { calculateGrade, calculatePositions, calculateAttendanceSummary, DEFAULT_GRADING, determinePromotion } from "@/lib/academic-engine"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export default function QuantitativeReportsPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [isComputing, setIsComputing] = useState(false)
  
  // Remarks State (Manual)
  const [teacherRemark, setTeacherRemark] = useState("")
  const [headRemark, setHeadRemark] = useState("")

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)
  const currentTerm = institution?.currentTerm || "Term 1"

  // Queries
  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const studentsQuery = useMemo(() => institutionId && selectedGrade ? query(collection(db, "students"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade)) : null, [db, institutionId, selectedGrade])
  const subjectsQuery = useMemo(() => institutionId ? query(collection(db, "subjects"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  
  // Fetch ALL exam records for the class to compute positions
  const classExamsQuery = useMemo(() => institutionId && selectedGrade ? query(collection(db, "exam_records"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade), where("termId", "==", currentTerm)) : null, [db, institutionId, selectedGrade, currentTerm])
  
  // Student-specific queries
  const attendanceQuery = useMemo(() => institutionId && selectedStudentId ? query(collection(db, "attendance"), where("studentId", "==", selectedStudentId)) : null, [db, institutionId, selectedStudentId])

  const { data: classes = [] } = useCollection(classesQuery)
  const { data: students = [] } = useCollection(studentsQuery)
  const { data: subjects = [] } = useCollection(subjectsQuery)
  const { data: allClassExams = [] } = useCollection(classExamsQuery)
  const { data: studentAttendance = [] } = useCollection(attendanceQuery)

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId])

  // Strategic Calculations
  const reportData = useMemo(() => {
    if (!selectedStudentId || allClassExams.length === 0) return null;

    // 1. Get current student's exams
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

    // 2. Compute Overall Metrics
    const totalMarks = results.reduce((acc, curr) => acc + curr.total, 0);
    const average = results.length > 0 ? totalMarks / results.length : 0;
    const overallGrade = calculateGrade(average);
    const failedCount = results.filter(r => r.total < 50).length;

    // 3. Compute Positions for the entire class
    const studentAverages = Array.from(new Set(allClassExams.map((e: any) => e.studentId))).map(sid => {
      const sExams = allClassExams.filter((e: any) => e.studentId === sid);
      const total = sExams.reduce((acc, curr: any) => acc + curr.totalScore, 0);
      return { studentId: sid, average: sExams.length > 0 ? total / sExams.length : 0 };
    });
    const positions = calculatePositions(studentAverages);

    // 4. Attendance
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Quantitative Report Hub</h1>
          <p className="text-muted-foreground font-medium">Deterministic academic computation for <span className="text-accent font-bold uppercase">{currentTerm}</span>.</p>
        </div>
        <div className="flex gap-3 no-print">
          <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => window.print()} disabled={!reportData}>
            <Printer className="size-4" /> Print Preview
          </Button>
          <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2" onClick={handleSaveReport} disabled={!reportData || isComputing}>
            {isComputing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Publish Result
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4 no-print">
        <Card className="lg:col-span-1 border-none shadow-md rounded-3xl bg-white overflow-hidden h-fit">
          <CardHeader className="bg-slate-50 border-b p-6">
             <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Calculator className="size-4" /> Logic Context
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Grade Module</Label>
                <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setSelectedStudentId(""); }}>
                   <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                   <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Student Registry</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedGrade}>
                   <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choose Student" /></SelectTrigger>
                   <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
                </Select>
             </div>
             {reportData && (
               <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                  <div className="flex justify-between text-xs"><span>Computed Position</span><Badge className="bg-primary text-white h-5">{reportData.position}</Badge></div>
                  <div className="flex justify-between text-xs"><span>Average Score</span><span className="font-bold">{reportData.average}%</span></div>
                  <div className="flex justify-between text-xs"><span>Attendance</span><span className="font-bold">{reportData.attendance.percentage}%</span></div>
               </div>
             )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-8">
           {!reportData ? (
             <Card className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-muted/5 p-12 text-center space-y-4">
                <TableIcon className="size-12 text-muted-foreground/20" />
                <div className="max-w-xs">
                   <h3 className="font-bold text-lg text-primary/60">Awaiting Record Selection</h3>
                   <p className="text-xs text-muted-foreground">Select a student to authorize the quantitative engine to aggregate marks, attendance, and positions.</p>
                </div>
             </Card>
           ) : (
             <>
               <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50 border-b p-6"><CardTitle className="text-lg">Academic Performance Breakdown</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/20">
                        <TableRow>
                          <TableHead className="font-bold">SUBJECT</TableHead>
                          <TableHead className="text-center font-bold">CA (30)</TableHead>
                          <TableHead className="text-center font-bold">EXAM (70)</TableHead>
                          <TableHead className="text-center font-bold">TOTAL</TableHead>
                          <TableHead className="text-center font-bold">GRADE</TableHead>
                          <TableHead className="text-right font-bold pr-6">REMARK</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.results.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-bold text-primary">{r.subject}</TableCell>
                            <TableCell className="text-center">{r.ca}</TableCell>
                            <TableCell className="text-center">{r.exam}</TableCell>
                            <TableCell className="text-center font-bold">{r.total}</TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className="font-bold">{r.grade}</Badge></TableCell>
                            <TableCell className="text-right pr-6"><span className="text-[10px] font-bold uppercase text-muted-foreground">{r.remark}</span></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
               </Card>

               <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-none shadow-md rounded-2xl bg-white p-6 space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Class Teacher's Remark</Label>
                    <Textarea 
                      placeholder="Enter professional observation..." 
                      className="min-h-[100px] rounded-xl"
                      value={teacherRemark}
                      onChange={(e) => setTeacherRemark(e.target.value)}
                    />
                    <p className="text-[9px] text-muted-foreground italic">* Manual entry required for official verification.</p>
                  </Card>
                  <Card className="border-none shadow-md rounded-2xl bg-white p-6 space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-accent">Head Teacher's Remark</Label>
                    <Textarea 
                      placeholder="Enter administrative directive..." 
                      className="min-h-[100px] rounded-xl"
                      value={headRemark}
                      onChange={(e) => setHeadRemark(e.target.value)}
                    />
                    <div className="flex justify-between items-center pt-2">
                       <span className="text-[10px] font-bold uppercase text-muted-foreground">Promotion Decision</span>
                       <Badge className="bg-accent text-white uppercase text-[9px]">{reportData.promotion}</Badge>
                    </div>
                  </Card>
               </div>

               <Card className="border-none shadow-md rounded-2xl bg-white p-6">
                  <CardTitle className="text-sm flex items-center gap-2 mb-6"><BarChart className="size-4" /> Performance Visualization</CardTitle>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={reportData.results}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="subject" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="total" fill="#1a1f2c" radius={[4, 4, 0, 0]} barSize={30} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
               </Card>
             </>
           )}
        </div>
      </div>

      {/* Hidden Print-Only View */}
      {reportData && selectedStudent && (
        <div className="print-view hidden print:block bg-white p-12 space-y-10 min-h-screen font-serif">
           <header className="flex justify-between items-start border-b-4 border-primary pb-6">
              <div className="flex gap-6 items-center">
                 <div className="size-24 bg-slate-50 border rounded-2xl flex items-center justify-center p-2">
                    {institution?.logoUrl ? <img src={institution.logoUrl} className="max-h-full" /> : <Calculator className="size-12 text-primary" />}
                 </div>
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold uppercase text-primary">{institution?.name}</h2>
                    <p className="text-sm font-bold text-muted-foreground italic">{institution?.location} • {institution?.phone}</p>
                    <p className="text-xs uppercase font-bold tracking-widest pt-2">Terminal Academic Report</p>
                 </div>
              </div>
              <div className="text-right">
                 <div className="size-28 bg-slate-100 rounded-xl border-2 border-slate-200 overflow-hidden ml-auto">
                    {selectedStudent.photoUrl && <img src={selectedStudent.photoUrl} className="w-full h-full object-cover" />}
                 </div>
                 <p className="text-[10px] font-bold uppercase mt-2">{selectedStudent.admissionNumber}</p>
              </div>
           </header>

           <section className="grid grid-cols-3 gap-8 py-6 bg-slate-50 rounded-2xl px-8 border">
              <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Student Name</p><p className="text-sm font-bold uppercase">{selectedStudent.firstName} {selectedStudent.lastName}</p></div>
              <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Class / Grade</p><p className="text-sm font-bold uppercase">{selectedGrade}</p></div>
              <div><p className="text-[10px] font-bold text-muted-foreground uppercase">Term / Year</p><p className="text-sm font-bold uppercase">{currentTerm} • 2026/2027</p></div>
           </section>

           <table className="w-full border-collapse border-2 border-slate-200">
              <thead className="bg-slate-100">
                 <tr>
                    <th className="border p-3 text-left text-xs font-bold uppercase">Subject</th>
                    <th className="border p-3 text-center text-xs font-bold uppercase">CA (30)</th>
                    <th className="border p-3 text-center text-xs font-bold uppercase">Exam (70)</th>
                    <th className="border p-3 text-center text-xs font-bold uppercase">Total</th>
                    <th className="border p-3 text-center text-xs font-bold uppercase">Grade</th>
                    <th className="border p-3 text-right text-xs font-bold uppercase">Remarks</th>
                 </tr>
              </thead>
              <tbody>
                 {reportData.results.map((r, i) => (
                    <tr key={i}>
                       <td className="border p-3 text-sm font-bold">{r.subject}</td>
                       <td className="border p-3 text-center text-sm">{r.ca}</td>
                       <td className="border p-3 text-center text-sm">{r.exam}</td>
                       <td className="border p-3 text-center text-sm font-bold">{r.total}</td>
                       <td className="border p-3 text-center text-sm font-bold">{r.grade}</td>
                       <td className="border p-3 text-right text-xs font-medium italic">{r.remark}</td>
                    </tr>
                 ))}
              </tbody>
           </table>

           <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                 <div className="p-6 border-2 border-slate-100 rounded-3xl space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b pb-2">Academic Summary</h4>
                    <div className="flex justify-between text-xs font-bold"><span>Position in Class:</span><span>{reportData.position}</span></div>
                    <div className="flex justify-between text-xs font-bold"><span>Overall Average:</span><span>{reportData.average}%</span></div>
                    <div className="flex justify-between text-xs font-bold"><span>Attendance Record:</span><span>{reportData.attendance.percentage}%</span></div>
                 </div>
                 <div className="p-6 border-2 border-slate-100 rounded-3xl space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b pb-2">Administrative Status</h4>
                    <div className="flex justify-between text-xs font-bold"><span>Decision:</span><span className="uppercase text-accent">{reportData.promotion}</span></div>
                    <div className="flex justify-between text-xs font-bold"><span>Next Term Begins:</span><span>Jan 15th, 2027</span></div>
                 </div>
              </div>
              <div className="space-y-6">
                 <div className="p-6 border-2 border-slate-100 rounded-3xl min-h-[120px]">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Teacher's Signature & Remark</h4>
                    <p className="text-sm italic">"{teacherRemark || 'No remark provided.'}"</p>
                    <div className="mt-8 border-t-2 border-dotted w-32 ml-auto" />
                 </div>
                 <div className="p-6 border-2 border-slate-100 rounded-3xl min-h-[120px]">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Head Teacher's Signature & Remark</h4>
                    <p className="text-sm italic">"{headRemark || 'No remark provided.'}"</p>
                    <div className="mt-8 border-t-2 border-dotted w-32 ml-auto" />
                 </div>
              </div>
           </div>

           <footer className="pt-12 border-t flex justify-between items-end">
              <div className="space-y-1">
                 <p className="text-[10px] font-bold uppercase text-primary">Live Institutional Registry Hub</p>
                 <p className="text-[8px] text-muted-foreground">Certified Document • Synchronized 2026 Academic Cycle</p>
              </div>
              <div className="size-20 bg-slate-50 border flex items-center justify-center text-[8px] text-muted-foreground font-bold">
                 QR VERIFY
              </div>
           </footer>
        </div>
      )}

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
