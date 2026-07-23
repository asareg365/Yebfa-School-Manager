"use client"

import { useState, useEffect, useMemo } from "react"
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
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ClipboardList,
  GraduationCap,
  ArrowRight,
  MoreVertical,
  XCircle,
  MessagesSquare,
  FileText,
  RefreshCw
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function AdmissionsHubPage() {
  const db = useFirestore()
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [isAppOpen, setIsAppOpen] = useState(false)
  const [isInterviewOpen, setIsInterviewOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<any>(null)

  const [appForm, setAppForm] = useState({
    firstName: "",
    lastName: "",
    gender: "Male",
    dateOfBirth: "",
    gradeLevel: "",
    email: "",
    phone: ""
  })

  const [interviewForm, setInterviewForm] = useState({
    status: "Interviewed",
    interviewNotes: ""
  })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const admissionsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(
      collection(db, "admissions"), 
      where("tenantId", "==", institutionId),
      orderBy("createdAt", "desc")
    )
  }, [db, institutionId])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "students"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const classesQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "classes"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: rawAdmissions = [], loading: dataLoading } = useCollection(admissionsQuery)
  const { data: enrolledStudents = [] } = useCollection(studentsQuery)
  const { data: classes = [] } = useCollection(classesQuery)

  // Merge admissions data with students who were added directly (Enrolled sync)
  const admissions = useMemo(() => {
    const pipeline = [...rawAdmissions]
    
    // Add students from registry who might not be in admissions collection
    const admissionStudentIds = new Set(pipeline.map(a => a.id))
    
    enrolledStudents.forEach((student: any) => {
      // If student was added via bulk or directly to registry, they might not have an admission doc
      // We "sync" them here visually for the hub
      if (!admissionStudentIds.has(student.id)) {
        pipeline.push({
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          gradeLevel: student.gradeLevel,
          phone: student.phone || "Direct Registry",
          status: "Enrolled",
          createdAt: student.createdAt,
          isRegistrySync: true
        })
      }
    });

    return pipeline
      .filter(a => 
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a: any, b: any) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;
        return dateB - dateA;
      })
  }, [rawAdmissions, enrolledStudents, searchQuery])

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    try {
      await addDoc(collection(db, "admissions"), {
        ...appForm,
        status: "Applied",
        tenantId: institutionId,
        institutionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      toast({ title: "Application Received", description: "The candidate has been added to the pipeline." })
      setIsAppOpen(false)
      setAppForm({ firstName: "", lastName: "", gender: "Male", dateOfBirth: "", gradeLevel: "", email: "", phone: "" })
    } catch (e: any) { toast({ variant: "destructive", title: "Submission Failed" }) } finally { setLoading(false) }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!db) return
    try {
      await updateDoc(doc(db, "admissions", id), { status, updatedAt: serverTimestamp() })
      toast({ title: "Pipeline Updated", description: `Candidate status is now ${status}.` })
    } catch (e) { toast({ variant: "destructive", title: "Update Failed" }) }
  }

  const handleInterviewSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !selectedApp) return
    setLoading(true)
    try {
      await updateDoc(doc(db, "admissions", selectedApp.id), {
        ...interviewForm,
        updatedAt: serverTimestamp()
      })
      toast({ title: "Interview Recorded", description: "Evaluation notes saved." })
      setIsInterviewOpen(false)
      setSelectedApp(null)
    } catch (e) { toast({ variant: "destructive", title: "Save Failed" }) } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!db) return
    try {
      await deleteDoc(doc(db, "admissions", id))
      toast({ title: "Application Removed" })
    } catch (e) { toast({ variant: "destructive", title: "Action Failed" }) }
  }

  const startEnrollment = (app: any) => {
    localStorage.setItem('pending_admission_data', JSON.stringify(app))
    router.push('/dashboard/students?enroll=true')
  }

  if (dataLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Synchronizing Admissions Pipeline...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-h-screen overflow-hidden flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Admissions Hub</h1>
          <p className="text-muted-foreground">Strategic candidate lifecycle management and enrollment tracking.</p>
        </div>
        <Button className="bg-primary rounded-xl h-11 shadow-lg gap-2" onClick={() => setIsAppOpen(true)}>
          <UserPlus className="size-4" /> New Application
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full flex-1 flex flex-col overflow-hidden">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6 shrink-0 w-fit">
          <TabsTrigger value="all" className="rounded-lg">All Pipeline</TabsTrigger>
          <TabsTrigger value="Applied" className="rounded-lg">Applications</TabsTrigger>
          <TabsTrigger value="Interviewed" className="rounded-lg">Interviews</TabsTrigger>
          <TabsTrigger value="Accepted" className="rounded-lg">Accepted</TabsTrigger>
          <TabsTrigger value="Enrolled" className="rounded-lg gap-2">
            Enrolled 
            <Badge variant="secondary" className="h-4 p-0 px-1 text-[8px] bg-primary text-white border-none">{enrolledStudents.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white flex-1 flex flex-col">
          <CardHeader className="border-b py-6 bg-slate-50/50 shrink-0">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search candidate name or phone..." 
                className="pl-10 h-12 bg-white border-none rounded-xl shadow-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            {["all", "Applied", "Interviewed", "Accepted", "Enrolled"].map((status) => (
              <TabsContent key={status} value={status} className="h-full mt-0">
                <ScrollArea className="h-[calc(100vh-320px)] w-full">
                  <Table className="relative">
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="py-4 font-bold px-6">CANDIDATE</TableHead>
                        <TableHead className="py-4 font-bold">GRADE</TableHead>
                        <TableHead className="py-4 font-bold">DATE TRACKED</TableHead>
                        <TableHead className="py-4 font-bold">STATUS</TableHead>
                        <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admissions
                        .filter(a => status === "all" || a.status === status)
                        .map((a: any) => (
                        <TableRow key={a.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="px-6">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                                {a.firstName?.charAt(0)}{a.lastName?.charAt(0)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-primary text-sm truncate">{a.firstName} {a.lastName}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground uppercase font-medium">{a.phone}</span>
                                  {a.isRegistrySync && <Badge className="h-3 p-0 px-1 text-[7px] bg-blue-50 text-blue-600 border-blue-200">Sync</Badge>}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-xs font-bold text-slate-700">{a.gradeLevel}</span></TableCell>
                          <TableCell><span className="text-[11px] font-medium">{a.createdAt ? new Date(a.createdAt.toMillis()).toLocaleDateString() : 'N/A'}</span></TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[9px] uppercase font-bold ${
                              a.status === 'Enrolled' ? 'bg-green-50 text-green-600 border-green-200' :
                              a.status === 'Accepted' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              a.status === 'Interviewed' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right px-6">
                             <div className="flex items-center justify-end gap-2">
                                {a.status === "Applied" && (
                                  <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase rounded-lg" onClick={() => { setSelectedApp(a); setInterviewForm({ status: "Interviewed", interviewNotes: a.interviewNotes || "" }); setIsInterviewOpen(true); }}>
                                    Interview
                                  </Button>
                                )}
                                {a.status === "Interviewed" && (
                                  <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase text-blue-600 border-blue-200 rounded-lg" onClick={() => handleUpdateStatus(a.id, "Accepted")}>
                                    Accept
                                  </Button>
                                )}
                                {a.status === "Accepted" && (
                                  <Button size="sm" className="h-8 text-[10px] font-bold uppercase bg-primary rounded-lg" onClick={() => startEnrollment(a)}>
                                    Enroll
                                  </Button>
                                )}
                                {a.status === "Enrolled" && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-lg" asChild>
                                    <a href={`/dashboard/students?id=${a.id}`}><RefreshCw className="size-3.5" /></a>
                                  </Button>
                                )}
                                {!a.isRegistrySync && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-lg" onClick={() => handleDelete(a.id)}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                )}
                             </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {admissions.filter(a => status === "all" || a.status === status).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-32 text-muted-foreground italic">No candidates found in this stage.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            ))}
          </CardContent>
        </Card>
      </Tabs>

      {/* New Application Dialog */}
      <Dialog open={isAppOpen} onOpenChange={setIsAppOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <form onSubmit={handleCreateApplication} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-8 bg-primary text-primary-foreground shrink-0">
              <DialogTitle className="text-2xl font-headline font-bold">New Prospect Application</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Initiate the admissions workflow for a new candidate.</DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1">
              <div className="grid gap-6 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>First Name</Label><Input required value={appForm.firstName} onChange={e => setAppForm({...appForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
                  <div className="space-y-2"><Label>Last Name</Label><Input required value={appForm.lastName} onChange={e => setAppForm({...appForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Gender</Label>
                    <Select value={appForm.gender} onValueChange={v => setAppForm({...appForm, gender: v})}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={appForm.dateOfBirth} onChange={e => setAppForm({...appForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="space-y-2"><Label>Target Grade Level</Label>
                  <Select required value={appForm.gradeLevel} onValueChange={v => setAppForm({...appForm, gradeLevel: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                    <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Contact Phone</Label><Input value={appForm.phone} onChange={e => setAppForm({...appForm, phone: e.target.value})} className="h-11 rounded-xl" /></div>
                  <div className="space-y-2"><Label>Email Address (Optional)</Label><Input type="email" value={appForm.email} onChange={e => setAppForm({...appForm, email: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-8 bg-slate-50 border-t shrink-0">
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary font-bold shadow-lg">
                {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="mr-2" />} Authorize Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Interview Notes Dialog */}
      <Dialog open={isInterviewOpen} onOpenChange={setIsInterviewOpen}>
        <DialogContent className="max-w-lg rounded-3xl border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <form onSubmit={handleInterviewSave} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-8 bg-slate-50 border-b shrink-0">
              <DialogTitle className="text-2xl font-headline font-bold">Interview Evaluation</DialogTitle>
              <DialogDescription>Evaluation notes for {selectedApp?.firstName} {selectedApp?.lastName}.</DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1">
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label>Interview Status</Label>
                  <Select value={interviewForm.status} onValueChange={v => setInterviewForm({...interviewForm, status: v})}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Interviewed">Interviewed / Pending</SelectItem>
                        <SelectItem value="Accepted">Proceed to Acceptance</SelectItem>
                        <SelectItem value="Rejected">Decline Application</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Evaluation Summary</Label>
                  <Textarea 
                    className="min-h-[200px] rounded-xl" 
                    placeholder="Enter interview outcomes and observations..." 
                    value={interviewForm.interviewNotes}
                    onChange={e => setInterviewForm({...interviewForm, interviewNotes: e.target.value})}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-8 bg-slate-50 border-t shrink-0">
               <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary font-bold shadow-xl">
                  {loading ? <Loader2 className="animate-spin" /> : "Save Evaluation"}
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
