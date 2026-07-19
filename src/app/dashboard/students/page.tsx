
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  UserPlus, 
  Trash2, 
  Pencil, 
  Loader2, 
  Upload, 
  User, 
  Camera, 
  ShieldCheck, 
  BookOpen, 
  UserCheck, 
  Stethoscope, 
  MapPin, 
  Phone, 
  IdCard,
  History
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc, useUser } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const RELIGIONS = ["Christianity", "Islam", "Traditional", "Hinduism", "Other", "None"]

export default function StudentsPage() {
  const db = useFirestore()
  const { user } = useUser()
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

  const initialForm = {
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "Male",
    dateOfBirth: "",
    nationality: "Ghanaian",
    religion: "",
    admissionNumber: "",
    indexNumber: "",
    gradeLevel: "",
    currentClassId: "",
    sectionId: "",
    academicYearId: "",
    house: "",
    status: "active",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    photoUrl: "",
    address: {
      digitalAddress: "",
      town: "",
      district: "",
      region: "",
      country: "Ghana"
    },
    emergencyContact: {
      name: "",
      relationship: "",
      phone: ""
    },
    medical: {
      bloodGroup: "O+",
      allergies: "",
      specialNeeds: "",
      disability: "",
      doctor: ""
    },
    previousSchool: {
      name: "",
      classCompleted: "",
      reason: ""
    }
  }

  const [studentForm, setStudentForm] = useState(initialForm)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db!, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const classesQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "classes"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "students"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const yearsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "academic_years"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const { data: registeredClasses = [] } = useCollection(classesQuery)
  const { data: rawStudentsData = [], loading: dataLoading } = useCollection(studentsQuery)
  const { data: academicYears = [] } = useCollection(yearsQuery)

  const students = useMemo(() => {
    return [...rawStudentsData]
      .filter(s => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => (b.admissionNumber || "").localeCompare(a.admissionNumber || ""));
  }, [rawStudentsData, searchQuery]);

  useEffect(() => {
    if (isEnrollOpen && !studentForm.admissionNumber) {
      const year = new Date().getFullYear();
      const count = rawStudentsData.length + 1;
      const prefix = institution?.name?.substring(0, 3).toUpperCase() || "SIS";
      const autoAdm = `${prefix}-${year}-${String(count).padStart(4, '0')}`;
      
      setStudentForm(prev => ({ 
        ...prev, 
        admissionNumber: autoAdm,
        academicYearId: academicYears.find(y => y.status === 'Active')?.id || "",
        gradeLevel: registeredClasses[0]?.name || ""
      }));
    }
  }, [isEnrollOpen, rawStudentsData.length, registeredClasses, institution, academicYears]);

  const startCamera = async () => {
    setIsCameraActive(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Failed" })
      setIsCameraActive(false)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      canvas.width = 400
      canvas.height = 400
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, 400, 400)
      setStudentForm(prev => ({ ...prev, photoUrl: canvas.toDataURL('image/jpeg') }))
      stopCamera()
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    
    const data = {
      ...studentForm,
      tenantId: institutionId,
      institutionId: institutionId,
      createdBy: user?.uid || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    try {
      await addDoc(collection(db, "students"), data)
      toast({ title: "Student Enrolled", description: `${studentForm.firstName} joined the registry.` })
      setIsEnrollOpen(false)
      setStudentForm(initialForm)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !editingStudent || !institutionId || loading) return
    setLoading(true)
    try {
      const { id, ...updateData } = studentForm as any;
      await updateDoc(doc(db, "students", editingStudent.id), {
        ...updateData,
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

  const updateAddress = (field: string, value: string) => {
    setStudentForm(prev => ({ ...prev, address: { ...prev.address, [field]: value } }))
  }

  const updateMedical = (field: string, value: string) => {
    setStudentForm(prev => ({ ...prev, medical: { ...prev.medical, [field]: value } }))
  }

  const updateEmergency = (field: string, value: string) => {
    setStudentForm(prev => ({ ...prev, emergencyContact: { ...prev.emergencyContact, [field]: value } }))
  }

  const updatePrevious = (field: string, value: string) => {
    setStudentForm(prev => ({ ...prev, previousSchool: { ...prev.previousSchool, [field]: value } }))
  }

  if (dataLoading) return (
    <div className="p-10 md:p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse text-sm">Synchronizing Registry...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-primary tracking-tight">Student Directory</h1>
          <p className="text-muted-foreground text-sm">Managing {students.length} enrollment records.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="flex-1 md:flex-none rounded-xl h-11 border-primary/20" asChild>
            <Link href="/dashboard/students/id-cards"><IdCard className="size-4 mr-2" /> ID Cards</Link>
          </Button>
          <Button className="flex-1 md:flex-none gap-2 bg-primary rounded-xl h-11 shadow-lg" onClick={() => { setStudentForm(initialForm); setIsEnrollOpen(true); }}>
            <UserPlus className="size-4" /> Enroll Student
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-2xl bg-white">
        <CardHeader className="border-b pb-6 p-4 md:p-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search admission # or name..." className="pl-9 h-11 bg-slate-50 border-none rounded-xl text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4 md:px-6">STUDENT INFO</TableHead>
                  <TableHead className="font-bold py-4 whitespace-nowrap px-4">ACADEMIC</TableHead>
                  <TableHead className="font-bold py-4 whitespace-nowrap px-4">GUARDIAN</TableHead>
                  <TableHead className="font-bold py-4 whitespace-nowrap px-4">STATUS</TableHead>
                  <TableHead className="text-right font-bold py-4 pr-6 whitespace-nowrap">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((stu: any) => (
                  <TableRow key={stu.id} className="hover:bg-slate-50/80 transition-colors group">
                    <TableCell className="px-4 md:px-6">
                      <div className="flex items-center gap-3 md:gap-4 min-w-[200px]">
                        <div className="size-10 md:size-12 rounded-xl md:rounded-2xl overflow-hidden bg-muted flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                          {stu.photoUrl ? <img src={stu.photoUrl} alt="" className="w-full h-full object-cover" /> : <User className="size-5 md:size-6 text-muted-foreground/30" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-[9px] md:text-[10px] font-bold text-accent uppercase tracking-tighter truncate">{stu.admissionNumber}</span>
                          <span className="font-bold text-primary text-xs md:text-sm truncate">{stu.firstName} {stu.lastName}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col gap-0.5 min-w-[120px]">
                        <span className="text-xs md:text-sm font-bold text-slate-700">{stu.gradeLevel}</span>
                        <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold">{stu.house || "No House"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col gap-0.5 min-w-[140px]">
                        <span className="text-[11px] md:text-xs font-bold text-slate-700 truncate">{stu.parentName || "N/A"}</span>
                        <span className="text-[9px] md:text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="size-2.5" /> {stu.parentPhone || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <Badge className={`text-[9px] uppercase font-bold border-none whitespace-nowrap h-5 px-2 ${stu.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {stu.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4 md:pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9 rounded-xl" onClick={() => {
                          setEditingStudent(stu);
                          setStudentForm({...initialForm, ...stu});
                          setIsEditOpen(true);
                        }}><Pencil className="size-3.5 md:size-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db!, "students", stu.id))} className="h-8 w-8 md:h-9 md:w-9 text-destructive rounded-xl hover:bg-destructive/10"><Trash2 className="size-3.5 md:size-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic text-sm">No student records found in your registry.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEnrollOpen || isEditOpen} onOpenChange={(val) => { 
        if (!val) { stopCamera(); setIsEnrollOpen(false); setIsEditOpen(false); setEditingStudent(null); }
      }}>
        <DialogContent className="w-[95vw] md:max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl md:rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={isEditOpen ? handleUpdate : handleEnroll} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="bg-primary text-primary-foreground p-5 md:p-8 shrink-0">
              <div className="flex items-center gap-3 mb-1 md:mb-2">
                <div className="size-6 md:size-8 rounded-lg md:rounded-xl bg-white/10 flex items-center justify-center shrink-0"><ShieldCheck className="size-4 md:size-5" /></div>
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-70">Institutional Enrollment</span>
              </div>
              <DialogTitle className="text-xl md:text-3xl font-headline font-bold">{isEditOpen ? "Modify Registry" : "New Student Entry"}</DialogTitle>
              <DialogDescription className="text-primary-foreground/70 text-xs md:text-sm">Comprehensive record building for the 2026 academic cycle.</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="identity" className="w-full flex-1 flex flex-col overflow-hidden">
              <div className="bg-muted/30 px-4 md:px-8 py-1 border-b shrink-0">
                <TabsList className="bg-transparent gap-4 md:gap-6 p-0 h-10 overflow-x-auto no-scrollbar justify-start">
                  <TabsTrigger value="identity" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-[10px] md:text-xs font-bold uppercase whitespace-nowrap"><User className="size-3.5" /> Identity</TabsTrigger>
                  <TabsTrigger value="academic" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-[10px] md:text-xs font-bold uppercase whitespace-nowrap"><BookOpen className="size-3.5" /> Academic</TabsTrigger>
                  <TabsTrigger value="family" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-[10px] md:text-xs font-bold uppercase whitespace-nowrap"><UserCheck className="size-3.5" /> Family</TabsTrigger>
                  <TabsTrigger value="medical" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-[10px] md:text-xs font-bold uppercase whitespace-nowrap"><Stethoscope className="size-3.5" /> Health</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-5 md:p-8">
                  <TabsContent value="identity" className="mt-0 space-y-6 md:space-y-8">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group">
                        <div className="size-24 md:size-32 rounded-2xl md:rounded-3xl bg-slate-100 overflow-hidden flex items-center justify-center border-4 border-white shadow-xl">
                          {studentForm.photoUrl ? <img src={studentForm.photoUrl} className="w-full h-full object-cover" /> : isCameraActive ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /> : <User className="size-10 md:size-12 text-muted-foreground/20" />}
                        </div>
                        <div className="absolute -bottom-2 -right-2 flex gap-1">
                          <input type="file" ref={fileInputRef} onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onloadend = () => setStudentForm(prev => ({ ...prev, photoUrl: reader.result as string }))
                              reader.readAsDataURL(file)
                            }
                          }} accept="image/*" className="hidden" />
                          <Button type="button" variant="secondary" size="icon" className="size-8 md:size-9 rounded-lg md:rounded-xl shadow-lg" onClick={() => fileInputRef.current?.click()}><Upload className="size-3.5 md:size-4" /></Button>
                          <Button type="button" variant={isCameraActive ? "destructive" : "secondary"} size="icon" className="size-8 md:size-9 rounded-lg md:rounded-xl shadow-lg" onClick={isCameraActive ? capturePhoto : startCamera}><Camera className="size-3.5 md:size-4" /></Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">First Name</Label><Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Middle Name</Label><Input value={studentForm.middleName} onChange={e => setStudentForm({...studentForm, middleName: e.target.value})} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Last Name</Label><Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Birth Date</Label><Input type="date" value={studentForm.dateOfBirth} onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Gender</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, gender: v})} value={studentForm.gender}>
                            <SelectTrigger className="h-10 md:h-11 rounded-lg md:rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="academic" className="mt-0 space-y-6 md:space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Admission #</Label><Input readOnly value={studentForm.admissionNumber} className="h-10 md:h-11 rounded-lg md:rounded-xl bg-slate-50 font-bold text-accent" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Student ID / Index</Label><Input value={studentForm.indexNumber} onChange={e => setStudentForm({...studentForm, indexNumber: e.target.value})} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                     </div>
                     <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Academic Year</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, academicYearId: v})} value={studentForm.academicYearId}>
                            <SelectTrigger className="h-10 md:h-11 rounded-lg md:rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Grade Level</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})} value={studentForm.gradeLevel}>
                            <SelectTrigger className="h-10 md:h-11 rounded-lg md:rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{registeredClasses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                     </div>
                  </TabsContent>

                  <TabsContent value="family" className="mt-0 space-y-6 md:space-y-8">
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><UserCheck className="size-3.5" /> Guardian Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Full Name</Label><Input required value={studentForm.parentName} onChange={e => setStudentForm({...studentForm, parentName: e.target.value})} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                           <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Phone Number</Label><Input required value={studentForm.parentPhone} onChange={e => setStudentForm({...studentForm, parentPhone: e.target.value})} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                        </div>
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Email Address</Label><Input type="email" value={studentForm.parentEmail} onChange={e => setStudentForm({...studentForm, parentEmail: e.target.value})} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                     </div>

                     <div className="space-y-4 pt-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><MapPin className="size-3.5" /> Residential</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Digital Address</Label><Input value={studentForm.address.digitalAddress} onChange={e => updateAddress('digitalAddress', e.target.value)} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                           <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Town</Label><Input value={studentForm.address.town} onChange={e => updateAddress('town', e.target.value)} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                        </div>
                     </div>
                  </TabsContent>

                  <TabsContent value="medical" className="mt-0 space-y-6 md:space-y-8">
                     <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Blood Group</Label>
                          <Select onValueChange={v => updateMedical('bloodGroup', v)} value={studentForm.medical.bloodGroup}>
                            <SelectTrigger className="h-10 md:h-11 rounded-lg md:rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Family Doctor</Label><Input value={studentForm.medical.doctor} onChange={e => updateMedical('doctor', e.target.value)} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                     </div>
                     <div className="space-y-4">
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Allergies</Label><Input value={studentForm.medical.allergies} onChange={e => updateMedical('allergies', e.target.value)} className="h-10 md:h-11 rounded-lg md:rounded-xl" placeholder="e.g. Peanuts" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Special Needs</Label><Input value={studentForm.medical.specialNeeds} onChange={e => updateMedical('specialNeeds', e.target.value)} className="h-10 md:h-11 rounded-lg md:rounded-xl" /></div>
                     </div>
                  </TabsContent>
                </div>
              </ScrollArea>

              <DialogFooter className="bg-slate-50 p-5 md:p-8 border-t shrink-0">
                <Button type="submit" disabled={loading} className="w-full h-12 md:h-14 text-sm md:text-lg font-bold rounded-xl md:rounded-2xl bg-primary shadow-xl transition-all active:scale-[0.98]">
                  {loading ? <Loader2 className="mr-2 size-4 md:size-5 animate-spin" /> : <ShieldCheck className="mr-2 size-4 md:size-5" />}
                  {isEditOpen ? "Authorize Registry Update" : "Authorize Enrollment"}
                </Button>
              </DialogFooter>
            </Tabs>
          </form>
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
