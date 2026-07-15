
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
  CheckCircle2
} from "lucide-react"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { query, collection, where } from "firebase/firestore"

export default function ParentPortal() {
  const { user } = useUser()
  const db = useFirestore()
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // 1. Fetch children linked to this parent UID
  const childrenQuery = useMemo(() => {
    if (!db || !user?.uid) return null
    return query(collection(db, "students"), where("parentUid", "==", user.uid))
  }, [db, user?.uid])

  const { data: children, loading: childrenLoading } = useCollection(childrenQuery)

  // 2. Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedStudentId) {
      setSelectedStudentId(children[0].id)
    }
  }, [children, selectedStudentId])

  const selectedChild = useMemo(() => 
    children.find(c => c.id === selectedStudentId), 
    [children, selectedStudentId]
  )

  // 3. Fetch data for selected child
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

  if (childrenLoading) return <div className="p-12 text-center animate-pulse">Syncing Family Registry...</div>

  if (children.length === 0) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="size-20 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Baby className="size-10 text-muted-foreground/30" />
        </div>
        <h2 className="text-2xl font-bold font-headline">No Linked Children</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Your account is not currently linked to any student records. Please contact the school administration to synchronize your profile.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary">Guardian Oversight</h1>
          <p className="text-muted-foreground">Monitoring progress for {children.length} {children.length === 1 ? 'child' : 'children'}.</p>
        </div>
        <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
          {children.map((child: any) => (
            <button
              key={child.id}
              onClick={() => setSelectedStudentId(child.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                selectedStudentId === child.id 
                ? 'bg-white shadow-sm text-primary' 
                : 'text-muted-foreground hover:bg-white/50'
              }`}
            >
              {child.firstName}
            </button>
          ))}
        </div>
      </div>

      {selectedChild && (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-none shadow-md bg-primary text-primary-foreground">
              <CardHeader className="pb-2">
                <CardDescription className="text-primary-foreground/70 text-xs font-bold uppercase">Balance Due</CardDescription>
                <CardTitle className="text-3xl font-headline">GH₵ {balance.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-white/10 text-white border-none">{balance > 0 ? 'Payment Required' : 'Account Clear'}</Badge>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase text-muted-foreground">Presence</CardDescription>
                <CardTitle className="text-3xl font-headline">
                  {Math.round((attendance.filter((a: any) => a.status === 'present').length / (attendance.length || 1)) * 100)}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[10px] text-muted-foreground font-bold uppercase">Current Term Roll Call</CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase text-muted-foreground">Academics</CardDescription>
                <CardTitle className="text-3xl font-headline">
                  {exams.length > 0 ? (exams.reduce((acc, curr: any) => acc + curr.totalScore, 0) / exams.length).toFixed(1) : '---'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[10px] text-muted-foreground font-bold uppercase">Exam Average</CardContent>
            </Card>
          </div>

          <Tabs defaultValue="exams" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
              <TabsTrigger value="exams" className="rounded-lg gap-2"><FileText className="size-4" /> Academic Results</TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-lg gap-2"><Clock className="size-4" /> Attendance Logs</TabsTrigger>
              <TabsTrigger value="ledger" className="rounded-lg gap-2"><Wallet className="size-4" /> Fee Statements</TabsTrigger>
            </TabsList>

            <TabsContent value="exams">
              <Card className="border-none shadow-md overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Exam (70)</TableHead>
                        <TableHead>Class (30)</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exams.map((ex: any) => (
                        <TableRow key={ex.id}>
                          <TableCell className="font-bold text-primary">{ex.subjectId}</TableCell>
                          <TableCell>{ex.examScore}</TableCell>
                          <TableCell>{ex.classScore}</TableCell>
                          <TableCell className="text-right font-bold text-accent">{ex.totalScore}</TableCell>
                        </TableRow>
                      ))}
                      {exams.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No examination records found for the current cycle.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance">
              <Card className="border-none shadow-md overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Logged At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.sort((a: any, b: any) => b.date.localeCompare(a.date)).map((att: any) => (
                        <TableRow key={att.id}>
                          <TableCell className="font-mono text-xs">{att.date}</TableCell>
                          <TableCell>
                            <Badge variant={att.status === 'present' ? 'default' : 'destructive'} className="text-[10px] uppercase">
                              {att.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-[10px] text-muted-foreground uppercase">Digital Registry</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ledger">
              <Card className="border-none shadow-md overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Reference Date</TableHead>
                        <TableHead>Item / Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs font-mono">{entry.date}</TableCell>
                          <TableCell className="font-bold">{entry.item}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] uppercase ${entry.type === 'charge' ? 'text-destructive' : 'text-green-600'}`}>
                              {entry.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">GH₵ {entry.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
