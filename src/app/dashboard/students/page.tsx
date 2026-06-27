
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, Filter, GraduationCap, Trash2, Pencil, Loader2, Upload, FileJson, User, Phone, MapPin, Calendar as CalendarIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, orderBy, deleteDoc, doc, where, serverTimestamp } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export default function StudentsPage() {
  const db = useFirestore()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  
  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    gender: "Male",
    gradeLevel: "SHS 1",
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

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(
      collection(db, "students"), 
      where("institutionId", "==", institutionId),
      orderBy("createdAt", "desc")
    );
  }, [db, institutionId]);

  const { data: students, loading: dataLoading } = useCollection(studentsQuery)

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
      setStudentForm({ 
        firstName: "", 
        lastName: "", 
        gender: "Male", 
        gradeLevel: "SHS 1", 
        studentId: "", 
        dateOfBirth: "", 
        parentName: "", 
        parentPhone: "", 
        homeAddress: "" 
      })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!db || !institutionId || loading || !bulkData.trim()) return
    setLoading(true)

    const lines = bulkData.split('\n').filter(line => line.trim() !== '')
    let successCount = 0

    try {
      for (const line of lines) {
        const [first, last, gender, grade, id, parent, phone] = line.split(',').map(s => s?.trim())
        if (first && last) {
          await addDoc(collection(db, "students"), {
            firstName: first,
            lastName: last,
            gender: gender || "Male",
            gradeLevel: grade || "Unassigned",
            studentId: id || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
            parentName: parent || "",
            parentPhone: phone || "",
            status: "active",
            institutionId,
            createdAt: serverTimestamp()
          })
          successCount++
        }
      }
      toast({
        title: "Bulk Import Complete",
        description: `Successfully enrolled ${successCount} students.`,
      })
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

  if (!institutionId) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold">No Institution Selected</h2>
        <p className="text-muted-foreground">Please select an institution from the Super Admin hub to manage students.</p>
        <Button asChild><a href="/admin">Go to Admin Hub</a></Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Student Directory</h1>
          <p className="text-muted-foreground">Manage individual and bulk enrollment records.</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 px-6">
                <Upload className="size-4" /> Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-bold text-primary">Bulk Student Import</DialogTitle>
                <DialogDescription>Format: FirstName, LastName, Gender, Grade, ID, ParentName, ParentPhone</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Textarea 
                  placeholder="John, Doe, Male, SHS 1, 10021, Robert Doe, 0244111222&#10;Jane, Smith, Female, JHS 3, 10022, Alice Smith, 0555333444" 
                  className="min-h-[200px] font-mono text-sm"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={handleBulkUpload} disabled={loading} className="w-full h-11">
                  {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <FileJson className="size-4 mr-2" />}
                  Import Records
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 shadow-lg shadow-primary/10">
                <UserPlus className="size-4" /> Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-2xl">
              <form onSubmit={handleEnroll}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline font-bold text-primary">Enroll New Student</DialogTitle>
                  <DialogDescription>Comprehensive academic and personal data collection.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-1">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Personal Info</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first">First Name</Label>
                        <Input id="first" required value={studentForm.firstName} onChange={(e) => setStudentForm({...studentForm, firstName: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last">Last Name</Label>
                        <Input id="last" required value={studentForm.lastName} onChange={(e) => setStudentForm({...studentForm, lastName: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select onValueChange={(v) => setStudentForm({...studentForm, gender: v})} defaultValue={studentForm.gender}>
                          <SelectTrigger>
                            <SelectValue placeholder="Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
                          <Input id="dob" type="date" className="pl-10" required value={studentForm.dateOfBirth} onChange={(e) => setStudentForm({...studentForm, dateOfBirth: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Academic Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="grade">Grade Level</Label>
                        <Select onValueChange={(v) => setStudentForm({...studentForm, gradeLevel: v})} defaultValue={studentForm.gradeLevel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Primary 1-6">Primary Node</SelectItem>
                            <SelectItem value="JHS 1-3">Junior High Node</SelectItem>
                            <SelectItem value="SHS 1">SHS 1</SelectItem>
                            <SelectItem value="SHS 2">SHS 2</SelectItem>
                            <SelectItem value="SHS 3">SHS 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sid">Student ID</Label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-3 size-4 text-muted-foreground" />
                          <Input id="sid" className="pl-10" placeholder="STU-XXXX" required value={studentForm.studentId} onChange={(e) => setStudentForm({...studentForm, studentId: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Guardian & Contact</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pname">Parent/Guardian Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                          <Input id="pname" className="pl-10" required value={studentForm.parentName} onChange={(e) => setStudentForm({...studentForm, parentName: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pphone">Guardian Phone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                          <Input id="pphone" className="pl-10" required value={studentForm.parentPhone} onChange={(e) => setStudentForm({...studentForm, parentPhone: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addr">Home Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input id="addr" className="pl-10" required value={studentForm.homeAddress} onChange={(e) => setStudentForm({...studentForm, homeAddress: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-4 border-t mt-4">
                  <Button type="submit" disabled={loading} className="w-full h-11">
                    {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <GraduationCap className="size-4 mr-2" />}
                    Complete Enrollment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden rounded-2xl">
        <CardHeader className="border-b pb-6 bg-white">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search records..." className="pl-9 h-11 bg-slate-50 border-none" />
            </div>
            <Button variant="outline" className="gap-2 h-11">
              <Filter className="size-4" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 && !dataLoading ? (
            <div className="flex flex-col items-center justify-center text-center p-24 space-y-4">
              <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center">
                <GraduationCap className="size-10 text-primary opacity-20" />
              </div>
              <p className="font-bold text-primary text-lg">Empty Directory</p>
              <p className="text-sm text-muted-foreground max-w-xs">Use manual enrollment or bulk upload to populate the student node.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold py-4">ID / Name</TableHead>
                  <TableHead className="font-bold py-4">Grade / Gender</TableHead>
                  <TableHead className="font-bold py-4">Guardian Contact</TableHead>
                  <TableHead className="font-bold py-4">Status</TableHead>
                  <TableHead className="text-right font-bold py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((stu: any) => (
                  <TableRow key={stu.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{stu.studentId || 'NO ID'}</span>
                        <span className="font-bold text-primary">{stu.lastName}, {stu.firstName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{stu.gradeLevel}</span>
                        <Badge variant="ghost" className="w-fit h-4 text-[9px] px-1 font-bold uppercase">{stu.gender}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-primary">{stu.parentName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                          <Phone className="size-3" /> {stu.parentPhone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold text-green-600 bg-green-50 border-green-200">
                        {stu.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(stu.id, `${stu.firstName} ${stu.lastName}`)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Hash(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  )
}
