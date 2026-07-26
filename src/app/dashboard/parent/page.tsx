"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Baby, 
  Wallet, 
  Calendar, 
  Loader2, 
  FileText,
  Clock,
  User,
  CheckCircle2,
  Target,
  BarChart,
  ClipboardList
} from "lucide-react"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase"
import { query, collection, where, doc } from "firebase/firestore"
import { Progress } from "@/components/ui/progress"
import { calculateGrade, calculateAttendanceSummary, calculatePositions } from "@/lib/academic-engine"
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export default function QuantitativeParentPortal() {
  const { user } = useUser()
  const db = useFirestore()
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // 1. Fetch children
  const relsQuery = useMemo(() => {
    if (!db || !user?.uid) return null
    return query(collection(db, "student_parents"), where("parentId", "==", user.uid))
  }, [db, user?.uid])

  const { data: relations, loading: relsLoading } = useCollection(relsQuery)

  const studentsQuery = useMemo(() => {
    if (!db || relations.length === 0) return null
    const studentIds = relations.map(r => r.studentId)
    return query(collection(db, "students"), where("id", "in", studentIds))
  }, [db, relations])

  const { data: children, loading: childrenLoading } = useCollection(studentsQuery)

  useEffect(() => {
    if (children.length > 0 && !selectedStudentId) {
      setSelectedStudentId(children[0].id)
    }
  }, [children, selectedStudentId])

  const selectedChild = useMemo(() => 
    children.find(c => c.id === selectedStudentId), 
    [children, selectedStudentId]
  )

  // 2. Fetch Institutional context for current term
  const tenantId = selectedChild?.tenantId;
  const instRef = useMemo(() => tenantId ? doc(db, "institutions", tenantId) : null, [db, tenantId]);
  const { data: institution } = useDoc(instRef);
  const currentTerm = institution?.currentTerm || "Term 1";

  // 3. Fetch academic data
  const examsQuery = useMemo(() => {
    if (!db || !selectedStudentId) return null
    return query(collection(db, "exam_records"), where("studentId", "==", selectedStudentId), where("termId", "==", currentTerm))
  }, [db, selectedStudentId, currentTerm])

  const attendanceQuery = useMemo(() => {
    if (!db || !selectedStudentId) return null
    return query(collection(db, "attendance"), where("studentId", "==", selectedStudentId))
  }, [db, selectedStudentId])

  const ledgerQuery = useMemo(() => {
    if (!db || !selectedStudentId) return null
    return query(collection(db, "student_ledger"), where("studentId", "==", selectedStudentId))
  }, [db, selectedStudentId])

  const { data: exams = [] } = useCollection(examsQuery)
  const { data: attendance = [] } = useCollection(attendanceQuery)
  const { data: ledger = [] } = useCollection(ledgerQuery)

  // 4. Quantitative Computations
  const computedData = useMemo(() => {
    if (exams.length === 0) return null;
    
    const results = exams.map((e: any) => ({
      subject: e.subjectId, // Simplified for portal
      total: e.totalScore,
      grade: calculateGrade(e.totalScore).grade,
      remark: calculateGrade(e.totalScore).remark
    }));

    const totalMarks = results.reduce((acc, curr) => acc + curr.total, 0);
    const average = totalMarks / results.length;
    const attSummary = calculateAttendanceSummary(attendance);
    const balance = ledger.reduce((acc, curr: any) => curr.type === 'charge' ? acc + curr.amount : acc - curr.amount, 0);

    return {
      results,
      average: parseFloat(average.toFixed(1)),
      attendance: attSummary,
      balance
    };
  }, [exams, attendance, ledger]);

  if (childrenLoading || relsLoading) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Syncing Family Ledger...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Parent Portal</h1>
          <p className="text-muted-foreground font-medium">Monitoring academic performance for {currentTerm}, 2026 Cycle.</p>
        </div>
        <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl border shadow-sm">
          {children.map((child: any) => (
            <button
              key={child.id}
              onClick={() => setSelectedStudentId(child.id)}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${
                selectedStudentId === child.id 
                ? 'bg-primary shadow-lg text-white' 
                : 'text-muted-foreground hover:bg-white/80'
              }`}
            >
              {child.firstName}
            </button>
          ))}
        </div>
      </div>

      {computedData && selectedChild && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-none shadow-md bg-primary text-primary-foreground rounded-2xl md:rounded-3xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">Outstanding Balance</CardDescription>
                <CardTitle className="text-2xl font-headline">GH₵ {computedData.balance.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent><Badge className="bg-white/10 text-white border-none text-[8px] font-bold uppercase">{computedData.balance > 0 ? 'Action Required' : 'Settled'}</Badge></CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white rounded-2xl md:rounded-3xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase text-muted-foreground">Term Average</CardDescription>
                <CardTitle className="text-2xl font-headline">{computedData.average}%</CardTitle>
              </CardHeader>
              <CardContent><Progress value={computedData.average} className="h-1.5" /></CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white rounded-2xl md:rounded-3xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase text-muted-foreground">Attendance</CardDescription>
                <CardTitle className="text-2xl font-headline">{computedData.attendance.percentage}%</CardTitle>
              </CardHeader>
              <CardContent><div className="text-[10px] text-muted-foreground font-bold uppercase">{computedData.attendance.present} Days Present</div></CardContent>
            </Card>

            <Card className="border-none shadow-md bg-accent text-accent-foreground rounded-2xl md:rounded-3xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-accent-foreground/60 text-[10px] font-bold uppercase tracking-widest">Registry ID</CardDescription>
                <CardTitle className="text-xl font-mono">{selectedChild.admissionNumber}</CardTitle>
              </CardHeader>
              <CardContent className="text-[10px] font-bold uppercase">{selectedChild.gradeLevel}</CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
             <div className="lg:col-span-2">
                <Tabs defaultValue="results" className="w-full">
                  <TabsList className="bg-muted/50 p-1 rounded-2xl mb-6 grid grid-cols-3 h-auto">
                    <TabsTrigger value="results" className="rounded-xl gap-2 py-3 text-xs"><ClipboardList className="size-4" /> Academic Table</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-xl gap-2 py-3 text-xs"><Clock className="size-4" /> Presence Log</TabsTrigger>
                    <TabsTrigger value="ledger" className="rounded-xl gap-2 py-3 text-xs"><Wallet className="size-4" /> Fee Ledger</TabsTrigger>
                  </TabsList>

                  <TabsContent value="results" className="mt-0">
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="px-6 py-4 font-bold">SUBJECT</TableHead>
                              <TableHead className="py-4 text-center font-bold">SCORE</TableHead>
                              <TableHead className="py-4 text-center font-bold">GRADE</TableHead>
                              <TableHead className="text-right px-6 py-4 font-bold">REMARK</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {computedData.results.map((r, i) => (
                              <TableRow key={i}>
                                <TableCell className="px-6 font-bold text-primary">{r.subject}</TableCell>
                                <TableCell className="text-center font-bold text-accent">{r.total}</TableCell>
                                <TableCell className="text-center"><Badge variant="outline" className="font-bold">{r.grade}</Badge></TableCell>
                                <TableCell className="text-right px-6 text-[10px] font-bold uppercase text-muted-foreground">{r.remark}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="attendance">
                     <Card className="border-none shadow-md p-8 text-center bg-white rounded-3xl">
                        <Calendar className="size-12 mx-auto text-primary/10 mb-4" />
                        <p className="text-sm text-muted-foreground">Quantitative attendance tracking for Term Cycle verified.</p>
                        <div className="mt-6 flex justify-center gap-12">
                           <div className="text-center"><p className="text-[10px] font-bold uppercase text-muted-foreground">Present</p><p className="text-xl font-bold">{computedData.attendance.present}</p></div>
                           <div className="text-center"><p className="text-[10px] font-bold uppercase text-muted-foreground">Absent</p><p className="text-xl font-bold text-destructive">{computedData.attendance.absent}</p></div>
                        </div>
                     </Card>
                  </TabsContent>

                  <TabsContent value="ledger">
                     <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                        <Table>
                           <TableHeader className="bg-muted/30"><TableRow><TableHead className="px-6">Description</TableHead><TableHead className="text-right px-6">Amount</TableHead></TableRow></TableHeader>
                           <TableBody>
                              {ledger.slice(0, 5).map((entry: any) => (
                                <TableRow key={entry.id}>
                                   <TableCell className="px-6 font-medium text-sm">{entry.item}</TableCell>
                                   <TableCell className={`text-right px-6 font-bold ${entry.type === 'charge' ? 'text-destructive' : 'text-green-600'}`}>
                                      {entry.type === 'charge' ? '-' : '+'} GH₵ {entry.amount}
                                   </TableCell>
                                </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                     </Card>
                  </TabsContent>
                </Tabs>
             </div>

             <div className="space-y-8">
                <Card className="border-none shadow-md rounded-2xl bg-white p-6">
                  <CardTitle className="text-sm flex items-center gap-2 mb-6"><BarChart className="size-4" /> Term Visual</CardTitle>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={computedData.results}>
                        <XAxis dataKey="subject" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Bar dataKey="total" fill="#1a1f2c" radius={[4, 4, 0, 0]} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <div className="p-6 rounded-3xl bg-primary text-primary-foreground space-y-4">
                   <h4 className="text-xs font-bold uppercase tracking-widest opacity-70">Strategic Access</h4>
                   <p className="text-sm leading-relaxed">Official reports for {currentTerm} will be available for PDF download once verified by the Head Teacher.</p>
                   <Button variant="secondary" className="w-full h-11 rounded-xl bg-white text-primary font-bold">Request Transcript</Button>
                </div>
             </div>
          </div>

          <div className="pt-8 border-t flex justify-center">
             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
                <CheckCircle2 className="size-3 text-green-600" /> Authorized Guardian Data Context • Hub 2026
             </p>
          </div>
        </div>
      )}
    </div>
  )
}
