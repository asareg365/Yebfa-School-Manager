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
  User, 
  ShieldCheck, 
  GraduationCap,
  IdCard,
  Stethoscope,
  MapPin,
  RefreshCw,
  ClipboardList,
  Save,
  Home,
  AlertCircle,
  School
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"

export default function StudentsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const initialForm = {
    firstName: "",
    lastName: "",
    gender: "Male",
    dateOfBirth: "",
    admissionNumber: "",
    gradeLevel: "",
    status: "active",
    parentId: "",
    house: "",
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
      allergies: "",
      specialNeeds: "",
      disability: "",
      doctor: ""
    },
    previousSchool: {
      name: "",
      classCompleted: "",
      reason: ""
    },
    documents: {
      birthCertificate: "",
      passport: "",
      medicalReport: ""
    }
  }

  const [studentForm, setStudentForm] = useState(initialForm)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const studentsQuery = useMemo(() => institutionId ? query(collection(db, "students"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);
  const parentsQuery = useMemo(() => institutionId ? query(collection(db, "parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);
  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);

  const { data: rawStudents = [], loading: dataLoading } = useCollection(studentsQuery)
  const { data: parents = [] } = useCollection(parentsQuery)
  const { data: registeredClasses = [] } = useCollection(classesQuery)

  const students = useMemo(() => {
    return rawStudents.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (a.admissionNumber || "").localeCompare(b.admissionNumber || ""));
  }, [rawStudents, searchQuery]);

  useEffect(() => {
    if (isEnrollOpen && !studentForm.admissionNumber && !editingStudent) {
      const year = new Date().getFullYear();
      const count = rawStudents.length + 1;
      const autoAdm = `ADM-${year}-${String(count).padStart(5, '0')}`;
      setStudentForm(prev => ({ ...prev, admissionNumber: autoAdm }));
    }
  }, [isEnrollOpen, rawStudents.length, editingStudent]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    
    const dataPayload = {
      ...studentForm,
      tenantId: institutionId,
      institutionId: institutionId,
      updatedAt: serverTimestamp()
    }

    try {
      if (editingStudent) {
        const { id, createdAt, ...sanitizedData } = dataPayload as any;
        await updateDoc(doc(db, "students", editingStudent.id), sanitizedData);
        toast({ title: "Registry Updated", description: `${studentForm.firstName}'s profile has been synchronized.` });
      } else {
        await addDoc(collection(db, "students"), {
          ...dataPayload,
          createdAt: serverTimestamp()
        });
        toast({ title: "Student Enrolled", description: `${studentForm.firstName} is now live in the registry.` });
      }
      setIsEnrollOpen(false);
      setEditingStudent(null);
      setStudentForm(initialForm);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed", description: error.message });
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (stu: any) => {
    setEditingStudent(stu);
    setStudentForm({ ...initialForm, ...stu });
    setIsEnrollOpen(true);
  }

  if (dataLoading) return <div className="p-24 text-center animate-pulse font-headline font-bold text-primary">Syncing Student Registry...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Student Registry</h1>
          <p className="text-muted-foreground">Managing {students.length} multi-tenant enrollment records.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 rounded-xl" asChild><Link href="/dashboard/students/id-cards"><IdCard className="size-4 mr-2" /> ID Cards</Link></Button>
          <Button className="bg-primary rounded-xl h-11 shadow-lg gap-2" onClick={() => { setEditingStudent(null); setStudentForm(initialForm); setIsEnrollOpen(true); }}>
            <UserPlus className="size-4" /> Enroll Student
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b py-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or admission #..." 
              className="pl-10 h-12 bg-slate-50 border-none rounded-xl" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold">ADM # / STUDENT</TableHead>
                <TableHead className="py-4 font-bold">GRADE</TableHead>
                <TableHead className="py-4 font-bold">PARENT</TableHead>
                <TableHead className="py-4 font-bold">STATUS</TableHead>
                <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((stu: any) => {
                const parent = parents.find(p => p.id === stu.parentId);
                return (
                  <TableRow key={stu.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setSelectedStudent(stu); setIsProfileOpen(true); }}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center overflow-hidden border">
                          {stu.photoUrl ? <img src={stu.photoUrl} className="w-full h-full object-cover" /> : <User className="size-5 text-primary/20" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono font-bold text-accent">{stu.admissionNumber}</span>
                          <span className="font-bold text-primary">{stu.firstName} {stu.lastName}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm font-bold text-slate-700">{stu.gradeLevel}</span></TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="font-bold">{parent?.guardianName || "N/A"}</span>
                        <span className="text-muted-foreground">{parent?.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold text-green-600 bg-green-50">{stu.status}</Badge></TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEdit(stu)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(db!, "students", stu.id))}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {students.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No student records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleEnroll} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0">
              <DialogTitle className="text-2xl font-headline font-bold">{editingStudent ? "Update Registry Profile" : "Authorized Enrollment"}</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Building a comprehensive institutional record.</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="identity" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="bg-muted/30 px-8 py-2 border-b shrink-0 overflow-x-auto no-scrollbar justify-start gap-2">
                <TabsTrigger value="identity">Identity</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="family">Family & Address</TabsTrigger>
                <TabsTrigger value="health">Health & Emergency</TabsTrigger>
                <TabsTrigger value="history">Academic History</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-8">
                <TabsContent value="identity" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>First Name</Label><Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Last Name</Label><Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Gender</Label>
                      <Select value={studentForm.gender} onValueChange={v => setStudentForm({...studentForm, gender: v})}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={studentForm.dateOfBirth} onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" /></div>
                  </div>
                </TabsContent>

                <TabsContent value="academic" className="space-y-6 mt-0">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label>Admission #</Label><Input readOnly value={studentForm.admissionNumber} className="h-11 rounded-xl bg-slate-50 font-bold" /></div>
                      <div className="space-y-2"><Label>Grade Level</Label>
                        <Select value={studentForm.gradeLevel} onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{registeredClasses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>House / Dormitory</Label><Input value={studentForm.house} onChange={e => setStudentForm({...studentForm, house: e.target.value})} className="h-11 rounded-xl" /></div>
                   </div>
                </TabsContent>

                <TabsContent value="family" className="space-y-8 mt-0">
                   <div className="space-y-6">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 border-b pb-2"><IdCard className="size-3.5" /> Guardian Link</h4>
                      <div className="space-y-2">
                        <Label>Select Primary Parent / Guardian</Label>
                        <Select value={studentForm.parentId} onValueChange={v => setStudentForm({...studentForm, parentId: v})}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Search Guardian Registry" /></SelectTrigger>
                          <SelectContent>{parents.map(p => <SelectItem key={p.id} value={p.id}>{p.guardianName} ({p.phone})</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 border-b pb-2"><MapPin className="size-3.5" /> Residential Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2"><Label>Digital Address (GPS)</Label><Input value={studentForm.address.digitalAddress} onChange={e => setStudentForm({...studentForm, address: {...studentForm.address, digitalAddress: e.target.value}})} className="h-11 rounded-xl" placeholder="e.g. GA-123-4567" /></div>
                         <div className="space-y-2"><Label>Town / Suburb</Label><Input value={studentForm.address.town} onChange={e => setStudentForm({...studentForm, address: {...studentForm.address, town: e.target.value}})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-2"><Label>District</Label><Input value={studentForm.address.district} onChange={e => setStudentForm({...studentForm, address: {...studentForm.address, district: e.target.value}})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-2"><Label>Region</Label><Input value={studentForm.address.region} onChange={e => setStudentForm({...studentForm, address: {...studentForm.address, region: e.target.value}})} className="h-11 rounded-xl" /></div>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="health" className="space-y-8 mt-0">
                   <div className="space-y-6">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 border-b pb-2"><AlertCircle className="size-3.5" /> Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-2"><Label>Name</Label><Input value={studentForm.emergencyContact.name} onChange={e => setStudentForm({...studentForm, emergencyContact: {...studentForm.emergencyContact, name: e.target.value}})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-2"><Label>Relationship</Label><Input value={studentForm.emergencyContact.relationship} onChange={e => setStudentForm({...studentForm, emergencyContact: {...studentForm.emergencyContact, relationship: e.target.value}})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-2"><Label>Phone</Label><Input value={studentForm.emergencyContact.phone} onChange={e => setStudentForm({...studentForm, emergencyContact: {...studentForm.emergencyContact, phone: e.target.value}})} className="h-11 rounded-xl" /></div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 border-b pb-2"><Stethoscope className="size-3.5" /> Medical Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2"><Label>Allergies</Label><Input value={studentForm.medical.allergies} onChange={e => setStudentForm({...studentForm, medical: {...studentForm.medical, allergies: e.target.value}})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-2"><Label>Special Needs</Label><Input value={studentForm.medical.specialNeeds} onChange={e => setStudentForm({...studentForm, medical: {...studentForm.medical, specialNeeds: e.target.value}})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-2"><Label>Chronic Disability</Label><Input value={studentForm.medical.disability} onChange={e => setStudentForm({...studentForm, medical: {...studentForm.medical, disability: e.target.value}})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-2"><Label>Family Doctor</Label><Input value={studentForm.medical.doctor} onChange={e => setStudentForm({...studentForm, medical: {...studentForm.medical, doctor: e.target.value}})} className="h-11 rounded-xl" /></div>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-6 mt-0">
                   <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 border-b pb-2"><School className="size-3.5" /> Previous Schooling</h4>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2"><Label>School Name</Label><Input value={studentForm.previousSchool.name} onChange={e => setStudentForm({...studentForm, previousSchool: {...studentForm.previousSchool, name: e.target.value}})} className="h-11 rounded-xl" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Class Completed</Label><Input value={studentForm.previousSchool.classCompleted} onChange={e => setStudentForm({...studentForm, previousSchool: {...studentForm.previousSchool, classCompleted: e.target.value}})} className="h-11 rounded-xl" /></div>
                        <div className="space-y-2"><Label>Reason for Leaving</Label><Input value={studentForm.previousSchool.reason} onChange={e => setStudentForm({...studentForm, previousSchool: {...studentForm.previousSchool, reason: e.target.value}})} className="h-11 rounded-xl" /></div>
                      </div>
                   </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="bg-slate-50 p-8 border-t shrink-0">
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary font-bold shadow-lg">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 
                {editingStudent ? "Authorize Registry Update" : "Authorize Registry Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
          <div className="flex flex-col h-full overflow-hidden">
             <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0 flex flex-row items-center gap-6">
                <div className="size-24 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border-2 border-white/20 overflow-hidden">
                  {selectedStudent?.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover" /> : <User className="size-12 opacity-50" />}
                </div>
                <div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">Live Profile Registry</span>
                   <DialogTitle className="text-3xl font-headline font-bold">{selectedStudent?.firstName} {selectedStudent?.lastName}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1.5 font-mono"><ShieldCheck className="size-3.5" /> {selectedStudent?.admissionNumber}</span>
                      <span className="flex items-center gap-1.5 font-bold"><GraduationCap className="size-3.5" /> {selectedStudent?.gradeLevel}</span>
                   </DialogDescription>
                </div>
             </DialogHeader>

             <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="bg-muted/30 px-8 py-2 border-b shrink-0 overflow-x-auto no-scrollbar justify-start gap-4">
                   <TabsTrigger value="overview">Overview</TabsTrigger>
                   <TabsTrigger value="attendance">Attendance</TabsTrigger>
                   <TabsTrigger value="fees">Fees</TabsTrigger>
                   <TabsTrigger value="health">Health & Safety</TabsTrigger>
                   <TabsTrigger value="history">Academic Lineage</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 p-8">
                   <TabsContent value="overview" className="mt-0 space-y-8">
                      <div className="grid gap-6 md:grid-cols-3">
                         <div className="p-4 rounded-2xl bg-slate-50 border space-y-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Admission Year</span>
                            <p className="font-bold text-primary">2026 Academic Cycle</p>
                         </div>
                         <div className="p-4 rounded-2xl bg-slate-50 border space-y-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">House / Hall</span>
                            <p className="font-bold text-primary">{selectedStudent?.house || "Unassigned"}</p>
                         </div>
                         <div className="p-4 rounded-2xl bg-slate-50 border space-y-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Parent Guardian</span>
                            <p className="font-bold text-primary">{parents.find(p => p.id === selectedStudent?.parentId)?.guardianName || "N/A"}</p>
                         </div>
                      </div>

                      <div className="grid gap-8 md:grid-cols-2">
                         <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Residential Context</h4>
                            <div className="space-y-2 text-sm">
                               <p className="flex justify-between"><span>Town</span><span className="font-bold">{selectedStudent?.address?.town}</span></p>
                               <p className="flex justify-between"><span>Digital Address</span><span className="font-mono font-bold">{selectedStudent?.address?.digitalAddress}</span></p>
                               <p className="flex justify-between"><span>Region</span><span className="font-bold">{selectedStudent?.address?.region}</span></p>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Emergency Hub</h4>
                            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 space-y-2 text-sm">
                               <p className="font-bold text-orange-900">{selectedStudent?.emergencyContact?.name || "Contact Missing"}</p>
                               <p className="text-xs text-orange-800 uppercase font-bold">{selectedStudent?.emergencyContact?.relationship}</p>
                               <p className="font-mono text-orange-900">{selectedStudent?.emergencyContact?.phone}</p>
                            </div>
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="health" className="mt-0">
                      <div className="grid gap-8 md:grid-cols-2">
                         <div className="p-6 rounded-2xl bg-red-50 border border-red-100">
                            <h4 className="text-xs font-bold text-red-900 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertCircle className="size-4" /> Medical Alerts</h4>
                            <p className="text-sm font-medium text-red-800">{selectedStudent?.medical?.allergies || "No allergies reported."}</p>
                            <p className="text-xs mt-4 text-red-700">Special Needs: {selectedStudent?.medical?.specialNeeds || "None"}</p>
                         </div>
                         <div className="p-6 rounded-2xl bg-slate-50 border">
                            <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Stethoscope className="size-4" /> Clinical Care</h4>
                            <p className="text-sm">Assigned Doctor: <span className="font-bold">{selectedStudent?.medical?.doctor || "Not Specified"}</span></p>
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="history" className="mt-0">
                      <Card className="border-none shadow-sm bg-slate-50 p-6 space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="size-12 rounded-xl bg-white flex items-center justify-center border shadow-sm"><School className="size-6 text-primary" /></div>
                            <div>
                               <p className="font-bold text-lg">{selectedStudent?.previousSchool?.name || "No previous records"}</p>
                               <p className="text-xs text-muted-foreground font-bold uppercase">Class Completed: {selectedStudent?.previousSchool?.classCompleted}</p>
                            </div>
                         </div>
                         <div className="p-4 bg-white rounded-xl text-sm italic">
                            Reason for transfer: {selectedStudent?.previousSchool?.reason || "Not specified."}
                         </div>
                      </Card>
                   </TabsContent>

                   <TabsContent value="attendance" className="mt-0">
                      <div className="p-12 text-center text-muted-foreground opacity-30 italic">Awaiting Cycle Roll Call data...</div>
                   </TabsContent>
                   
                   <TabsContent value="fees" className="mt-0">
                      <div className="p-12 text-center text-muted-foreground opacity-30 italic">Syncing personal ledger for GH₵...</div>
                   </TabsContent>
                </ScrollArea>
             </Tabs>

             <DialogFooter className="bg-slate-50 p-6 border-t shrink-0 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Authorized Registry Access • {new Date().toLocaleDateString()}</p>
                <div className="flex gap-2">
                   <Button variant="outline" className="h-9 text-xs rounded-xl" onClick={() => setIsProfileOpen(false)}>Close Registry</Button>
                   <Button className="h-9 text-xs rounded-xl bg-primary" onClick={() => { setIsProfileOpen(false); openEdit(selectedStudent); }}>Edit Profile</Button>
                </div>
             </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
