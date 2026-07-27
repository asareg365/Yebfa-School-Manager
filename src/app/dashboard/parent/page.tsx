
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
  ClipboardList,
  Receipt,
  CreditCard,
  AlertTriangle,
  GraduationCap
} from "lucide-react"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase"
import { query, collection, where, doc } from "firebase/firestore"
import { Progress } from "@/components/ui/progress"
import { calculateGrade, calculateAttendanceSummary } from "@/lib/academic-engine"
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export default function StudentReportsPortal() {
  const { user } = useUser()
  const db = useFirestore()
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)
  
  const isStudent = profile?.role === 'student'
  const isParent = profile?.role === 'parent'

  // 1. Resolve student identity based on role
  const relsQuery = useMemo(() => {
    if (!db || !user?.uid || !isParent) return null
    return query(collection(db, "student_parents"), where("parentId", "==", user.uid))
  }, [db, user?.uid, isParent])

  const { data: relations, loading: relsLoading } = useCollection(relsQuery)

  const studentsQuery = useMemo(() => {
    if (!db || !profile) return null
    if (isStudent) {
       // If student, they only see themselves
       const sId = profile.studentId;
       if (!sId) return null;
       return query(collection(db, "students"), where("id", "==", sId))
    }
    if (isParent && relations.length > 0) {
      const studentIds = relations.map(r => r.studentId)
      return query(collection(db, "students"), where("id", "in", studentIds))
    }
    return null;
  }, [db, relations, isStudent, isParent, profile])

  const { data: children = [], loading: childrenLoading } = useCollection(studentsQuery)

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

  // 3. Fetch academic and financial data
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

  const invoicesQuery = useMemo(() => {
    if (!db || !selectedStudentId) return null
    return query(collection(db, "invoices"), where("studentId", "==", selectedStudentId))
  }, [db, selectedStudentId])

  const { data: exams = [] } = useCollection(examsQuery)
  const { data: attendance = [] } = useCollection(attendanceQuery)
  const { data: ledger = [] } = useCollection(ledgerQuery)
  const { data: invoices = [] } = useCollection(invoicesQuery)

  // 4. Quantitative Computations
  const computedData = useMemo(() => {
    if (exams.length === 0 && invoices.length === 0 && attendance.length === 0) {
       return { results: [], average: 0, attendance: { percentage: 0, present: 0 }, balance: 0 };
    }
    
    const results = exams.map((e: any) => {
      const gradeInfo = calculateGrade(e.totalScore);
      return {
        subject: e.subjectId, 
        total: e.totalScore,
        grade: gradeInfo.grade,
        remark: gradeInfo.remark
      };
    });

    const totalMarks = results.reduce((acc, curr) => acc + curr.total, 0);
    const average = results.length > 0 ? totalMarks / results.length : 0;
    const attSummary = calculateAttendanceSummary(attendance);
    const balance = ledger.reduce((acc, curr: any) => curr.type === 'charge' ? acc + curr.amount : acc - curr.amount, 0);

    return {
      results,
      average: parseFloat(average.toFixed(1)),
      attendance: attSummary,
      balance
    };
  }, [exams, attendance, ledger, invoices]);

  if (childrenLoading || relsLoading) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Syncing Portal Identity...</p>
    </div>
  )

  if (children.length === 0) return (
    <div className="p-24 text-center space-y-6">
      <div className="size-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/30">
        <GraduationCap className="size-10" />
      </div>
      <div className="max-w-md mx-auto space-y-2">
         <h2 className="text-2xl font-headline font-bold text-primary">Identity Not Linked</h2>
         <p className="text-sm text-muted-foreground leading-relaxed">
           {isStudent 
             ? "Your security account is not yet linked to an institutional student record. Contact the registry office to authorize your profile link."
             : "Your portal account is not yet linked to any student records. Contact the school administration to authorize your guardian identity."}
         </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">{isStudent ? "My Academic Hub" : "Parent Portal"}</h1>
          <p className="text-muted-foreground font-medium">Monitoring academic and financial status for {currentTerm}, 2026.</p>
        </div>
        {!isStudent && children.length > 1 && (
          <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl border shadow-sm">
            {children.map((child: any) => (
              <button
                key={child.id}
                onClick={() => setSelectedStudentId(child.id)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  selectedStudentId === child.id 
                  ? 'bg-primary shadow-lg text-white' 
                  : 'text-muted-foreground hover:bg-white/80'
                }`}
              >
                {child.firstName}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedChild && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
          <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-md bg-primary text-primary-foreground rounded-2xl md:rounded-3xl overflow-hidden group">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardDescription className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">Fee Balance</CardDescription>
                  <Wallet className="size-4 text-accent opacity-50 group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="text-2xl font-headline font-bold">GH₵ {computedData?.balance?.toLocaleString() || "0.00"}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={`border-none text-[8px] font-bold uppercase ${computedData?.balance && computedData.balance > 0 ? 'bg-accent text-accent-foreground animate-pulse' : 'bg-green-500/20 text-green-400'}`}>
                  {computedData?.balance && computedData.balance > 0 ? 'Payment Required' : 'Account Balanced'}
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white rounded-2xl md:rounded-3xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Average Score</CardDescription>
                <CardTitle className="text-2xl font-headline font-bold text-primary">{computedData?.average}%</CardTitle>
              </CardHeader>
              <CardContent><Progress value={computedData?.average || 0} className="h-1.5" /></CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white rounded-2xl md:rounded-3xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Attendance</CardDescription>
                <CardTitle className="text-2xl font-headline font-bold text-primary">{computedData?.attendance.percentage}%</CardTitle>
              </CardHeader>
              <CardContent><div className="text-[10px] text-muted-foreground font-bold uppercase">{computedData?.attendance.present} Days Verified</div></CardContent>
            </Card>

            <Card className="border-none shadow-md bg-accent text-accent-foreground rounded-2xl md:rounded-3xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-accent-foreground/60 text-[10px] font-bold uppercase tracking-widest">Registry Identity</CardDescription>
                <CardTitle className="text-xl font-mono font-bold">{selectedChild.admissionNumber}</CardTitle>
              </CardHeader>
              <CardContent className="text-[10px] font-bold uppercase tracking-widest opacity-80">{selectedChild.gradeLevel}</CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
             <div className="lg:col-span-2">
                <Tabs defaultValue="results" className="w-full">
                  <TabsList className="bg-muted/50 p-1 rounded-2xl mb-8 flex-wrap h-auto">
                    <TabsTrigger value="results" className="rounded-xl gap-2 py-3 px-6 text-xs font-bold uppercase tracking-widest"><ClipboardList className="size-4" /> Academic Table</TabsTrigger>
                    <TabsTrigger value="invoices" className="rounded-xl gap-2 py-3 px-6 text-xs font-bold uppercase tracking-widest"><Receipt className="size-4" /> Bills & Fees</TabsTrigger>
                    <TabsTrigger value="ledger" className="rounded-xl gap-2 py-3 px-6 text-xs font-bold uppercase tracking-widest"><Wallet className="size-4" /> Transaction Log</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-xl gap-2 py-3 px-6 text-xs font-bold uppercase tracking-widest"><Clock className="size-4" /> Presence</TabsTrigger>
                  </TabsList>

                  <TabsContent value="results" className="mt-0 space-y-6">
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
                         <CardTitle className="text-lg font-bold">Terminal Results</CardTitle>
                         <Badge variant="outline" className="text-[9px] uppercase font-bold text-primary">{currentTerm}</Badge>
                      </CardHeader>
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
                            {computedData?.results.map((r, i) => (
                              <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell className="px-6 font-bold text-primary">{r.subject}</TableCell>
                                <TableCell className="text-center font-bold text-accent">{r.total}</TableCell>
                                <TableCell className="text-center"><Badge variant="outline" className="font-bold border-primary/20 text-primary">{r.grade}</Badge></TableCell>
                                <TableCell className="text-right px-6 text-[10px] font-bold uppercase text-muted-foreground">{r.remark}</TableCell>
                              </TableRow>
                            ))}
                            {(!computedData || computedData.results.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                                   Results for {currentTerm} have not yet been published by the academic office.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="invoices" className="mt-0">
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                       <CardHeader className="bg-slate-50 border-b p-6">
                          <CardTitle className="text-lg font-bold">Assigned Fees & Bills</CardTitle>
                          <CardDescription>Term-based institutional charges for {selectedChild.firstName}.</CardDescription>
                       </CardHeader>
                       <CardContent className="p-0">
                          <Table>
                             <TableHeader className="bg-muted/30">
                                <TableRow>
                                   <TableHead className="px-6 py-4 font-bold">INV # / TERM</TableHead>
                                   <TableHead className="py-4 font-bold">TOTAL</TableHead>
                                   <TableHead className="py-4 font-bold">PAID</TableHead>
                                   <TableHead className="py-4 font-bold">DUE</TableHead>
                                   <TableHead className="text-right px-6 py-4 font-bold">STATUS</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {invoices.map((inv: any) => (
                                  <TableRow key={inv.id} className="hover:bg-slate-50 transition-colors">
                                     <TableCell className="px-6">
                                        <div className="flex flex-col">
                                           <span className="text-[10px] font-mono font-bold text-accent">{inv.invoiceNumber}</span>
                                           <span className="text-xs font-bold text-primary uppercase">{inv.term}</span>
                                        </div>
                                     </TableCell>
                                     <TableCell className="text-sm font-bold">GH₵ {inv.totalAmount.toLocaleString()}</TableCell>
                                     <TableCell className="text-sm font-bold text-green-600">GH₵ {inv.amountPaid.toLocaleString()}</TableCell>
                                     <TableCell className="text-sm font-bold text-destructive">GH₵ {inv.amountDue.toLocaleString()}</TableCell>
                                     <TableCell className="text-right px-6">
                                        <Badge variant={inv.status === 'Paid' ? 'default' : 'outline'} className={`text-[9px] uppercase font-bold ${inv.status === 'Paid' ? 'bg-green-600 border-none' : 'text-amber-600 border-amber-200'}`}>
                                           {inv.status}
                                        </Badge>
                                     </TableCell>
                                  </TableRow>
                                ))}
                                {invoices.length === 0 && (
                                  <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No official bills detected for current cycle.</TableCell></TableRow>
                                )}
                             </TableBody>
                          </Table>
                       </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="ledger" className="mt-0">
                     <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50 border-b p-6">
                           <CardTitle className="text-lg font-bold">Payment History</CardTitle>
                           <CardDescription>Full audit trail of charges and collections.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                             <TableHeader className="bg-muted/30"><TableRow><TableHead className="px-6 font-bold py-4">DESCRIPTION / DATE</TableHead><TableHead className="text-right px-6 font-bold py-4">AMOUNT</TableHead></TableRow></TableHeader>
                             <TableBody>
                                {ledger.sort((a:any,b:any)=>b.date.localeCompare(a.date)).map((entry: any) => (
                                  <TableRow key={entry.id} className="hover:bg-slate-50 transition-colors">
                                     <TableCell className="px-6 py-4">
                                        <div className="flex flex-col">
                                           <span className="font-bold text-sm text-primary">{entry.item}</span>
                                           <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">{entry.date}</span>
                                        </div>
                                     </TableCell>
                                     <TableCell className={`text-right px-6 font-bold text-sm ${entry.type === 'charge' ? 'text-destructive' : 'text-green-600'}`}>
                                        {entry.type === 'charge' ? '-' : '+'} GH₵ {entry.amount.toLocaleString()}
                                     </TableCell>
                                  </TableRow>
                                ))}
                             </TableBody>
                          </Table>
                        </CardContent>
                     </Card>
                  </TabsContent>

                  <TabsContent value="attendance">
                     <Card className="border-none shadow-md p-12 text-center bg-white rounded-3xl border-2 border-dashed">
                        <Calendar className="size-16 mx-auto text-primary/10 mb-4" />
                        <h3 className="text-xl font-bold font-headline text-primary/70">Institutional Presence Log</h3>
                        <p className="text-sm text-muted-foreground max-sm mx-auto mt-2">Quantitative attendance tracking for Term Cycle verified by the registry.</p>
                        <div className="mt-10 flex justify-center gap-16">
                           <div className="text-center group"><p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1 group-hover:text-primary transition-colors">Present</p><p className="text-3xl font-bold text-primary">{computedData?.attendance.present}</p></div>
                           <div className="text-center group"><p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1 group-hover:text-destructive transition-colors">Absent</p><p className="text-3xl font-bold text-destructive">{computedData?.attendance.absent}</p></div>
                        </div>
                     </Card>
                  </TabsContent>
                </Tabs>
             </div>

             <div className="space-y-8">
                <Card className="border-none shadow-md rounded-2xl bg-white p-6 overflow-hidden">
                  <CardTitle className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2 mb-6">
                    <BarChart className="size-3.5 text-primary" /> Term Performance Curve
                  </CardTitle>
                  <div className="h-[200px] w-full">
                    {computedData && computedData.results.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={computedData.results}>
                          <XAxis dataKey="subject" hide />
                          <YAxis hide domain={[0, 100]} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', shadow: 'none' }} />
                          <Bar dataKey="total" fill="#1a1f2c" radius={[4, 4, 0, 0]} barSize={24} />
                        </ReBarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground italic text-[10px] uppercase">Awaiting academic publish</div>
                    )}
                  </div>
                </Card>

                <div className="p-8 rounded-[2.5rem] bg-primary text-primary-foreground space-y-6 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Target className="size-24 rotate-12" />
                   </div>
                   <div className="space-y-2 relative z-10">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent">Institutional Directive</h4>
                      <p className="text-sm leading-relaxed font-medium">Official academic transcripts and billing statements for {currentTerm} will be available for PDF download once verified by the Office of the Registrar.</p>
                   </div>
                   <Button variant="secondary" className="w-full h-14 rounded-2xl bg-white text-primary font-bold shadow-xl transition-all active:scale-95 relative z-10">
                      Request Certified Transcript
                   </Button>
                </div>

                <div className="p-6 rounded-3xl bg-slate-100 border flex gap-4">
                   <AlertTriangle className="size-6 text-orange-600 shrink-0" />
                   <div className="space-y-1">
                      <h5 className="text-xs font-bold text-primary uppercase">Financial Alert</h5>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">Please ensure all fees are settled before the final assessment week to avoid portal restriction for results viewing.</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="pt-12 border-t flex justify-center">
             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
                <CheckCircle2 className="size-3 text-green-600" /> Authorized Registry Context • 2026 Institutional Hub
             </p>
          </div>
        </div>
      )}
    </div>
  )
}
