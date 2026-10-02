"use client"

import { useState, useEffect, useMemo, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  Briefcase, 
  ShieldCheck, 
  Baby,
  Building2,
  IdCard,
  MapPin,
  Pencil,
  HeartHandshake,
  Navigation,
  AlertCircle,
  Plus,
  Sparkles,
  Bot,
  Save,
  CheckCircle2
} from "lucide-react"
import { useFirestore, useDoc, useCollection } from "@/firebase"
import { doc, collection, query, where, writeBatch, serverTimestamp } from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function ParentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: parentId } = use(params)
  const db = useFirestore()
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)

  const [linkForm, setLinkForm] = useState({
    studentId: "",
    relationship: "Mother",
    primaryContact: true,
    emergencyContact: true
  })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const parentRef = useMemo(() => doc(db, "parents", parentId), [db, parentId])
  const { data: parent, loading: pLoading } = useDoc(parentRef)

  // Fetch all students for the dropdown
  const allStudentsQuery = useMemo(() => 
    institutionId ? query(collection(db, "students"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  const { data: allStudents = [] } = useCollection(allStudentsQuery)

  // Fetch relationships from junction table
  const relsQuery = useMemo(() => 
    institutionId ? query(collection(db, "student_parents"), where("parentId", "==", parentId)) : null, 
    [db, parentId, institutionId]
  )
  const { data: rels = [], loading: relsLoading } = useCollection(relsQuery)

  // Fetch student details for linked children
  const studentIds = useMemo(() => rels.map(r => r.studentId), [rels]);
  const studentsQuery = useMemo(() => {
    if (!institutionId || studentIds.length === 0) return null
    return query(collection(db, "students"), where("id", "in", studentIds))
  }, [db, studentIds, institutionId])
  const { data: children = [], loading: childrenLoading } = useCollection(studentsQuery)

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || !linkForm.studentId || linkLoading) return
    
    setLinkLoading(true)
    try {
      const batch = writeBatch(db)
      const relId = `${linkForm.studentId}_${parentId}`
      
      batch.set(doc(db, "student_parents", relId), {
        ...linkForm,
        parentId,
        tenantId: institutionId,
        institutionId,
        updatedAt: serverTimestamp()
      }, { merge: true })

      await batch.commit()
      toast({ title: "Relationship Authorized", description: "Student successfully linked to guardian." })
      setIsLinkDialogOpen(false)
      setLinkForm({ studentId: "", relationship: "Mother", primaryContact: true, emergencyContact: true })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Linking Failed", description: error.message })
    } finally {
      setLinkLoading(false)
    }
  }

  if (pLoading) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Syncing Guardian Profile...</p>
    </div>
  )

  if (!parent) return (
    <div className="p-12 text-center space-y-4">
      <AlertCircle className="size-12 text-destructive mx-auto" />
      <h2 className="text-xl font-bold text-primary font-headline">Parent Profile Not Found</h2>
      <p className="text-muted-foreground">The requested registry record does not exist or has been archived.</p>
      <Button asChild className="rounded-xl"><Link href="/dashboard/parents">Return to Hub</Link></Button>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11">
            <Link href="/dashboard/parents">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Parent Command Center</h1>
            <p className="text-muted-foreground font-medium">Strategic oversight for {parent.firstName} {parent.lastName}.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl gap-2 text-xs font-bold uppercase" asChild>
            <Link href={`/dashboard/parents/edit/${parentId}`}>
              <Pencil className="size-4" /> Modify Profile
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <div className="h-24 bg-primary relative">
               <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-3xl shadow-xl">
                  <div className="size-24 rounded-2xl bg-slate-100 flex items-center justify-center border overflow-hidden">
                    {parent.photoURL ? <img src={parent.photoURL} className="w-full h-full object-cover" /> : <User className="size-12 text-primary/10" />}
                  </div>
               </div>
            </div>
            <CardContent className="pt-16 pb-8 px-8 space-y-6">
               <div>
                  <Badge variant="outline" className="mb-2 text-[9px] font-bold uppercase text-green-600 bg-green-50 border-green-200">{parent.status}</Badge>
                  <h2 className="text-2xl font-headline font-bold text-primary">{parent.firstName} {parent.lastName}</h2>
                  <p className="font-mono text-xs font-bold text-accent mt-1">{parent.parentNumber}</p>
               </div>

               <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="size-4 text-muted-foreground" />
                    <span className="font-medium text-slate-700">{parent.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="size-4 text-muted-foreground" />
                    <span className="font-medium text-slate-700 truncate">{parent.email || "No email registered"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="size-4 text-muted-foreground" />
                    <span className="font-medium text-slate-700">{parent.occupation || "Unspecified"}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="font-medium text-slate-700 leading-relaxed">{parent.address}, {parent.town}, {parent.region}</span>
                  </div>
               </div>

               <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3">
                    <span>Digital Address</span>
                    <Navigation className="size-3" />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border font-mono text-xs font-bold text-primary">
                    {parent.digitalAddress || "GA-000-0000"}
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-accent text-accent-foreground rounded-3xl overflow-hidden">
             <CardHeader className="pb-2">
                <CardDescription className="text-accent-foreground/60 text-[10px] font-bold uppercase tracking-widest">Emergency Contact</CardDescription>
                <CardTitle className="text-lg">{parent.emergencyContact || "None Listed"}</CardTitle>
             </CardHeader>
             <CardContent className="space-y-1">
                <p className="text-sm font-bold">{parent.emergencyPhone}</p>
                <p className="text-[10px] uppercase font-bold opacity-70">{parent.emergencyRelationship}</p>
             </CardContent>
          </Card>

          <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-white border-2 border-primary/5">
            <CardHeader className="bg-primary text-primary-foreground p-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="size-4 text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">AI Strategic Hub</span>
              </div>
              <CardTitle className="text-lg font-headline">Family Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center space-y-4">
              <div className="size-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto">
                <Bot className="size-6 text-primary/20" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-primary/60">
                  {rels.length === 0 ? "No linked student data available yet." : "Awaiting AI Data Processing"}
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {rels.length === 0 
                    ? "Link a student to receive AI-generated academic summaries and recommendations."
                    : "The AI agent is currently analyzing family performance vectors for the 2026 cycle."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="children" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-2xl mb-6 grid grid-cols-3 h-auto">
              <TabsTrigger value="children" className="rounded-xl gap-2 py-3 text-xs uppercase font-bold tracking-widest">Children Hub <Badge className="ml-1 bg-primary text-white h-4 w-4 p-0 flex items-center justify-center text-[8px] border-none">{rels.length}</Badge></TabsTrigger>
              <TabsTrigger value="employment" className="rounded-xl gap-2 py-3 text-xs uppercase font-bold tracking-widest">Professional</TabsTrigger>
              <TabsTrigger value="identification" className="rounded-xl gap-2 py-3 text-xs uppercase font-bold tracking-widest">IDs</TabsTrigger>
            </TabsList>

            <TabsContent value="children" className="mt-0 space-y-4">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Baby className="size-4" /> Linked Wards
                  </h3>
                  
                  <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold uppercase">
                        <Plus className="size-3 mr-1.5" /> Link Student
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md rounded-2xl">
                      <form onSubmit={handleLinkStudent}>
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-headline font-bold">Link Student to Profile</DialogTitle>
                          <DialogDescription>Associate an existing student record with {parent.firstName} {parent.lastName}.</DialogDescription>
                        </DialogHeader>
                        <div className="py-6 space-y-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Student from Registry</Label>
                            <Select required onValueChange={v => setLinkForm({...linkForm, studentId: v})}>
                              <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="🔍 Search Students..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allStudents.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber})</SelectItem>
                                ))}
                                {allStudents.length === 0 && <div className="p-4 text-center text-xs">No students in registry.</div>}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Relationship Role</Label>
                            <Select value={linkForm.relationship} onValueChange={v => setLinkForm({...linkForm, relationship: v})}>
                              <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Mother">Mother</SelectItem>
                                <SelectItem value="Father">Father</SelectItem>
                                <SelectItem value="Guardian">Guardian</SelectItem>
                                <SelectItem value="Uncle">Uncle</SelectItem>
                                <SelectItem value="Aunt">Aunt</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-6 pt-2">
                             <div className="flex items-center gap-2">
                                <Checkbox id="primary_link" checked={linkForm.primaryContact} onCheckedChange={v => setLinkForm({...linkForm, primaryContact: !!v})} />
                                <Label htmlFor="primary_link" className="text-xs font-bold cursor-pointer">Primary</Label>
                             </div>
                             <div className="flex items-center gap-2">
                                <Checkbox id="emergency_link" checked={linkForm.emergencyContact} onCheckedChange={v => setLinkForm({...linkForm, emergencyContact: !!v})} />
                                <Label htmlFor="emergency_link" className="text-xs font-bold cursor-pointer">Emergency</Label>
                             </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={linkLoading || !linkForm.studentId} className="w-full h-12 rounded-xl bg-primary font-bold shadow-lg">
                            {linkLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                            Authorize Link
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
               </div>

               <div className="grid gap-4">
                  {rels.map((rel: any) => {
                    const student = children.find(s => s.id === rel.studentId);
                    return (
                      <Card key={rel.id} className="border-none shadow-sm hover:shadow-md transition-shadow group bg-white rounded-2xl overflow-hidden border-2 border-transparent hover:border-primary/5">
                        <CardContent className="p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-primary border group-hover:scale-105 transition-transform">
                               {student?.firstName?.charAt(0) || "?"}
                            </div>
                            <div>
                               <p className="font-bold text-primary text-base">{student?.firstName} {student?.lastName}</p>
                               <div className="flex items-center gap-3 mt-1">
                                  <Badge variant="outline" className="text-[8px] uppercase font-bold">{student?.gradeLevel || "Not Set"}</Badge>
                                  <Badge className="bg-primary/5 text-primary border-none text-[8px] font-bold uppercase tracking-widest">{rel.relationship}</Badge>
                               </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                             {rel.primaryContact && <Badge className="bg-green-600 text-white text-[7px] uppercase font-bold px-2 h-4 flex items-center">Primary Contact</Badge>}
                             <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-xl hover:bg-primary hover:text-white transition-colors">
                                <Link href={`/dashboard/students?id=${rel.studentId}`}>
                                   <ArrowLeft className="size-4 rotate-180" />
                                </Link>
                             </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {(rels.length === 0 && !relsLoading) && (
                    <div className="p-20 text-center border-2 border-dashed rounded-3xl bg-muted/5 space-y-4">
                       <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto">
                          <Baby className="size-8 text-primary/20" />
                       </div>
                       <div className="max-w-xs mx-auto">
                          <h4 className="font-bold text-primary/60 uppercase text-xs tracking-widest">No Children Linked</h4>
                          <p className="text-[11px] text-muted-foreground mt-1">Authorize a relationship link for this guardian profile to start academic monitoring.</p>
                       </div>
                    </div>
                  )}

                  {(relsLoading || childrenLoading) && (
                    <div className="p-20 text-center">
                       <Loader2 className="size-8 animate-spin mx-auto text-primary opacity-20" />
                    </div>
                  )}
               </div>
            </TabsContent>

            <TabsContent value="employment" className="mt-0">
               <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50 border-b p-8">
                     <CardTitle className="text-lg flex items-center gap-2"><Briefcase className="size-5 text-primary" /> Professional Background</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Primary Occupation</p>
                           <p className="text-lg font-bold text-primary">{parent.occupation || "Not Specified"}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Employer / Organization</p>
                           <p className="text-lg font-bold text-primary">{parent.employer || "Self-Employed / Private"}</p>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Office Address</p>
                           <p className="font-medium text-slate-600 italic">"{parent.employerAddress || "No workplace location provided."}"</p>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="identification" className="mt-0">
               <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50 border-b p-8">
                     <CardTitle className="text-lg flex items-center gap-2"><IdCard className="size-5 text-primary" /> Identification Registry</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                     <div className="grid gap-6">
                        <div className="p-6 rounded-2xl border bg-slate-50/50 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                           <div className="flex items-center gap-4">
                              <div className="size-10 rounded-xl bg-white border flex items-center justify-center shadow-sm">
                                 <IdCard className="size-5 text-primary" />
                              </div>
                              <div className="space-y-0.5">
                                 <p className="text-[10px] font-bold uppercase text-muted-foreground">National ID (Ghana Card)</p>
                                 <p className="font-mono font-bold text-primary text-sm tracking-widest">{parent.nationalId || "GHA-000000000-0"}</p>
                              </div>
                           </div>
                           <Badge className="bg-green-600 text-white text-[8px] uppercase font-bold border-none">Stored</Badge>
                        </div>

                        <div className="p-6 rounded-2xl border bg-slate-50/50 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                           <div className="flex items-center gap-4">
                              <div className="size-10 rounded-xl bg-white border flex items-center justify-center shadow-sm">
                                 <ShieldCheck className="size-5 text-primary" />
                              </div>
                              <div className="space-y-0.5">
                                 <p className="text-[10px] font-bold uppercase text-muted-foreground">Passport Document</p>
                                 <p className="font-mono font-bold text-primary text-sm tracking-widest">{parent.passportNumber || "NOT REGISTERED"}</p>
                              </div>
                           </div>
                           <Badge variant="outline" className="text-[8px] uppercase font-bold">{parent.passportNumber ? 'SECURE' : 'NONE'}</Badge>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <div className="flex justify-center pt-8">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
           <ShieldCheck className="size-3 text-green-600" /> Authorized Institutional Audit • 2026 Registry Hub • Global Ecosystem
        </p>
      </div>
    </div>
  )
}
