"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { 
  UserPlus, 
  Trash2, 
  Pencil, 
  Loader2, 
  ShieldCheck, 
  Search,
  Save
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function StaffPage() {
  const db = useFirestore()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const initialForm = {
    staffNumber: "",
    firstName: "",
    lastName: "",
    gender: "Male",
    phone: "",
    email: "",
    qualification: "",
    departmentId: "Academics",
    designation: "Teacher",
    employmentDate: "",
    salary: "",
    bankName: "",
    bankAccount: "",
    ssnitNumber: "",
    tin: "",
    status: "active"
  }

  const [staffForm, setStaffForm] = useState(initialForm)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
    // Initialize date on client to avoid hydration mismatch
    setStaffForm(prev => ({
      ...prev,
      employmentDate: new Date().toISOString().split('T')[0]
    }))
  }, [])

  const staffQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "staff"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const { data: rawStaff = [], loading: dataLoading } = useCollection(staffQuery)

  const staffList = useMemo(() => {
    return rawStaff.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.staffNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (a.staffNumber || "").localeCompare(b.staffNumber || ""));
  }, [rawStaff, searchQuery]);

  useEffect(() => {
    if (isEnrollOpen && !staffForm.staffNumber && !editingStaff) {
      const count = rawStaff.length + 1;
      const autoId = `EMP-${String(count).padStart(3, '0')}`;
      setStaffForm(prev => ({ ...prev, staffNumber: autoId }));
    }
  }, [isEnrollOpen, rawStaff.length, editingStaff]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    
    const data = {
      ...staffForm,
      salary: parseFloat(staffForm.salary as string) || 0,
      tenantId: institutionId,
      institutionId: institutionId,
      updatedAt: serverTimestamp()
    }

    try {
      if (editingStaff) {
        const { id, ...sanitizedData } = data as any;
        await updateDoc(doc(db, "staff", editingStaff.id), sanitizedData);
        toast({ title: "Registry Synchronized", description: `${staffForm.firstName}'s employment profile updated.` });
      } else {
        await addDoc(collection(db, "staff"), {
          ...data,
          createdAt: serverTimestamp()
        });
        toast({ title: "Staff Enrolled", description: `${staffForm.firstName} is now registered in the ecosystem.` });
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

  if (dataLoading) return <div className="p-24 text-center animate-pulse font-headline font-bold text-primary">Syncing Staff Registry...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Faculty & Staff</h1>
          <p className="text-muted-foreground">Managing institutional human resources and payroll metadata.</p>
        </div>
        <Button className="gap-2 bg-primary rounded-xl h-11" onClick={() => { setEditingStaff(null); setStaffForm(initialForm); setIsEnrollOpen(true); }}>
          <UserPlus className="size-4" /> Enroll Staff
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b py-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or ID..." 
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
                <TableHead className="py-4 font-bold">ID / NAME</TableHead>
                <TableHead className="py-4 font-bold">DESIGNATION</TableHead>
                <TableHead className="py-4 font-bold">CONTACT</TableHead>
                <TableHead className="py-4 font-bold">STATUS</TableHead>
                <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map((s: any) => (
                <TableRow key={s.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono font-bold text-accent">{s.staffNumber}</span>
                      <span className="font-bold text-primary">{s.firstName} {s.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{s.designation}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{s.departmentId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span>{s.phone}</span>
                      <span className="text-muted-foreground">{s.email}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold text-green-600 border-green-200 bg-green-50">{s.status}</Badge></TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEdit(s)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(db!, "staff", s.id))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {staffList.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No staff members found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleEnroll} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0">
              <DialogTitle className="text-2xl font-headline font-bold">{editingStaff ? "Update Employment Record" : "New Staff Enrollment"}</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Building a professional employment profile.</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="personal" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="bg-muted/30 px-8 py-2 border-b shrink-0">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="financial">Financials</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-8">
                <TabsContent value="personal" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>First Name</Label><Input required value={staffForm.firstName} onChange={e => setStaffForm({...staffForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Last Name</Label><Input required value={staffForm.lastName} onChange={e => setStaffForm({...staffForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Gender</Label>
                      <Select value={staffForm.gender} onValueChange={v => setStaffForm({...staffForm, gender: v})}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Phone Number</Label><Input required value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2 md:col-span-2"><Label>Email Address</Label><Input type="email" required value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} className="h-11 rounded-xl" /></div>
                  </div>
                </TabsContent>

                <TabsContent value="employment" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>Staff Number</Label><Input readOnly value={staffForm.staffNumber} className="h-11 rounded-xl bg-slate-50 font-bold" /></div>
                    <div className="space-y-2"><Label>Employment Date</Label><Input type="date" value={staffForm.employmentDate} onChange={e => setStaffForm({...staffForm, employmentDate: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Designation / Role</Label><Input required value={staffForm.designation} onChange={e => setStaffForm({...staffForm, designation: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Senior Teacher" /></div>
                    <div className="space-y-2"><Label>Department</Label><Input value={staffForm.departmentId} onChange={e => setStaffForm({...staffForm, departmentId: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2 md:col-span-2"><Label>Qualification</Label><Input value={staffForm.qualification} onChange={e => setStaffForm({...staffForm, qualification: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Master of Arts in Education" /></div>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>Monthly Salary (GH₵)</Label><Input type="number" required value={staffForm.salary} onChange={e => setStaffForm({...staffForm, salary: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Bank Name</Label><Input value={staffForm.bankName} onChange={e => setStaffForm({...staffForm, bankName: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>Bank Account Number</Label><Input value={staffForm.bankAccount} onChange={e => setStaffForm({...staffForm, bankAccount: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>SSNIT Number</Label><Input value={staffForm.ssnitNumber} onChange={e => setStaffForm({...staffForm, ssnitNumber: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-2"><Label>TIN Number</Label><Input value={staffForm.tin} onChange={e => setStaffForm({...staffForm, tin: e.target.value})} className="h-11 rounded-xl" /></div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="bg-slate-50 p-8 border-t shrink-0">
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary font-bold shadow-lg">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />} 
                {editingStaff ? "Authorize Updates" : "Authorize Enrollment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
