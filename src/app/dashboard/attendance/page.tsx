"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Activity, Clock, CheckCircle, Save, Loader2, Calendar as CalendarIcon, Filter, Search, CheckSquare, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc, useUser } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, setDoc, doc, getDocs } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"

export default function AttendancePage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [presentStudents, setPresentStudents] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
    setSelectedDate(new Date().toISOString().split('T')[0])
  }, [])

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)
  const isTeacher = profile?.role === 'teacher'
  const staffId = profile?.staffId

  const assignmentsQuery = useMemo(() => 
    institutionId && isTeacher && staffId 
      ? query(collection(db, "teacher_assignments"), where("tenantId", "==", institutionId), where("teacherId", "==", staffId)) 
      : null, 
    [db, institutionId, isTeacher, staffId]
  )
  const { data: assignments = [] } = useCollection(assignmentsQuery)
  const assignedClassIds = useMemo(() => new Set(assignments.map((a: any) => a.classId)), [assignments])

  const classesQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "classes"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId || !selectedGrade) return null;
    return query(collection(db, "students"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade));
  }, [db, institutionId, selectedGrade]);

  const attendanceQuery = useMemo(() => {
    if (!db || !institutionId || !selectedGrade || !selectedDate) return null;
    return query(
      collection(db, "attendance"),
      where("tenantId", "==", institutionId),
      where("gradeLevel", "==", selectedGrade),
      where("date", "==", selectedDate)
    );
  }, [db, institutionId, selectedGrade, selectedDate]);

  const { data: allClasses = [] } = useCollection(classesQuery)
  const { data: students, loading: studentsLoading } = useCollection(studentsQuery)
  const { data: existingAttendance } = useCollection(attendanceQuery)

  const classes = useMemo(() => isTeacher ? allClasses.filter(c => assignedClassIds.has(c.id)) : allClasses, [allClasses, isTeacher, assignedClassIds])

  useEffect(() => {
    if (existingAttendance.length > 0) {
      const map: Record<string, boolean> = {};
      existingAttendance.forEach((record: any) => {
        map[record.studentId] = record.status === 'present';
      });
      setPresentStudents(map);
    } else {
      setPresentStudents({});
    }
  }, [existingAttendance]);

  const handleToggleAll = (status: boolean) => {
    const map: Record<string, boolean> = {};
    students.forEach(s => {
      map[s.id] = status;
    });
    setPresentStudents(map);
    toast({ title: status ? "All Marked Present" : "All Marked Absent", description: "Remember to save changes to authorize the roll call." });
  }

  const handleSaveAttendance = () => {
    if (!db || !institutionId || !selectedGrade || !selectedDate) return
    setIsSaving(true)
    
    const promises = students.map(student => {
      const status = presentStudents[student.id] ? "present" : "absent"
      const recordId = `${student.id}_${selectedDate}`
      const data = {
        studentId: student.id,
        tenantId: institutionId,
        studentName: `${student.firstName} ${student.lastName}`,
        gradeLevel: selectedGrade,
        date: selectedDate,
        status: status,
        recordedBy: staffId || null,
        institutionId: institutionId,
        updatedAt: serverTimestamp()
      }
      return setDoc(doc(db, "attendance", recordId), data, { merge: true })
    })

    Promise.all(promises)
      .then(() => toast({ title: "Attendance Recorded", description: "Roll call synchronized." }))
      .finally(() => setIsSaving(false))
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Daily Attendance</h1>
          <p className="text-muted-foreground font-medium text-sm">Tracking presence across grade modules for the 2026 registry.</p>
        </div>
        <Button className="gap-2 bg-primary h-11 rounded-xl shadow-lg font-bold px-6 w-full md:w-auto" onClick={handleSaveAttendance} disabled={isSaving || !selectedGrade}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Roll Call
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="border-none shadow-md h-fit lg:col-span-1">
          <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Capture Context</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Date</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Grade Module</Label>
              <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                  {classes.filter(c => !!c.id).map(c => (
                    <SelectItem key={c.id} value={c.name || c.id}>
                      {c.name || "Unnamed Class"}
                    </SelectItem>
                  ))}
                  {classes.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">No classes assigned.</div>}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b bg-slate-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div>
                 <CardTitle className="text-lg">Student Roster</CardTitle>
                 <CardDescription className="text-xs">Synchronizing presence for {selectedGrade || "unselected grade"}.</CardDescription>
               </div>
               {selectedGrade && !studentsLoading && students.length > 0 && (
                 <div className="flex flex-wrap gap-2 p-1 bg-white border rounded-xl shadow-sm w-full sm:w-auto">
                   <Button variant="ghost" size="sm" className="flex-1 h-8 text-[10px] font-bold uppercase text-primary hover:bg-primary/5 rounded-lg" onClick={() => handleToggleAll(true)}>
                     <CheckSquare className="size-3.5 mr-1.5" /> Mark All Present
                   </Button>
                   <Button variant="ghost" size="sm" className="flex-1 h-8 text-[10px] font-bold uppercase text-destructive hover:bg-destructive/5 rounded-lg" onClick={() => handleToggleAll(false)}>
                     <Square className="size-3.5 mr-1.5" /> Mark All Absent
                   </Button>
                 </div>
               )}
            </CardHeader>
            <CardContent className="p-0">
              {!selectedGrade ? (
                <div className="p-20 md:p-32 text-center text-muted-foreground space-y-4">
                  <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto opacity-20"><Users className="size-8" /></div>
                  <p className="italic text-sm">Select a grade module to load the active student roster.</p>
                </div>
              ) : studentsLoading ? (
                <div className="p-20 md:p-32 text-center">
                  <Loader2 className="size-10 animate-spin mx-auto text-primary opacity-20" />
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="py-4 font-bold px-6">STUDENT IDENTITY</TableHead>
                        <TableHead className="py-4 font-bold text-center">STATUS</TableHead>
                        <TableHead className="py-4 font-bold text-right px-6">VERIFICATION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((stu: any) => (
                        <TableRow key={stu.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="px-6">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary text-[10px] border shrink-0">
                                {stu.firstName?.charAt(0)}{stu.lastName?.charAt(0)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-primary text-sm truncate">{stu.firstName} {stu.lastName}</span>
                                <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-tighter truncate">{stu.admissionNumber}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox 
                                id={`att-${stu.id}`}
                                className="size-6 rounded-lg border-2"
                                checked={presentStudents[stu.id] || false} 
                                onCheckedChange={(val) => setPresentStudents({...presentStudents, [stu.id]: !!val})} 
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <Badge variant={presentStudents[stu.id] ? "default" : "outline"} className={`text-[9px] uppercase font-bold px-3 h-6 border-none ${presentStudents[stu.id] ? 'bg-green-600' : 'bg-destructive/10 text-destructive'}`}>
                              {presentStudents[stu.id] ? "Present" : "Absent"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {students.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-24 text-muted-foreground italic">
                            No student records detected for this grade in the registry.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
