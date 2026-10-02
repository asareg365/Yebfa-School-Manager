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
  User,
  CheckCircle2,
  Activity,
  RefreshCw,
  AlertCircle,
  X,
  Camera,
  Upload
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, deleteDoc, doc, where, serverTimestamp, updateDoc, setDoc, writeBatch, getDocs } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { initializeApp, deleteApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"
import { normalizeSecurityPhone, getInstitutionEmailDomain } from "@/lib/identity-service"
import { generateId } from "@/lib/id-generator"

export default function StaffHRPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialForm = {
    staffNumber: "PENDING",
    firstName: "",
    lastName: "",
    gender: "Male",
    phone: "",
    email: "",
    designation: "Teacher",
    employmentDate: "",
    salary: "",
    status: "active",
    photoURL: ""
  }

  const [staffForm, setStaffForm] = useState(initialForm)

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile, loading: profileLoading } = useDoc(userProfileRef)

  // Safe Context Resolution
  useEffect(() => {
    if (!profileLoading && profile) {
      if (profile.role === 'super_admin') {
        setInstitutionId(localStorage.getItem('selected_institution_id'));
      } else {
        setInstitutionId(profile.tenantId || null);
      }
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    setStaffForm(prev => ({ ...prev, employmentDate: new Date().toISOString().split('T')[0] }))
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const staffQuery = useMemo(() => {
    if (!db || !profile) return null;

    if (profile.role === "super_admin") {
      return query(collection(db, "staff"));
    }

    if (!institutionId) return null;

    return query(
      collection(db, "staff"),
      where("tenantId", "==", institutionId)
    );
  }, [db, profile, institutionId]);

  const { data: rawStaff = [], loading: dataLoading } = useCollection(staffQuery)

  const staffList = useMemo(() => {
    return rawStaff.filter(s => 
      `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.staffNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (a.staffNumber || "").localeCompare(b.staffNumber || ""));
  }, [rawStaff, searchQuery]);

  const resolveSystemRole = (designation: string) => {
    const d = designation?.toLowerCase() || ""
    if (d === 'head teacher' || d === 'administrator') return 'administrator'
    if (d === 'accountant') return 'accountant'
    if (d === 'librarian') return 'librarian'
    return 'teacher' 
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 800000) {
        toast({ variant: "destructive", title: "File Too Large", description: "Image must be under 800KB." })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => setStaffForm(prev => ({ ...prev, photoURL: reader.result as string }))
      reader.readAsDataURL(file)
    }
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || !institution || loading) return

    setLoading(true)
    const provisionAppName = `staff-enroll-${Date.now()}`;
    const provisionApp = initializeApp(firebaseConfig, provisionAppName);
    const provisionAuth = getAuth(provisionApp);
    
    try {
      const batch = writeBatch(db)
      let staffId = editingStaff?.id
      let finalStaffNumber = staffForm.staffNumber
      let authUid = editingStaff?.authUid || null;

      const staffRef = editingStaff ? doc(db, "staff", editingStaff.id) : doc(collection(db, "staff"))
      staffId = staffRef.id

      if (!editingStaff) {
        finalStaffNumber = await generateId('staff', institution.schoolCode, 'SF');
        
        let cleanPass = normalizeSecurityPhone(staffForm.phone);
        if (cleanPass.length < 6) cleanPass = cleanPass.padEnd(6, '0');
        
        const domain = getInstitutionEmailDomain(institution);
        
        const authEmail = `${finalStaffNumber.trim()}@${domain}`.toLowerCase();
        const contactEmail = staffForm.email?.trim().toLowerCase() || authEmail;
        
        let authUser;
        try {
          const credential = await createUserWithEmailAndPassword(provisionAuth, authEmail, cleanPass)
          authUser = credential.user
          authUid = authUser.uid;
        } catch (authErr: any) {
          console.log("Staff Auth Error");
          throw authErr;
        }

        const userUid = authUid || staffId;
        batch.set(doc(db, "users", userUid), {
          uid: userUid,
          name: `${staffForm.firstName} ${staffForm.lastName}`,
          email: contactEmail,
          authEmail: authEmail,
          role: resolveSystemRole(staffForm.designation),
          tenantId: institutionId,
          institutionId: institutionId,
          institutionName: institution?.name || "Academic Hub",
          staffId: staffId,
          status: "active",
          createdAt: serverTimestamp()
        }, { merge: true })
        
        if (authUser) await signOut(provisionAuth);

        batch.set(staffRef, {
          ...staffForm,
          staffNumber: finalStaffNumber,
          phone: normalizeSecurityPhone(staffForm.phone),
          email: contactEmail,
          authEmail: authEmail,
          salary: parseFloat(staffForm.salary as string) || 0,
          id: staffId,
          authUid,
          tenantId: institutionId,
          institutionId: institutionId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        const { id, createdAt, tenantId, institutionId: instId, ...sanitizedData } = staffForm as any;
        batch.update(staffRef, { 
          ...sanitizedData, 
          salary: parseFloat(staffForm.salary as string) || 0,
          updatedAt: serverTimestamp() 
        });
      }

      await batch.commit()
      toast({ title: editingStaff ? "Registry Updated" : `Faculty Enrolled` })
      setIsEnrollOpen(false); setEditingStaff(null); setStaffForm(initialForm);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed", description: error.message });
    } finally { 
      setLoading(false);
      try { await deleteApp(provisionApp); } catch (e) {}
    }
  }

  const openEdit = (s: any) => {
    setEditingStaff(s);
    setStaffForm({ ...initialForm, ...s });
    setIsEnrollOpen(true);
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    try {
      await deleteDoc(doc(db!, "staff", id))
      toast({ title: "Profile Removed" })
    } catch (e) { 
      toast({ variant: "destructive", title: "Action Failed" }) 
    }
  }

  if (profileLoading || dataLoading) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Syncing HR Registry...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">HR Management Hub</h1>
          <p className="text-muted-foreground font-medium">Strategic oversight of faculty registry and direct portal access.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button className="gap-2 bg-primary rounded-xl h-12 shadow-lg px-6 font-bold" onClick={() => { setEditingStaff(null); setStaffForm(initialForm); setIsEnrollOpen(true); }}>
            <UserPlus className="size-5" /> Enroll Faculty
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b py-6 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative max-sm w-full sm:max-w-sm">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search by name or ID..." className="pl-10 h-12 bg-white border-none rounded-xl shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
               <Badge className="bg-primary/5 text-primary border-none text-[10px] font-bold uppercase tracking-widest px-4 h-10 flex items-center">
                 {rawStaff.length} Records Active
               </Badge>
            </div>
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
                <TableRow key={s.id} className="hover:bg-slate-50 transition-colors group">
                  <TableCell className="px-6">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-primary text-xs border overflow-hidden">
                        {s.photoURL ? <img src={s.photoURL} className="w-full h-full object-cover" /> : <span className="uppercase">{s.firstName?.charAt(0)}{s.lastName?.charAt(0)}</span>}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-accent">{s.staffNumber}</span>
                        <span className="font-bold text-primary text-sm">{s.firstName} {s.lastName}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs font-bold text-slate-700">{s.designation}</span></TableCell>
                  <TableCell><span className="text-xs font-medium">{s.phone}</span></TableCell>
                  <TableCell><Badge variant="outline" className={`text-[9px] uppercase font-bold ${s.status === 'active' ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-50'}`}>{s.status}</Badge></TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl md:rounded-3xl h-[90vh] flex flex-col">
          <form onSubmit={handleEnroll} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="bg-primary text-primary-foreground p-6 md:p-8 shrink-0 relative">
              <DialogTitle className="text-2xl font-headline font-bold">{editingStaff ? "Update Registry" : "Faculty Enrollment"}</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Portal access is provisioned automatically with secure ID generation.</DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="sm:col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl bg-slate-50/50 mb-6">
                  <div 
                    className="relative size-32 rounded-2xl bg-white border flex items-center justify-center overflow-hidden shadow-sm group cursor-pointer" 
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload from Gallery or Camera"
                  >
                    {staffForm.photoURL ? (
                      <img src={staffForm.photoURL} className="w-full h-full object-cover" alt="Staff Preview" />
                    ) : (
                      <Camera className="size-10 text-muted-foreground/20" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="size-6 text-white" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <p className="mt-3 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">
                    Faculty Portrait (Gallery/Camera)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Staff Number</Label>
                  <div className="h-12 px-4 rounded-xl bg-slate-50 flex items-center border border-dashed border-slate-200">
                    <Badge variant="secondary" className="font-mono text-xs font-bold uppercase bg-slate-200 text-slate-600 border-none">
                      {staffForm.staffNumber}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2"><Label>First Name</Label><Input required value={staffForm.firstName} onChange={e => setStaffForm({...staffForm, firstName: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input required value={staffForm.lastName} onChange={e => setStaffForm({...staffForm, lastName: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Phone Number (Portal Password)</Label><Input required value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Email Address (Optional)</Label><Input type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Monthly Salary (GH₵)</Label><Input type="number" required value={staffForm.salary} onChange={e => setStaffForm({...staffForm, salary: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Designation</Label>
                   <Select value={staffForm.designation} onValueChange={v => setStaffForm({...staffForm, designation: v})}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="Teacher">Teacher</SelectItem>
                         <SelectItem value="Head Teacher">Head Teacher</SelectItem>
                         <SelectItem value="Administrator">Administrator</SelectItem>
                         <SelectItem value="Accountant">Accountant</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="bg-slate-50 p-6 md:p-8 border-t shrink-0">
              <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl text-lg gap-2">
                {loading ? <Loader2 className="mr-2 animate-spin" /> : <ShieldCheck className="size-5" />} 
                Authorize Provisioning
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
