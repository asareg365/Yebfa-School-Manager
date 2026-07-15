
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, GraduationCap, Trash2, Pencil, Loader2, Upload, IdCard, User, Camera, X, Check, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"

const PRIMARY_GRADES = ["KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]
const JHS_GRADES = ["JHS 1", "JHS 2", "JHS 3"]
const SHS_GRADES = ["SHS 1", "SHS 2", "SHS 3"]

export default function StudentsPage() {
  const db = useFirestore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    gender: "Male",
    gradeLevel: "Primary 1",
    studentId: "",
    dateOfBirth: "",
    parentName: "",
    parentPhone: "",
    homeAddress: "",
    photoUrl: ""
  })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db!, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(
      collection(db, "students"), 
      where("tenantId", "==", institutionId)
    );
  }, [db, institutionId]);

  const { data: rawStudentsData, loading: dataLoading } = useCollection(studentsQuery)

  const students = useMemo(() => {
    return [...rawStudentsData]
      .filter(s => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => (b.studentId || "").localeCompare(a.studentId || ""));
  }, [rawStudentsData, searchQuery]);

  const availableGrades = useMemo(() => {
    const category = institution?.gradeLevel || institution?.type || "Basic"
    if (category.toLowerCase().includes("primary") || category.toLowerCase().includes("basic")) return PRIMARY_GRADES
    if (category.toLowerCase().includes("jhs")) return JHS_GRADES
    if (category.toLowerCase().includes("shs")) return SHS_GRADES
    return [...PRIMARY_GRADES, ...JHS_GRADES, ...SHS_GRADES]
  }, [institution])

  useEffect(() => {
    if (isEnrollOpen && !studentForm.studentId) {
      const nextNum = rawStudentsData.length + 1;
      const autoId = `STU-${String(nextNum).padStart(4, '0')}`;
      setStudentForm(prev => ({ ...prev, studentId: autoId, gradeLevel: availableGrades[0] }));
    }
  }, [isEnrollOpen, rawStudentsData.length, availableGrades]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setStudentForm(prev => ({ ...prev, photoUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const startCamera = async () => {
    setIsCameraActive(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Failed", description: "Please check permissions." })
      setIsCameraActive(false)
    }
  }

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = 400
      canvas.height = 400
      canvas.getContext('2d')?.drawImage(video, 0, 0, 400, 400)
      setStudentForm(prev => ({ ...prev, photoUrl: canvas.toDataURL('image/jpeg') }))
      stopCamera()
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
  }, [])

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    
    const data = {
      ...studentForm,
      status: "active",
      tenantId: institutionId,
      institutionId: institutionId,
      createdAt: serverTimestamp()
    }

    try {
      await addDoc(collection(db, "students"), data)
      toast({ title: "Student Enrolled", description: `${studentForm.firstName} joined the registry.` })
      setIsEnrollOpen(false)
      setStudentForm({ firstName: "", lastName: "", gender: "Male", gradeLevel: availableGrades[0], studentId: "", dateOfBirth: "", parentName: "", parentPhone: "", homeAddress: "", photoUrl: "" })
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
      await updateDoc(doc(db, "students", editingStudent.id), {
        ...studentForm,
        updatedAt: serverTimestamp()
      })
      toast({ title: "Record Updated", description: "Student details synchronized." })
      setIsEditOpen(false)
      setEditingStudent(null)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) return <div className="p-24 text-center animate-pulse font-bold text-muted-foreground">Loading Registry...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Student Directory</h1>
          <p className="text-muted-foreground">Managing {students.length} enrollment records.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild><Link href="/dashboard/students/id-cards"><IdCard className="size-4" /> ID Generator</Link></Button>
          <Button className="gap-2 bg-primary" onClick={() => setIsEnrollOpen(true)}><UserPlus className="size-4" /> Enroll Student</Button>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden rounded-2xl">
        <CardHeader className="border-b pb-6 bg-white">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search records..." className="pl-9 h-11" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
                <TableRow key={stu.id} className="hover:bg-slate-50 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full overflow-hidden bg-muted flex items-center justify-center border shrink-0">
                        {stu.photoUrl ? <img src={stu.photoUrl} alt="" className="w-full h-full object-cover" /> : <User className="size-5 text-muted-foreground" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{stu.studentId}</span>
                        <span className="font-bold text-primary">{stu.firstName} {stu.lastName}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{stu.gradeLevel}</span>
                      <Badge variant="outline" className="w-fit text-[9px] uppercase font-bold">{stu.gender}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold">{stu.parentName}</span>
                      <span className="text-[10px] text-muted-foreground">{stu.parentPhone}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge className="text-[9px] uppercase font-bold bg-green-50 text-green-600 border-green-200">{stu.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" asChild><Link href="/dashboard/exams"><FileText className="size-3.5" /></Link></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        setEditingStudent(stu);
                        setStudentForm({...stu});
                        setIsEditOpen(true);
                      }}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db!, "students", stu.id))} className="h-8 w-8 text-destructive"><Trash2 className="size-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEnrollOpen} onOpenChange={(val) => { if (!val) stopCamera(); setIsEnrollOpen(val); }}>
        <DialogContent className="max-w-2xl"><form onSubmit={handleEnroll}>
          <DialogHeader><DialogTitle>Enroll Student</DialogTitle><DialogDescription>Linked to {institution?.name}.</DialogDescription></DialogHeader>
          <div className="grid gap-6 py-6 max-h-[70vh] overflow-y-auto px-1">
            <div className="flex flex-col items-center gap-4">
              <div className="size-32 rounded-2xl bg-muted overflow-hidden flex items-center justify-center border-2 border-dashed">
                {studentForm.photoUrl ? <img src={studentForm.photoUrl} className="w-full h-full object-cover" /> : isCameraActive ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /> : <User className="size-12 text-muted-foreground/30" />}
              </div>
              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Upload</Button>
                {!isCameraActive ? <Button type="button" variant="outline" size="sm" onClick={startCamera}>Camera</Button> : <Button type="button" size="sm" onClick={capturePhoto} className="bg-green-600">Capture</Button>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Gender</Label><Select onValueChange={v => setStudentForm({...studentForm, gender: v})} value={studentForm.gender}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>DOB</Label><Input type="date" value={studentForm.dateOfBirth} onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Grade</Label><Select onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})} value={studentForm.gradeLevel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{availableGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>ID</Label><Input readOnly value={studentForm.studentId} className="bg-slate-50 font-bold" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Guardian Name</Label><Input required value={studentForm.parentName} onChange={e => setStudentForm({...studentForm, parentName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Guardian Phone</Label><Input required value={studentForm.parentPhone} onChange={e => setStudentForm({...studentForm, parentPhone: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={studentForm.homeAddress} onChange={e => setStudentForm({...studentForm, homeAddress: e.target.value})} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={loading} className="w-full">Complete Enrollment</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl"><form onSubmit={handleUpdate}>
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Guardian Name</Label><Input required value={studentForm.parentName} onChange={e => setStudentForm({...studentForm, parentName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Guardian Phone</Label><Input required value={studentForm.parentPhone} onChange={e => setStudentForm({...studentForm, parentPhone: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={studentForm.homeAddress} onChange={e => setStudentForm({...studentForm, homeAddress: e.target.value})} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={loading} className="w-full">Authorize Update</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>
    </div>
  )
}
