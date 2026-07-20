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
  School,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FileText,
  HeartHandshake
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore"
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
  
  // Wizard State
  const [activeStep, setActiveStep] = useState("identity")
  const steps = ["identity", "academic", "guardian", "medical", "documents", "finalize"]

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
      bloodGroup: "",
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
      birthCertificate: "Pending",
      passport: "Pending",
      transferLetter: "N/A",
      previousRecords: "Pending"
    }
  }

  const [studentForm, setStudentForm] = useState(initialForm)
  
  const [isNewParent, setIsNewParent] = useState(false)
  const [newParentForm, setNewParentForm] = useState({
    guardianName: "",
    phone: "",
    email: "",
    relationship: "Father",
    occupation: ""
  })

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
    
    try {
      const batch = writeBatch(db)
      let finalParentId = studentForm.parentId

      if (isNewParent) {
        const parentRef = doc(collection(db, "parents"))
        finalParentId = parentRef.id
        batch.set(parentRef, {
          ...newParentForm,
          id: finalParentId,
          tenantId: institutionId,
          institutionId: institutionId,
          createdAt: serverTimestamp()
        })
      }

      const dataPayload = {
        ...studentForm,
        parentId: finalParentId,
        tenantId: institutionId,
        institutionId: institutionId,
        updatedAt: serverTimestamp()
      }

      if (editingStudent) {
        const { id, createdAt, ...sanitizedData } = dataPayload as any;
        batch.update(doc(db, "students", editingStudent.id), sanitizedData);
      } else {
        const studentRef = doc(collection(db, "students"))
        batch.set(studentRef, {
          ...dataPayload,
          id: studentRef.id,
          createdAt: serverTimestamp()
        });

        // Initialize Fee Ledger for the student automatically
        const ledgerRef = doc(collection(db, "student_ledger"))
        batch.set(ledgerRef, {
          tenantId: institutionId,
          institutionId: institutionId,
          studentId: studentRef.id,
          date: new Date().toISOString().split('T')[0],
          item: "Initial Account Provisioning",
          type: "charge",
          amount: 0,
          createdAt: serverTimestamp()
        })
      }

      await batch.commit()
      toast({ title: editingStudent ? "Registry Synchronized" : "Student Enrolled", description: "The institutional record has been finalized." })
      
      setIsEnrollOpen(false);
      setEditingStudent(null);
      setStudentForm(initialForm);
      setActiveStep("identity")
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
    setActiveStep("identity")
  }

  const navigateStep = (direction: 'next' | 'back') => {
    const currentIndex = steps.indexOf(activeStep)
    if (direction === 'next' && currentIndex < steps.length - 1) {
      setActiveStep(steps[currentIndex + 1])
    } else if (direction === 'back' && currentIndex > 0) {
      setActiveStep(steps[currentIndex - 1])
    }
  }

  if (dataLoading) return <div className="p-24 text-center animate-pulse font-headline font-bold text-primary">Syncing Student Registry...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Student Registry</h1>
          <p className="text-muted-foreground">Managing {students.length} multi-tenant enrollment records.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 rounded-xl" asChild><Link href="/dashboard/students/id-cards"><IdCard className="size-4 mr-2" /> ID Cards</Link></Button>
          <Button className="bg-primary rounded-xl h-11 shadow-lg gap-2" onClick={() => { setEditingStudent(null); setStudentForm(initialForm); setIsEnrollOpen(true); setActiveStep("identity"); }}>
            <UserPlus className="size-4" /> Enroll Student
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b py-6 p-4 md:p-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or admission #..." 
              className="pl-10 h-12 bg-slate-50 border-none rounded-xl" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold px-6">ADM # / STUDENT</TableHead>
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
                    <TableCell className="px-6">
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
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-white/10 text-white border-none text-[10px] font-bold uppercase tracking-widest">
                  Step {steps.indexOf(activeStep) + 1} of 6
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-headline font-bold">
                {editingStudent ? "Update Admission File" : "Student Admission Wizard"}
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Authorized guided enrollment process.</DialogDescription>
            </DialogHeader>

            <Tabs value={activeStep} onValueChange={setActiveStep} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="bg-muted/30 px-8 py-2 border-b shrink-0 overflow-x-auto no-scrollbar justify-start gap-2">
                <TabsTrigger value="identity" className="data-[state=active]:bg-primary data-[state=active]:text-white">1. Identity</TabsTrigger>
                <TabsTrigger value="academic" className="data-[state=active]:bg-primary data-[state=active]:text-white">2. Academic</TabsTrigger>
                <TabsTrigger value="guardian" className="data-[state=active]:bg-primary data-[state=active]:text-white">3. Guardian</TabsTrigger>
                <TabsTrigger value="medical" className="data-[state=active]:bg-primary data-[state=active]:text-white">4. Medical</TabsTrigger>
                <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-white">5. Docs</TabsTrigger>
                <TabsTrigger value="finalize" className="data-[state=active]:bg-primary data-[state=active]:text-white">6. Finish</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-8">
                <TabsContent value="identity" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>Admission Number (Auto)</Label><Input readOnly value={studentForm.admissionNumber} className="h-11 rounded-xl bg-slate-50 font-bold" /></div>
                    <div className="space-y-2"><Label>First Name</Label><Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Last Name</Label><Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Gender</Label>
                      <Select value={studentForm.gender} onValueChange={v => setStudentForm({...studentForm, gender: v})}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={studentForm.dateOfBirth} onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Passport Photo URL</Label><Input placeholder="https://..." value={studentForm.photoUrl} onChange={e => setStudentForm({...studentForm, photoUrl: e.target.value})} className="h-11 rounded-xl" /></div>
                  </div>
                </TabsContent>

                <TabsContent value="academic" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label>Grade Module</Label>
                        <Select value={studentForm.gradeLevel} onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                          <SelectContent>{registeredClasses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>House / Dormitory (Optional)</Label><Input value={studentForm.house} onChange={e => setStudentForm({...studentForm, house: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Aggrey House" /></div>
                      <div className="space-y-2"><Label>Student Status</Label>
                         <Select value={studentForm.status} onValueChange={v => setStudentForm({...studentForm, status: v})}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                         </Select>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="guardian" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Guardian Hub</Label>
                         <Button type="button" variant="outline" size="sm" onClick={() => setIsNewParent(!isNewParent)} className="h-8 text-[10px] font-bold uppercase">
                            {isNewParent ? "Search Registry" : "Register New Parent"}
                         </Button>
                      </div>

                      {isNewParent ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20">
                           <div className="space-y-2"><Label>Guardian Full Name</Label><Input value={newParentForm.guardianName} onChange={e => setNewParentForm({...newParentForm, guardianName: e.target.value})} className="h-11 rounded-xl" /></div>
                           <div className="space-y-2"><Label>Phone Number</Label><Input value={newParentForm.phone} onChange={e => setNewParentForm({...newParentForm, phone: e.target.value})} className="h-11 rounded-xl" /></div>
                           <div className="space-y-2"><Label>Email Address</Label><Input type="email" value={newParentForm.email} onChange={e => setNewParentForm({...newParentForm, email: e.target.value})} className="h-11 rounded-xl" /></div>
                           <div className="space-y-2"><Label>Relationship</Label>
                              <Select value={newParentForm.relationship} onValueChange={v => setNewParentForm({...newParentForm, relationship: v})}>
                                 <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                 <SelectContent><SelectItem value="Father">Father</SelectItem><SelectItem value="Mother">Mother</SelectItem><SelectItem value="Guardian">Guardian</SelectItem></SelectContent>
                              </Select>
                           </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                           <Select value={studentForm.parentId} onValueChange={v => setStudentForm({...studentForm, parentId: v})}>
                              <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Search existing parent by Name, Phone, or Email" /></SelectTrigger>
                              <SelectContent>
                                 {parents.map(p => <SelectItem key={p.id} value={p.id}>{p.guardianName} ({p.phone} • {p.email || 'No Email'})</SelectItem>)}
                                 {parents.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">No parents registered in registry.</div>}
                              </SelectContent>
                           </Select>
                           <p className="text-[10px] text-muted-foreground italic">Note: Linking an existing profile prevents data redundancy.</p>
                        </div>
                      )}
                   </div>

                   <div className="space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Residential Hub</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2"><Label>Digital Address (GPS)</Label><Input value={studentForm.address.digitalAddress} onChange={e => setStudentForm({...studentForm, address: {...studentForm.address, digitalAddress: e.target.value}})} className="h-11 rounded-xl" placeholder="e.g. GA-123-4567" /></div>
                         <div className="space-y-2"><Label>Town / City</Label><Input value={studentForm.address.town} onChange={e => setStudentForm({...studentForm, address: {...studentForm.address, town: e.target.value}})} className="h-11 rounded-xl" /></div>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="medical" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label>Blood Group</Label>
                        <Select value={studentForm.medical.bloodGroup} onValueChange={v => setStudentForm({...studentForm, medical: {...studentForm.medical, bloodGroup: v}})}>
                           <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Group" /></SelectTrigger>
                           <SelectContent>
                              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Allergies</Label><Input value={studentForm.medical.allergies} onChange={e => setStudentForm({...studentForm, medical: {...studentForm.medical, allergies: e.target.value}})} className="h-11 rounded-xl" placeholder="e.g. Peanuts, Penicillin" /></div>
                      <div className="space-y-2"><Label>Special Needs</Label><Input value={studentForm.medical.specialNeeds} onChange={e => setStudentForm({...studentForm, medical: {...studentForm.medical, specialNeeds: e.target.value}})} className="h-11 rounded-xl" /></div>
                      <div className="space-y-2"><Label>Emergency Contact Name</Label><Input value={studentForm.emergencyContact.name} onChange={e => setStudentForm({...studentForm, emergencyContact: {...studentForm.emergencyContact, name: e.target.value}})} className="h-11 rounded-xl" /></div>
                      <div className="space-y-2"><Label>Emergency Phone</Label><Input value={studentForm.emergencyContact.phone} onChange={e => setStudentForm({...studentForm, emergencyContact: {...studentForm.emergencyContact, phone: e.target.value}})} className="h-11 rounded-xl" /></div>
                   </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2"><FileText className="size-4" /> Compliance Checklist</h4>
                      <div className="grid gap-3">
                         {[
                           { label: "Birth Certificate", key: "birthCertificate" },
                           { label: "Passport Photo", key: "passport" },
                           { label: "Transfer Letter", key: "transferLetter" },
                           { label: "Previous School Records", key: "previousRecords" }
                         ].map(doc => (
                           <div key={doc.key} className="flex items-center justify-between p-3 bg-white rounded-xl border">
                              <span className="text-sm font-medium">{doc.label}</span>
                              <Select 
                                value={studentForm.documents[doc.key as keyof typeof studentForm.documents]} 
                                onValueChange={v => setStudentForm({...studentForm, documents: {...studentForm.documents, [doc.key]: v}})}
                              >
                                 <SelectTrigger className="w-32 h-8 text-[10px]"><SelectValue /></SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="Submitted">Submitted</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="N/A">Not Applicable</SelectItem>
                                 </SelectContent>
                              </Select>
                           </div>
                         ))}
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="finalize" className="space-y-8 mt-0 animate-in fade-in zoom-in-95 duration-500">
                   <div className="text-center space-y-4 py-8">
                      <div className="size-20 rounded-full bg-green-50 flex items-center justify-center mx-auto text-green-600">
                         <CheckCircle2 className="size-12" />
                      </div>
                      <div className="max-w-sm mx-auto">
                         <h3 className="text-xl font-bold font-headline">Ready for Finalization</h3>
                         <p className="text-sm text-muted-foreground mt-2">
                            Please confirm the registry details. Upon authorization, the system will generate the Admission ID and initialize the student ledger.
                         </p>
                      </div>
                   </div>
                   <Card className="border-none shadow-sm bg-slate-50 p-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                         <div className="flex flex-col"><span className="text-[10px] font-bold uppercase opacity-50">Student</span><span className="font-bold">{studentForm.firstName} {studentForm.lastName}</span></div>
                         <div className="flex flex-col"><span className="text-[10px] font-bold uppercase opacity-50">Admission ID</span><span className="font-mono font-bold text-accent">{studentForm.admissionNumber}</span></div>
                         <div className="flex flex-col"><span className="text-[10px] font-bold uppercase opacity-50">Grade</span><span className="font-bold">{studentForm.gradeLevel || "Unassigned"}</span></div>
                         <div className="flex flex-col"><span className="text-[10px] font-bold uppercase opacity-50">Parent Link</span><span className="font-bold">{isNewParent ? "New Registration" : "Registry Linked"}</span></div>
                      </div>
                   </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="bg-slate-50 p-8 border-t shrink-0 flex items-center justify-between">
              <div className="flex gap-2">
                 <Button type="button" variant="ghost" className="h-11 px-6 rounded-xl" onClick={() => navigateStep('back')} disabled={activeStep === 'identity'}>
                    <ChevronLeft className="size-4 mr-2" /> Previous
                 </Button>
              </div>
              <div className="flex gap-3">
                 {activeStep === "finalize" ? (
                   <Button type="submit" disabled={loading} className="h-12 px-8 rounded-xl bg-primary font-bold shadow-xl gap-2">
                      {loading ? <Loader2 className="animate-spin" /> : <Save className="size-4" />} Authorize Registry Entry
                   </Button>
                 ) : (
                   <Button type="button" className="h-12 px-8 rounded-xl bg-primary font-bold shadow-lg gap-2" onClick={() => navigateStep('next')}>
                      Next Phase <ChevronRight className="size-4" />
                   </Button>
                 )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Profile Detail Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col bg-background">
          <div className="flex flex-col h-full overflow-hidden">
             <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0 flex flex-row items-center gap-6">
                <div className="size-24 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border-2 border-white/20 overflow-hidden">
                  {selectedStudent?.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover" /> : <User className="size-12 opacity-50" />}
                </div>
                <div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">Institutional Profile</span>
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
                   <TabsTrigger value="health">Medical</TabsTrigger>
                   <TabsTrigger value="documents">Documents</TabsTrigger>
                   <TabsTrigger value="history">Lineage</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 p-8">
                   <TabsContent value="overview" className="mt-0 space-y-8">
                      <div className="grid gap-6 md:grid-cols-3">
                         <div className="p-4 rounded-2xl bg-slate-50 border space-y-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Registry Cycle</span>
                            <p className="font-bold text-primary">2026 Academic Year</p>
                         </div>
                         <div className="p-4 rounded-2xl bg-slate-50 border space-y-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Residential Hall</span>
                            <p className="font-bold text-primary">{selectedStudent?.house || "Day Student"}</p>
                         </div>
                         <div className="p-4 rounded-2xl bg-slate-50 border space-y-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Primary Guardian</span>
                            <p className="font-bold text-primary">{parents.find(p => p.id === selectedStudent?.parentId)?.guardianName || "Unlinked"}</p>
                         </div>
                      </div>

                      <div className="grid gap-8 md:grid-cols-2">
                         <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Residential Registry</h4>
                            <div className="space-y-2 text-sm">
                               <p className="flex justify-between"><span>Town</span><span className="font-bold">{selectedStudent?.address?.town}</span></p>
                               <p className="flex justify-between"><span>Digital Address</span><span className="font-mono font-bold">{selectedStudent?.address?.digitalAddress}</span></p>
                               <p className="flex justify-between"><span>Region</span><span className="font-bold">{selectedStudent?.address?.region || "Ghana"}</span></p>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Emergency Hub</h4>
                            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 space-y-2 text-sm">
                               <p className="font-bold text-orange-900">{selectedStudent?.emergencyContact?.name || "No Name Provided"}</p>
                               <p className="text-xs text-orange-800 uppercase font-bold">{selectedStudent?.emergencyContact?.relationship}</p>
                               <p className="font-mono text-orange-900 font-bold">{selectedStudent?.emergencyContact?.phone}</p>
                            </div>
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="health" className="mt-0">
                      <div className="grid gap-8 md:grid-cols-2">
                         <div className="p-6 rounded-2xl bg-red-50 border border-red-100">
                            <h4 className="text-xs font-bold text-red-900 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertCircle className="size-4" /> Medical Alerts</h4>
                            <p className="text-[10px] font-bold uppercase text-red-700 mb-1">Blood Group: {selectedStudent?.medical?.bloodGroup || "Not Provided"}</p>
                            <p className="text-sm font-medium text-red-800 leading-relaxed">{selectedStudent?.medical?.allergies || "No identified allergies."}</p>
                            <p className="text-xs mt-4 text-red-700 font-bold">Special Needs: {selectedStudent?.medical?.specialNeeds || "None"}</p>
                         </div>
                         <div className="p-6 rounded-2xl bg-slate-50 border">
                            <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Stethoscope className="size-4" /> Primary Physician</h4>
                            <p className="text-sm">Assigned Doctor: <span className="font-bold">{selectedStudent?.medical?.doctor || "Not Specified"}</span></p>
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="documents" className="mt-0">
                      <div className="p-6 rounded-2xl border bg-slate-50/50">
                         <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Official Records Status</h4>
                         <div className="grid gap-3">
                            {selectedStudent?.documents && Object.entries(selectedStudent.documents).map(([key, status]) => (
                               <div key={key} className="flex justify-between items-center p-3 bg-white rounded-xl border">
                                  <span className="text-xs font-bold capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                  <Badge variant={status === 'Submitted' ? 'default' : 'outline'} className="text-[9px] uppercase">{status as string}</Badge>
                               </div>
                            ))}
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="history" className="mt-0">
                      <Card className="border-none shadow-sm bg-slate-50 p-6 space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="size-12 rounded-xl bg-white flex items-center justify-center border shadow-sm"><School className="size-6 text-primary" /></div>
                            <div>
                               <p className="font-bold text-lg">{selectedStudent?.previousSchool?.name || "No Prior Records"}</p>
                               <p className="text-xs text-muted-foreground font-bold uppercase">Class Level Completed: {selectedStudent?.previousSchool?.classCompleted}</p>
                            </div>
                         </div>
                         <div className="p-4 bg-white rounded-xl text-sm italic">
                            Transfer Justification: {selectedStudent?.previousSchool?.reason || "Reason not provided."}
                         </div>
                      </Card>
                   </TabsContent>

                   <TabsContent value="attendance" className="mt-0">
                      <div className="p-20 text-center text-muted-foreground opacity-30 italic">Awaiting Cycle Roll Call synchronization...</div>
                   </TabsContent>
                   
                   <TabsContent value="fees" className="mt-0">
                      <div className="p-20 text-center text-muted-foreground opacity-30 italic">Syncing personal fee ledger for GH₵...</div>
                   </TabsContent>
                </ScrollArea>
             </Tabs>

             <DialogFooter className="bg-slate-50 p-6 border-t shrink-0 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Authorized Registry Access • {new Date().toLocaleDateString()}</p>
                <div className="flex gap-2">
                   <Button variant="outline" className="h-9 text-xs rounded-xl" onClick={() => setIsProfileOpen(false)}>Close Registry</Button>
                   <Button className="h-9 text-xs rounded-xl bg-primary" onClick={() => { setIsProfileOpen(false); openEdit(selectedStudent); }}>Update Profile</Button>
                </div>
             </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
