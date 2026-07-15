"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, GraduationCap, Trash2, Pencil, Loader2, Upload, IdCard, User, Camera, X, Check, FileText, Phone, MapPin, ShieldCheck, HeartPulse, Bus, Home } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc, orderBy } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import { useRouter } from "next/navigation"

const PRIMARY_GRADES = ["KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]
const JHS_GRADES = ["JHS 1", "JHS 2", "JHS 3"]
const SHS_GRADES = ["SHS 1", "SHS 2", "SHS 3"]

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const RELIGIONS = ["Christianity", "Islam", "Traditional", "Hinduism", "Other", "None"]

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
    middleName: "",
    lastName: "",
    gender: "Male",
    gradeLevel: "Primary 1",
    admissionNumber: "",
    studentId: "",
    dateOfBirth: "",
    nationality: "Ghanaian",
    religion: "Christianity",
    bloodGroup: "O+",
    nhisNumber: "",
    gpsAddress: "",
    residentialAddress: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    guardianName: "",
    emergencyContact: "",
    medicalHistory: "",
    allergies: "",
    house: "",
    busRoute: "",
    hostel: "",
    previousSchool: "",
    admissionDate: new Date().toISOString().split('T')[0],
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
        s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => (b.admissionNumber || "").localeCompare(a.admissionNumber || ""));
  }, [rawStudentsData, searchQuery]);

  const availableGrades = useMemo(() => {
    const category = institution?.gradeLevel || institution?.type || "Basic"
    if (category.toLowerCase().includes("primary") || category.toLowerCase().includes("basic")) return PRIMARY_GRADES
    if (category.toLowerCase().includes("jhs")) return JHS_GRADES
    if (category.toLowerCase().includes("shs")) return SHS_GRADES
    return [...PRIMARY_GRADES, ...JHS_GRADES, ...SHS_GRADES]
  }, [institution])

  useEffect(() => {
    if (isEnrollOpen && !studentForm.admissionNumber) {
      const year = new Date().getFullYear();
      const count = rawStudentsData.length + 1;
      const prefix = institution?.name?.substring(0, 3).toUpperCase() || "APS";
      const autoAdm = `${prefix}-${year}-${String(count).padStart(6, '0')}`;
      const autoId = `STU-${String(count).padStart(4, '0')}`;
      
      setStudentForm(prev => ({ 
        ...prev, 
        admissionNumber: autoAdm, 
        studentId: autoId, 
        gradeLevel: availableGrades[0] 
      }));
    }
  }, [isEnrollOpen, rawStudentsData.length, availableGrades, institution]);

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
      // Reset form
      setStudentForm({
        firstName: "", middleName: "", lastName: "", gender: "Male", gradeLevel: availableGrades[0],
        admissionNumber: "", studentId: "", dateOfBirth: "", nationality: "Ghanaian", religion: "Christianity",
        bloodGroup: "O+", nhisNumber: "", gpsAddress: "", residentialAddress: "", parentName: "",
        parentPhone: "", parentEmail: "", guardianName: "", emergencyContact: "", medicalHistory: "",
        allergies: "", house: "", busRoute: "", hostel: "", previousSchool: "",
        admissionDate: new Date().toISOString().split('T')[0], photoUrl: ""
      })
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

  if (dataLoading) return <div className="p-24 text-center animate-pulse font-bold text-muted-foreground text-lg">Synchronizing Institutional Registry...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary">Student Directory</h1>
          <p className="text-muted-foreground">Managing {students.length} comprehensive enrollment records.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild className="rounded-xl h-11"><Link href="/dashboard/students/id-cards"><IdCard className="size-4" /> ID Generator</Link></Button>
          <Button className="gap-2 bg-primary rounded-xl h-11 shadow-lg shadow-primary/20" onClick={() => setIsEnrollOpen(true)}><UserPlus className="size-4" /> Enroll Student</Button>
        </div>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
        <CardHeader className="border-b pb-6 bg-white">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, ID or Admission #..." className="pl-9 h-12 bg-slate-50 border-none rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold py-4">ADMISSION # / NAME</TableHead>
                <TableHead className="font-bold py-4">GRADE / GENDER</TableHead>
                <TableHead className="font-bold py-4">GUARDIAN / PHONE</TableHead>
                <TableHead className="font-bold py-4">STATUS</TableHead>
                <TableHead className="text-right font-bold py-4">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((stu: any) => (
                <TableRow key={stu.id} className="hover:bg-slate-50/80 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl overflow-hidden bg-muted flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                        {stu.photoUrl ? <img src={stu.photoUrl} alt="" className="w-full h-full object-cover" /> : <User className="size-6 text-muted-foreground/30" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-tighter">{stu.admissionNumber}</span>
                        <span className="font-bold text-primary text-base">{stu.firstName} {stu.lastName}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-slate-700">{stu.gradeLevel}</span>
                      <Badge variant="secondary" className="w-fit text-[9px] uppercase font-bold bg-primary/5 text-primary border-none">{stu.gender}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-700">{stu.parentName || stu.guardianName || "N/A"}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="size-2.5" /> {stu.parentPhone || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge className="text-[9px] uppercase font-bold bg-green-50 text-green-600 border-green-200">{stu.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-primary rounded-xl" asChild><Link href="/dashboard/exams"><FileText className="size-4" /></Link></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => {
                        setEditingStudent(stu);
                        setStudentForm({...stu});
                        setIsEditOpen(true);
                      }}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db!, "students", stu.id))} className="h-9 w-9 text-destructive rounded-xl hover:bg-destructive/10"><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 && !dataLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                    No student records found matching your query.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEnrollOpen} onOpenChange={(val) => { if (!val) stopCamera(); setIsEnrollOpen(val); }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <form onSubmit={handleEnroll}>
            <DialogHeader className="bg-primary text-primary-foreground p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">New Enrollment Protocol</span>
              </div>
              <DialogTitle className="text-3xl font-headline font-bold">Enterprise SIS Entry</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Building a permanent academic record for {institution?.name}.</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="identity" className="w-full">
              <div className="bg-muted/30 px-8 py-2 border-b">
                <TabsList className="bg-transparent gap-6 p-0 h-10">
                  <TabsTrigger value="identity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><User className="size-3.5" /> Identity</TabsTrigger>
                  <TabsTrigger value="family" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><Home className="size-3.5" /> Family & Home</TabsTrigger>
                  <TabsTrigger value="health" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><HeartPulse className="size-3.5" /> Health & Logistics</TabsTrigger>
                  <TabsTrigger value="academic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><GraduationCap className="size-3.5" /> Academic</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="max-h-[60vh]">
                <div className="p-8">
                  <TabsContent value="identity" className="mt-0 space-y-8">
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative group">
                        <div className="size-32 rounded-3xl bg-slate-100 overflow-hidden flex items-center justify-center border-4 border-white shadow-xl">
                          {studentForm.photoUrl ? <img src={studentForm.photoUrl} className="w-full h-full object-cover" /> : isCameraActive ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" /> : <User className="size-12 text-muted-foreground/20" />}
                        </div>
                        <div className="absolute -bottom-2 -right-2 flex gap-1">
                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                          <Button type="button" variant="secondary" size="icon" className="size-9 rounded-xl shadow-lg" onClick={() => fileInputRef.current?.click()}><Upload className="size-4" /></Button>
                          <Button type="button" variant={isCameraActive ? "destructive" : "secondary"} size="icon" className="size-9 rounded-xl shadow-lg" onClick={isCameraActive ? stopCamera : startCamera}><Camera className="size-4" /></Button>
                        </div>
                      </div>
                      {isCameraActive && <Button type="button" size="sm" onClick={capturePhoto} className="bg-green-600 rounded-full h-9 px-6 gap-2"><Check className="size-4" /> Snap Photo</Button>}
                    </div>

                    <div className="grid gap-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">First Name</Label>
                          <Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Middle Name</Label>
                          <Input value={studentForm.middleName} onChange={e => setStudentForm({...studentForm, middleName: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Surname</Label>
                          <Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Admission Number</Label>
                          <Input readOnly value={studentForm.admissionNumber} className="h-11 rounded-xl bg-slate-50 font-bold text-accent" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gender</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, gender: v})} value={studentForm.gender}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</Label>
                          <Input type="date" required value={studentForm.dateOfBirth} onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nationality</Label>
                          <Input value={studentForm.nationality} onChange={e => setStudentForm({...studentForm, nationality: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Religion</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, religion: v})} value={studentForm.religion}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{RELIGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="family" className="mt-0 space-y-6">
                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parent/Guardian Name</Label>
                          <Input required value={studentForm.parentName} onChange={e => setStudentForm({...studentForm, parentName: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Primary Contact Phone</Label>
                          <Input required value={studentForm.parentPhone} onChange={e => setStudentForm({...studentForm, parentPhone: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Residential Address</Label>
                        <Input value={studentForm.residentialAddress} onChange={e => setStudentForm({...studentForm, residentialAddress: e.target.value})} className="h-11 rounded-xl" placeholder="Full residential description" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GPS Address (Digital)</Label>
                          <Input value={studentForm.gpsAddress} onChange={e => setStudentForm({...studentForm, gpsAddress: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. GA-123-4567" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Emergency Alt. Contact</Label>
                          <Input value={studentForm.emergencyContact} onChange={e => setStudentForm({...studentForm, emergencyContact: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="health" className="mt-0 space-y-6">
                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Blood Group</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, bloodGroup: v})} value={studentForm.bloodGroup}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">NHIS Number</Label>
                          <Input value={studentForm.nhisNumber} onChange={e => setStudentForm({...studentForm, nhisNumber: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned House</Label>
                          <Input value={studentForm.house} onChange={e => setStudentForm({...studentForm, house: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Red House" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hostel / Dormitory</Label>
                          <Input value={studentForm.hostel} onChange={e => setStudentForm({...studentForm, hostel: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Medical History / Allergies</Label>
                        <Input value={studentForm.medicalHistory} onChange={e => setStudentForm({...studentForm, medicalHistory: e.target.value})} className="h-11 rounded-xl" placeholder="List any chronic conditions or allergies" />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="academic" className="mt-0 space-y-6">
                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Enrollment Grade</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})} value={studentForm.gradeLevel}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{availableGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Admission Date</Label>
                          <Input type="date" value={studentForm.admissionDate} onChange={e => setStudentForm({...studentForm, admissionDate: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Previous Institution</Label>
                        <Input value={studentForm.previousSchool} onChange={e => setStudentForm({...studentForm, previousSchool: e.target.value})} className="h-11 rounded-xl" placeholder="School name and location" />
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="bg-slate-50 p-8 border-t">
              <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20 transition-all active:scale-95">
                {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : <ShieldCheck className="mr-2 size-5" />}
                Authorize Enrollment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog remains similar but sectioned or simplified as needed */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl rounded-3xl"><form onSubmit={handleUpdate}>
          <DialogHeader><DialogTitle className="text-2xl font-headline font-bold">Edit Student Record</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6 px-1 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="rounded-xl h-11" /></div>
              <div className="space-y-2"><Label>Surname</Label><Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="rounded-xl h-11" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Grade</Label>
                <Select onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})} value={studentForm.gradeLevel}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{availableGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Guardian Phone</Label><Input required value={studentForm.parentPhone} onChange={e => setStudentForm({...studentForm, parentPhone: e.target.value})} className="rounded-xl h-11" /></div>
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={loading} className="w-full h-12 font-bold rounded-xl bg-primary shadow-lg shadow-primary/10">Authorize Update</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>
    </div>
  )
}
