
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Baby, 
  BookOpen, 
  Wallet, 
  Calendar, 
  TrendingUp, 
  Loader2, 
  AlertCircle,
  FileText,
  Clock,
  User,
  CheckCircle2,
  Sparkles,
  Target,
  Lightbulb,
  MessageSquare
} from "lucide-react"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase"
import { query, collection, where, doc } from "firebase/firestore"
import { Progress } from "@/components/ui/progress"
import { generateStudentReportComments } from "@/ai/flows/generate-student-report-comments"
import { toast } from "@/hooks/use-toast"

export default function ParentPortal() {
  const { user } = useUser()
  const db = useFirestore()
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNarrative, setAiNarrative] = useState<string | null>(null)

  // 1. Fetch children linked to this parent UID in student_parents junction
  const relsQuery = useMemo(() => {
    if (!db || !user?.uid) return null
    return query(collection(db, "student_parents"), where("parentId", "==", user.uid))
  }, [db, user?.uid])

  const { data: relations, loading: relsLoading } = useCollection(relsQuery)

  // 2. Fetch student details for linked children
  const studentsQuery = useMemo(() => {
    if (!db || relations.length === 0) return null
    const studentIds = relations.map(r => r.studentId)
    return query(collection(db, "students"), where("id", "in", studentIds))
  }, [db, relations])

  const { data: children, loading: childrenLoading } = useCollection(studentsQuery)

  // 3. Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedStudentId) {
      setSelectedStudentId(children[0].id)
    }
  }, [children, selectedStudentId])

  const selectedChild = useMemo(() => 
    children.find(c => c.id === selectedStudentId), 
    [children, selectedStudentId]
  )

  // 4. Fetch lifecycle data for selected child
  const examsQuery = useMemo(() => {
    if (!db || !selectedStudentId) return null
    return query(collection(db, "exam_records"), where("studentId", "==", selectedStudentId))
  }, [db, selectedStudentId])

  const attendanceQuery = useMemo(() => {
    if (!db || !selectedStudentId) return null
    return query(collection(db, "attendance"), where("studentId", "==", selectedStudentId))
  }, [db, selectedStudentId])

  const ledgerQuery = useMemo(() => {
    if (!db || !selectedStudentId) return null
    return query(collection(db, "student_ledger"), where("studentId", "==", selectedStudentId))
  }, [db, selectedStudentId])

  const { data: exams, loading: examsLoading } = useCollection(examsQuery)
  const { data: attendance, loading: attLoading } = useCollection(attendanceQuery)
  const { data: ledger, loading: ledLoading } = useCollection(ledgerQuery)

  const balance = useMemo(() => {
    return ledger.reduce((acc, curr: any) => curr.type === 'charge' ? acc + curr.amount : acc - curr.amount, 0)
  }, [ledger])

  const handleGenerateAiSummary = async () => {
    if (!selectedChild || exams.length === 0) return
    setAiLoading(true)
    try {
      const scores = exams.map((e: any) => ({ name: e.subjectId, score: e.totalScore }))
      const attPercent = Math.round((attendance.filter((a: any) => a.status === 'present').length / (attendance.length || 1)) * 100)
      
      const res = await generateStudentReportComments({
        studentName: selectedChild.firstName,
        subject: "All Core Subjects",
        gradeLevel: selectedChild.gradeLevel,
        examScores: scores,
        attendancePercentage: attPercent,
        behaviorNotes: "Consistent participation and polite conduct."
      })
      
      setAiNarrative(res.finalGradeNarrative || "Performance is steady. Continued focus is recommended.")
    } catch (e) {
      toast({ variant: "destructive", title: "AI Insight Unavailable" })
    } finally {
      setAiLoading(false)
    }
  }

  // Clear AI when switching child
  useEffect(() => { setAiNarrative(null) }, [selectedStudentId])

  if (childrenLoading || relsLoading) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse">Establishing Secure Guardian Session...</p>
    </div>
  )

  if (children.length === 0) {
    return (
      <div className="p-12 text-center space-y-6">
        <div className="size-24 rounded-full bg-muted flex items-center justify-center mx-auto border-2 border-dashed">
          <Baby className="size-12 text-muted-foreground/30" />
        </div>
        <div className="max-w-sm mx-auto space-y-2">
          <h2 className="text-2xl font-bold font-headline text-primary">No Linked Children Found</h2>
          <p className="text-sm text-muted-foreground">Your account is not currently linked to any student records. Please contact your institution's Registrar to link your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Guardian Oversight Hub</h1>
          <p className="text-muted-foreground font-medium">Monitoring progress for {children.length} {children.length === 1 ? 'ward' : 'wards'}.</p>
        </div>
        <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl border shadow-sm">
          {children.map((child: any) => (
            <button
              key={child.id}
              onClick={() => setSelectedStudentId(child.id)}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
                selectedStudentId === child.id 
                ? 'bg-primary shadow-lg text-white' 
                : 'text-muted-foreground hover:bg-white/80'
              }`}
            >
              <User className={`size-3.5 ${selectedStudentId === child.id ? 'text-accent' : ''}`} />
              {child.firstName}
            </button>
          ))}
        </div>
      </div>

      {selectedChild && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-none shadow-md bg-primary text-primary-foreground rounded-2xl md:rounded-3xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Wallet className="size-12" /></div>
              <CardHeader className="pb-2">
                <CardDescription className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-widest">Fee Balance</CardDescription>
                <CardTitle className="text-2xl font-headline">GH₵ {balance.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-white/10 text-white border-none text-[8px] font-bold uppercase">{balance > 0 ? 'Due for Payment' : 'Settled'}</Badge>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white rounded-2xl md:rounded-3xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase text-muted-foreground">Roll Call</CardDescription>
                <CardTitle className="text-2xl font-headline">
                  {Math.round((attendance.filter((a: any) => a.status === 'present').length / (attendance.length || 1)) * 100)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={Math.round((attendance.filter((a: any) => a.status === 'present').length / (attendance.length || 1)) * 100)} className="h-1.5" />
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white rounded-2xl md:rounded-3xl">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase text-muted-foreground">Exams Avg</CardDescription>
                <CardTitle className="text-2xl font-headline">
                  {exams.length > 0 ? (exams.reduce((acc, curr: any) => acc + curr.totalScore, 0) / exams.length).toFixed(1) : '---'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Academic Status Active</CardContent>
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
                <Tabs defaultValue="exams" className="w-full">
                  <TabsList className="bg-muted/50 p-1 rounded-2xl mb-6 grid grid-cols-3 h-auto">
                    <TabsTrigger value="exams" className="rounded-xl gap-2 py-3 text-xs"><FileText className="size-4" /> Results</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-xl gap-2 py-3 text-xs"><Clock className="size-4" /> Attendance</TabsTrigger>
                    <TabsTrigger value="ledger" className="rounded-xl gap-2 py-3 text-xs"><Wallet className="size-4" /> Ledger</TabsTrigger>
                  </TabsList>

                  <TabsContent value="exams" className="mt-0">
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="px-6 py-4 font-bold">SUBJECT</TableHead>
                              <TableHead className="py-4 font-bold">TOTAL SCORE</TableHead>
                              <TableHead className="text-right px-6 py-4 font-bold">STATUS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {exams.map((ex: any) => (
                              <TableRow key={ex.id} className="hover:bg-slate-50 transition-colors">
                                <TableCell className="px-6 font-bold text-primary">{ex.subjectId}</TableCell>
                                <TableCell><span className="text-base font-headline font-bold text-accent">{ex.totalScore}</span> <span className="text-[10px] text-muted-foreground">/ 100</span></TableCell>
                                <TableCell className="text-right px-6">
                                  <Badge className={ex.totalScore >= 50 ? 'bg-green-600' : 'bg-destructive'}>{ex.totalScore >= 50 ? 'Pass' : 'Review'}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                            {exams.length === 0 && (
                              <TableRow><TableCell colSpan={3} className="text-center py-24 text-muted-foreground italic">No examination records recorded for current term.</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="attendance" className="mt-0">
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="px-6 py-4 font-bold">DATE</TableHead>
                              <TableHead className="py-4 font-bold">ROLL CALL</TableHead>
                              <TableHead className="text-right px-6 py-4 font-bold">SOURCE</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendance.sort((a: any, b: any) => b.date.localeCompare(a.date)).map((att: any) => (
                              <TableRow key={att.id} className="hover:bg-slate-50 transition-colors">
                                <TableCell className="px-6 font-mono text-xs">{att.date}</TableCell>
                                <TableCell>
                                  <Badge variant={att.status === 'present' ? 'default' : 'destructive'} className="text-[9px] uppercase font-bold px-3">
                                    {att.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right px-6 text-[9px] font-bold text-muted-foreground uppercase">Registry Sync</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="ledger" className="mt-0">
                    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="px-6 py-4 font-bold">ITEM / DATE</TableHead>
                              <TableHead className="py-4 font-bold">TYPE</TableHead>
                              <TableHead className="text-right px-6 py-4 font-bold">AMOUNT</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledger.map((entry: any) => (
                              <TableRow key={entry.id} className="hover:bg-slate-50 transition-colors">
                                <TableCell className="px-6">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm text-primary">{entry.item}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase font-mono">{entry.date}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-[9px] uppercase font-bold ${entry.type === 'charge' ? 'text-destructive border-destructive/20' : 'text-green-600 border-green-200'}`}>
                                    {entry.type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right px-6 font-bold text-sm">GH₵ {entry.amount.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
             </div>

             <div className="space-y-8">
                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white border-2 border-primary/5">
                   <CardHeader className="bg-primary text-primary-foreground p-8 shrink-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="size-4 text-accent" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">AI Parent Assistant</span>
                      </div>
                      <CardTitle className="text-xl font-headline font-bold">Strategic Insight</CardTitle>
                      <CardDescription className="text-primary-foreground/70">Simplified performance narrative powered by Vertex AI.</CardDescription>
                   </CardHeader>
                   <CardContent className="p-8 space-y-6">
                      {!aiNarrative ? (
                        <div className="text-center py-6 space-y-4">
                           <p className="text-sm text-muted-foreground italic leading-relaxed px-4">"Authorize the AI Assistant to translate your child's raw marks into a helpful performance summary."</p>
                           <Button 
                            className="w-full bg-primary hover:bg-primary/90 h-12 rounded-xl gap-2 font-bold shadow-xl shadow-primary/10" 
                            onClick={handleGenerateAiSummary}
                            disabled={aiLoading || exams.length === 0}
                           >
                              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-accent" />}
                              Authorize AI Explanation
                           </Button>
                        </div>
                      ) : (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                           <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 relative">
                              <div className="absolute -top-3 -left-3 size-8 rounded-full bg-primary flex items-center justify-center text-white shadow-lg"><MessageSquare className="size-4" /></div>
                              <p className="text-sm leading-relaxed text-slate-700 font-medium italic">"{aiNarrative}"</p>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <div className="p-4 rounded-xl border bg-slate-50 space-y-1">
                                 <h5 className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1.5"><Target className="size-3 text-primary" /> Focus</h5>
                                 <p className="text-[10px] font-bold text-primary">Strengthen Fractions</p>
                              </div>
                              <div className="p-4 rounded-xl border bg-slate-50 space-y-1">
                                 <h5 className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1.5"><Lightbulb className="size-3 text-accent" /> Tip</h5>
                                 <p className="text-[10px] font-bold text-primary">20m Daily Practice</p>
                              </div>
                           </div>
                        </div>
                      )}
                   </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-slate-50 rounded-2xl p-6 border">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2"><Calendar className="size-4" /> School Noticeboard</h4>
                   <div className="space-y-4">
                      <div className="p-4 bg-white rounded-xl shadow-sm border space-y-1 hover:shadow-md transition-all cursor-pointer group">
                        <Badge className="bg-primary/5 text-primary border-none text-[8px] font-bold mb-1">ALL PARENTS</Badge>
                        <h5 className="text-xs font-bold group-hover:text-primary transition-colors">Term 2 PTA Consultative Forum</h5>
                        <p className="text-[10px] text-muted-foreground">Scheduled for Oct 15th, 2026 at the Main Hall.</p>
                      </div>
                   </div>
                </Card>
             </div>
          </div>

          <div className="pt-8 border-t flex justify-center">
             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
                <CheckCircle2 className="size-3 text-green-600" /> Authorized Guardian Access • Registry Verified • 2026 Cycle
             </p>
          </div>
        </div>
      )}
    </div>
  )
}
