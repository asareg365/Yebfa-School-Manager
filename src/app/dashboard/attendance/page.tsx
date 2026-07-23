"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Activity, Clock, CheckCircle, Save, Loader2, Calendar as CalendarIcon, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, setDoc, doc, getDocs } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table"

export default function AttendancePage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [presentStudents, setPresentStudents] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
    // Initialize date on client to avoid hydration mismatch
    setSelectedDate(new Date().toISOString().split('T')[0])
  }, [])

  // Sync with actual registered classes
  const classesQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "classes"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId || !selectedGrade) return null;
    return query(collection(db, "students"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade));
  }, [db, institutionId, selectedGrade]);

  // Query for existing attendance records for the selected date/grade
  const attendanceQuery = useMemo(() => {
    if (!db || !institutionId || !selectedGrade || !selectedDate) return null;
    return query(
      collection(db, "attendance"),
      where("tenantId", "==", institutionId),
      where("gradeLevel", "==", selectedGrade),
      where("date", "==", selectedDate)
    );
  }, [db, institutionId, selectedGrade, selectedDate]);

  const { data: classes = [] } = useCollection(classesQuery)
  const { data: students, loading: studentsLoading } = useCollection(studentsQuery)
  const { data: existingAttendance } = useCollection(attendanceQuery)

  // Sync UI state with fetched database records
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-headline font-bold text-primary">Daily Attendance</h1><p className="text-muted-foreground">Tracking presence across grade modules.</p></div>
        <Button className="gap-2 bg-primary" onClick={handleSaveAttendance} disabled={isSaving || !selectedGrade}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Roll Call
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-md">
          <CardHeader><CardTitle className="text-sm">Capture Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Grade</Label>
              <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                  {classes.length === 0 && <div className="p-2 text-center text-[10px] text-muted-foreground italic">No classes found</div>}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            {!selectedGrade ? (
              <div className="p-20 text-center text-muted-foreground opacity-30"><Users className="size-12 mx-auto mb-2" /><p>Select a grade to load roster.</p></div>
            ) : studentsLoading ? (
              <div className="p-20 text-center"><Loader2 className="size-8 animate-spin mx-auto text-primary" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="py-4">Student Name</TableHead>
                    <TableHead className="w-32 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((stu: any) => (
                    <TableRow key={stu.id}>
                      <TableCell className="font-bold text-primary">{stu.firstName} {stu.lastName}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={presentStudents[stu.id] || false} 
                          onCheckedChange={(val) => setPresentStudents({...presentStudents, [stu.id]: !!val})} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {students.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-12 text-muted-foreground italic">No students found in this grade.</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</label>
}
