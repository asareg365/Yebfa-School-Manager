
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
  IdCard,
  RefreshCw,
  Save,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  HeartHandshake,
  Baby,
  Users,
  Upload,
  FileSpreadsheet
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc, writeBatch, setDoc } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import Papa from "papaparse"
import { initializeApp, getApp, getApps } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"

export default function StudentsPage() {
  const db = useFirestore()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [activeStep, setActiveStep] = useState("identity")
  const steps = ["identity", "academic", "guardian", "finalize"]

  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialForm = {
    firstName: "",
    lastName: "",
    gender: "Male",
    dateOfBirth: "",
    admissionNumber: "",
    gradeLevel: "",
    status: "active",
    house: "",
    photoUrl: "",
    address: {
      digitalAddress: "",
      town: "",
      district: "",
      region: "",
      country: "Ghana"
    },
    admissionId: ""
  }

  const [studentForm, setStudentForm] = useState(initialForm)
  
  const [isNewParent, setIsNewParent] = useState(false)
  const [linkedParentId, setLinkedParentId] = useState("")
  const [relationshipData, setRelationshipData] = useState({
    relationship: "Mother",
    primaryContact: true,
    emergencyContact: true,
    pickupAuthorized: true
  })

  const [newParentForm, setNewParentForm] = useState({
    parentNumber: "",
    firstName: "",
    lastName: "",
    gender: "Female",
    phone: "",
    email: "",
    occupation: "",
    status: "Active"
  })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
    
    const enrollTrigger = searchParams.get('enroll')
    if (enrollTrigger === 'true') {
      const pendingData = localStorage.getItem('pending_admission_data')
      if (pendingData) {
        const app = JSON.parse(pendingData)
        setStudentForm(prev => ({
          ...prev,
          firstName: app.firstName || "",
          lastName: app.lastName || "",
          gender: app.gender || "Male",
          dateOfBirth: app.dateOfBirth || "",
          gradeLevel: app.gradeLevel || "",
          admissionId: app.id
        }))
        setIsEnrollOpen(true)
        localStorage.removeItem('pending_admission_data')
      }
    }
  }, [searchParams])

  const studentsQuery = useMemo(() => institutionId ? query(collection(db, "students"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);
  const parentsQuery = useMemo(() => institutionId ? query(collection(db, "parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);
  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);
  const relsQuery = useMemo(() => institutionId ? query(collection(db, "student_parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);

  const { data: rawStudents = [], loading: dataLoading } = useCollection(studentsQuery)
  const { data: parents = [] } = useCollection(parentsQuery)
  const { data: registeredClasses = [] } = useCollection(classesQuery)
  const { data: allRels = [] } = useCollection(relsQuery)

  const studentsList = useMemo(() => {
    return rawStudents.filter(s => 
      `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: any, b: any) => (a.admissionNumber || "").localeCompare(b.admissionNumber || ""));
  }, [rawStudents, searchQuery]);

  useEffect(() => {
    if (isEnrollOpen && !studentForm.admissionNumber && !editingStudent) {
      const year = new Date().getFullYear();
      const count = rawStudents.length + 1;
      const autoAdm = `ADM-${year}-${String(count).padStart(5, '0')}`;
      setStudentForm(prev => ({ ...prev, admissionNumber: autoAdm }));
    }
    if (isEnrollOpen && isNewParent && !newParentForm.parentNumber) {
      const nextCount = parents.length + 1;
      const autoCode = `PAR-${String(nextCount).padStart(6, '0')}`;
      setNewParentForm(prev => ({ ...prev, parentNumber: autoCode }));
    }
  }, [isEnrollOpen, rawStudents.length, parents.length, editingStudent, isNewParent, studentForm.admissionNumber, newParentForm.parentNumber]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return

    if (isNewParent && !newParentForm.email) {
      toast({ variant: "destructive", title: "Guardian Email Required", description: "Parents must have an email for portal access." });
      return;
    }

    setLoading(true)
    
    try {
      const batch = writeBatch(db)
      let finalParentId = linkedParentId
      let studentId = editingStudent?.id

      // 1. Handle New Parent Auth Provisioning
      if (isNewParent) {
        const secondaryAppName = `secondary-enroll-${Date.now()}`
        const secondaryApp = getApps().find(a => a.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName)
        const secondaryAuth = getAuth(secondaryApp)
        
        let parentAuthUser;
        try {
          const credential = await createUserWithEmailAndPassword(secondaryAuth, newParentForm.email, newParentForm.phone)
          parentAuthUser = credential.user
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            console.warn("Parent Auth record exists.");
          } else {
            throw authErr;
          }
        }

        const parentRef = doc(collection(db, "parents"))
        finalParentId = parentRef.id
        batch.set(parentRef, {
          ...newParentForm,
          id: finalParentId,
          tenantId: institutionId,
          institutionId: institutionId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })

        if (parentAuthUser) {
          batch.set(doc(db, "users", parentAuthUser.uid), {
            uid: parentAuthUser.uid,
            name: `${newParentForm.firstName} ${newParentForm.lastName}`,
            email: newParentForm.email,
            role: "parent",
            tenantId: institutionId,
            institutionId: institutionId,
            status: "active",
            createdAt: serverTimestamp()
          })
        }
      }

      const studentData = {
        ...studentForm,
        tenantId: institutionId,
        institutionId,
        updatedAt: serverTimestamp()
      }

      if (editingStudent) {
        const { id, createdAt, ...sanitizedData } = studentData as any;
        batch.update(doc(db, "students", studentId), sanitizedData);
      } else {
        const studentRef = doc(collection(db, "students"))
        studentId = studentRef.id
        batch.set(studentRef, {
          ...studentData,
          id: studentId,
          createdAt: serverTimestamp()
        });

        const ledgerRef = doc(collection(db, "student_ledger"))
        batch.set(ledgerRef, {
          tenantId: institutionId,
          institutionId,
          studentId,
          date: new Date().toISOString().split('T')[0],
          item: "Account Provisioning",
          type: "charge",
          amount: 0,
          createdAt: serverTimestamp()
        })

        if (studentForm.admissionId) {
          batch.update(doc(db, "admissions", studentForm.admissionId), { status: "Enrolled", updatedAt: serverTimestamp() })
        }
      }

      if (finalParentId) {
        const relId = `${studentId}_${finalParentId}`
        batch.set(doc(db, "student_parents", relId), {
          ...relationshipData,
          studentId,
          parentId: finalParentId,
          tenantId: institutionId,
          institutionId,
          updatedAt: serverTimestamp()
        }, { merge: true })
      }

      await batch.commit()
      toast({ title: editingStudent ? "Registry Synchronized" : "Student Enrolled" })
      setIsEnrollOpen(false); setEditingStudent(null); setStudentForm(initialForm); setActiveStep("identity")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed", description: error.message });
    } finally { setLoading(false) }
  }

  const handleBulkEnroll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !institutionId) return

    setLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const batch = writeBatch(db)
        const year = new Date().getFullYear()
        let count = rawStudents.length + 1

        for (const row of results.data as any[]) {
          const studentRef = doc(collection(db, "students"))
          const studentId = studentRef.id
          const admNo = `ADM-${year}-${String(count).padStart(5, '0')}`

          batch.set(studentRef, {
            firstName: row.firstName || "New",
            lastName: row.lastName || "Student",
            gender: row.gender || "Male",
            dateOfBirth: row.dob || "",
            admissionNumber: admNo,
            gradeLevel: row.grade || "",
            status: "active",
            tenantId: institutionId,
            institutionId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })

          const ledgerRef = doc(collection(db, "student_ledger"))
          batch.set(ledgerRef, {
            tenantId: institutionId,
            institutionId,
            studentId,
            date: new Date().toISOString().split('T')[0],
            item: "Bulk Account Provisioning",
            type: "charge",
            amount: 0,
            createdAt: serverTimestamp()
          })

          count++
        }

        try {
          await batch.commit()
          toast({ title: "Bulk Enrollment Complete", description: `Loaded ${results.data.length} students into registry.` })
          setIsBulkOpen(false)
        } catch (err: any) {
          toast({ variant: "destructive", title: "Bulk Upload Failed", description: err.message })
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const navigateStep = (direction: 'next' | 'back') => {
    const currentIndex = steps.indexOf(activeStep)
    if (direction === 'next' && currentIndex < steps.length - 1) setActiveStep(steps[currentIndex + 1])
    else if (direction === 'back' && currentIndex > 0) setActiveStep(steps[currentIndex - 1])
  }

  const openEdit = (stu: any) => {
    setEditingStudent(stu)
    setStudentForm({ ...initialForm, ...stu })
    const rel = allRels.find(r => r.studentId === stu.id)
    if (rel) {
      setLinkedParentId(rel.parentId)
      setRelationshipData({ ...relationshipData, relationship: rel.relationship, primaryContact: rel.primaryContact })
    }
    setIsEnrollOpen(true)
    setActiveStep("identity")
  }

  if (dataLoading) return <div className="p-24 text-center animate-pulse font-bold text-muted-foreground uppercase tracking-widest text-xs">Syncing Registry...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Student Registry</h1>
          <p className="text-muted-foreground">Managing {studentsList.length} institutional enrollment records.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => setIsBulkOpen(true)}>
            <FileSpreadsheet className="size-4" /> Bulk Enrollment
          </Button>
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
            <Input placeholder="Search records..." className="pl-10 h-12 bg-slate-50 border-none rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold px-6">ADM # / STUDENT</TableHead>
                <TableHead className="py-4 font-bold">GRADE</TableHead>
                <TableHead className="py-4 font-bold">GUARDIAN LINK</TableHead>
                <TableHead className="py-4 font-bold">STATUS</TableHead>
                <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsList.map((stu: any) => {
                const mainRel = allRels.find(r => r.studentId === stu.id && r.primaryContact);
                const parent = parents.find(p => p.id === mainRel?.parentId);
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
                        <span className="font-bold">{parent ? `${parent.firstName} ${parent.lastName}` : "No Primary"}</span>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">{mainRel?.relationship || "Unlinked"}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold text-green-600 bg-green-50">{stu.status}</Badge></TableCell>
                    <TableCell className="text-right px-6" onClick={e => e.stopPropagation()}>
                       <Button variant="ghost" size="icon" onClick={() => openEdit(stu)}><Pencil className="size-4" /></Button>
                       <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDoc(doc(db!, "students", stu.id))}><Trash2 className="size-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">Bulk Student Enrollment</DialogTitle>
            <DialogDescription>Upload a CSV file to enroll multiple students instantly. Expected columns: firstName, lastName, gender, dob, grade.</DialogDescription>
          </DialogHeader>
          <div className="py-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 bg-muted/5">
            <Upload className="size-12 text-primary opacity-20" />
            <div className="text-center space-y-1">
              <p className="text-sm font-bold">Drop CSV here or click to select</p>
              <p className="text-xs text-muted-foreground italic">File size limit: 2MB</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleBulkEnroll} accept=".csv" className="hidden" />
            <Button className="h-10 px-8 rounded-xl font-bold" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 size-4" />}
              Choose File
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl md:rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleEnroll} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0">
              <Badge className="bg-white/10 text-white border-none text-[10px] font-bold uppercase tracking-widest mb-2 w-fit">Wizard Step {steps.indexOf(activeStep) + 1}</Badge>
              <DialogTitle className="text-2xl font-headline font-bold">{editingStudent ? "Update Registry" : "New Enrollment Wizard"}</DialogTitle>
            </DialogHeader>

            <Tabs value={activeStep} className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-8">
                <TabsContent value="identity" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>Admission #</Label><Input readOnly value={studentForm.admissionNumber} className="h-11 rounded-xl bg-slate-50 font-bold" /></div>
                    <div className="space-y-2"><Label>First Name</Label><Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Last Name</Label><Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Gender</Label>
                      <Select value={studentForm.gender} onValueChange={v => setStudentForm({...studentForm, gender: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select>
                    </div>
                    <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={studentForm.dateOfBirth} onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" /></div>
                  </div>
                </TabsContent>

                <TabsContent value="academic" className="space-y-6 mt-0">
                  <div className="space-y-2">
                    <Label>Assign Grade Level</Label>
                    <Select value={studentForm.gradeLevel} onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                      <SelectContent>{registeredClasses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="guardian" className="space-y-8 mt-0">
                   <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <h3 className="font-bold flex items-center gap-2 text-primary"><HeartHandshake className="size-4" /> Guardian Link</h3>
                        <p className="text-xs text-muted-foreground">Search registry for siblings or register a new master profile.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg gap-2" onClick={() => setIsNewParent(!isNewParent)}>
                        {isNewParent ? <Search className="size-3.5" /> : <UserPlus className="size-3.5" />}
                        {isNewParent ? "Registry Search" : "Register New Profile"}
                      </Button>
                   </div>
                   
                   {isNewParent ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-50 rounded-2xl border-2 border-dashed animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-2"><Label>Master Code</Label><Input readOnly value={newParentForm.parentNumber} className="h-11 bg-white font-bold font-mono" /></div>
                        <div className="space-y-2"><Label>First Name</Label><Input value={newParentForm.firstName} onChange={e => setNewParentForm({...newParentForm, firstName: e.target.value})} className="h-11 bg-white" /></div>
                        <div className="space-y-2"><Label>Last Name</Label><Input value={newParentForm.lastName} onChange={e => setNewParentForm({...newParentForm, lastName: e.target.value})} className="h-11 bg-white" /></div>
                        <div className="space-y-2"><Label>Contact Phone</Label><Input value={newParentForm.phone} onChange={e => setNewParentForm({...newParentForm, phone: e.target.value})} className="h-11 bg-white" /></div>
                        <div className="space-y-2 md:col-span-2"><Label>Guardian Email (Required for Portal)</Label><Input type="email" value={newParentForm.email} onChange={e => setNewParentForm({...newParentForm, email: e.target.value})} className="h-11 bg-white" /></div>
                     </div>
                   ) : (
                     <div className="space-y-4 animate-in fade-in duration-200">
                        <Label>Search Existing Parents (Siblings Check)</Label>
                        <Select value={linkedParentId} onValueChange={setLinkedParentId}>
                           <SelectTrigger className="h-14 rounded-xl text-primary font-medium">
                              <SelectValue placeholder="🔍 Search registry by name or phone..." />
                           </SelectTrigger>
                           <SelectContent>
                              {parents.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} • {p.phone} ({p.parentNumber})</SelectItem>)}
                              {parents.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">No parents registered in the hub.</div>}
                           </SelectContent>
                        </Select>
                     </div>
                   )}

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                      <div className="space-y-2"><Label>Relationship Type</Label>
                         <Select value={relationshipData.relationship} onValueChange={v => setRelationshipData({...relationshipData, relationship: v})}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Guardian">Guardian</SelectItem>
                              <SelectItem value="Uncle">Uncle</SelectItem>
                              <SelectItem value="Aunt">Aunt</SelectItem>
                              <SelectItem value="Foster Parent">Foster Parent</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-8">
                        <Checkbox id="primary" checked={relationshipData.primaryContact} onCheckedChange={v => setRelationshipData({...relationshipData, primaryContact: !!v})} />
                        <Label htmlFor="primary" className="cursor-pointer">Primary Contact</Label>
                      </div>
                      <div className="flex items-center gap-2 pt-8">
                        <Checkbox id="emergency" checked={relationshipData.emergencyContact} onCheckedChange={v => setRelationshipData({...relationshipData, emergencyContact: !!v})} />
                        <Label htmlFor="emergency" className="cursor-pointer">Emergency Hub</Label>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="finalize" className="space-y-8 mt-0 text-center py-10">
                   <div className="size-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4"><CheckCircle2 className="size-12" /></div>
                   <h3 className="text-xl font-bold font-headline">Institutional Enrollment Authorized</h3>
                   <p className="text-sm text-muted-foreground max-w-sm mx-auto">Verify the academic grade and relationship links before finalizing the registry entry.</p>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="bg-slate-50 p-8 border-t shrink-0 flex items-center justify-between">
              <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl" onClick={() => navigateStep('back')} disabled={activeStep === 'identity'}>
                <ChevronLeft className="size-4 mr-2" /> Back
              </Button>
              <div className="flex gap-3">
                 {activeStep === "finalize" ? (
                   <Button type="submit" disabled={loading} className="h-12 px-8 rounded-xl bg-primary font-bold shadow-xl">
                      {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                      Finalize Enrollment
                   </Button>
                 ) : (
                   <Button type="button" className="h-12 px-8 rounded-xl bg-primary font-bold gap-2" onClick={() => navigateStep('next')}>
                     Next Step <ChevronRight className="size-4" />
                   </Button>
                 )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Profile Detail Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col bg-background">
          <div className="flex flex-col h-full overflow-hidden">
             <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0 flex flex-row items-center gap-6">
                <div className="size-20 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border-2 border-white/20 overflow-hidden">
                  {selectedStudent?.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover" /> : <User className="size-10 opacity-50" />}
                </div>
                <div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">Institutional Profile</span>
                   <DialogTitle className="text-2xl font-headline font-bold">{selectedStudent?.firstName} {selectedStudent?.lastName}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1.5 font-mono text-xs"><ShieldCheck className="size-3" /> {selectedStudent?.admissionNumber}</span>
                      <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[10px]">{selectedStudent?.gradeLevel}</Badge>
                   </DialogDescription>
                </div>
             </DialogHeader>

             <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="bg-muted/30 px-8 py-2 border-b shrink-0 overflow-x-auto no-scrollbar justify-start gap-4">
                   <TabsTrigger value="overview">Identity</TabsTrigger>
                   <TabsTrigger value="family">Family & Guardians</TabsTrigger>
                   <TabsTrigger value="health">Medical</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 p-8">
                   <TabsContent value="overview" className="mt-0 space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                         <div className="p-4 rounded-xl border bg-slate-50 space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Full Name</Label>
                            <p className="font-bold text-primary">{selectedStudent?.firstName} {selectedStudent?.lastName}</p>
                         </div>
                         <div className="p-4 rounded-xl border bg-slate-50 space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Gender & DOB</Label>
                            <p className="font-bold text-primary">{selectedStudent?.gender} • {selectedStudent?.dateOfBirth}</p>
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="family" className="mt-0 space-y-6">
                      <div className="grid gap-4">
                         {allRels.filter(r => r.studentId === selectedStudent?.id).map((r: any) => {
                            const p = parents.find(parent => parent.id === r.parentId);
                            return (
                              <Card key={r.id} className="border-none shadow-sm bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                 <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                       <div className="size-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary border">{p?.firstName?.charAt(0)}</div>
                                       <div>
                                          <p className="font-bold text-sm">{p?.firstName} {p?.lastName}</p>
                                          <p className="text-[10px] text-muted-foreground font-bold uppercase">{r.relationship} • {p?.phone}</p>
                                       </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                       {r.primaryContact && <Badge className="bg-green-600 text-white text-[7px] uppercase font-bold">Primary</Badge>}
                                       {r.emergencyContact && <Badge className="bg-orange-500 text-white text-[7px] uppercase font-bold">Emergency</Badge>}
                                    </div>
                                 </CardContent>
                              </Card>
                            )
                         })}
                      </div>
                   </TabsContent>
                </ScrollArea>
             </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
