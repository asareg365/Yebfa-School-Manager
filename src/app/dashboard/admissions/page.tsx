
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
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
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
import { generateId } from "@/lib/id-generator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function AdmissionsHubPage() {
  const db = useFirestore()
  const router = useRouter()
  const { user } = useUser()
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
    phone: "",
    applicationNumber: "PENDING"
  })

  const [interviewForm, setInterviewForm] = useState({
    status: "Interviewed",
    interviewNotes: ""
  })

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile, loading: profileLoading } = useDoc(userProfileRef)

  const institutionId = useMemo(() => {
    if (profileLoading || !profile) return null;
    if (profile.role === 'super_admin') {
      return typeof window !== 'undefined' ? localStorage.getItem('selected_institution_id') : null;
    }
    return profile.tenantId || null;
  }, [profile, profileLoading]);

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const admissionsQuery = useMemoFirebase(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "admissions"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const studentsQuery = useMemoFirebase(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "students"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: rawAdmissions = [], loading: dataLoading } = useCollection(admissionsQuery)
  const { data: enrolledStudents = [] } = useCollection(studentsQuery)

  const admissions = useMemo(() => {
    const admissionIdsInRegistry = new Set(enrolledStudents.map((s: any) => s.admissionId).filter(Boolean))
    const pipeline = rawAdmissions.filter((a: any) => !admissionIdsInRegistry.has(a.id))
    
    enrolledStudents.forEach((student: any) => {
      pipeline.push({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        gradeLevel: student.gradeLevel,
        phone: student.phone || "Enrolled",
        status: "Enrolled",
        createdAt: student.createdAt,
        isRegistrySync: true
      })
    });

    return pipeline.filter(a => `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [rawAdmissions, enrolledStudents, searchQuery])

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || !institution || loading) return
    setLoading(true)
    try {
      const appNumber = await generateId('admissions', institution.schoolCode, 'ADM');
      await addDoc(collection(db, "admissions"), {
        ...appForm,
        applicationNumber: appNumber,
        status: "Applied",
        tenantId: institutionId,
        institutionId,
        createdAt: serverTimestamp()
      })
      toast({ title: "Application Received", description: `ID: ${appNumber} assigned.` })
      setIsAppOpen(false)
      setAppForm({ firstName: "", lastName: "", gender: "Male", dateOfBirth: "", gradeLevel: "", email: "", phone: "", applicationNumber: "PENDING" })
    } catch (e: any) { toast({ variant: "destructive", title: "Submission Failed" }) } finally { setLoading(false) }
  }

  const startEnrollment = (app: any) => {
    localStorage.setItem('pending_admission_data', JSON.stringify(app))
    router.push('/dashboard/students?enroll=true')
  }

  if (profileLoading || dataLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Admissions Hub</h1>
          <p className="text-muted-foreground font-medium">Strategic candidate lifecycle management.</p>
        </div>
        <Button className="bg-primary rounded-xl h-12 shadow-lg gap-2 px-6 font-bold" onClick={() => setIsAppOpen(true)}>
          <UserPlus className="size-5" /> New Prospect
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold px-6">CANDIDATE / ID</TableHead>
                <TableHead className="py-4 font-bold">GRADE</TableHead>
                <TableHead className="py-4 font-bold">STATUS</TableHead>
                <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admissions.map((a: any) => (
                <TableRow key={a.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{a.firstName} {a.lastName}</span>
                      <span className="text-[10px] font-mono font-bold text-accent">{a.applicationNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs font-bold">{a.gradeLevel}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-[8px] uppercase font-bold">{a.status}</Badge></TableCell>
                  <TableCell className="text-right px-6">
                     {!a.isRegistrySync && a.status === 'Accepted' && (
                       <Button variant="ghost" size="sm" className="text-primary font-bold text-xs" onClick={() => startEnrollment(a)}>Finalize Enrollment</Button>
                     )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAppOpen} onOpenChange={setIsAppOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <form onSubmit={handleCreateApplication}>
            <DialogHeader className="p-8 bg-primary text-primary-foreground">
              <DialogTitle className="text-2xl font-headline font-bold">New Application</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Initiate candidate enrollment.</DialogDescription>
            </DialogHeader>
            <div className="p-8 grid grid-cols-2 gap-6">
              <div className="space-y-2"><Label>First Name</Label><Input required value={appForm.firstName} onChange={e => setAppForm({...appForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input required value={appForm.lastName} onChange={e => setAppForm({...appForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
              <div className="space-y-2"><Label>Gender</Label>
                <Select value={appForm.gender} onValueChange={v => setAppForm({...appForm, gender: v})}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Grade</Label><Input required value={appForm.gradeLevel} onChange={e => setAppForm({...appForm, gradeLevel: e.target.value})} className="h-11 rounded-xl" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Phone</Label><Input required value={appForm.phone} onChange={e => setAppForm({...appForm, phone: e.target.value})} className="h-11 rounded-xl" /></div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t">
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary font-bold shadow-lg">Authorize Application</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
