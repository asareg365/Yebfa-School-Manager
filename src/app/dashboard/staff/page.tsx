
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Users, Mail, UserCog, Search, Trash2, Pencil, Loader2, Upload, UserPlus, Phone, Calendar as CalendarIcon, BookOpen, GraduationCap, Eye, FileText, Sparkles, Copy, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { generateAppointmentLetter } from "@/ai/flows/generate-appointment-letter"
import { ScrollArea } from "@/components/ui/scroll-area"

const DEFAULT_DEPARTMENTS = [
  "Administration",
  "Mathematics",
  "Science",
  "Languages",
  "Social Studies",
  "Creative Arts",
  "ICT & Computing",
  "Physical Education",
  "Finance",
  "Admissions",
  "Facilities & Maintenance",
  "Security"
]

export default function StaffPage() {
  const db = useFirestore()
  const [loading, setLoading] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [letterLoading, setLetterLoading] = useState(false)
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [institutionName, setInstitutionName] = useState("Institution")
  const [copied, setCopied] = useState(false)
  
  const [staffForm, setStaffForm] = useState({
    fullName: "",
    role: "",
    department: "Administration",
    email: "",
    phoneNumber: "",
    staffId: "",
    joiningDate: new Date().toISOString().split('T')[0],
    assignedClasses: "",
    assignedSubjects: ""
  })
  const [bulkData, setBulkData] = useState("")

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    const storedName = localStorage.getItem('selected_institution_name')
    setInstitutionId(storedId)
    if (storedName) setInstitutionName(storedName)
  }, [])

  const staffQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(
      collection(db, "staff"),
      where("institutionId", "==", institutionId)
    );
  }, [db, institutionId]);

  const { data: staffData, loading: dataLoading } = useCollection(staffQuery)

  const staff = useMemo(() => {
    return [...staffData].sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || Date.now();
      const dateB = b.createdAt?.toMillis?.() || Date.now();
      return dateB - dateA;
    });
  }, [staffData]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    
    try {
      await addDoc(collection(db, "staff"), {
        ...staffForm,
        institutionId: institutionId,
        createdAt: serverTimestamp()
      })
      toast({
        title: "Staff Member Added",
        description: `${staffForm.fullName} has joined the roster.`,
      })
      setIsAddOpen(false)
      setStaffForm({ 
        fullName: "", 
        role: "", 
        department: "Administration", 
        email: "", 
        phoneNumber: "", 
        staffId: "", 
        joiningDate: new Date().toISOString().split('T')[0],
        assignedClasses: "",
        assignedSubjects: ""
      })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !editingStaff || loading) return
    setLoading(true)
    try {
      const docRef = doc(db, "staff", editingStaff.id)
      await updateDoc(docRef, staffForm)
      toast({
        title: "Staff Record Updated",
        description: `${staffForm.fullName}'s profile is now synchronized.`,
      })
      setIsEditOpen(false)
      setEditingStaff(null)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateLetter = async () => {
    if (!selectedStaff) return
    setLetterLoading(true)
    try {
      const result = await generateAppointmentLetter({
        staffName: selectedStaff.fullName,
        role: selectedStaff.role,
        department: selectedStaff.department,
        institutionName: institutionName,
        joiningDate: selectedStaff.joiningDate
      })
      setGeneratedLetter(result.letterContent)
      toast({ title: "Letter Generated", description: "Professional draft is ready for review." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Error", description: error.message })
    } finally {
      setLetterLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db!, "staff", id))
      toast({ title: "Staff Removed", description: `${name} has been de-provisioned.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message })
    }
  }

  const handleCopyLetter = () => {
    if (generatedLetter) {
      navigator.clipboard.writeText(generatedLetter)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!institutionId) return (
    <div className="p-12 text-center space-y-4">
      <h2 className="text-xl font-bold">No Institution Selected</h2>
      <p className="text-muted-foreground">Please select an institution from the Super Admin hub.</p>
      <Button asChild><a href="/admin">Go to Admin Hub</a></Button>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Staff Roster</h1>
          <p className="text-muted-foreground">Manage institutional workforce and personnel links.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 h-11 px-6" onClick={() => setIsBulkOpen(true)}>
            <Upload className="size-4" /> Bulk Import
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 shadow-lg shadow-primary/10">
                <UserPlus className="size-4" /> Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto">
              <form onSubmit={handleAddStaff}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline font-bold text-primary">Add Faculty/Staff</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input required value={staffForm.fullName} onChange={(e) => setStaffForm({...staffForm, fullName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input required value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select onValueChange={(v) => setStaffForm({...staffForm, department: v})} defaultValue={staffForm.department}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DEFAULT_DEPARTMENTS.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Staff ID</Label>
                      <Input required value={staffForm.staffId} onChange={(e) => setStaffForm({...staffForm, staffId: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" required value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input type="tel" required value={staffForm.phoneNumber} onChange={(e) => setStaffForm({...staffForm, phoneNumber: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Classes</Label>
                      <Input placeholder="e.g. SHS 1" value={staffForm.assignedClasses} onChange={(e) => setStaffForm({...staffForm, assignedClasses: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Subjects</Label>
                      <Input placeholder="e.g. Math" value={staffForm.assignedSubjects} onChange={(e) => setStaffForm({...staffForm, assignedSubjects: e.target.value})} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading} className="w-full h-11">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="mr-2" />}
                    Confirm Roster Record
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden rounded-2xl">
        <CardHeader className="border-b bg-white p-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff records..." className="pl-9 h-11 bg-slate-50 border-none" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {staff.length === 0 && !dataLoading ? (
            <div className="h-80 flex flex-col items-center justify-center p-12 text-center">
              <UserCog className="size-12 text-primary/10 mb-4" />
              <p className="text-muted-foreground font-bold">No Staff Members Found</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Staff ID / Name</TableHead>
                  <TableHead>Department / Role</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s: any) => (
                  <TableRow key={s.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-muted-foreground">{s.staffId}</span>
                        <span className="font-bold text-primary">{s.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-accent">{s.department}</span>
                        <span className="text-sm font-medium">{s.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-[10px] text-muted-foreground">
                        {s.assignedClasses || "No Classes"} • {s.assignedSubjects || "No Subjects"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setSelectedStaff(s);
                          setGeneratedLetter(null);
                          setIsViewOpen(true);
                        }}><Eye className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingStaff(s);
                          setStaffForm({ ...s });
                          setIsEditOpen(true);
                        }}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id, s.fullName)} className="h-8 w-8 text-destructive"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleUpdateStaff}>
            <DialogHeader>
              <DialogTitle>Edit Staff Profile</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Full Name</Label><Input required value={staffForm.fullName} onChange={e => setStaffForm({...staffForm, fullName: e.target.value})} /></div>
                <div className="space-y-2"><Label>Role</Label><Input required value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" required value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input required value={staffForm.phoneNumber} onChange={e => setStaffForm({...staffForm, phoneNumber: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Classes</Label><Input value={staffForm.assignedClasses} onChange={e => setStaffForm({...staffForm, assignedClasses: e.target.value})} /></div>
                <div className="space-y-2"><Label>Subjects</Label><Input value={staffForm.assignedSubjects} onChange={e => setStaffForm({...staffForm, assignedSubjects: e.target.value})} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">{loading ? <Loader2 className="animate-spin" /> : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 bg-slate-50 border-b">
            <DialogTitle className="text-2xl font-bold text-primary">{selectedStaff?.fullName}</DialogTitle>
            <DialogDescription className="text-accent font-bold uppercase text-[10px]">{selectedStaff?.role} • {selectedStaff?.department}</DialogDescription>
          </div>
          <ScrollArea className="flex-1 p-8">
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1"><p className="text-[10px] font-bold text-muted-foreground uppercase">Staff ID</p><p className="font-mono text-primary font-bold">{selectedStaff?.staffId}</p></div>
                <div className="space-y-1"><p className="text-[10px] font-bold text-muted-foreground uppercase">Joining Date</p><p className="font-medium">{selectedStaff?.joiningDate}</p></div>
              </div>
              <div className="p-6 rounded-2xl bg-muted/30 border-2 border-dashed border-muted">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold flex items-center gap-2"><Sparkles className="size-4 text-primary" /> AI Appointment Link</h4>
                  <Button size="sm" onClick={handleGenerateLetter} disabled={letterLoading}>{letterLoading ? <Loader2 className="animate-spin" /> : "Generate Draft"}</Button>
                </div>
                {generatedLetter ? (
                  <div className="relative p-6 bg-white rounded-xl border leading-relaxed text-sm font-serif">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleCopyLetter}>{copied ? <Check /> : <Copy />}</Button>
                    <pre className="whitespace-pre-wrap">{generatedLetter}</pre>
                  </div>
                ) : <p className="text-xs text-center italic text-muted-foreground">Click generate to create an AI-powered appointment letter.</p>}
              </div>
            </div>
          </ScrollArea>
          <div className="p-4 border-t bg-slate-50 flex justify-end"><Button variant="ghost" onClick={() => setIsViewOpen(false)}>Close</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
