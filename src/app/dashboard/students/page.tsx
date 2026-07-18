
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, UserPlus, GraduationCap, Trash2, Pencil, Loader2, Upload, IdCard, User, Camera, X, Check, FileText, Phone, MapPin, ShieldCheck, HeartPulse, Bus, Home, FileSpreadsheet, ArrowUpRight, ChevronRight, AlertTriangle, BookOpen, UserCheck, Stethoscope } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc, useUser } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import Papa from "papaparse"

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const RELIGIONS = ["Christianity", "Islam", "Traditional", "Hinduism", "Other", "None"]

export default function StudentsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isPromoteOpen, setIsPromoteOpen] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [targetGrade, setTargetGrade] = useState("")
  
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [studentForm, setStudentForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "Male",
    dateOfBirth: "",
    bloodGroup: "O+",
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
    parentId: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    photoUrl: ""
  })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
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
        s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(students.map(s => s.id)))
    }
  }

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

  if (dataLoading) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground">Synchronizing Registry...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Student Directory</h1>
          <p className="text-muted-foreground">Managing {students.length} enrollment records.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedIds.size > 0 && (
            <Button variant="outline" className="h-11 rounded-xl shadow-sm gap-2" onClick={() => setIsPromoteOpen(true)}>
              <ArrowUpRight className="size-4" /> Promote ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsImportOpen(true)} className="rounded-xl h-11 border-primary/20">
            <FileSpreadsheet className="size-4 mr-2" /> Bulk Import
          </Button>
          <Button className="gap-2 bg-primary rounded-xl h-11 shadow-lg" onClick={() => setIsEnrollOpen(true)}>
            <UserPlus className="size-4" /> Enroll Student
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-2xl bg-white">
        <CardHeader className="border-b pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search admission # or name..." className="pl-9 h-12 bg-slate-50 border-none rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex gap-2">
             <Badge variant="outline" className="h-10 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-slate-50">
               {students.length} Total
             </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox checked={selectedIds.size === students.length && students.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="py-4 font-bold">STUDENT INFO</TableHead>
                  <TableHead className="font-bold py-4">ACADEMIC</TableHead>
                  <TableHead className="font-bold py-4">GUARDIAN</TableHead>
                  <TableHead className="font-bold py-4 text-center">STATUS</TableHead>
                  <TableHead className="text-right font-bold py-4 pr-6">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((stu: any) => (
                  <TableRow key={stu.id} className="hover:bg-slate-50/80 transition-colors group">
                    <TableCell className="text-center">
                      <Checkbox checked={selectedIds.has(stu.id)} onCheckedChange={() => toggleSelect(stu.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl overflow-hidden bg-muted flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                          {stu.photoUrl ? <img src={stu.photoUrl} alt="" className="w-full h-full object-cover" /> : <User className="size-6 text-muted-foreground/30" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] font-bold text-accent uppercase">{stu.admissionNumber}</span>
                          <span className="font-bold text-primary text-base">{stu.firstName} {stu.lastName}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-slate-700">{stu.gradeLevel}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">{stu.house || "No House"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-700">{stu.parentName || "N/A"}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="size-2.5" /> {stu.parentPhone || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[9px] uppercase font-bold border-none ${stu.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {stu.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                {students.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-24 text-muted-foreground italic">No student records found in current institutional partition.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEnrollOpen || isEditOpen} onOpenChange={(val) => { 
        if (!val) { stopCamera(); setIsEnrollOpen(false); setIsEditOpen(false); setEditingStudent(null); }
      }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={isEditOpen ? handleUpdate : handleEnroll} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><ShieldCheck className="size-5" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{isEditOpen ? "Update Protocol" : "Enrollment Protocol"}</span>
              </div>
              <DialogTitle className="text-3xl font-headline font-bold">{isEditOpen ? "Modify Registry" : "Enterprise SIS Entry"}</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Building a permanent academic record for institutional governance.</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="identity" className="w-full flex-1 flex flex-col overflow-hidden">
              <div className="bg-muted/30 px-8 py-2 border-b shrink-0">
                <TabsList className="bg-transparent gap-6 p-0 h-10">
                  <TabsTrigger value="identity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><User className="size-3.5" /> Identity</TabsTrigger>
                  <TabsTrigger value="academic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><BookOpen className="size-3.5" /> Academic</TabsTrigger>
                  <TabsTrigger value="family" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><UserCheck className="size-3.5" /> Family</TabsTrigger>
                  <TabsTrigger value="medical" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><Stethoscope className="size-3.5" /> Medical</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-8 space-y-8">
                  <TabsContent value="identity" className="mt-0 space-y-8">
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative group">
                        <div className="size-32 rounded-3xl bg-slate-100 overflow-hidden flex items-center justify-center border-4 border-white shadow-xl">
                          {studentForm.photoUrl ? <img src={studentForm.photoUrl} className="w-full h-full object-cover" /> : isCameraActive ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" /> : <User className="size-12 text-muted-foreground/20" />}
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
                          <Button type="button" variant="secondary" size="icon" className="size-9 rounded-xl shadow-lg" onClick={() => fileInputRef.current?.click()}><Upload className="size-4" /></Button>
                          <Button type="button" variant={isCameraActive ? "destructive" : "secondary"} size="icon" className="size-9 rounded-xl shadow-lg" onClick={isCameraActive ? capturePhoto : startCamera}><Camera className="size-4" /></Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>First Name</Label><Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
                        <div className="space-y-2"><Label>Middle Name</Label><Input value={studentForm.middleName} onChange={e => setStudentForm({...studentForm, middleName: e.target.value})} className="h-11 rounded-xl" /></div>
                        <div className="space-y-2"><Label>Last Name</Label><Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={studentForm.dateOfBirth} onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" /></div>
                        <div className="space-y-2"><Label>Gender</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, gender: v})} value={studentForm.gender}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Nationality</Label><Input value={studentForm.nationality} onChange={e => setStudentForm({...studentForm, nationality: e.target.value})} className="h-11 rounded-xl" /></div>
                        <div className="space-y-2"><Label>Religion</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, religion: v})} value={studentForm.religion}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{RELIGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="academic" className="mt-0 space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>Admission #</Label><Input readOnly value={studentForm.admissionNumber} className="h-11 rounded-xl bg-slate-50 font-bold text-accent" /></div>
                        <div className="space-y-2"><Label>Index / Student ID</Label><Input value={studentForm.indexNumber} onChange={e => setStudentForm({...studentForm, indexNumber: e.target.value})} className="h-11 rounded-xl" /></div>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>Academic Year</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, academicYearId: v})} value={studentForm.academicYearId}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Year" /></SelectTrigger>
                            <SelectContent>{academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Grade Level / Class</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})} value={studentForm.gradeLevel}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                            <SelectContent>{registeredClasses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>House / Residence</Label><Input value={studentForm.house} onChange={e => setStudentForm({...studentForm, house: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Aggrey House" /></div>
                        <div className="space-y-2"><Label>Admission Date</Label><Input type="date" value={studentForm.admissionDate} onChange={e => setStudentForm({...studentForm, admissionDate: e.target.value})} className="h-11 rounded-xl" /></div>
                     </div>
                  </TabsContent>

                  <TabsContent value="family" className="mt-0 space-y-6">
                     <div className="space-y-2"><Label>Guardian Name</Label><Input required value={studentForm.parentName} onChange={e => setStudentForm({...studentForm, parentName: e.target.value})} className="h-11 rounded-xl" /></div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>Phone Number</Label><Input required value={studentForm.parentPhone} onChange={e => setStudentForm({...studentForm, parentPhone: e.target.value})} className="h-11 rounded-xl" /></div>
                        <div className="space-y-2"><Label>Email Address</Label><Input type="email" value={studentForm.parentEmail} onChange={e => setStudentForm({...studentForm, parentEmail: e.target.value})} className="h-11 rounded-xl" /></div>
                     </div>
                  </TabsContent>

                  <TabsContent value="medical" className="mt-0 space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><Label>Blood Group</Label>
                          <Select onValueChange={v => setStudentForm({...studentForm, bloodGroup: v})} value={studentForm.bloodGroup}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Status</Label>
                           <Select onValueChange={v => setStudentForm({...studentForm, status: v})} value={studentForm.status}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="alumni">Alumni</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                     </div>
                  </TabsContent>
                </div>
              </ScrollArea>

              <DialogFooter className="bg-slate-50 p-8 border-t shrink-0">
                <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold rounded-2xl bg-primary shadow-xl">
                  {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : <ShieldCheck className="mr-2 size-5" />}
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
