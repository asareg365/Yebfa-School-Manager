
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar, 
  Layers, 
  BookOpen, 
  UserCheck, 
  ChevronRight,
  GraduationCap,
  Clock
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useFirestore, useCollection } from "@/firebase"
import { 
  collection, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from "firebase/firestore"

export default function AcademicStructurePage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("cycle")
  
  // Loading states
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  // Collections
  const yearsQuery = useMemo(() => institutionId ? query(collection(db, "academic_years"), where("tenantId", "==", institutionId), orderBy("year", "desc")) : null, [db, institutionId])
  const termsQuery = useMemo(() => institutionId ? query(collection(db, "terms"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const sectionsQuery = useMemo(() => institutionId ? query(collection(db, "sections"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const subjectsQuery = useMemo(() => institutionId ? query(collection(db, "subjects"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const staffQuery = useMemo(() => institutionId ? query(collection(db, "staff"), where("tenantId", "==", institutionId), where("role", "==", "teacher")) : null, [db, institutionId])
  const assignmentsQuery = useMemo(() => institutionId ? query(collection(db, "teacher_assignments"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: years } = useCollection(yearsQuery)
  const { data: terms } = useCollection(termsQuery)
  const { data: classes } = useCollection(classesQuery)
  const { data: sections } = useCollection(sectionsQuery)
  const { data: subjects } = useCollection(subjectsQuery)
  const { data: teachers } = useCollection(staffQuery)
  const { data: assignments } = useCollection(assignmentsQuery)

  const handleAddYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!institutionId || loading) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const year = formData.get("year") as string
    try {
      await addDoc(collection(db, "academic_years"), {
        tenantId: institutionId,
        year,
        status: "active",
        createdAt: serverTimestamp()
      })
      toast({ title: "Academic Year Created", description: `Session ${year} is now active.` })
      e.currentTarget.reset()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Creation Failed", description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTerm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!institutionId || loading) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = {
      tenantId: institutionId,
      academicYearId: formData.get("yearId") as string,
      name: formData.get("name") as string,
      status: "upcoming",
      createdAt: serverTimestamp()
    }
    try {
      await addDoc(collection(db, "terms"), data)
      toast({ title: "Term Added", description: `${data.name} recorded for session.` })
    } finally {
      setLoading(false)
    }
  }

  const handleAddClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!institutionId || loading) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await addDoc(collection(db, "classes"), {
        tenantId: institutionId,
        name: formData.get("name") as string,
        gradeLevel: formData.get("grade") as string,
        createdAt: serverTimestamp()
      })
      toast({ title: "Class Created" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!institutionId || loading) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = {
      tenantId: institutionId,
      staffId: formData.get("staffId") as string,
      classId: formData.get("classId") as string,
      sectionId: formData.get("sectionId") as string,
      subjectId: formData.get("subjectId") as string,
      academicYearId: years.find(y => y.status === "active")?.id || "",
      createdAt: serverTimestamp()
    }
    try {
      await addDoc(collection(db, "teacher_assignments"), data)
      toast({ title: "Teacher Assigned", description: "Class and subject linked successfully." })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (coll: string, id: string) => {
    try {
      await deleteDoc(doc(db, coll, id))
      toast({ title: "Item Removed" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: "Check permissions." })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Academic Enterprise Structure</h1>
        <p className="text-muted-foreground">The foundational hierarchy for campus operations in 2026.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-8">
          <TabsTrigger value="cycle" className="rounded-lg gap-2"><Calendar className="size-4" /> Academic Cycle</TabsTrigger>
          <TabsTrigger value="hierarchy" className="rounded-lg gap-2"><Layers className="size-4" /> Classroom Hierarchy</TabsTrigger>
          <TabsTrigger value="curriculum" className="rounded-lg gap-2"><BookOpen className="size-4" /> Curriculum</TabsTrigger>
          <TabsTrigger value="assignments" className="rounded-lg gap-2"><UserCheck className="size-4" /> Teacher Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="cycle" className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Academic Sessions</CardTitle>
                <CardDescription>Provision annual academic calendars.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddYear} className="flex gap-3">
                  <Input name="year" placeholder="e.g. 2026/2027" required className="h-10" />
                  <Button type="submit" disabled={loading} className="shrink-0"><Plus className="size-4" /> Create Session</Button>
                </form>
                <div className="space-y-3">
                  {years.map(y => (
                    <div key={y.id} className="flex items-center justify-between p-4 rounded-xl border bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <Clock className="size-4 text-primary" />
                        <span className="font-bold text-primary">{y.year}</span>
                        <Badge variant={y.status === "active" ? "default" : "secondary"} className="text-[10px] uppercase font-bold tracking-tight">
                          {y.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete("academic_years", y.id)} className="h-8 w-8 text-destructive"><Trash2 className="size-4" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Term Definition</CardTitle>
                <CardDescription>Sub-division of the active academic session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddTerm} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Select Session</Label>
                    <Select name="yearId" required>
                      <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
                      <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3">
                    <Input name="name" placeholder="e.g. Term 1" required />
                    <Button type="submit" disabled={loading}><Plus className="size-4" /> Add Term</Button>
                  </div>
                </form>
                <div className="space-y-3">
                  {terms.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{t.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{years.find(y => y.id === t.academicYearId)?.year}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold uppercase">{t.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-8">
           <div className="grid gap-6 md:grid-cols-2">
             <Card className="border-none shadow-md">
               <CardHeader><CardTitle className="text-lg">Classroom Registry</CardTitle></CardHeader>
               <CardContent className="space-y-6">
                 <form onSubmit={handleAddClass} className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                     <Input name="name" placeholder="Class Name (e.g. Primary 1)" required />
                     <Input name="grade" placeholder="Grade Level" required />
                   </div>
                   <Button type="submit" className="w-full bg-primary"><Plus className="size-4" /> Register Class</Button>
                 </form>
                 <div className="grid gap-3">
                   {classes.map(c => (
                     <div key={c.id} className="p-4 rounded-xl border bg-white flex justify-between items-center group">
                       <div className="flex items-center gap-3">
                         <div className="size-10 rounded-lg bg-primary/5 flex items-center justify-center"><GraduationCap className="size-5 text-primary" /></div>
                         <div className="flex flex-col">
                           <span className="font-bold text-primary">{c.name}</span>
                           <span className="text-[10px] uppercase font-bold text-muted-foreground">{c.gradeLevel}</span>
                         </div>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => handleDelete("classes", c.id)} className="opacity-0 group-hover:opacity-100 text-destructive"><Trash2 className="size-4" /></Button>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>

             <Card className="border-none shadow-md">
               <CardHeader><CardTitle className="text-lg">Streams & Sections</CardTitle></CardHeader>
               <CardContent className="space-y-6">
                 <form onSubmit={async (e) => {
                   e.preventDefault()
                   const formData = new FormData(e.currentTarget)
                   await addDoc(collection(db, "sections"), {
                     tenantId: institutionId,
                     classId: formData.get("classId"),
                     name: formData.get("name"),
                     createdAt: serverTimestamp()
                   })
                   toast({ title: "Section Created" })
                 }} className="space-y-4">
                   <div className="space-y-2">
                     <Label className="text-xs font-bold uppercase">Parent Class</Label>
                     <Select name="classId" required>
                        <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                     </Select>
                   </div>
                   <div className="flex gap-3">
                     <Input name="name" placeholder="Stream Name (e.g. A, Blue, Gold)" required />
                     <Button type="submit"><Plus className="size-4" /> Add Stream</Button>
                   </div>
                 </form>
                 <div className="space-y-3">
                   {sections.map(s => (
                     <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
                       <div className="flex items-center gap-2">
                         <span className="font-bold">{s.name}</span>
                         <ChevronRight className="size-3 text-muted-foreground" />
                         <span className="text-xs text-muted-foreground uppercase">{classes.find(c => c.id === s.classId)?.name}</span>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => handleDelete("sections", s.id)} className="text-destructive h-8 w-8"><Trash2 className="size-3.5" /></Button>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
           </div>
        </TabsContent>

        <TabsContent value="curriculum" className="space-y-8">
          <Card className="border-none shadow-md">
            <CardHeader><CardTitle>Curriculum Subjects</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                await addDoc(collection(db, "subjects"), {
                  tenantId: institutionId,
                  name: formData.get("name"),
                  category: formData.get("category"),
                  createdAt: serverTimestamp()
                })
                toast({ title: "Subject Added" })
              }} className="flex flex-col md:flex-row gap-4">
                <Input name="name" placeholder="Subject Name" required className="flex-1" />
                <Select name="category" defaultValue="Core">
                  <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Core">Core</SelectItem>
                    <SelectItem value="Elective">Elective</SelectItem>
                    <SelectItem value="Vocational">Vocational</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit"><Plus className="size-4" /> Add to Curriculum</Button>
              </form>
              <div className="grid gap-4 md:grid-cols-3">
                {subjects.map(sub => (
                  <div key={sub.id} className="p-4 rounded-xl border bg-white flex justify-between items-center group">
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{sub.name}</span>
                      <Badge variant="outline" className="text-[9px] font-bold uppercase w-fit mt-1">{sub.category}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete("subjects", sub.id)} className="opacity-0 group-hover:opacity-100 text-destructive"><Trash2 className="size-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-8">
           <div className="grid gap-6 md:grid-cols-4">
             <Card className="md:col-span-1 border-none shadow-md">
               <CardHeader><CardTitle className="text-lg">Link Faculty</CardTitle></CardHeader>
               <CardContent>
                 <form onSubmit={handleAddAssignment} className="space-y-4">
                   <div className="space-y-2">
                     <Label className="text-xs font-bold uppercase">Teacher</Label>
                     <Select name="staffId" required>
                       <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                       <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-xs font-bold uppercase">Subject</Label>
                     <Select name="subjectId" required>
                       <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                       <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-xs font-bold uppercase">Class</Label>
                     <Select name="classId" required>
                       <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                       <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-xs font-bold uppercase">Stream/Section</Label>
                     <Select name="sectionId" required>
                       <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                       <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                     </Select>
                   </div>
                   <Button type="submit" className="w-full bg-accent text-accent-foreground font-bold h-11 shadow-lg shadow-accent/10">Authorize Assignment</Button>
                 </form>
               </CardContent>
             </Card>

             <Card className="md:col-span-3 border-none shadow-md overflow-hidden">
                <CardHeader className="bg-white border-b"><CardTitle>Active Teacher Assignments</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {assignments.map(assign => {
                      const teacher = teachers.find(t => t.id === assign.staffId)
                      const subject = subjects.find(s => s.id === assign.subjectId)
                      const cls = classes.find(c => c.id === assign.classId)
                      const sec = sections.find(s => s.id === assign.sectionId)
                      
                      return (
                        <div key={assign.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary">{teacher?.fullName?.charAt(0)}</div>
                            <div className="flex flex-col">
                              <span className="font-bold text-primary">{teacher?.fullName}</span>
                              <span className="text-[10px] uppercase font-bold text-accent">{subject?.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col text-right">
                              <span className="text-sm font-bold">{cls?.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{sec?.name} Stream</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete("teacher_assignments", assign.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button>
                          </div>
                        </div>
                      )
                    })}
                    {assignments.length === 0 && (
                      <div className="p-24 text-center text-muted-foreground opacity-30 flex flex-col items-center gap-3">
                        <UserCheck className="size-12" />
                        <p className="font-bold">No teacher assignments detected.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
             </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
