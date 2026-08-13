"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { calculateGrade, calculateAttendanceSummary, calculatePositions } from "@/lib/academic-engine"
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export default function StudentReportsPortal() {
  const { user } = useUser()
  const db = useFirestore()
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)
  
  const isStudent = profile?.role === 'student'
  const isParent = profile?.role === 'parent'

  const relsQuery = useMemo(() => {
    if (!db || !profile?.parentId || !profile?.tenantId || !isParent) return null;
    return query(collection(db, "student_parents"), where("parentId", "==", profile.parentId), where("tenantId", "==", profile.tenantId));
  }, [db, profile, isParent]);

  const { data: relations = [], loading: relsLoading } = useCollection(relsQuery)

  const studentsQuery = useMemo(() => {
    if (!db || !profile) return null;
    if (isStudent && user?.uid) return query(collection(db, "students"), where("authUid", "==", user.uid));
    if (isParent && relations.length > 0) return query(collection(db, "students"), where("id", "in", relations.map(r => r.studentId)));
    return null;
  }, [db, relations, isStudent, isParent, profile, user?.uid])

  const { data: children = [], loading: childrenLoading } = useCollection(studentsQuery)

  useEffect(() => {
    if (children.length > 0 && !selectedStudentId) {
      setSelectedStudentId(children[0].id)
    }
  }, [children, selectedStudentId])

  const selectedChild = useMemo(() => children.find(c => c.id === selectedStudentId), [children, selectedStudentId])
  const tenantId = selectedChild?.tenantId;
  const instRef = useMemo(() => tenantId ? doc(db, "institutions", tenantId) : null, [db, tenantId]);
  const { data: institution } = useDoc(instRef);
  const currentTerm = institution?.currentTerm || "Term 1";

  const examsQuery = useMemo(() => {
    if (!db || !selectedStudentId || !tenantId) return null
    return query(collection(db, "exam_records"), where("tenantId", "==", tenantId), where("studentId", "==", selectedStudentId), where("termId", "==", currentTerm))
  }, [db, selectedStudentId, currentTerm, tenantId])

  const attendanceQuery = useMemo(() => {
    if (!db || !selectedStudentId || !tenantId) return null
    return query(collection(db, "attendance"), where("tenantId", "==", tenantId), where("studentId", "==", selectedStudentId))
  }, [db, selectedStudentId, tenantId])

  const ledgerQuery = useMemo(() => {
    if (!db || !selectedStudentId || !tenantId) return null
    return query(collection(db, "student_ledger"), where("tenantId", "==", tenantId), where("studentId", "==", selectedStudentId))
  }, [db, selectedStudentId, tenantId])

  const invoicesQuery = useMemo(() => {
    if (!db || !selectedStudentId || !tenantId) return null
    return query(collection(db, "invoices"), where("tenantId", "==", tenantId), where("studentId", "==", selectedStudentId))
  }, [db, selectedStudentId, tenantId])

  const { data: exams = [] } = useCollection(examsQuery)
  const { data: attendanceDocs = [] } = useCollection(attendanceQuery)
  const { data: ledger = [] } = useCollection(ledgerQuery)
  const { data: invoices = [] } = useCollection(invoicesQuery)

  const computedData = useMemo(() => {
    const results = exams.map((e: any) => {
      const gradeInfo = calculateGrade(e.totalScore || 0);
      return { subject: e.subjectId, total: e.totalScore || 0, grade: gradeInfo.grade, remark: gradeInfo.remark };
    });
    const totalMarks = results.reduce((acc, curr) => acc + curr.total, 0);
    const average = results.length > 0 ? totalMarks / results.length : 0;
    const attSummary = calculateAttendanceSummary(attendanceDocs);
    const balance = ledger.reduce((acc, curr: any) => curr.type === 'charge' ? acc - curr.amount : acc + curr.amount, 0);

    return { results, average: parseFloat(average.toFixed(1)), attendance: attSummary, balance };
  }, [exams, attendanceDocs, ledger]);

  if (childrenLoading || relsLoading) return (
    <div className="p-20 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Syncing Identity Hub...</p>
    </div>
  )

  if (children.length === 0) return (
    <div className="p-12 md:p-24 text-center space-y-6">
      <GraduationCap className="size-20 mx-auto text-muted-foreground/20" />
      <div className="max-w-md mx-auto space-y-2">
         <h2 className="text-xl md:text-2xl font-headline font-bold text-primary">Profile Not Linked</h2>
         <p className="text-sm text-muted-foreground leading-relaxed">Identity verification required. Contact school registry to authorize your portal link.</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-primary tracking-tight">{isStudent ? "Student Hub" : "Parent Portal"}</h1>
          <p className="text-muted-foreground font-medium text-sm">Monitoring records for {currentTerm}, 2026 Academic Cycle.</p>
        </div>
        {!isStudent && children.length > 1 && (
          <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar">
            {children.map((child: any) => (
              <button
                key={child.id}
                onClick={() => setSelectedStudentId(child.id)}
                className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${selectedStudentId === child.id ? 'bg-primary shadow-lg text-white' : 'text-muted-foreground hover:bg-white/80'}`}
              >
                {child.firstName}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedChild && (
        <div className="space-y-6 md:space-y-8">
          <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-md bg-primary text-primary-foreground rounded-2xl group overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardDescription className="text-primary-foreground/60 text-[9px] font-bold uppercase tracking-widest">Ledger Balance</CardDescription>
                  <Wallet className="size-4 text-accent opacity-50 group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="text-xl md:text-2xl font-headline font-bold">GH₵ {computedData.balance.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={`border-none text-[8px] font-bold uppercase px-3 ${computedData.balance < 0 ? 'bg-accent text-accent-foreground' : 'bg-green-500/20 text-green-400'}`}>
                  {computedData.balance < 0 ? 'Due' : 'Balanced'}
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white rounded-2xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Average Score</CardDescription>
                <CardTitle className="text-xl md:text-2xl font-headline font-bold text-primary">{computedData.average}%</CardTitle>
              </CardHeader>
              <CardContent><Progress value={computedData.average} className="h-1.5" /></CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white rounded-2xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Presence</CardDescription>
                <CardTitle className="text-xl md:text-2xl font-headline font-bold text-primary">{computedData.attendance.percentage}%</CardTitle>
              </CardHeader>
              <CardContent><div className="text-[9px] text-muted-foreground font-bold uppercase">{computedData.attendance.present} Days Verified</div></CardContent>
            </Card>

            <Card className="border-none shadow-md bg-accent text-accent-foreground rounded-2xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-accent-foreground/60 text-[9px] font-bold uppercase tracking-widest">Student ID</CardDescription>
                <CardTitle className="text-lg md:text-xl font-mono font-bold truncate">{selectedChild.admissionNumber}</CardTitle>
              </CardHeader>
              <CardContent className="text-[9px] font-bold uppercase tracking-widest opacity-80 truncate">{selectedChild.gradeLevel}</CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
             <div className="lg:col-span-2">
                <Tabs defaultValue="results" className="w-full">
                  <TabsList className="bg-muted/50 p-1 rounded-2xl mb-6 flex-wrap h-auto gap-1 justify-start">
                    <TabsTrigger value="results" className="rounded-xl gap-2 py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest flex-1 sm:flex-none"><ClipboardList className="size-3.5" /> Academic</TabsTrigger>
                    <TabsTrigger value="invoices" className="rounded-xl gap-2 py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest flex-1 sm:flex-none"><Receipt className="size-3.5" /> Billing</TabsTrigger>
                    <TabsTrigger value="ledger" className="rounded-xl gap-2 py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest flex-1 sm:flex-none"><Wallet className="size-3.5" /> Ledger</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-xl gap-2 py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest flex-1 sm:flex-none"><Clock className="size-3.5" /> Presence</TabsTrigger>
                  </TabsList>

                  <TabsContent value="results" className="mt-0">
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
                         <CardTitle className="text-lg font-bold">Terminal Results</CardTitle>
                         <Badge variant="outline" className="text-[9px] uppercase font-bold text-primary">{currentTerm}</Badge>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto w-full">
                          <Table className="min-w-[500px]">
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
                                <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                                  <TableCell className="px-6 font-bold text-primary whitespace-nowrap">{r.subject}</TableCell>
                                  <TableCell className="text-center font-bold text-accent">{r.total}</TableCell>
                                  <TableCell className="text-center"><Badge variant="outline" className="font-bold border-primary/20 text-primary">{r.grade}</Badge></TableCell>
                                  <TableCell className="text-right px-6 text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">{r.remark}</TableCell>
                                </TableRow>
                              ))}
                              {computedData.results.length === 0 && (
                                <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">No results published for {currentTerm}.</TableCell></TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="invoices" className="mt-0">
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                       <CardHeader className="bg-slate-50 border-b p-6"><CardTitle className="text-lg font-bold">Assigned Fees & Bills</CardTitle></CardHeader>
                       <CardContent className="p-0">
                          <div className="overflow-x-auto w-full">
                            <Table className="min-w-[600px]">
                               <TableHeader className="bg-muted/30">
                                  <TableRow>
                                     <TableHead className="px-6 py-4 font-bold">INV # / TERM</TableHead>
                                     <TableHead className="py-4 font-bold">TOTAL</TableHead>
                                     <TableHead className="py-4 font-bold">PAID</TableHead>
                                     <TableHead className="text-right px-6 py-4 font-bold">STATUS</TableHead>
                                  </TableRow>
                               </TableHeader>
                               <TableBody>
                                  {invoices.map((inv: any) => (
                                    <TableRow key={inv.id} className="hover:bg-slate-50 transition-colors">
                                       <TableCell className="px-6 py-4">
                                          <div className="flex flex-col min-w-0">
                                             <span className="text-[10px] font-mono font-bold text-accent">{inv.invoiceNumber}</span>
                                             <span className="text-xs font-bold text-primary uppercase truncate">{inv.term}</span>
                                          </div>
                                       </TableCell>
                                       <TableCell className="text-sm font-bold whitespace-nowrap">GH₵ {inv.totalAmount.toLocaleString()}</TableCell>
                                       <TableCell className="text-sm font-bold text-green-600 whitespace-nowrap">GH₵ {inv.amountPaid.toLocaleString()}</TableCell>
                                       <TableCell className="text-right px-6">
                                          <Badge variant={inv.status === 'Paid' ? 'default' : 'outline'} className={`text-[9px] font-bold ${inv.status === 'Paid' ? 'bg-green-600 border-none' : 'text-amber-600 border-amber-200'}`}>{inv.status}</Badge>
                                       </TableCell>
                                    </TableRow>
                                  ))}
                                  {invoices.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">No official bills detected.</TableCell></TableRow>}
                               </TableBody>
                            </Table>
                          </div>
                       </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="ledger" className="mt-0">
                     <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50 border-b p-6"><CardTitle className="text-lg font-bold">Payment History</CardTitle></CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto w-full">
                            <Table className="min-w-[400px]">
                               <TableHeader className="bg-muted/30"><TableRow><TableHead className="px-6 font-bold py-4">DESCRIPTION</TableHead><TableHead className="text-right px-6 font-bold py-4">AMOUNT</TableHead></TableRow></TableHeader>
                               <TableBody>
                                  {ledger.sort((a:any,b:any)=>b.date.localeCompare(a.date)).map((entry: any) => (
                                    <TableRow key={entry.id} className="hover:bg-slate-50 transition-colors">
                                       <TableCell className="px-6 py-4">
                                          <div className="flex flex-col min-w-0">
                                             <span className="font-bold text-sm text-primary truncate">{entry.item}</span>
                                             <span className="text-[10px] text-muted-foreground font-mono uppercase">{entry.date}</span>
                                          </div>
                                       </TableCell>
                                       <TableCell className={`text-right px-6 font-bold text-sm whitespace-nowrap ${entry.type === 'charge' ? 'text-destructive' : 'text-green-600'}`}>
                                          {entry.type === 'charge' ? '-' : '+'} GH₵ {entry.amount.toLocaleString()}
                                       </TableCell>
                                    </TableRow>
                                  ))}
                               </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                     </Card>
                  </TabsContent>

                  <TabsContent value="attendance">
                     <Card className="border-none shadow-md p-12 text-center bg-white rounded-3xl border-2 border-dashed">
                        <Calendar className="size-16 mx-auto text-primary/10 mb-4" />
                        <h3 className="text-xl font-bold font-headline text-primary/70">Institutional Presence</h3>
                        <div className="mt-10 flex justify-center gap-16">
                           <div className="text-center"><p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Present</p><p className="text-3xl font-bold text-primary">{computedData.attendance.present}</p></div>
                           <div className="text-center"><p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Absent</p><p className="text-3xl font-bold text-destructive">{computedData.attendance.absent}</p></div>
                        </div>
                     </Card>
                  </TabsContent>
                </Tabs>
             </div>

             <div className="space-y-6 md:space-y-8">
                <Card className="border-none shadow-md rounded-2xl bg-white p-6 overflow-hidden">
                  <CardTitle className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-2 mb-6"><BarChart className="size-3.5 text-primary" /> Performance Curve</CardTitle>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={computedData.results}>
                        <XAxis dataKey="subject" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Bar dataKey="total" fill="#1a1f2c" radius={[4, 4, 0, 0]} barSize={20} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="p-8 rounded-[2.5rem] bg-primary text-primary-foreground space-y-6 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="size-24 rotate-12" /></div>
                   <div className="space-y-2 relative z-10">
                      <h4 className="text-[9px] font-bold uppercase text-accent">Directive</h4>
                      <p className="text-xs md:text-sm leading-relaxed font-medium">Verified academic transcripts for {currentTerm} will be available for download once confirmed by the Registry Hub.</p>
                   </div>
                   <Button variant="secondary" className="w-full h-12 rounded-2xl bg-white text-primary font-bold shadow-xl text-xs relative z-10">Request Transcript</Button>
                </div>

                <div className="p-6 rounded-3xl bg-slate-100 border flex gap-4">
                   <AlertTriangle className="size-6 text-orange-600 shrink-0" />
                   <div className="space-y-1">
                      <h5 className="text-[10px] font-bold text-primary uppercase">Financial Alert</h5>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">Ensure all outstanding balances are settled to maintain full portal access for results viewing.</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="pt-8 border-t flex justify-center text-center">
             <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
                <CheckCircle2 className="size-3 text-green-600" /> Authorized Registry Context • 2026 Institutional Hub
             </p>
          </div>
        </div>
      )}
    </div>
  )
}
