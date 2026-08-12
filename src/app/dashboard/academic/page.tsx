
"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  GraduationCap,
  Settings2,
  ChevronRight,
  MoreVertical,
  X
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { 
  collection, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  updateDoc
} from "firebase/firestore"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

function AcademicFoundationContent() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // URL Tab Sync
  const tabParam = searchParams.get('tab') || 'cycle'
  const [activeTab, setActiveTab] = useState(tabParam)

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)
  const isTeacher = profile?.role === 'teacher'
  const staffId = profile?.staffId

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    router.push(`/dashboard/academic?tab=${val}`, { scroll: false })
  }

  // Form States
  const [yearForm, setYearForm] = useState({ year: "", status: "Active" })
  const [termForm, setTermForm] = useState({ name: "", academicYearId: "", startDate: "", endDate: "" })
  const [classForm, setClassForm] = useState({ name: "", level: "Primary" })
  const [sectionForm, setSectionForm] = useState({ classId: "", name: "", capacity: "30" })
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" })
  const [assignForm, setAssignForm] = useState({ teacherId: "", classId: "", sectionId: "", subjectId: "", termId: "" })

  useEffect(() => {
    if (profile) {
      if (profile.role === 'super_admin') {
        setInstitutionId(localStorage.getItem('selected_institution_id'))
      } else {
        setInstitutionId(profile.tenantId || null)
      }
    }
  }, [profile])

  // Teacher Assignments Filter
  const myAssignmentsQuery = useMemo(() => 
    institutionId && isTeacher && staffId 
      ? query(collection(db, "teacher_assignments"), where("tenantId", "==", institutionId), where("teacherId", "==", staffId)) 
      : null, 
    [db, institutionId, isTeacher, staffId]
  )
  const { data: myAssignments = [] } = useCollection(myAssignmentsQuery)
  const assignedClassIds = useMemo(() => new Set(myAssignments.map((a: any) => a.classId)), [myAssignments])
  const assignedSubjectIds = useMemo(() => new Set(myAssignments.map((a: any) => a.subjectId)), [myAssignments])

  // Foundation Queries
  const yearsQuery = useMemo(() => institutionId ? query(collection(db, "academic_years"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const termsQuery = useMemo(() => institutionId ? query(collection(db, "terms"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const sectionsQuery = useMemo(() => institutionId ? query(collection(db, "sections"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const subjectsQuery = useMemo(() => institutionId ? query(collection(db, "subjects"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const staffQuery = useMemo(() => institutionId ? query(collection(db, "staff"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const assignmentsQuery = useMemo(() => institutionId ? query(collection(db, "teacher_assignments"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: rawYears = [] } = useCollection(yearsQuery)
  const { data: rawTerms = [] } = useCollection(termsQuery)
  const { data: rawClasses = [] } = useCollection(classesQuery)
  const { data: rawSections = [] } = useCollection(sectionsQuery)
  const { data: rawSubjects = [] } = useCollection(subjectsQuery)
  const { data: rawStaff = [] } = useCollection(staffQuery)
  const { data: rawAssignments = [] } = useCollection(assignmentsQuery)

  const years = useMemo(() => [...rawYears].sort((a: any, b: any) => b.year.localeCompare(a.year)), [rawYears])
  const terms = useMemo(() => [...rawTerms].sort((a: any, b: any) => a.name.localeCompare(b.name)), [rawTerms])
  
  const classes = useMemo(() => {
    let list = rawClasses;
    if (isTeacher) list = list.filter(c => assignedClassIds.has(c.id));
    return [...list].sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [rawClasses, isTeacher, assignedClassIds])

  const subjects = useMemo(() => {
    let list = rawSubjects;
    if (isTeacher) list = list.filter(s => assignedSubjectIds.has(s.id));
    return [...list].sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [rawSubjects, isTeacher, assignedSubjectIds])

  const staff = rawStaff;
  const sections = rawSections;
  const assignments = rawAssignments;

  const handleCreate = async (coll: string, data: any, reset: () => void) => {
    if (!institutionId || isTeacher) return
    setLoading(true)
    try {
      await addDoc(collection(db, coll), {
        ...data,
        tenantId: institutionId,
        institutionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      toast({ title: "Structure Updated", description: "The academic foundation has been updated." })
      reset()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (coll: string, id: string) => {
    if (!db || isTeacher) return
    if (!confirm("Are you sure you want to remove this record?")) return

    const docRef = doc(db, coll, id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Record Removed" })
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Academic Foundation</h1>
        <p className="text-muted-foreground">
          {isTeacher ? "Viewing assigned instructional structure." : "Establish the institutional structure for classes, subjects, and assignments."}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-8 flex-wrap h-auto">
          {!isTeacher && <TabsTrigger value="cycle" className="rounded-lg gap-2"><Calendar className="size-4" /> Academic Cycle</TabsTrigger>}
          <TabsTrigger value="classes" className="rounded-lg gap-2"><Layers className="size-4" /> Grade Modules</TabsTrigger>
          <TabsTrigger value="curriculum" className="rounded-lg gap-2"><BookOpen className="size-4" /> Curriculum</TabsTrigger>
          {!isTeacher && <TabsTrigger value="assignments" className="rounded-lg gap-2"><UserCheck className="size-4" /> Staffing</TabsTrigger>}
        </TabsList>

        {!isTeacher && (
          <TabsContent value="cycle" className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Academic Sessions</CardTitle>
                  <CardDescription>Define year ranges for the institution.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-4">
                    <Input placeholder="e.g. 2026/2027" value={yearForm.year} onChange={e => setYearForm({...yearForm, year: e.target.value})} />
                    <Button onClick={() => handleCreate("academic_years", yearForm, () => setYearForm({year: "", status: "Active"}))} disabled={loading}>
                      Link Year
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {years.map((y: any) => (
                      <div key={y.id} className="flex items-center justify-between p-4 rounded-xl border bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <Calendar className="size-4 text-primary" />
                          <span className="font-bold text-primary">{y.year}</span>
                          <Badge className="text-[10px] uppercase font-bold">{y.status}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete("academic_years", y.id)} className="h-8 w-8 text-destructive"><Trash2 className="size-4" /></Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Terms / Semesters</CardTitle>
                  <CardDescription>Sub-divide academic years into terms.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <Select 
                      key={years.length} 
                      onValueChange={v => setTermForm({...termForm, academicYearId: v})} 
                      value={termForm.academicYearId}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Academic Year" /></SelectTrigger>
                      <SelectContent>
                          {years.length > 0 ? (
                            years.map((y: any) => <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>)
                          ) : (
                            <div className="p-2 text-center text-xs text-muted-foreground">No years found</div>
                          )}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Term Name (e.g. Term 1)" value={termForm.name} onChange={e => setTermForm({...termForm, name: e.target.value})} />
                    <Button className="w-full" onClick={() => handleCreate("terms", {...termForm, status: "Active"}, () => setTermForm({name: "", academicYearId: "", startDate: "", endDate: ""}))} disabled={loading || !termForm.academicYearId}>
                      Link Term
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {terms.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border bg-white">
                        <div>
                          <p className="font-bold text-sm">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">{years.find((y: any) => y.id === t.academicYearId)?.year || "Registry ID: " + t.academicYearId.substring(0, 5)}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete("terms", t.id)} className="h-8 w-8 text-destructive"><Trash2 className="size-4" /></Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="classes" className="space-y-8">
           <div className="grid gap-8 md:grid-cols-3">
             {!isTeacher && (
               <Card className="md:col-span-1 border-none shadow-md h-fit">
                 <CardHeader><CardTitle>Add Grade Module</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Class Name</Label><Input placeholder="e.g. Primary 1" value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} /></div>
                    <div className="space-y-2">
                      <Label>Academic Level</Label>
                      <Select onValueChange={v => setClassForm({...classForm, level: v})} value={classForm.level}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KG">Pre-School / KG</SelectItem>
                          <SelectItem value="Primary">Primary</SelectItem>
                          <SelectItem value="JHS">Junior High</SelectItem>
                          <SelectItem value="SHS">Senior High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => handleCreate("classes", classForm, () => setClassForm({name: "", level: "Primary"}))} disabled={loading}>Establish Class</Button>
                 </CardContent>
               </Card>
             )}

             <div className={isTeacher ? "md:col-span-3 space-y-6" : "md:col-span-2 space-y-6"}>
                {classes.map((c: any) => (
                  <Card key={c.id} className="border-none shadow-sm overflow-hidden">
                    <div className="bg-primary/5 p-4 border-b flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="size-5 text-primary" />
                        <h3 className="font-bold text-primary">{c.name}</h3>
                        <Badge variant="outline" className="text-[9px] uppercase">{c.level}</Badge>
                      </div>
                      {!isTeacher && <Button variant="ghost" size="icon" onClick={() => handleDelete("classes", c.id)} className="text-destructive h-8 w-8"><Trash2 className="size-4" /></Button>}
                    </div>
                    <CardContent className="p-0">
                       <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
                         <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Sections / Streams</span>
                         {!isTeacher && (
                           <Dialog>
                             <DialogTrigger asChild><Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase"><Plus className="size-3 mr-1" /> Add Section</Button></DialogTrigger>
                             <DialogContent>
                               <DialogHeader><DialogTitle>New Section for {c.name}</DialogTitle></DialogHeader>
                               <div className="py-4 space-y-4">
                                 <div className="space-y-2"><Label>Section Name</Label><Input placeholder="e.g. Section A" value={sectionForm.name} onChange={e => setSectionForm({...sectionForm, name: e.target.value})} /></div>
                                 <div className="space-y-2"><Label>Capacity</Label><Input type="number" value={sectionForm.capacity} onChange={e => setSectionForm({...sectionForm, capacity: e.target.value})} /></div>
                               </div>
                               <DialogFooter><Button onClick={() => handleCreate("sections", {...sectionForm, classId: c.id}, () => setSectionForm({classId: "", name: "", capacity: "30"}))}>Create Section</Button></DialogFooter>
                             </DialogContent>
                           </Dialog>
                         )}
                       </div>
                       <div className="divide-y">
                         {sections.filter((s: any) => s.classId === c.id).map((s: any) => (
                           <div key={s.id} className="p-4 flex items-center justify-between text-sm">
                             <div className="flex items-center gap-2">
                               <Layers className="size-3.5 text-muted-foreground" />
                               <span className="font-medium">{s.name}</span>
                               <span className="text-[10px] text-muted-foreground font-bold">({s.capacity} Seats)</span>
                             </div>
                             {!isTeacher && <Button variant="ghost" size="icon" onClick={() => handleDelete("sections", s.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive"><X className="size-3" /></Button>}
                           </div>
                         ))}
                         {sections.filter((s: any) => s.classId === c.id).length === 0 && <div className="p-8 text-center text-[10px] text-muted-foreground italic uppercase">No sections registered.</div>}
                       </div>
                    </CardContent>
                  </Card>
                ))}
             </div>
           </div>
        </TabsContent>

        <TabsContent value="curriculum" className="space-y-8">
           <div className="grid gap-8 md:grid-cols-3">
             {!isTeacher && (
               <Card className="md:col-span-1 border-none shadow-md h-fit">
                 <CardHeader><CardTitle>Link Subject</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Subject Name</Label><Input placeholder="e.g. Mathematics" value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Subject Code</Label><Input placeholder="e.g. MATH-101" value={subjectForm.code} onChange={e => setSubjectForm({...subjectForm, code: e.target.value})} /></div>
                    <Button className="w-full" onClick={() => handleCreate("subjects", subjectForm, () => setSubjectForm({name: "", code: ""}))} disabled={loading}>Authorize Subject</Button>
                 </CardContent>
               </Card>
             )}
             <Card className={isTeacher ? "md:col-span-3 border-none shadow-md overflow-hidden" : "md:col-span-2 border-none shadow-md overflow-hidden"}>
                <CardHeader><CardTitle>Institutional Subjects</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {subjects.map((s: any) => (
                      <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center font-bold text-primary text-[10px]">{s.code || s.name.substring(0, 3).toUpperCase()}</div>
                          <span className="font-bold text-sm">{s.name}</span>
                        </div>
                        {!isTeacher && <Button variant="ghost" size="icon" onClick={() => handleDelete("subjects", s.id)} className="text-destructive"><Trash2 className="size-4" /></Button>}
                      </div>
                    ))}
                  </div>
                </CardContent>
             </Card>
           </div>
        </TabsContent>

        {!isTeacher && (
          <TabsContent value="assignments" className="space-y-8">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Staff Academic Assignments</CardTitle>
                <CardDescription>Assign teachers to specific class sections and subjects.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-5">
                    <div className="space-y-2">
                      <Label>Teacher</Label>
                      <Select 
                        key={`staff-select-${staff.length}`}
                        onValueChange={v => setAssignForm({...assignForm, teacherId: v})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {staff.filter((s: any) => s.designation?.toLowerCase().includes("teacher")).length > 0 ? (
                            staff.filter((s: any) => s.designation?.toLowerCase().includes("teacher")).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)
                          ) : (
                            <div className="p-2 text-center text-xs">No teachers found</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Grade</Label>
                      <Select 
                        key={`class-select-${classes.length}`}
                        onValueChange={v => setAssignForm({...assignForm, classId: v})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Select 
                        key={`section-select-${assignForm.classId}-${sections.length}`}
                        onValueChange={v => setAssignForm({...assignForm, sectionId: v})} 
                        disabled={!assignForm.classId}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {sections.filter((s: any) => s.classId === assignForm.classId).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select 
                        key={`subject-select-${subjects.length}`}
                        onValueChange={v => setAssignForm({...assignForm, subjectId: v})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button className="w-full" onClick={() => handleCreate("teacher_assignments", assignForm, () => setAssignForm({teacherId: "", classId: "", sectionId: "", subjectId: "", termId: ""}))}>Assign</Button>
                    </div>
                  </div>

                  <div className="border rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 border-b">
                        <tr>
                          <th className="p-4 text-left font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Teacher</th>
                          <th className="p-4 text-left font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Allocation</th>
                          <th className="p-4 text-left font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Subject</th>
                          <th className="p-4 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {assignments.map((a: any) => {
                          const teacher = staff.find((s: any) => s.id === a.teacherId);
                          const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : "Unknown Staff";
                          return (
                            <tr key={a.id}>
                              <td className="p-4 font-bold text-primary">{teacherName}</td>
                              <td className="p-4 text-muted-foreground">
                                {classes.find((c: any) => c.id === a.classId)?.name} • {sections.find((s: any) => s.id === a.sectionId)?.name || "All Sections"}
                              </td>
                              <td className="p-4"><Badge variant="secondary" className="font-bold">{subjects.find((s: any) => s.id === a.subjectId)?.name}</Badge></td>
                              <td className="p-4 text-right"><Button variant="ghost" size="icon" onClick={() => handleDelete("teacher_assignments", a.id)} className="text-destructive"><Trash2 className="size-4" /></Button></td>
                            </tr>
                          );
                        })}
                        {assignments.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-muted-foreground italic">No faculty assignments active for current foundation.</td></tr>}
                      </tbody>
                    </table>
                  </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default function AcademicFoundationPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center animate-pulse font-headline font-bold text-primary">Synchronizing Academic Hub...</div>}>
      <AcademicFoundationContent />
    </Suspense>
  )
}
