
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
  FileSpreadsheet,
  Download,
  AlertCircle,
  KeyRound,
  X,
  LockKeyhole,
  Key
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc, writeBatch, setDoc } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { initializeApp, getApps } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"
import { generateInstitutionId, normalizeSecurityPhone, generateStudentPin } from "@/lib/identity-service"
import Papa from "papaparse"

export default function StudentsPage() {
  const db = useFirestore()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [activeStep, setActiveStep] = useState("identity")
  const steps = ["identity", "academic", "guardian", "finalize"]

  const initialForm = {
    firstName: "",
    lastName: "",
    gender: "Male",
    dateOfBirth: "",
    admissionNumber: "PENDING COMMIT",
    studentPin: "", // Changed from "----" to empty to avoid sync confusion
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
    }
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
    parentNumber: "PENDING COMMIT",
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
          gradeLevel: app.gradeLevel || ""
        }))
        setIsEnrollOpen(true)
        localStorage.removeItem('pending_admission_data')
      }
    }
  }, [searchParams])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const studentsQuery = useMemo(() => institutionId ? query(collection(db, "students"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);
  const parentsQuery = useMemo(() => institutionId ? query(collection(db, "parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);
  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);
  const relsQuery = useMemo(() => institutionId ? query(collection(db, "student_parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);

  const { data: rawStudents = [] } = useCollection(studentsQuery)
  const { data: parents = [] } = useCollection(parentsQuery)
  const { data: registeredClasses = [] } = useCollection(classesQuery)
  const { data: allRels = [] } = useCollection(relsQuery)

  const studentsList = useMemo(() => {
    return rawStudents.filter(s => 
      `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: any, b: any) => (a.admissionNumber || "").localeCompare(b.admissionNumber || ""));
  }, [rawStudents, searchQuery]);

  const navigateStep = (direction: 'next' | 'back') => {
    const currentIndex = steps.indexOf(activeStep)
    if (direction === 'next' && currentIndex < steps.length - 1) {
      setActiveStep(steps[currentIndex + 1])
    } else if (direction === 'back' && currentIndex > 0) {
      setActiveStep(steps[currentIndex - 1])
    }
  }

  const handleSyncCredentials = async () => {
    if (!db || !institutionId || rawStudents.length === 0) return;
    if (!confirm("This tool will generate Portal PINs for students missing them. This allows students to log in using 'Student ID + PIN'. Proceed?")) return;

    setSyncing(true);
    try {
      const batch = writeBatch(db);
      let syncCount = 0;

      for (const stu of rawStudents) {
        // Update if pin is missing, is placeholder "----", or empty string
        if (!stu.studentPin || stu.studentPin === "----" || stu.studentPin === "") {
          const newPin = generateStudentPin();
          batch.update(doc(db, "students", stu.id), {
            studentPin: newPin,
            updatedAt: serverTimestamp()
          });
          syncCount++;
        }
      }

      if (syncCount > 0) {
        await batch.commit();
        toast({ title: "Credentials Synchronized", description: `${syncCount} students have been assigned secure login PINs.` });
      } else {
        toast({ title: "Registry Healthy", description: "All students already have valid Portal PINs." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return

    setLoading(true)
    
    try {
      const batch = writeBatch(db)
      let finalParentId = linkedParentId
      let studentId = editingStudent?.id
      let finalAdmissionNumber = studentForm.admissionNumber
      let finalPin = studentForm.studentPin

      if (!editingStudent) {
        finalAdmissionNumber = await generateInstitutionId('STU', institutionId, institution?.schoolCode);
        finalPin = generateStudentPin();
        
        const secondaryAppName = `student-provision-${Date.now()}`
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName)
        const secondaryAuth = getAuth(secondaryApp)
        const studentEmail = `${finalAdmissionNumber.toLowerCase()}@system.yebfa.com`;
        
        try {
          const credential = await createUserWithEmailAndPassword(secondaryAuth, studentEmail, finalPin)
          const authUser = credential.user
          
          batch.set(doc(db, "users", authUser.uid), {
            uid: authUser.uid,
            name: `${studentForm.firstName} ${studentForm.lastName}`,
            email: studentEmail,
            role: "student",
            tenantId: institutionId,
            institutionId: institutionId,
            status: "active",
            createdAt: serverTimestamp()
          })
        } catch (authErr: any) {
          if (authErr.code !== 'auth/email-already-in-use') throw authErr;
        }
      }

      if (isNewParent && !editingStudent) {
        const finalParentNumber = await generateInstitutionId('PAR', institutionId, institution?.schoolCode);
        const cleanPass = normalizeSecurityPhone(newParentForm.phone);
        
        const secondaryAppName = `parent-provision-${Date.now()}`
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName)
        const secondaryAuth = getAuth(secondaryApp)
        const parentEmail = newParentForm.email || `${finalParentNumber.toLowerCase()}@system.yebfa.com`;
        
        try {
          const credential = await createUserWithEmailAndPassword(secondaryAuth, parentEmail, cleanPass)
          const parentAuthUser = credential.user
          
          batch.set(doc(db, "users", parentAuthUser.uid), {
            uid: parentAuthUser.uid,
            name: `${newParentForm.firstName} ${newParentForm.lastName}`,
            email: parentEmail,
            role: "parent",
            tenantId: institutionId,
            institutionId: institutionId,
            status: "active",
            createdAt: serverTimestamp()
          })
        } catch (authErr: any) {
          if (authErr.code !== 'auth/email-already-in-use') throw authErr;
        }

        const parentRef = doc(collection(db, "parents"))
        finalParentId = parentRef.id
        batch.set(parentRef, {
          ...newParentForm,
          parentNumber: finalParentNumber,
          phone: normalizeSecurityPhone(newParentForm.phone),
          email: parentEmail,
          id: finalParentId,
          tenantId: institutionId,
          institutionId: institutionId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      }

      const studentData = {
        ...studentForm,
        admissionNumber: finalAdmissionNumber,
        studentPin: finalPin,
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
      toast({ title: editingStudent ? "Registry Synchronized" : "Enrollment Successful", description: `ID: ${finalAdmissionNumber} • PIN: ${finalPin}` })
      setIsEnrollOpen(false); setEditingStudent(null); setStudentForm(initialForm); setActiveStep("identity")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: error.message });
    } finally { setLoading(false) }
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !institutionId) return

    setBulkLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db)
          const rows = results.data as any[]
          
          for (const row of rows) {
            if (!row.firstName || !row.lastName) continue;

            const finalAdmissionNumber = await generateInstitutionId('STU', institutionId, institution?.schoolCode);
            const finalPin = generateStudentPin();
            
            const studentRef = doc(collection(db, "students"))
            batch.set(studentRef, {
              firstName: row.firstName,
              lastName: row.lastName,
              gender: row.gender || "Male",
              gradeLevel: row.grade || row.gradeLevel || "Unassigned",
              dateOfBirth: row.dob || row.dateOfBirth || "",
              admissionNumber: finalAdmissionNumber,
              studentPin: finalPin,
              tenantId: institutionId,
              institutionId,
              status: "active",
              id: studentRef.id,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
          }

          await batch.commit()
          toast({ title: "Bulk Intake Successful", description: `Enrolled ${rows.length} students into the registry.` })
          setIsBulkOpen(false)
        } catch (error: any) {
          toast({ variant: "destructive", title: "Bulk Intake Failed", description: error.message })
        } finally {
          setBulkLoading(false)
        }
      }
    })
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Student Registry</h1>
          <p className="text-muted-foreground font-medium">Strategic institutional enrollment and ID/PIN management.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            className="h-11 rounded-xl gap-2 text-xs font-bold uppercase"
            onClick={handleSyncCredentials}
            disabled={syncing || rawStudents.length === 0}
          >
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Sync Credentials
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => setIsBulkOpen(true)}>
            <FileSpreadsheet className="size-4 mr-2" /> Bulk Intake
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" asChild><Link href="/dashboard/students/id-cards"><IdCard className="size-4 mr-2" /> ID Cards</Link></Button>
          <Button className="bg-primary rounded-xl h-11 shadow-lg gap-2" onClick={() => { setEditingStudent(null); setStudentForm(initialForm); setIsEnrollOpen(true); setActiveStep("identity"); }}>
            <UserPlus className="size-4" /> Enroll Student
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b py-6 p-4 md:p-6 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search records..." className="pl-10 h-12 bg-white border-none rounded-xl shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/5 text-primary border-none text-[10px] font-bold uppercase tracking-widest px-4 h-10 flex items-center">
                {rawStudents.length} Students Total
              </Badge>
              <div className="flex items-center gap-1.5 p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shadow-sm px-3">
                <LockKeyhole className="size-3.5" />
                <span className="text-[10px] font-bold uppercase">PIN Protection Active</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold px-6">STUDENT / REGISTRY ID</TableHead>
                <TableHead className="py-4 font-bold">GRADE</TableHead>
                <TableHead className="py-4 font-bold">PORTAL PIN</TableHead>
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
                  <TableRow key={stu.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell className="px-6">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center overflow-hidden border">
                          {stu.photoUrl ? <img src={stu.photoUrl} className="w-full h-full object-cover" /> : <User className="size-5 text-primary/20" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">{stu.firstName} {stu.lastName}</span>
                          <span className="text-[10px] font-mono font-bold text-accent">{stu.admissionNumber}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm font-bold text-slate-700">{stu.gradeLevel}</span></TableCell>
                    <TableCell>
                      <Badge className="h-7 px-3 text-xs font-mono bg-primary text-white border-none shadow-sm gap-2 font-bold">
                        <Key className="size-3 text-accent" />
                        {stu.studentPin || '----'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="font-bold">{parent ? `${parent.firstName} ${parent.lastName}` : "No Primary"}</span>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">{mainRel?.relationship || "Unlinked"}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={`text-[9px] uppercase font-bold ${stu.status === 'active' ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-50'}`}>
                      {stu.status}
                    </Badge></TableCell>
                    <TableCell className="text-right px-6">
                       <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(stu)}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDoc(doc(db!, "students", stu.id))}><Trash2 className="size-4" /></Button>
                       </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {studentsList.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-32 text-muted-foreground italic">No student roster detected in your institutional registry.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                    <div className="space-y-2">
                       <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admission # (Transactional)</Label>
                       <div className="h-11 px-4 rounded-xl bg-slate-50 flex items-center border border-dashed border-slate-200">
                          <Badge variant="secondary" className="font-mono text-xs font-bold uppercase bg-slate-200 text-slate-600 border-none">
                             {studentForm.admissionNumber}
                          </Badge>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Portal Access PIN</Label>
                       <div className="h-11 px-4 rounded-xl bg-slate-50 flex items-center border border-dashed border-slate-200">
                          <Badge className="font-mono text-xs font-bold uppercase bg-primary text-white border-none shadow-sm px-3">
                             {studentForm.studentPin || '----'}
                          </Badge>
                       </div>
                    </div>
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
                        <p className="text-xs text-muted-foreground">Transactional IDs ensure unique parent profiles.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg gap-2" onClick={() => setIsNewParent(!isNewParent)}>
                        {isNewParent ? <Search className="size-3.5" /> : <UserPlus className="size-3.5" />}
                        {isNewParent ? "Registry Search" : "Register New Profile"}
                      </Button>
                   </div>
                   
                   {isNewParent ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-50 rounded-2xl border-2 border-dashed animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Parent # (Transactional)</Label>
                           <div className="h-11 px-4 rounded-xl bg-white flex items-center border border-dashed border-slate-200">
                              <Badge variant="secondary" className="font-mono text-xs font-bold uppercase bg-slate-200 text-slate-600 border-none">
                                 {newParentForm.parentNumber}
                              </Badge>
                           </div>
                        </div>
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
                              <SelectValue placeholder="🔍 Search registry by name or ID..." />
                           </SelectTrigger>
                           <SelectContent>
                              {parents.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} • {p.parentNumber}</SelectItem>)}
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
                   <p className="text-sm text-muted-foreground max-w-sm mx-auto">Unique Student IDs and Portal PINs will be generated at the point of commit to ensure registry integrity.</p>
                   <div className="p-4 bg-slate-50 rounded-2xl border flex items-center justify-center gap-3">
                      <KeyRound className="size-5 text-primary" />
                      <span className="text-xs font-bold text-primary uppercase">Contextual Identity Handshake Active</span>
                   </div>
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

      {/* Bulk Intake Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">Bulk Student Intake</DialogTitle>
            <DialogDescription>Enroll entire classes using a CSV template. Transactional IDs and PINs will be auto-generated.</DialogDescription>
          </DialogHeader>
          <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-muted/5 space-y-6">
            <div className="size-20 bg-primary/5 rounded-full flex items-center justify-center text-primary/30">
               {bulkLoading ? <Loader2 className="size-10 animate-spin" /> : <Upload className="size-10" />}
            </div>
            <div className="text-center px-8">
               <p className="text-sm font-bold text-primary">Upload Enrollment CSV</p>
               <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Columns: firstName, lastName, gender, grade, dob</p>
            </div>
            <div className="relative">
               <input 
                type="file" 
                accept=".csv" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleBulkUpload}
                disabled={bulkLoading}
               />
               <Button className="bg-primary rounded-xl font-bold shadow-lg" disabled={bulkLoading}>
                  {bulkLoading ? "Synchronizing Registry..." : "Select File"}
               </Button>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 rounded-b-2xl border-t">
             <Button variant="ghost" className="w-full text-xs font-bold uppercase gap-2" asChild>
                <a href="data:text/csv;charset=utf-8,firstName,lastName,gender,grade,dob" download="student_enrollment_template.csv">
                   <Download className="size-4" /> Download Template
                </a>
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
