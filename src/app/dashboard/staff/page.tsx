"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { 
  UserPlus, 
  Trash2, 
  Pencil, 
  Loader2, 
  ShieldCheck, 
  Search,
  Save,
  Briefcase,
  GraduationCap,
  Calendar,
  Wallet,
  Clock,
  History,
  TrendingUp,
  FileText,
  User,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Building2,
  Award
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc, setDoc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { initializeApp, getApp, getApps } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"

export default function StaffHRPage() {
  const db = useFirestore()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const initialForm = {
    staffNumber: "",
    firstName: "",
    lastName: "",
    gender: "Male",
    phone: "",
    email: "",
    qualification: "Bachelor of Education",
    departmentId: "Academics",
    designation: "Teacher",
    employmentDate: "",
    salary: "",
    salaryScale: "Senior Staff",
    bankName: "",
    bankAccount: "",
    ssnitNumber: "",
    tin: "",
    status: "active",
    promotionHistory: [],
    leaveBalance: 20
  }

  const [staffForm, setStaffForm] = useState(initialForm)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
    setStaffForm(prev => ({
      ...prev,
      employmentDate: new Date().toISOString().split('T')[0]
    }))
  }, [])

  // Core Queries
  const staffQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "staff"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const assignmentsQuery = useMemo(() => {
    if (!db || !institutionId || !selectedStaff) return null;
    return query(collection(db, "teacher_assignments"), where("teacherId", "==", selectedStaff.id));
  }, [db, institutionId, selectedStaff]);

  const payrollQuery = useMemo(() => {
    if (!db || !institutionId || !selectedStaff) return null;
    return query(collection(db, "payroll_records"), where("staffId", "==", selectedStaff.id));
  }, [db, institutionId, selectedStaff]);

  const attendanceQuery = useMemo(() => {
    if (!db || !institutionId || !selectedStaff) return null;
    return query(collection(db, "staff_attendance"), where("staffId", "==", selectedStaff.id));
  }, [db, institutionId, selectedStaff]);

  const { data: rawStaff = [], loading: dataLoading } = useCollection(staffQuery)
  const { data: assignments = [] } = useCollection(assignmentsQuery)
  const { data: payRecords = [] } = useCollection(payrollQuery)
  const { data: attendance = [] } = useCollection(attendanceQuery)

  const staffList = useMemo(() => {
    return rawStaff.filter(s => 
      `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.staffNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (a.staffNumber || "").localeCompare(b.staffNumber || ""));
  }, [rawStaff, searchQuery]);

  // Robust ID Generation logic
  useEffect(() => {
    if (isEnrollOpen && !dataLoading && !editingStaff) {
      const numbers = rawStaff
        .map(s => {
          const raw = s.staffNumber || "";
          const match = raw.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        })
        .filter(n => !isNaN(n));
      
      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextNum = maxNum + 1;
      const autoId = `EMP-${String(nextNum).padStart(3, '0')}`;
      
      if (staffForm.staffNumber !== autoId) {
        setStaffForm(prev => ({ ...prev, staffNumber: autoId }));
      }
    }
  }, [isEnrollOpen, dataLoading, rawStaff, editingStaff, staffForm.staffNumber]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return

    if (!staffForm.email) {
      toast({ variant: "destructive", title: "Email Required", description: "Staff must have an email for system authentication." });
      return;
    }

    setLoading(true)
    try {
      // 1. Handle Auth Provisioning for new staff
      let authUser;
      if (!editingStaff) {
        const secondaryAppName = `secondary-staff-${Date.now()}`
        const secondaryApp = getApps().find(a => a.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName)
        const secondaryAuth = getAuth(secondaryApp)
        
        try {
          const credential = await createUserWithEmailAndPassword(secondaryAuth, staffForm.email, staffForm.phone)
          authUser = credential.user
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            console.warn("Staff Auth record exists.");
          } else {
            throw authErr;
          }
        }
      }

      // 2. Sync Firestore Registry
      const data = {
        ...staffForm,
        salary: parseFloat(staffForm.salary as string) || 0,
        tenantId: institutionId,
        institutionId: institutionId,
        updatedAt: serverTimestamp()
      }

      if (editingStaff) {
        const { id, createdAt, ...sanitizedData } = data as any;
        await updateDoc(doc(db, "staff", editingStaff.id), sanitizedData);
        toast({ title: "HR Registry Synchronized", description: `${staffForm.firstName}'s professional profile updated.` });
      } else {
        const staffRef = doc(collection(db, "staff"))
        await setDoc(staffRef, {
          ...data,
          id: staffRef.id,
          createdAt: serverTimestamp()
        });

        if (authUser) {
          await setDoc(doc(db, "users", authUser.uid), {
            uid: authUser.uid,
            name: `${staffForm.firstName} ${staffForm.lastName}`,
            email: staffForm.email,
            role: staffForm.designation.toLowerCase().includes('teacher') ? "teacher" : "administrator",
            tenantId: institutionId,
            institutionId: institutionId,
            status: "active",
            createdAt: serverTimestamp()
          })
        }
        toast({ title: "Staff Managed", description: `${staffForm.firstName} is now enrolled in the HR ecosystem.` });
      }
      setIsEnrollOpen(false);
      setEditingStaff(null);
      setStaffForm(initialForm);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed", description: error.message });
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (s: any) => {
    setEditingStaff(s);
    setStaffForm({ ...initialForm, ...s });
    setIsEnrollOpen(true);
  }

  if (dataLoading) return (
    <div className="p-24 text-center space-y-4">
      <Loader2 className="size-10 animate-spin text-primary mx-auto" />
      <p className="font-headline font-bold text-primary animate-pulse uppercase tracking-widest text-xs">Syncing HR Institutional Intelligence...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">HR Management Hub</h1>
          <p className="text-muted-foreground">Strategic oversight of faculty registry, payroll, and academic performance.</p>
        </div>
        <Button className="gap-2 bg-primary rounded-xl h-12 shadow-lg px-6 font-bold" onClick={() => { setEditingStaff(null); setStaffForm(initialForm); setIsEnrollOpen(true); }}>
          <UserPlus className="size-5" /> Enroll Faculty
        </Button>
      </div>

      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Faculty", value: staffList.length, label: "Active Registry", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Academic Staff", value: staffList.filter(s => s.departmentId === 'Academics').length, label: "Subject Masters", icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
          { title: "Monthly Liability", value: `GH₵ ${staffList.reduce((a,c:any)=>a+(parseFloat(c.salary)||0),0).toLocaleString()}`, label: "Total Payroll", icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
          { title: "Leave Active", value: "0", label: "Current Absences", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" }
        ].map((stat) => (
          <Card key={stat.title} className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.title}</CardTitle>
              <div className={`size-8 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}><stat.icon className={`size-4 ${stat.color}`} /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline truncate">{stat.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase truncate">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b py-6 bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search HR database by name or EMP ID..." 
              className="pl-10 h-12 bg-white border-none rounded-xl shadow-sm" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold px-6">ID / NAME</TableHead>
                <TableHead className="py-4 font-bold">DESIGNATION & SCALE</TableHead>
                <TableHead className="py-4 font-bold">CONTACT</TableHead>
                <TableHead className="py-4 font-bold">STATUS</TableHead>
                <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map((s: any) => (
                <TableRow key={s.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setSelectedStaff(s); setIsProfileOpen(true); }}>
                  <TableCell className="px-6">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-primary text-xs shrink-0 border">
                        {(s.firstName || "S").charAt(0)}{(s.lastName || "T").charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-accent">{s.staffNumber}</span>
                        <span className="font-bold text-primary text-sm">{s.firstName} {s.lastName}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{s.designation}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">{s.salaryScale}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="font-medium">{s.phone}</span>
                      <span className="text-muted-foreground text-[10px]">{s.email}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold text-green-600 border-green-200 bg-green-50">{s.status}</Badge></TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/5" onClick={() => openEdit(s)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/5" onClick={() => deleteDoc(doc(db!, "staff", s.id))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {staffList.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-32 text-muted-foreground italic">No professional records detected in registry.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Profile Detail Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col bg-white">
           <div className="flex flex-col h-full overflow-hidden">
              <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0 flex flex-row items-center gap-6">
                 <div className="size-24 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border-2 border-white/20 overflow-hidden">
                    <User className="size-12 opacity-50" />
                 </div>
                 <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">Professional Registry Profile</span>
                    <DialogTitle className="text-3xl font-headline font-bold">{selectedStaff?.firstName} {selectedStaff?.lastName}</DialogTitle>
                    <DialogDescription className="text-primary-foreground/70 mt-1 flex items-center gap-6">
                       <span className="flex items-center gap-1.5 font-mono text-xs"><ShieldCheck className="size-4" /> {selectedStaff?.staffNumber}</span>
                       <span className="flex items-center gap-1.5 font-bold text-xs"><Award className="size-4" /> {selectedStaff?.designation}</span>
                       <span className="flex items-center gap-1.5 font-bold text-xs"><Building2 className="size-4" /> {selectedStaff?.departmentId}</span>
                    </DialogDescription>
                 </div>
              </DialogHeader>

              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                 <TabsList className="bg-muted/30 px-8 py-2 border-b shrink-0 overflow-x-auto no-scrollbar justify-start gap-4">
                    <TabsTrigger value="overview" className="gap-2"><Briefcase className="size-4" /> Professional</TabsTrigger>
                    <TabsTrigger value="academic" className="gap-2"><GraduationCap className="size-4" /> Academic Load</TabsTrigger>
                    <TabsTrigger value="attendance" className="gap-2"><Clock className="size-4" /> Attendance</TabsTrigger>
                    <TabsTrigger value="payroll" className="gap-2"><Wallet className="size-4" /> Payroll Slips</TabsTrigger>
                    <TabsTrigger value="history" className="gap-2"><History className="size-4" /> HR Log</TabsTrigger>
                 </TabsList>

                 <ScrollArea className="flex-1 p-8">
                    <TabsContent value="overview" className="mt-0 space-y-8">
                       <div className="grid gap-6 md:grid-cols-3">
                          <div className="p-4 rounded-2xl bg-slate-50 border space-y-1">
                             <span className="text-[10px] font-bold uppercase text-muted-foreground">Salary Scale</span>
                             <p className="font-bold text-primary">{selectedStaff?.salaryScale || "Standard"}</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-50 border space-y-1">
                             <span className="text-[10px] font-bold uppercase text-muted-foreground">Leave Balance</span>
                             <p className="font-bold text-primary">{selectedStaff?.leaveBalance || 20} Days Remaining</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-50 border space-y-1">
                             <span className="text-[10px] font-bold uppercase text-muted-foreground">SSNIT Registry</span>
                             <p className="font-mono font-bold text-primary">{selectedStaff?.ssnitNumber || "Unlisted"}</p>
                          </div>
                       </div>

                       <div className="grid gap-8 md:grid-cols-2">
                          <div className="space-y-4">
                             <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2"><Award className="size-4" /> Credentials</h4>
                             <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                                <p className="text-sm font-bold text-primary">{selectedStaff?.qualification}</p>
                                <p className="text-xs text-muted-foreground mt-1 italic">Authorized for {selectedStaff?.departmentId} instruction.</p>
                             </div>
                          </div>
                          <div className="space-y-4">
                             <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2"><TrendingUp className="size-4" /> Career Metrics</h4>
                             <div className="space-y-2">
                                <div className="flex justify-between text-sm"><span>Employment Date</span><span className="font-bold">{selectedStaff?.employmentDate}</span></div>
                                <div className="flex justify-between text-sm"><span>Net Base Salary</span><span className="font-bold text-primary">GH₵ {selectedStaff?.salary?.toLocaleString()}</span></div>
                             </div>
                          </div>
                       </div>
                    </TabsContent>

                    <TabsContent value="academic" className="mt-0">
                       <div className="space-y-6">
                          <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                             <div className="space-y-1">
                                <h4 className="text-lg font-bold text-blue-900">Current Workload</h4>
                                <p className="text-sm text-blue-700">Live assignment registry for {selectedStaff?.firstName}.</p>
                             </div>
                             <GraduationCap className="size-10 text-blue-200" />
                          </div>
                          <div className="grid gap-4">
                             {assignments.map((a: any) => (
                               <div key={a.id} className="p-4 rounded-xl border bg-white flex items-center justify-between hover:shadow-md transition-shadow">
                                  <div className="flex items-center gap-3">
                                     <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center"><BookOpen className="size-4 text-slate-600" /></div>
                                     <span className="font-bold text-sm">Subject ID: {a.subjectId}</span>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">Class ID: {a.classId}</Badge>
                               </div>
                             ))}
                             {assignments.length === 0 && (
                               <div className="p-20 text-center text-muted-foreground opacity-30 italic">No academic assignments recorded in registry.</div>
                             )}
                          </div>
                       </div>
                    </TabsContent>

                    <TabsContent value="payroll" className="mt-0">
                       <div className="overflow-hidden border rounded-2xl">
                          <Table>
                             <TableHeader className="bg-muted/30"><TableRow><TableHead>Period</TableHead><TableHead>Net Pay</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Reference</TableHead></TableRow></TableHeader>
                             <TableBody>
                                {payRecords.map((p: any) => (
                                  <TableRow key={p.id}>
                                     <TableCell className="font-bold text-xs">{p.month} {p.year}</TableCell>
                                     <TableCell className="font-bold">GH₵ {p.netSalary.toLocaleString()}</TableCell>
                                     <TableCell><Badge className="bg-green-600 text-[8px] uppercase">Disbursed</Badge></TableCell>
                                     <TableCell className="text-right font-mono text-[10px] text-muted-foreground">{p.id.substring(0, 8)}</TableCell>
                                  </TableRow>
                                ))}
                                {payRecords.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No historical pay slips detected.</TableCell></TableRow>}
                             </TableBody>
                          </Table>
                       </div>
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-0">
                       <div className="p-20 text-center text-muted-foreground opacity-30 italic flex flex-col items-center gap-4">
                          <Clock className="size-12" />
                          <p>Awaiting institutional faculty attendance data synchronization...</p>
                       </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                       <div className="space-y-6">
                          <section className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                             <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Leave Log</h4>
                             <p className="text-sm text-muted-foreground italic">No active leave requests or historical absences.</p>
                          </section>
                          <section className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                             <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Career Advancements</h4>
                             <div className="space-y-3">
                                <div className="p-3 bg-white rounded-lg border flex justify-between items-center">
                                   <span className="text-xs font-bold">Initial Appointment</span>
                                   <Badge variant="secondary" className="text-[8px]">{selectedStaff?.employmentDate}</Badge>
                                </div>
                             </div>
                          </section>
                       </div>
                    </TabsContent>
                 </ScrollArea>
              </Tabs>

              <DialogFooter className="bg-slate-50 p-6 border-t shrink-0 flex items-center justify-between">
                 <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Authorized HR Access • Global Ecosystem 2026</p>
                 <div className="flex gap-2">
                    <Button variant="outline" className="h-10 text-xs rounded-xl font-bold" onClick={() => setIsProfileOpen(false)}>Close Registry</Button>
                    <Button className="h-10 text-xs rounded-xl bg-primary font-bold px-6" onClick={() => { setIsProfileOpen(false); openEdit(selectedStaff); }}>Modify Record</Button>
                 </div>
              </DialogFooter>
           </div>
        </DialogContent>
      </Dialog>

      {/* Enrollment Wizard Dialog */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleEnroll} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0">
              <DialogTitle className="text-2xl font-headline font-bold">{editingStaff ? "Update Professional Profile" : "Faculty HR Enrollment"}</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Building a strategic professional record for the institutional hub.</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="personal" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="bg-muted/30 px-8 py-2 border-b shrink-0 gap-2">
                <TabsTrigger value="personal" className="rounded-lg">1. Personal Info</TabsTrigger>
                <TabsTrigger value="employment" className="rounded-lg">2. Career Data</TabsTrigger>
                <TabsTrigger value="financial" className="rounded-lg">3. Payroll Registry</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-8">
                <TabsContent value="personal" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">First Name</Label><Input required value={staffForm.firstName} onChange={e => setStaffForm({...staffForm, firstName: e.target.value})} className="h-12 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Last Name</Label><Input required value={staffForm.lastName} onChange={e => setStaffForm({...staffForm, lastName: e.target.value})} className="h-12 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Gender</Label>
                      <Select value={staffForm.gender} onValueChange={v => setStaffForm({...staffForm, gender: v})}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Phone Number</Label><Input required value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
                    <div className="space-y-2 md:col-span-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Email Address (System Login)</Label><Input type="email" required value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} className="h-12 rounded-xl" /></div>
                  </div>
                </TabsContent>

                <TabsContent value="employment" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">EMP Number (Auto)</Label><Input readOnly value={staffForm.staffNumber} className="h-12 rounded-xl bg-slate-50 font-bold font-mono" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Employment Date</Label><Input type="date" value={staffForm.employmentDate} onChange={e => setStaffForm({...staffForm, employmentDate: e.target.value})} className="h-12 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Professional Designation</Label><Input required value={staffForm.designation} onChange={e => setStaffForm({...staffForm, designation: e.target.value})} className="h-12 rounded-xl" placeholder="e.g. Senior Master" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Department Hub</Label>
                      <Select value={staffForm.departmentId} onValueChange={v => setStaffForm({...staffForm, departmentId: v})}>
                         <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="Academics">Academics</SelectItem>
                            <SelectItem value="Administration">Administration</SelectItem>
                            <SelectItem value="Accounts">Accounts</SelectItem>
                            <SelectItem value="Logistics">Logistics</SelectItem>
                         </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Academic Qualification</Label><Input value={staffForm.qualification} onChange={e => setStaffForm({...staffForm, qualification: e.target.value})} className="h-12 rounded-xl" placeholder="e.g. B.Ed English & Literature" /></div>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Salary Scale</Label>
                       <Select value={staffForm.salaryScale} onValueChange={v => setStaffForm({...staffForm, salaryScale: v})}>
                          <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                             <SelectItem value="Junior Staff">Junior Staff</SelectItem>
                             <SelectItem value="Senior Staff">Senior Staff</SelectItem>
                             <SelectItem value="Principal Officer">Principal Officer</SelectItem>
                             <SelectItem value="Management">Management Hub</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Gross Monthly Salary (GH₵)</Label><Input type="number" required value={staffForm.salary} onChange={e => setStaffForm({...staffForm, salary: e.target.value})} className="h-12 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Bank Name</Label><Input value={staffForm.bankName} onChange={e => setStaffForm({...staffForm, bankName: e.target.value})} className="h-12 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Bank Account Number</Label><Input value={staffForm.bankAccount} onChange={e => setStaffForm({...staffForm, bankAccount: e.target.value})} className="h-12 rounded-xl font-mono" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">SSNIT Number</Label><Input value={staffForm.ssnitNumber} onChange={e => setStaffForm({...staffForm, ssnitNumber: e.target.value})} className="h-12 rounded-xl font-mono" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground">TIN (Ghana Revenue)</Label><Input value={staffForm.tin} onChange={e => setStaffForm({...staffForm, tin: e.target.value})} className="h-12 rounded-xl font-mono" /></div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="bg-slate-50 p-8 border-t shrink-0">
              <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl text-lg gap-2">
                {loading ? <Loader2 className="mr-2 animate-spin" /> : <ShieldCheck className="size-5" />} 
                {editingStaff ? "Authorize Registry Update" : "Authorize HR Enrollment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
