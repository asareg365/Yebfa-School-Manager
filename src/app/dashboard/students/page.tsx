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
      .sort((a, b) => {
        const idA = a.studentId || "";
        const idB = b.studentId || "";
        return idB.localeCompare(idA);
      });
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
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ variant: "destructive", title: "Incompatible Browser", description: "Your browser does not support camera access." })
      return
    }

    setIsCameraActive(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 }
        } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
        }
      }
    } catch (err: any) {
      console.error("Camera error:", err)
      toast({ 
        variant: "destructive", 
        title: "Camera Access Denied", 
        description: "Please check your browser permissions and ensure no other app is using the camera." 
      })
      setIsCameraActive(false)
    }
  }

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = 400
      canvas.height = 400
      
      const size = Math.min(video.videoWidth, video.videoHeight)
      const x = (video.videoWidth - size) / 2
      const y = (video.videoHeight - size) / 2
      
      context?.drawImage(video, x, y, size, size, 0, 0, 400, 400)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      setStudentForm(prev => ({ ...prev, photoUrl: dataUrl }))
      stopCamera()
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
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
      toast({
        title: "Student Enrolled",
        description: `${studentForm.firstName} enrolled successfully.`,
      })
      setIsEnrollOpen(false)
      stopCamera()
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
      await updateDoc(doc(db, "students", editingStudent.id), studentForm)
      toast({ title: "Record Updated", description: "Student details synchronized." })
      setIsEditOpen(false)
      stopCamera()
      setEditingStudent(null)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
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

  if (dataLoading) return (
    <div className="p-24 text-center space-y-4">
      <Loader2 className="size-10 animate-spin text-primary mx-auto" />
      <p className="font-bold text-muted-foreground uppercase tracking-widest">Synchronizing Records...</p>
    </div>
  )

  if (!institutionId) return (
    <div className="p-12 text-center space-y-4">
      <h2 className="text-xl font-bold">No Institution Selected</h2>
      <p className="text-muted-foreground">Select a school in the Admin Hub to continue.</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Student Directory</h1>
          <p className="text-muted-foreground">Managing {students.length} enrollment records.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 h-11 transition-all active:scale-95" asChild>
             <Link href="/dashboard/students/id-cards"><IdCard className="size-4" /> ID Card Generator</Link>
          </Button>
          <Button className="gap-2 bg-primary h-11 shadow-lg shadow-primary/10 transition-all active:scale-95" onClick={() => setIsEnrollOpen(true)}>
            <UserPlus className="size-4" /> Enroll Student
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden rounded-2xl">
        <CardHeader className="border-b pb-6 bg-white">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search records..." 
              className="pl-9 h-11 bg-slate-50 border-none transition-all focus:bg-white" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="p-24 text-center space-y-4">
              <GraduationCap className="size-16 text-primary opacity-10 mx-auto" />
              <p className="font-bold text-muted-foreground">Empty Directory</p>
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
                  <TableRow key={stu.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full overflow-hidden bg-muted flex items-center justify-center border shrink-0">
                          {stu.photoUrl ? (
                            <img src={stu.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="size-5 text-muted-foreground" />
                          )}
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
                        <Badge variant="outline" className="w-fit text-[9px] uppercase font-bold tracking-tight">{stu.gender}</Badge>
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
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" asChild>
                           <Link href="/dashboard/exams"><FileText className="size-3.5" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingStudent(stu);
                          setStudentForm({
                            firstName: stu.firstName || "",
                            lastName: stu.lastName || "",
                            gender: stu.gender || "Male",
                            gradeLevel: stu.gradeLevel || availableGrades[0],
                            studentId: stu.studentId || "",
                            dateOfBirth: stu.dateOfBirth || "",
                            parentName: stu.parentName || "",
                            parentPhone: stu.parentPhone || "",
                            homeAddress: stu.homeAddress || "",
                            photoUrl: stu.photoUrl || ""
                          });
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

      <Dialog open={isEnrollOpen} onOpenChange={(val) => {
        if (!val) stopCamera()
        setIsEnrollOpen(val)
      }}>
        <DialogContent className="max-w-2xl border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
          <form onSubmit={handleEnroll}>
            <DialogHeader className="bg-primary text-primary-foreground p-8">
              <DialogTitle className="text-2xl">Enroll New Student</DialogTitle>
              <DialogDescription className="text-primary-foreground/70 text-sm">Capturing record for {institution?.name}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-8 py-8 px-8 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-col items-center gap-6 p-6 border-2 border-dashed rounded-3xl bg-muted/20">
                <div className="relative size-40 rounded-3xl overflow-hidden bg-background border-4 border-white shadow-xl group">
                  {studentForm.photoUrl ? (
                    <img src={studentForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : isCameraActive ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover scale-x-[-1]" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <User className="size-16 text-slate-200" />
                    </div>
                  )}
                  {studentForm.photoUrl && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 size-7 rounded-full"
                      onClick={() => setStudentForm(prev => ({ ...prev, photoUrl: "" }))}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="flex gap-3">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                  <Button type="button" variant="outline" size="sm" className="gap-2 h-10 px-4 rounded-xl" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="size-4" /> Device Upload
                  </Button>
                  
                  {!isCameraActive ? (
                    <Button type="button" variant="outline" size="sm" className="gap-2 h-10 px-4 rounded-xl" onClick={startCamera}>
                      <Camera className="size-4" /> Use Camera
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button type="button" variant="default" size="sm" onClick={capturePhoto} className="bg-green-600 hover:bg-green-700 h-10 px-6 rounded-xl">
                        <Check className="size-4 mr-2" /> Capture
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={stopCamera} className="h-10 px-4 rounded-xl">
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">First Name</Label>
                  <Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Last Name</Label>
                  <Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gender</Label>
                  <Select onValueChange={v => setStudentForm({...studentForm, gender: v})} value={studentForm.gender}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Date of Birth</Label>
                  <Input type="date" value={studentForm.dateOfBirth} onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Grade Level</Label>
                  <Select onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})} value={studentForm.gradeLevel}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableGrades.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Student ID</Label>
                  <Input required readOnly value={studentForm.studentId} className="bg-slate-50 font-mono font-bold h-11 rounded-xl border-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Guardian Name</Label>
                  <Input required value={studentForm.parentName} onChange={e => setStudentForm({...studentForm, parentName: e.target.value})} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Guardian Phone</Label>
                  <Input required value={studentForm.parentPhone} onChange={e => setStudentForm({...studentForm, parentPhone: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Home Address</Label>
                <Input value={studentForm.homeAddress} onChange={e => setStudentForm({...studentForm, homeAddress: e.target.value})} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="p-8 border-t bg-slate-50 flex justify-end">
              <Button type="submit" disabled={loading} className="h-12 px-10 gap-2 bg-primary font-bold rounded-xl shadow-lg transition-all active:scale-95">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Complete Enrollment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={(val) => {
        if (!val) {
          stopCamera()
          setEditingStudent(null)
        }
        setIsEditOpen(val)
      }}>
        <DialogContent className="max-w-2xl border-none shadow-2xl rounded-2xl p-0 overflow-hidden">
          <form onSubmit={handleUpdate}>
            <DialogHeader className="bg-accent text-accent-foreground p-8">
              <DialogTitle className="text-2xl">Edit Student Record</DialogTitle>
              <DialogDescription className="text-accent-foreground/70">Updating records for {studentForm.firstName}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-8 px-8 max-h-[70vh] overflow-y-auto">
               <div className="flex flex-col items-center gap-6 p-6 border-2 border-dashed rounded-3xl bg-muted/20">
                <div className="relative size-36 rounded-3xl overflow-hidden bg-background border shadow-sm group">
                  {studentForm.photoUrl ? (
                    <img src={studentForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : isCameraActive ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <User className="size-14 text-slate-200" />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                  <Button type="button" variant="outline" size="sm" className="rounded-xl h-10 px-4" onClick={() => fileInputRef.current?.click()}>
                    Update Photo
                  </Button>
                  {!isCameraActive ? (
                    <Button type="button" variant="outline" size="sm" className="rounded-xl h-10 px-4" onClick={startCamera}>
                      Snap Photo
                    </Button>
                  ) : (
                    <Button type="button" variant="default" size="sm" onClick={capturePhoto} className="bg-green-600 rounded-xl h-10 px-6">
                      Capture
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">First Name</Label>
                  <Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Last Name</Label>
                  <Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Gender</Label>
                  <Select onValueChange={v => setStudentForm({...studentForm, gender: v})} value={studentForm.gender}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Date of Birth</Label>
                  <Input type="date" value={studentForm.dateOfBirth} onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Grade Level</Label>
                  <Select onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})} value={studentForm.gradeLevel}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableGrades.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Guardian Name</Label>
                  <Input required value={studentForm.parentName} onChange={e => setStudentForm({...studentForm, parentName: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Guardian Phone</Label>
                  <Input required value={studentForm.parentPhone} onChange={e => setStudentForm({...studentForm, parentPhone: e.target.value})} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Home Address</Label>
                  <Input value={studentForm.homeAddress} onChange={e => setStudentForm({...studentForm, homeAddress: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="p-8 border-t bg-slate-50 flex justify-end">
              <Button type="submit" disabled={loading} className="h-12 px-10 font-bold rounded-xl bg-primary shadow-lg transition-all active:scale-95">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Authorize Profile Update"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
