
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
  Save
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
    medical: {
      allergies: "",
      specialNeeds: "",
      disability: "",
      doctor: ""
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
    
    const data = {
      ...studentForm,
      tenantId: institutionId,
      institutionId: institutionId,
      updatedAt: serverTimestamp()
    }

    try {
      if (editingStudent) {
        const { id, ...sanitizedData } = data as any;
        await updateDoc(doc(db, "students", editingStudent.id), sanitizedData);
        toast({ title: "Registry Updated", description: `${studentForm.firstName}'s profile has been synchronized.` });
      } else {
        await addDoc(collection(db, "students"), {
          ...data,
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
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
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
              <DialogTitle className="text-2xl font-headline font-bold">{editingStudent ? "Update Profile" : "Authorized Enrollment"}</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Institutional data synchronization in progress.</DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2"><User className="size-3.5" /> Identity</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>First Name</Label><Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Last Name</Label><Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Admission #</Label><Input readOnly value={studentForm.admissionNumber} className="h-11 rounded-xl bg-slate-50 font-bold" /></div>
                    <div className="space-y-2"><Label>Grade Level</Label>
                      <Select value={studentForm.gradeLevel} onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{registeredClasses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2"><IdCard className="size-3.5" /> Family Context</h3>
                   <div className="space-y-2"><Label>Select Parent / Guardian</Label>
                      <Select value={studentForm.parentId} onValueChange={v => setStudentForm({...studentForm, parentId: v})}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choose from Hub" /></SelectTrigger>
                        <SelectContent>{parents.map(p => <SelectItem key={p.id} value={p.id}>{p.guardianName} ({p.phone})</SelectItem>)}</SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2"><Label>House / Dormitory</Label><Input value={studentForm.house} onChange={e => setStudentForm({...studentForm, house: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Aggrey House" /></div>
                </div>
              </div>
            </ScrollArea>

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
                <div className="size-24 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border-2 border-white/20">
                  {selectedStudent?.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover" /> : <User className="size-12 opacity-50" />}
                </div>
                <div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">Live Profile Registry</span>
                   <DialogTitle className="text-3xl font-headline font-bold">{selectedStudent?.firstName} {selectedStudent?.lastName}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> {selectedStudent?.admissionNumber}</span>
                      <span className="flex items-center gap-1.5"><GraduationCap className="size-3.5" /> {selectedStudent?.gradeLevel}</span>
                   </DialogDescription>
                </div>
             </DialogHeader>

             <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="bg-muted/30 px-8 py-2 border-b shrink-0 overflow-x-auto no-scrollbar justify-start gap-4">
                   <TabsTrigger value="overview">Overview</TabsTrigger>
                   <TabsTrigger value="attendance">Attendance</TabsTrigger>
                   <TabsTrigger value="fees">Fees</TabsTrigger>
                   <TabsTrigger value="results">Results</TabsTrigger>
                   <TabsTrigger value="medical">Medical</TabsTrigger>
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
                   </TabsContent>

                   <TabsContent value="attendance" className="mt-0">
                      <div className="p-12 text-center text-muted-foreground opacity-30 italic">Awaiting Cycle Roll Call data...</div>
                   </TabsContent>
                   
                   <TabsContent value="fees" className="mt-0">
                      <div className="p-12 text-center text-muted-foreground opacity-30 italic">Syncing personal ledger for GH₵...</div>
                   </TabsContent>

                   <TabsContent value="medical" className="mt-0 space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                         <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground border-b pb-2 flex items-center gap-2"><Stethoscope className="size-3.5" /> Vital Stats</h4>
                            <div className="space-y-3">
                               <div className="flex justify-between text-sm"><span>Blood Group</span><span className="font-bold">{selectedStudent?.bloodGroup || "Not Specified" }</span></div>
                               <div className="flex justify-between text-sm"><span>Allergies</span><span className="font-bold text-destructive">{selectedStudent?.medical?.allergies || "None Reported" }</span></div>
                            </div>
                         </div>
                      </div>
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
