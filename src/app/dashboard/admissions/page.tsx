"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  RefreshCw,
  Layers,
  ChevronRight,
  Phone,
  LayoutGrid
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

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

  const admissions = useMemo(() => {
    const pipeline = [...rawAdmissions]
    const admissionStudentIds = new Set(pipeline.map(a => a.id))
    
    enrolledStudents.forEach((student: any) => {
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
  }, [rawAdmissions, enrolledStudents, searchQuery])

  // Grouping logic for the thumbnail view
  const groupedAdmissions = useMemo(() => {
    const groups: Record<string, any[]> = {}
    admissions.forEach(a => {
      const grade = a.gradeLevel || "Unassigned"
      if (!groups[grade]) groups[grade] = []
      groups[grade].push(a)
    })
    return groups
  }, [admissions])

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
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Admissions Hub</h1>
          <p className="text-muted-foreground font-medium">Strategic candidate lifecycle management and enrollment tracking.</p>
        </div>
        <Button className="bg-primary rounded-xl h-12 shadow-lg gap-2 px-6 font-bold" onClick={() => setIsAppOpen(true)}>
          <UserPlus className="size-5" /> New Prospect
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-fit shrink-0">
            <TabsTrigger value="all" className="rounded-lg px-6 gap-2">All Registry</TabsTrigger>
            <TabsTrigger value="Applied" className="rounded-lg px-6">Applied</TabsTrigger>
            <TabsTrigger value="Interviewed" className="rounded-lg px-6">Interviewed</TabsTrigger>
            <TabsTrigger value="Accepted" className="rounded-lg px-6">Accepted</TabsTrigger>
            <TabsTrigger value="Enrolled" className="rounded-lg px-6 gap-2">
              Enrolled 
              <Badge variant="secondary" className="h-4 p-0 px-1 text-[8px] bg-primary text-white border-none">{enrolledStudents.length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search candidate or phone..." 
              className="pl-10 h-12 bg-white border shadow-sm rounded-xl" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {["all", "Applied", "Interviewed", "Accepted", "Enrolled"].map((status) => (
          <TabsContent key={status} value={status} className="space-y-12 mt-0">
             {Object.entries(groupedAdmissions)
              .sort(([gradeA], [gradeB]) => gradeA.localeCompare(gradeB))
              .map(([grade, candidates]) => {
                const filtered = candidates.filter(c => status === "all" || c.status === status)
                if (filtered.length === 0) return null

                return (
                  <div key={grade} className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 border-b pb-2">
                      <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center">
                        <Layers className="size-4 text-primary" />
                      </div>
                      <h2 className="text-xl font-headline font-bold text-primary">{grade}</h2>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold text-[10px]">{filtered.length} CANDIDATES</Badge>
                    </div>

                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filtered.map((a: any) => (
                        <Card key={a.id} className="border-none shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden bg-white group border-2 border-transparent hover:border-primary/5">
                          <CardHeader className="pb-3 flex flex-row items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-primary border-2 border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                                {a.firstName?.charAt(0)}{a.lastName?.charAt(0)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <CardTitle className="text-sm font-bold text-primary truncate leading-tight">{a.firstName} {a.lastName}</CardTitle>
                                <Badge variant="outline" className={`mt-1 text-[8px] uppercase font-bold w-fit ${
                                  a.status === 'Enrolled' ? 'bg-green-50 text-green-600 border-green-200' :
                                  a.status === 'Accepted' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                  a.status === 'Interviewed' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                  'bg-slate-50 text-slate-600'
                                }`}>
                                  {a.status}
                                </Badge>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                  <MoreVertical className="size-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl w-48">
                                {a.status === "Applied" && (
                                  <DropdownMenuItem className="gap-2 text-xs font-bold" onClick={() => { setSelectedApp(a); setInterviewForm({ status: "Interviewed", interviewNotes: a.interviewNotes || "" }); setIsInterviewOpen(true); }}>
                                    <MessagesSquare className="size-4" /> Record Interview
                                  </DropdownMenuItem>
                                )}
                                {a.status === "Interviewed" && (
                                  <DropdownMenuItem className="gap-2 text-xs font-bold text-blue-600" onClick={() => handleUpdateStatus(a.id, "Accepted")}>
                                    <CheckCircle2 className="size-4" /> Authorize Acceptance
                                  </DropdownMenuItem>
                                )}
                                {a.status === "Accepted" && (
                                  <DropdownMenuItem className="gap-2 text-xs font-bold text-primary" onClick={() => startEnrollment(a)}>
                                    <UserPlus className="size-4" /> Finalize Enrollment
                                  </DropdownMenuItem>
                                )}
                                {a.status === "Enrolled" && (
                                  <DropdownMenuItem className="gap-2 text-xs font-bold" asChild>
                                    <Link href={`/dashboard/students?id=${a.id}`}>
                                      <RefreshCw className="size-4" /> View in Registry
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="gap-2 text-xs font-bold text-destructive" onClick={() => handleDelete(a.id)}>
                                  <Trash2 className="size-4" /> Remove Application
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardHeader>
                          <CardContent className="space-y-3 pb-4">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                              <Phone className="size-3 text-accent" />
                              <span>{a.phone}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t mt-2">
                              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Registered</span>
                              <span className="text-[9px] font-bold text-primary">
                                {a.createdAt ? new Date(a.createdAt.toMillis()).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </CardContent>
                          {a.isRegistrySync && (
                            <div className="bg-blue-600 py-1 text-center text-[7px] font-bold text-white uppercase tracking-widest">
                               Registry Sync Active
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}

              {admissions.length === 0 && (
                <div className="py-40 text-center space-y-4">
                  <div className="size-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                    <UserPlus className="size-10 text-muted-foreground/30" />
                  </div>
                  <div className="max-w-xs mx-auto">
                    <h3 className="text-xl font-headline font-bold text-primary/60">Registry Empty</h3>
                    <p className="text-sm text-muted-foreground italic">No candidates matching current filter detected.</p>
                  </div>
                </div>
              )}
          </TabsContent>
        ))}
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
