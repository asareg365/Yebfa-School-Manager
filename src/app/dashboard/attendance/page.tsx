
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

const PRIMARY_GRADES = ["KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]
const JHS_GRADES = ["JHS 1", "JHS 2", "JHS 3"]
const SHS_GRADES = ["SHS 1", "SHS 2", "SHS 3"]

export default function AttendancePage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [presentStudents, setPresentStudents] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db!, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId || !selectedGrade) return null
    return query(collection(db, "students"), where("institutionId", "==", institutionId), where("gradeLevel", "==", selectedGrade))
  }, [db, institutionId, selectedGrade])

  const { data: students, loading: studentsLoading } = useCollection(studentsQuery)

  // Fetch existing attendance for the selected date and grade
  useEffect(() => {
    async function fetchAttendance() {
      if (!db || !institutionId || !selectedGrade || !selectedDate) return
      setIsLoadingHistory(true)
      try {
        const q = query(
          collection(db, "attendance"),
          where("institutionId", "==", institutionId),
          where("gradeLevel", "==", selectedGrade),
          where("date", "==", selectedDate)
        )
        const snap = await getDocs(q)
        const history: Record<string, boolean> = {}
        snap.docs.forEach(d => {
          const data = d.data()
          history[data.studentId] = data.status === "present"
        })
        setPresentStudents(history)
      } catch (error) {
        console.error("Error loading attendance history:", error)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    fetchAttendance()
  }, [db, institutionId, selectedGrade, selectedDate])

  const availableGrades = useMemo(() => {
    const category = institution?.gradeLevel || institution?.type || "Basic"
    if (category.toLowerCase().includes("primary") || category.toLowerCase().includes("basic")) return PRIMARY_GRADES
    if (category.toLowerCase().includes("jhs")) return JHS_GRADES
    if (category.toLowerCase().includes("shs")) return SHS_GRADES
    return [...PRIMARY_GRADES, ...JHS_GRADES, ...SHS_GRADES]
  }, [institution])

  const handleToggleAttendance = (studentId: string, isPresent: boolean) => {
    setPresentStudents(prev => ({
      ...prev,
      [studentId]: isPresent
    }))
  }

  const handleSaveAttendance = () => {
    if (!db || !institutionId || !selectedGrade || !selectedDate) return
    setIsSaving(true)
    
    const promises = students.map(student => {
      const status = presentStudents[student.id] ? "present" : "absent"
      const recordId = `${student.id}_${selectedDate}`
      const data = {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        gradeLevel: selectedGrade,
        date: selectedDate,
        status: status,
        institutionId: institutionId,
        updatedAt: serverTimestamp()
      }
      
      const docRef = doc(db, "attendance", recordId)
      return setDoc(docRef, data, { merge: true })
        .catch(async (error: any) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'write',
            requestResourceData: data,
          });
          errorEmitter.emit('permission-error', permissionError);
        })
    })

    Promise.all(promises)
      .then(() => {
        toast({
          title: "Attendance Recorded",
          description: `Daily roll call for ${selectedGrade} has been synchronized.`,
        })
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Daily Attendance</h1>
          <p className="text-muted-foreground">Recording student presence for the academic cycle.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
          <Button 
            onClick={handleSaveAttendance} 
            disabled={isSaving || !selectedGrade || students.length === 0}
            className="gap-2 bg-primary shadow-lg shadow-primary/10 h-11 px-8 rounded-xl transition-all active:scale-95"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Roll Call
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-md bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Present Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline">
              {Object.values(presentStudents).filter(v => v).length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Selected Class Node</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Absent Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline text-accent">
              {Math.max(0, students.length - Object.values(presentStudents).filter(v => v).length)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Requiring Follow-up</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1 border-none shadow-md rounded-2xl bg-white">
          <CardHeader><CardTitle className="text-sm font-bold">Class Selection</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Grade Node</Label>
              <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Grade Node" /></SelectTrigger>
                <SelectContent>
                  {availableGrades.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-md overflow-hidden rounded-2xl bg-white">
          <CardHeader className="border-b bg-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-headline font-bold">Roster Attendance</CardTitle>
                <CardDescription>
                  {selectedGrade ? `Enrolled students in ${selectedGrade}` : "Please select a grade node to begin."}
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold tracking-tight rounded-lg">
                {selectedDate}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {studentsLoading || isLoadingHistory ? (
              <div className="p-20 text-center space-y-4">
                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Synchronizing Roster Status...</p>
              </div>
            ) : !selectedGrade ? (
              <div className="p-20 text-center space-y-4">
                <Users className="size-12 text-primary/10 mx-auto" />
                <p className="text-sm font-bold text-muted-foreground">Select a grade node to display the student list.</p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-20 text-center italic text-muted-foreground">No students enrolled in this grade node.</div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold">Tick</TableHead>
                    <TableHead className="font-bold">Student Details</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold">Identifier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((stu: any) => (
                    <TableRow key={stu.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={!!presentStudents[stu.id]} 
                          onCheckedChange={(checked) => handleToggleAttendance(stu.id, !!checked)}
                          className="size-5 rounded-md border-primary/20"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-white shadow-sm">
                            {stu.photoUrl ? <img src={stu.photoUrl} className="w-full h-full object-cover" /> : <Users className="size-4 text-muted-foreground" />}
                          </div>
                          <span className="font-bold text-primary">{stu.firstName} {stu.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={presentStudents[stu.id] ? "default" : "secondary"} className={`text-[10px] uppercase font-bold rounded-lg ${presentStudents[stu.id] ? 'bg-green-500 hover:bg-green-600' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-50'}`}>
                          {presentStudents[stu.id] ? "Present" : "Absent"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-bold text-muted-foreground">
                        {stu.studentId}
                      </TableCell>
                    </TableRow>
                  ))}
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
  return <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{children}</label>
}
