
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Users, Mail, UserCog, Search, Trash2, Pencil, Loader2, Upload, UserPlus, Phone, Calendar as CalendarIcon, BookOpen, GraduationCap, Eye, FileText, Sparkles, Copy, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp } from "firebase/firestore"
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
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
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

  // Sort staff by creation date client-side
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

  if (!institutionId) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold">No Institution Selected</h2>
        <p className="text-muted-foreground">Please select an institution from the Super Admin hub to manage staff.</p>
        <Button asChild><a href="/admin">Go to Admin Hub</a></Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Staff Roster</h1>
          <p className="text-muted-foreground">Manage institutional workforce and personnel links.</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 px-6">
                <Upload className="size-4" /> Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-bold text-primary">Bulk Staff Import</DialogTitle>
                <DialogDescription>Format: FullName, Role, Dept, Email, Phone, StaffID, Classes, Subjects</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Textarea 
                  placeholder="Isaac Boateng, Teacher, Science, isaac@yebfa.edu, 0244, EMP-101, SHS 1A|SHS 2B, Math|Science" 
                  className="min-h-[200px] font-mono text-sm"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={() => {}} disabled={loading} className="w-full h-11">
                  Add All Staff
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                  <DialogDescription>Create a new personnel node with comprehensive details.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sname">Full Name</Label>
                      <Input id="sname" required value={staffForm.fullName} onChange={(e) => setStaffForm({...staffForm, fullName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="srole">Role / Designation</Label>
                      <Input id="srole" required value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sdept">Department</Label>
                      <Select onValueChange={(v) => setStaffForm({...staffForm, department: v})} defaultValue={staffForm.department}>
                        <SelectTrigger>
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_DEPARTMENTS.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sid">Staff ID</Label>
                      <Input id="sid" required value={staffForm.staffId} onChange={(e) => setStaffForm({...staffForm, staffId: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sclasses">Assigned Classes</Label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input 
                          id="sclasses" 
                          className="pl-10" 
                          placeholder="e.g. JHS 1, JHS 2" 
                          value={staffForm.assignedClasses} 
                          onChange={(e) => setStaffForm({...staffForm, assignedClasses: e.target.value})} 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ssubjects">Assigned Subjects</Label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input 
                          id="ssubjects" 
                          className="pl-10" 
                          placeholder="e.g. Mathematics, English" 
                          value={staffForm.assignedSubjects} 
                          onChange={(e) => setStaffForm({...staffForm, assignedSubjects: e.target.value})} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="semail">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input id="semail" type="email" className="pl-10" required value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sphone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input id="sphone" type="tel" className="pl-10" required value={staffForm.phoneNumber} onChange={(e) => setStaffForm({...staffForm, phoneNumber: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sdate">Joining Date</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input id="sdate" type="date" className="pl-10" required value={staffForm.joiningDate} onChange={(e) => setStaffForm({...staffForm, joiningDate: e.target.value})} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading} className="w-full h-11">
                    {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <UserCog className="size-4 mr-2" />}
                    Confirm Personnel
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
            <div className="h-80 flex flex-col items-center justify-center gap-2 text-muted-foreground p-12">
              <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <UserCog className="size-10 text-primary opacity-20" />
              </div>
              <p className="font-bold text-primary text-lg">Staff Ledger Empty</p>
              <p className="text-sm">No personnel accounts detected in this institutional node.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold py-4">Staff ID / Name</TableHead>
                  <TableHead className="font-bold py-4">Assignments</TableHead>
                  <TableHead className="font-bold py-4">Department / Role</TableHead>
                  <TableHead className="font-bold py-4">Contact Info</TableHead>
                  <TableHead className="text-right font-bold py-4">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s: any) => (
                  <TableRow key={s.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{s.staffId || 'NO ID'}</span>
                        <span className="font-bold text-primary">{s.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {s.assignedClasses && (
                          <div className="flex items-center gap-1">
                            <GraduationCap className="size-3 text-muted-foreground" />
                            <span className="text-[10px] font-medium">{s.assignedClasses}</span>
                          </div>
                        )}
                        {s.assignedSubjects && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="size-3 text-muted-foreground" />
                            <span className="text-[10px] font-medium">{s.assignedSubjects}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{s.department}</span>
                        <span className="text-sm font-medium">{s.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="size-3" /> {s.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setSelectedStaff(s);
                            setGeneratedLetter(null);
                            setIsViewOpen(true);
                          }}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id, s.fullName)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl rounded-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 border-b bg-slate-50">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {selectedStaff?.fullName?.charAt(0)}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-headline font-bold text-primary">{selectedStaff?.fullName}</DialogTitle>
                  <DialogDescription className="font-medium text-accent uppercase tracking-wider text-[10px] mt-1">
                    {selectedStaff?.role} • {selectedStaff?.department}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-8 space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personal Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm font-semibold">{selectedStaff?.email}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <span className="text-sm font-semibold">{selectedStaff?.phoneNumber}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Staff ID</span>
                      <span className="text-sm font-mono font-bold text-primary">{selectedStaff?.staffId}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Academic Load</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Assigned Classes</span>
                      <span className="text-sm font-semibold">{selectedStaff?.assignedClasses || "None"}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Assigned Subjects</span>
                      <span className="text-sm font-semibold">{selectedStaff?.assignedSubjects || "None"}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Joined Date</span>
                      <span className="text-sm font-semibold">{selectedStaff?.joiningDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Career Document Node</h4>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2 border-primary/20 text-primary h-8"
                    onClick={handleGenerateLetter}
                    disabled={letterLoading}
                  >
                    {letterLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                    Generate Appointment Letter
                  </Button>
                </div>

                {generatedLetter ? (
                  <div className="relative p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 font-serif leading-relaxed text-sm animate-in fade-in duration-500">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-4 right-4 h-8 w-8"
                      onClick={handleCopyLetter}
                    >
                      {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                    </Button>
                    <pre className="whitespace-pre-wrap font-serif text-slate-700">{generatedLetter}</pre>
                  </div>
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted text-muted-foreground gap-2">
                    <FileText className="size-8 opacity-20" />
                    <p className="text-[10px] uppercase font-bold tracking-tight">No Letter Generated Yet</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t bg-slate-50 flex justify-end">
            <Button variant="ghost" onClick={() => setIsViewOpen(false)}>Close Roster Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
