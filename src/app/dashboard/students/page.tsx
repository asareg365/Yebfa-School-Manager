
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, Filter, GraduationCap, Trash2, Pencil, Loader2, Upload, FileJson, User, Phone, MapPin, Calendar as CalendarIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const PRIMARY_GRADES = ["KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]
const JHS_GRADES = ["JHS 1", "JHS 2", "JHS 3"]
const SHS_GRADES = ["SHS 1", "SHS 2", "SHS 3"]

export default function StudentsPage() {
  const db = useFirestore()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  
  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    gender: "Male",
    gradeLevel: "Primary 1",
    studentId: "",
    dateOfBirth: "",
    parentName: "",
    parentPhone: "",
    homeAddress: ""
  })
  const [bulkData, setBulkData] = useState("")

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const instRef = institutionId ? doc(db!, "institutions", institutionId) : null
  const { data: institution } = useDoc(instRef)

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(
      collection(db, "students"), 
      where("institutionId", "==", institutionId)
    );
  }, [db, institutionId]);

  const { data: studentsData, loading: dataLoading } = useCollection(studentsQuery)

  const students = useMemo(() => {
    return [...studentsData].sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || Date.now();
      const dateB = b.createdAt?.toMillis?.() || Date.now();
      return dateB - dateA;
    });
  }, [studentsData]);

  const availableGrades = useMemo(() => {
    const category = institution?.gradeLevel || institution?.type || "Basic"
    if (category.toLowerCase().includes("primary") || category.toLowerCase().includes("basic")) return PRIMARY_GRADES
    if (category.toLowerCase().includes("jhs")) return JHS_GRADES
    if (category.toLowerCase().includes("shs")) return SHS_GRADES
    return [...PRIMARY_GRADES, ...JHS_GRADES, ...SHS_GRADES]
  }, [institution])

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    
    const data = {
      ...studentForm,
      status: "active",
      institutionId: institutionId,
      createdAt: serverTimestamp()
    }

    try {
      await addDoc(collection(db, "students"), data)
      toast({
        title: "Student Enrolled",
        description: `${studentForm.firstName} has been added successfully.`,
      })
      setIsEnrollOpen(false)
      setStudentForm({ firstName: "", lastName: "", gender: "Male", gradeLevel: availableGrades[0], studentId: "", dateOfBirth: "", parentName: "", parentPhone: "", homeAddress: "" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !editingStudent || loading) return
    setLoading(true)
    try {
      await updateDoc(doc(db, "students", editingStudent.id), studentForm)
      toast({ title: "Record Updated", description: `${studentForm.firstName}'s details are synchronized.` })
      setIsEditOpen(false)
      setEditingStudent(null)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!db || !institutionId || loading || !bulkData.trim()) return
    setLoading(true)
    const lines = bulkData.split('\n').filter(line => line.trim() !== '')
    try {
      for (const line of lines) {
        const [first, last, gender, grade, id, parent, phone] = line.split(',').map(s => s?.trim())
        if (first && last) {
          await addDoc(collection(db, "students"), {
            firstName: first,
            lastName: last,
            gender: gender || "Male",
            gradeLevel: grade || availableGrades[0],
            studentId: id || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
            parentName: parent || "",
            parentPhone: phone || "",
            status: "active",
            institutionId,
            createdAt: serverTimestamp()
          })
        }
      }
      toast({ title: "Bulk Import Complete", description: "All records processed." })
      setIsBulkOpen(false)
      setBulkData("")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Import Error", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db!, "students", id))
      toast({ title: "Record Deleted", description: `${name} has been removed.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message })
    }
  }

  if (!institutionId) return (
    <div className="p-12 text-center space-y-4">
      <h2 className="text-xl font-bold">No Institution Selected</h2>
      <p className="text-muted-foreground">Select a school in the Admin Hub to continue.</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Student Directory</h1>
          <p className="text-muted-foreground">Managing {students.length} enrollment nodes for {institution?.name}.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 h-11" onClick={() => setIsBulkOpen(true)}>
            <Upload className="size-4" /> Bulk Upload
          </Button>
          <Button className="gap-2 bg-primary h-11" onClick={() => setIsEnrollOpen(true)}>
            <UserPlus className="size-4" /> Enroll Student
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden rounded-2xl">
        <CardHeader className="border-b pb-6 bg-white">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search records..." className="pl-9 h-11 bg-slate-50 border-none" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 && !dataLoading ? (
            <div className="p-24 text-center space-y-4">
              <GraduationCap className="size-16 text-primary opacity-10 mx-auto" />
              <p className="font-bold text-muted-foreground">Empty Directory Node</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold py-4">ID / Name</TableHead>
                  <TableHead className="font-bold py-4">Grade / Gender</TableHead>
                  <TableHead className="font-bold py-4">Guardian</TableHead>
                  <TableHead className="font-bold py-4">Status</TableHead>
                  <TableHead className="text-right font-bold py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((stu: any) => (
                  <TableRow key={stu.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{stu.studentId}</span>
                        <span className="font-bold text-primary">{stu.firstName} {stu.lastName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{stu.gradeLevel}</span>
                        <Badge variant="outline" className="w-fit text-[9px] uppercase">{stu.gender}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold">{stu.parentName}</span>
                        <span className="text-[10px] text-muted-foreground">{stu.parentPhone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[9px] uppercase font-bold bg-green-50 text-green-600 border-green-200">{stu.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingStudent(stu);
                          setStudentForm(stu);
                          setIsEditOpen(true);
                        }}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(stu.id, stu.firstName)} className="h-8 w-8 text-destructive">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleEnroll}>
            <DialogHeader>
              <DialogTitle>Enroll New Student</DialogTitle>
              <DialogDescription>Assigning to {institution?.name} node.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade Level (Live Sync)</Label>
                  <Select onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})} defaultValue={availableGrades[0]}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGrades.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input required value={studentForm.studentId} onChange={e => setStudentForm({...studentForm, studentId: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Guardian Name</Label>
                  <Input required value={studentForm.parentName} onChange={e => setStudentForm({...studentForm, parentName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Guardian Phone</Label>
                  <Input required value={studentForm.parentPhone} onChange={e => setStudentForm({...studentForm, parentPhone: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <GraduationCap className="size-4 mr-2" />}
                Complete Enrollment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Student Node</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade Level</Label>
                  <Select onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})} defaultValue={studentForm.gradeLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGrades.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Guardian Name</Label>
                  <Input required value={studentForm.parentName} onChange={e => setStudentForm({...studentForm, parentName: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Nodes</DialogTitle>
          </DialogHeader>
          <Textarea 
            placeholder="First, Last, Gender, Grade, ID, Parent, Phone"
            className="min-h-[200px] font-mono text-sm"
            value={bulkData}
            onChange={e => setBulkData(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleBulkUpload} disabled={loading} className="w-full">Process Bulk Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
