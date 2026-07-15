
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Users, Mail, UserCog, Search, Trash2, Pencil, Loader2, Upload, UserPlus, Phone, Calendar as CalendarIcon, BookOpen, GraduationCap, Eye, FileText, Sparkles, Copy, Check, School } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { generateAppointmentLetter } from "@/ai/flows/generate-appointment-letter"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"

const DEFAULT_DEPARTMENTS = ["Administration", "Academics", "Accounts", "Library", "Science", "Mathematics", "Languages"]

export default function StaffPage() {
  const db = useFirestore()
  const { user, loading: authLoading } = useUser()
  const [loading, setLoading] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  
  const [staffForm, setStaffForm] = useState({
    fullName: "", 
    role: "teacher", 
    department: "Administration", 
    email: "", 
    phoneNumber: "", 
    staffId: "",
    joiningDate: new Date().toISOString().split('T')[0], 
    assignedClasses: "", 
    assignedSubjects: ""
  })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const staffQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "staff"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const { data: staff, loading: dataLoading } = useCollection(staffQuery)

  useEffect(() => {
    if (isAddOpen && !staffForm.staffId) {
      setStaffForm(prev => ({ ...prev, staffId: `STF-${String(staff.length + 1).padStart(4, '0')}` }));
    }
  }, [isAddOpen, staff.length]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    try {
      await addDoc(collection(db, "staff"), { 
        ...staffForm, 
        tenantId: institutionId,
        institutionId: institutionId, 
        createdAt: serverTimestamp() 
      })
      toast({ title: "Staff Enrolled", description: `${staffForm.fullName} joined the faculty.` })
      setIsAddOpen(false)
      setStaffForm({ fullName: "", role: "teacher", department: "Administration", email: "", phoneNumber: "", staffId: "", joiningDate: new Date().toISOString().split('T')[0], assignedClasses: "", assignedSubjects: "" })
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }) } finally { setLoading(false) }
  }

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !editingStaff) return
    setLoading(true)
    try {
      await updateDoc(doc(db, "staff", editingStaff.id), {
        ...staffForm,
        updatedAt: serverTimestamp()
      })
      toast({ title: "Profile Updated", description: "Registry synchronized." })
      setIsEditOpen(false)
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }) } finally { setLoading(false) }
  }

  if (dataLoading) return <div className="p-12 text-center animate-pulse font-bold text-muted-foreground">Loading Faculty...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-headline font-bold text-primary">Teachers Management</h1><p className="text-muted-foreground">Managing {staff.length} faculty members.</p></div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button className="gap-2 bg-primary"><UserPlus className="size-4" /> Enroll Teacher</Button></DialogTrigger>
          <DialogContent className="max-w-2xl"><form onSubmit={handleAddStaff}><DialogHeader><DialogTitle>Faculty Registration</DialogTitle></DialogHeader>
            <div className="grid gap-6 py-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Full Name</Label><Input required value={staffForm.fullName} onChange={e => setStaffForm({...staffForm, fullName: e.target.value})} /></div>
                <div className="space-y-2"><Label>Role</Label><Select onValueChange={v => setStaffForm({...staffForm, role: v})} value={staffForm.role}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="administrator">Administrator</SelectItem><SelectItem value="accountant">Accountant</SelectItem><SelectItem value="librarian">Librarian</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Department</Label><Select onValueChange={v => setStaffForm({...staffForm, department: v})} value={staffForm.department}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEFAULT_DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Staff ID</Label><Input readOnly value={staffForm.staffId} className="bg-slate-50 font-bold" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={staffForm.phoneNumber} onChange={e => setStaffForm({...staffForm, phoneNumber: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Assignments (Classes)</Label><Input value={staffForm.assignedClasses} onChange={e => setStaffForm({...staffForm, assignedClasses: e.target.value})} placeholder="e.g. Primary 1, 2" /></div>
                <div className="space-y-2"><Label>Subjects</Label><Input value={staffForm.assignedSubjects} onChange={e => setStaffForm({...staffForm, assignedSubjects: e.target.value})} placeholder="e.g. Math, Science" /></div>
              </div>
            </div>
            <DialogFooter><Button type="submit" disabled={loading} className="w-full">Confirm Enrollment</Button></DialogFooter>
          </form></DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-md overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30"><TableRow><TableHead>ID / Name</TableHead><TableHead>Role / Dept</TableHead><TableHead>Assignments</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {staff.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell><div className="flex flex-col"><span className="text-[10px] font-mono text-muted-foreground">{s.staffId}</span><span className="font-bold text-primary">{s.fullName}</span></div></TableCell>
                  <TableCell><span className="text-[10px] font-bold text-accent uppercase block">{s.department}</span><span className="text-xs uppercase">{s.role}</span></TableCell>
                  <TableCell><div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{s.assignedClasses || "No Classes"} • {s.assignedSubjects || "No Subjects"}</div></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingStaff(s); setStaffForm({...s}); setIsEditOpen(true); }}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDoc(doc(db!, "staff", s.id))}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl"><form onSubmit={handleUpdateStaff}>
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Full Name</Label><Input required value={staffForm.fullName} onChange={e => setStaffForm({...staffForm, fullName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Assignments</Label><Input value={staffForm.assignedClasses} onChange={e => setStaffForm({...staffForm, assignedClasses: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={staffForm.phoneNumber} onChange={e => setStaffForm({...staffForm, phoneNumber: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={loading} className="w-full">Authorize Changes</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>
    </div>
  )
}
