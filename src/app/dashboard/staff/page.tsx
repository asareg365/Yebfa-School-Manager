
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

  const { data: rawStaff = [], loading: dataLoading } = useCollection(staffQuery)

  const staffList = useMemo(() => {
    return rawStaff.filter(s => 
      `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.staffNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (a.staffNumber || "").localeCompare(b.staffNumber || ""));
  }, [rawStaff, searchQuery]);

  // Robust ID Generation logic (Identify Max + 1)
  useEffect(() => {
    if (isEnrollOpen && !dataLoading && !editingStaff && institutionId) {
      const numbers = rawStaff
        .map(s => {
          const raw = s.staffNumber || "";
          const match = raw.match(/(\d+)/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter(n => !isNaN(n));
      
      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextNum = maxNum + 1;
      const autoId = `EMP-${String(nextNum).padStart(3, '0')}`;
      
      if (staffForm.staffNumber !== autoId) {
        setStaffForm(prev => ({ ...prev, staffNumber: autoId }));
      }
    }
  }, [isEnrollOpen, dataLoading, rawStaff, editingStaff, institutionId]);

  const normalizePhone = (num: string) => {
    if (!num) return "";
    let clean = num.replace(/\s+/g, '').replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '');
    if (clean.startsWith('+233')) return '0' + clean.slice(4);
    if (clean.startsWith('233') && clean.length > 9) return '0' + clean.slice(3);
    return clean;
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return

    if (!staffForm.email) {
      toast({ variant: "destructive", title: "Email Required", description: "Staff must have an email for system authentication." });
      return;
    }

    setLoading(true)
    try {
      const cleanPhone = normalizePhone(staffForm.phone)
      
      // 1. Handle Auth Provisioning for new staff
      let authUser;
      if (!editingStaff) {
        const secondaryAppName = `secondary-staff-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const secondaryApp = getApps().find(a => a.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName)
        const secondaryAuth = getAuth(secondaryApp)
        
        try {
          const credential = await createUserWithEmailAndPassword(secondaryAuth, staffForm.email, cleanPhone)
          authUser = credential.user
        } catch (authErr: any) {
          if (authErr.code !== 'auth/email-already-in-use') throw authErr;
        }
      }

      // 2. Sync Firestore Registry
      const data = {
        ...staffForm,
        phone: cleanPhone,
        salary: parseFloat(staffForm.salary as string) || 0,
        tenantId: institutionId,
        institutionId: institutionId,
        updatedAt: serverTimestamp()
      }

      if (editingStaff) {
        const { id, createdAt, ...sanitizedData } = data as any;
        await updateDoc(doc(db, "staff", editingStaff.id), sanitizedData);
        toast({ title: "HR Registry Synchronized" });
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
        toast({ title: "Staff Managed", description: `${staffForm.firstName} enrolled.` });
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
      <p className="font-headline font-bold text-primary animate-pulse uppercase tracking-widest text-xs">Syncing HR Registry...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">HR Management Hub</h1>
          <p className="text-muted-foreground">Strategic oversight of faculty registry and payroll.</p>
        </div>
        <Button className="gap-2 bg-primary rounded-xl h-12 shadow-lg px-6 font-bold" onClick={() => { setEditingStaff(null); setStaffForm(initialForm); setIsEnrollOpen(true); }}>
          <UserPlus className="size-5" /> Enroll Faculty
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b py-6 bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or EMP ID..." 
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
                <TableHead className="py-4 font-bold">DESIGNATION</TableHead>
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
                  <TableCell><span className="text-xs font-bold text-slate-700">{s.designation}</span></TableCell>
                  <TableCell><span className="text-xs font-medium">{s.phone}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold text-green-600 border-green-200 bg-green-50">{s.status}</Badge></TableCell>
                  <TableCell className="text-right px-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDoc(doc(db!, "staff", s.id))}><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {staffList.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-32 text-muted-foreground italic">No professional records detected.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Enrollment Wizard Dialog */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleEnroll} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0">
              <DialogTitle className="text-2xl font-headline font-bold">{editingStaff ? "Update Registry" : "Faculty HR Enrollment"}</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Building a strategic professional record.</DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>EMP Number (Auto)</Label><Input readOnly value={dataLoading ? "Calculating..." : staffForm.staffNumber} className="h-12 rounded-xl bg-slate-50 font-bold font-mono" /></div>
                <div className="space-y-2"><Label>First Name</Label><Input required value={staffForm.firstName} onChange={e => setStaffForm({...staffForm, firstName: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input required value={staffForm.lastName} onChange={e => setStaffForm({...staffForm, lastName: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Phone Number</Label><Input required value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Email Address (Portal ID)</Label><Input type="email" required value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Employment Date</Label><Input type="date" value={staffForm.employmentDate} onChange={e => setStaffForm({...staffForm, employmentDate: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Monthly Salary (GH₵)</Label><Input type="number" required value={staffForm.salary} onChange={e => setStaffForm({...staffForm, salary: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Professional Designation</Label><Input required value={staffForm.designation} onChange={e => setStaffForm({...staffForm, designation: e.target.value})} className="h-12 rounded-xl" /></div>
              </div>
            </ScrollArea>

            <DialogFooter className="bg-slate-50 p-8 border-t shrink-0">
              <Button type="submit" disabled={loading || dataLoading} className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl text-lg gap-2">
                {loading ? <Loader2 className="mr-2 animate-spin" /> : <ShieldCheck className="size-5" />} 
                Authorize Registry Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
