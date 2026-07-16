
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Pencil, 
  Loader2, 
  Upload, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Banknote, 
  GraduationCap, 
  Briefcase, 
  User, 
  HeartHandshake,
  Search,
  Filter,
  Check,
  X
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc, orderBy } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

const STAFF_ROLES = [
  "teacher", 
  "accountant", 
  "librarian", 
  "receptionist", 
  "cleaner", 
  "security", 
  "ict", 
  "headmaster", 
  "administrator"
]

const CONTRACT_TYPES = ["Full-time", "Part-time", "Contract"]

export default function StaffPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [staffForm, setStaffForm] = useState({
    fullName: "",
    role: "teacher",
    department: "Academics",
    staffId: "",
    email: "",
    phoneNumber: "",
    qualification: "",
    salary: "",
    bankName: "",
    accountNumber: "",
    ssnitNumber: "",
    nssfNumber: "",
    nextOfKinName: "",
    nextOfKinPhone: "",
    joiningDate: new Date().toISOString().split('T')[0],
    contractType: "Full-time",
    photoUrl: ""
  })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const staffQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(
      collection(db, "staff"), 
      where("tenantId", "==", institutionId)
    );
  }, [db, institutionId]);

  const { data: rawStaff, loading: dataLoading } = useCollection(staffQuery)

  const staff = useMemo(() => {
    return rawStaff
      .filter(s => 
        s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.staffId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => (b.staffId || "").localeCompare(a.staffId || ""));
  }, [rawStaff, searchQuery]);

  useEffect(() => {
    if (isEnrollOpen && !staffForm.staffId) {
      const count = rawStaff.length + 1;
      const autoId = `STF-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
      setStaffForm(prev => ({ ...prev, staffId: autoId }));
    }
  }, [isEnrollOpen, rawStaff.length]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setStaffForm(prev => ({ ...prev, photoUrl: reader.result as string }))
      reader.readAsDataURL(file)
    }
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    
    const data = {
      ...staffForm,
      salary: parseFloat(staffForm.salary) || 0,
      tenantId: institutionId,
      institutionId: institutionId,
      createdAt: serverTimestamp()
    }

    try {
      await addDoc(collection(db, "staff"), data)
      toast({ title: "Staff Enrolled", description: `${staffForm.fullName} is now registered.` })
      setIsEnrollOpen(false)
      setStaffForm({
        fullName: "", role: "teacher", department: "Academics", staffId: "", email: "", phoneNumber: "",
        qualification: "", salary: "", bankName: "", accountNumber: "", ssnitNumber: "", nssfNumber: "",
        nextOfKinName: "", nextOfKinPhone: "", joiningDate: new Date().toISOString().split('T')[0],
        contractType: "Full-time", photoUrl: ""
      })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !editingStaff || loading) return
    setLoading(true)
    try {
      await updateDoc(doc(db, "staff", editingStaff.id), {
        ...staffForm,
        salary: parseFloat(staffForm.salary) || 0,
        updatedAt: serverTimestamp()
      })
      toast({ title: "Registry Updated", description: "Employee record synchronized." })
      setIsEditOpen(false)
      setEditingStaff(null)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) return <div className="p-24 text-center animate-pulse font-headline font-bold text-primary">Synchronizing Faculty Records...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary">Human Resources</h1>
          <p className="text-muted-foreground">Managing {staff.length} staff members across all departments.</p>
        </div>
        <Button className="gap-2 bg-primary h-11 rounded-xl shadow-lg shadow-primary/20" onClick={() => setIsEnrollOpen(true)}>
          <UserPlus className="size-4" /> Enroll New Staff
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b py-6">
          <div className="flex items-center gap-4">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, ID or role..." 
                  className="pl-10 h-12 bg-slate-50 border-none rounded-xl" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             <Button variant="outline" className="h-12 rounded-xl border-slate-200"><Filter className="size-4 mr-2" /> Filter</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold">STAFF ID / NAME</TableHead>
                <TableHead className="py-4 font-bold">ROLE & DEPT</TableHead>
                <TableHead className="py-4 font-bold">CONTACT</TableHead>
                <TableHead className="py-4 font-bold">CONTRACT</TableHead>
                <TableHead className="text-right py-4 font-bold">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s: any) => (
                <TableRow key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-primary/5 border flex items-center justify-center overflow-hidden shrink-0">
                        {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="size-5 text-primary/20" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-tighter">{s.staffId}</span>
                        <span className="font-bold text-primary text-sm">{s.fullName}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <Badge variant="outline" className="w-fit text-[9px] uppercase font-bold text-primary border-primary/20 bg-primary/5">{s.role}</Badge>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase mt-1">{s.department}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium flex items-center gap-1.5"><Phone className="size-3 text-muted-foreground" /> {s.phoneNumber || "N/A"}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><Mail className="size-3" /> {s.email || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[9px] uppercase font-bold">{s.contractType || "Full-time"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => {
                        setEditingStaff(s);
                        setStaffForm({...s, salary: s.salary?.toString() || ""});
                        setIsEditOpen(true);
                      }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => deleteDoc(doc(db!, "staff", s.id))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleEnroll} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><ShieldCheck className="size-5" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Faculty Enrollment Hub</span>
              </div>
              <DialogTitle className="text-3xl font-headline font-bold">New Staff Onboarding</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Registering unique credentials for the 2026 academic cycle.</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="personal" className="w-full flex-1 flex flex-col overflow-hidden">
              <div className="bg-muted/30 px-8 py-2 border-b shrink-0">
                <TabsList className="bg-transparent gap-6 p-0 h-10">
                  <TabsTrigger value="personal" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><User className="size-3.5" /> Personal</TabsTrigger>
                  <TabsTrigger value="professional" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><Briefcase className="size-3.5" /> Professional</TabsTrigger>
                  <TabsTrigger value="financial" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full gap-2 text-xs font-bold uppercase"><Banknote className="size-3.5" /> Financial & HR</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-8">
                  <TabsContent value="personal" className="mt-0 space-y-6">
                    <div className="flex flex-col items-center gap-4 mb-8">
                      <div className="size-24 rounded-2xl bg-slate-100 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center">
                        {staffForm.photoUrl ? <img src={staffForm.photoUrl} className="w-full h-full object-cover" /> : <User className="size-10 text-muted-foreground/20" />}
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-9">
                        <Upload className="size-3.5 mr-2" /> Upload Photo
                      </Button>
                    </div>

                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                          <Input required value={staffForm.fullName} onChange={e => setStaffForm({...staffForm, fullName: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Staff Employee ID</Label>
                          <Input readOnly value={staffForm.staffId} className="h-11 rounded-xl bg-slate-50 font-bold text-accent" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                          <Input type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                          <Input value={staffForm.phoneNumber} onChange={e => setStaffForm({...staffForm, phoneNumber: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next of Kin Name</Label>
                          <Input value={staffForm.nextOfKinName} onChange={e => setStaffForm({...staffForm, nextOfKinName: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next of Kin Phone</Label>
                          <Input value={staffForm.nextOfKinPhone} onChange={e => setStaffForm({...staffForm, nextOfKinPhone: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="professional" className="mt-0 space-y-6">
                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Staff Role</Label>
                          <Select onValueChange={v => setStaffForm({...staffForm, role: v})} value={staffForm.role}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{STAFF_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Department</Label>
                          <Input value={staffForm.department} onChange={e => setStaffForm({...staffForm, department: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Science, Accounts" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Highest Qualification</Label>
                          <Input value={staffForm.qualification} onChange={e => setStaffForm({...staffForm, qualification: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Masters in Education" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contract Type</Label>
                          <Select onValueChange={v => setStaffForm({...staffForm, contractType: v})} value={staffForm.contractType}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>{CONTRACT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Joining Date</Label>
                        <Input type="date" value={staffForm.joiningDate} onChange={e => setStaffForm({...staffForm, joiningDate: e.target.value})} className="h-11 rounded-xl" />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="financial" className="mt-0 space-y-6">
                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Salary (GH₵)</Label>
                          <Input type="number" value={staffForm.salary} onChange={e => setStaffForm({...staffForm, salary: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bank Name</Label>
                          <Input value={staffForm.bankName} onChange={e => setStaffForm({...staffForm, bankName: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account Number</Label>
                        <Input value={staffForm.accountNumber} onChange={e => setStaffForm({...staffForm, accountNumber: e.target.value})} className="h-11 rounded-xl" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SSNIT Number (Ghana)</Label>
                          <Input value={staffForm.ssnitNumber} onChange={e => setStaffForm({...staffForm, ssnitNumber: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">NSSF Number (Other)</Label>
                          <Input value={staffForm.nssfNumber} onChange={e => setStaffForm({...staffForm, nssfNumber: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="bg-slate-50 p-8 border-t shrink-0">
              <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20">
                {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : <ShieldCheck className="mr-2 size-5" />}
                Confirm Enrollment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
          <form onSubmit={handleUpdate} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-8 border-b shrink-0"><DialogTitle className="text-2xl font-headline font-bold">Edit Employee Registry</DialogTitle></DialogHeader>
            <ScrollArea className="flex-1">
              <div className="grid gap-6 p-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Full Name</Label><Input required value={staffForm.fullName} onChange={e => setStaffForm({...staffForm, fullName: e.target.value})} className="h-11 rounded-xl" /></div>
                  <div className="space-y-2"><Label>Salary (GH₵)</Label><Input type="number" value={staffForm.salary} onChange={e => setStaffForm({...staffForm, salary: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2"><Label>Role</Label>
                      <Select onValueChange={v => setStaffForm({...staffForm, role: v})} value={staffForm.role}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{STAFF_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2"><Label>Department</Label><Input value={staffForm.department} onChange={e => setStaffForm({...staffForm, department: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-8 bg-slate-50 border-t shrink-0">
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold bg-primary shadow-lg">Authorize Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
