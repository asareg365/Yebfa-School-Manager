"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, Plus, Search, Trash2, Pencil, Loader2, BookCheck, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

const SUBJECT_CATEGORIES = ["Core", "Elective", "Vocational", "Extra-Curricular"]

const PRIMARY_GRADES = ["KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]
const JHS_GRADES = ["JHS 1", "JHS 2", "JHS 3"]
const SHS_GRADES = ["SHS 1", "SHS 2", "SHS 3"]

export default function AcademicPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingSubject, setEditingSubject] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterGrade, setFilterGrade] = useState("all")

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    category: "Core",
    gradeLevels: [] as string[],
    description: ""
  })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db!, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const subjectsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "subjects"), where("institutionId", "==", institutionId))
  }, [db, institutionId])

  const { data: subjectsData, loading: dataLoading } = useCollection(subjectsQuery)

  const availableGrades = useMemo(() => {
    const category = institution?.gradeLevel || institution?.type || "Basic"
    if (category.toLowerCase().includes("primary") || category.toLowerCase().includes("basic")) return PRIMARY_GRADES
    if (category.toLowerCase().includes("jhs")) return JHS_GRADES
    if (category.toLowerCase().includes("shs")) return SHS_GRADES
    return [...PRIMARY_GRADES, ...JHS_GRADES, ...SHS_GRADES]
  }, [institution])

  const filteredSubjects = useMemo(() => {
    return subjectsData.filter(sub => {
      const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase())
      // Check if filterGrade is in the gradeLevels array or matches legacy gradeLevel string
      const matchesGrade = filterGrade === "all" || 
                          sub.gradeLevels?.includes(filterGrade) || 
                          sub.gradeLevel === filterGrade
      return matchesSearch && matchesGrade
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [subjectsData, searchQuery, filterGrade])

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    
    if (subjectForm.gradeLevels.length === 0) {
      toast({ variant: "destructive", title: "Missing Grades", description: "Please select at least one target grade." })
      return
    }

    setLoading(true)
    const data = {
      ...subjectForm,
      institutionId,
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, "subjects"), data)
      .then(() => {
        toast({ title: "Subject Added", description: `${subjectForm.name} is now in the curriculum.` })
        setIsAddOpen(false)
        setSubjectForm({ name: "", category: "Core", gradeLevels: [], description: "" })
      })
      .catch(async (error: any) => {
        const permissionError = new FirestorePermissionError({
          path: 'subjects',
          operation: 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const handleUpdateSubject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !editingSubject || loading) return
    
    if (subjectForm.gradeLevels.length === 0) {
      toast({ variant: "destructive", title: "Missing Grades", description: "Please select at least one target grade." })
      return
    }

    setLoading(true)
    const data = { ...subjectForm }

    updateDoc(doc(db, "subjects", editingSubject.id), data)
      .then(() => {
        toast({ title: "Subject Updated", description: "Academic record synchronized." })
        setIsEditOpen(false)
        setEditingSubject(null)
      })
      .catch(async (error: any) => {
        const permissionError = new FirestorePermissionError({
          path: `subjects/${editingSubject.id}`,
          operation: 'update',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const handleDeleteSubject = (id: string, name: string) => {
    if (!db) return
    deleteDoc(doc(db, "subjects", id))
      .then(() => {
        toast({ title: "Subject Removed", description: `${name} de-provisioned from syllabus.` })
      })
      .catch(async (error: any) => {
        const permissionError = new FirestorePermissionError({
          path: `subjects/${id}`,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      })
  }

  if (!institutionId) return (
    <div className="p-12 text-center space-y-4">
      <h2 className="text-xl font-bold">No Institution Selected</h2>
      <p className="text-muted-foreground">Select a school in the Admin Hub to manage curriculum.</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Academic Ledger</h1>
          <p className="text-muted-foreground">Manage curriculum, subjects, and departmental syllabi.</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary h-11 px-6 shadow-lg shadow-primary/10">
                <Plus className="size-4" /> Add New Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-lg">
              <form onSubmit={handleAddSubject}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline font-bold text-primary">Map Academic Subject</DialogTitle>
                  <DialogDescription>Define a new subject for the 2026 academic cycle.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6 max-h-[70vh] overflow-y-auto pr-2">
                  <div className="space-y-2">
                    <Label>Subject Name</Label>
                    <Input required value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} placeholder="e.g. Core Mathematics" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select onValueChange={v => setSubjectForm({...subjectForm, category: v})} defaultValue="Core">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUBJECT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label>Target Grades (Multiple Select)</Label>
                    <div className="grid grid-cols-2 gap-3 p-4 border rounded-xl bg-slate-50/50">
                      {availableGrades.map(grade => (
                        <div key={grade} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`add-grade-${grade}`}
                            checked={subjectForm.gradeLevels.includes(grade)}
                            onCheckedChange={(checked) => {
                              const next = checked 
                                ? [...subjectForm.gradeLevels, grade]
                                : subjectForm.gradeLevels.filter(g => g !== grade);
                              setSubjectForm({...subjectForm, gradeLevels: next});
                            }}
                          />
                          <label htmlFor={`add-grade-${grade}`} className="text-sm font-medium leading-none cursor-pointer">
                            {grade}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Brief Description</Label>
                    <Input value={subjectForm.description} onChange={e => setSubjectForm({...subjectForm, description: e.target.value})} placeholder="Learning objectives summary..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading} className="w-full h-11">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <BookOpen className="mr-2" />}
                    Provision Subject
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase">Total Subjects</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline">{subjectsData.length}</div></CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase">Core Subjects</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline">{subjectsData.filter(s => s.category === 'Core').length}</div></CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase">Electives</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline">{subjectsData.filter(s => s.category === 'Elective').length}</div></CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase">Vocational</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline">{subjectsData.filter(s => s.category === 'Vocational').length}</div></CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md bg-white overflow-hidden rounded-2xl">
        <CardHeader className="border-b bg-white p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search curriculum map..." className="pl-9 h-11 bg-slate-50 border-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <Select onValueChange={setFilterGrade} defaultValue="all">
                <SelectTrigger className="w-[180px] h-11 bg-slate-50 border-none"><SelectValue placeholder="Filter by Grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {availableGrades.map(grade => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {dataLoading ? (
            <div className="p-24 text-center space-y-4">
              <Loader2 className="size-10 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Synchronizing Academic Roster...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="p-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center">
                <BookCheck className="size-10 text-primary/30" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-xl font-bold text-primary">No Curriculum Items Detected</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed italic">
                  Start building your curriculum by adding subjects. Map them to specific grade levels for tracking.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {filteredSubjects.map((sub: any) => (
                <div key={sub.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-6">
                    <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold">
                      {sub.name.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary text-lg">{sub.name}</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider">{sub.category}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap gap-1">
                          {(sub.gradeLevels || [sub.gradeLevel || "Unmapped"]).map((gl: string) => (
                            <span key={gl} className="font-bold text-accent uppercase tracking-tight text-[10px] bg-accent/5 px-1.5 py-0.5 rounded border border-accent/10">{gl}</span>
                          ))}
                        </div>
                        <ChevronRight className="size-3 shrink-0" />
                        <span className="italic">{sub.description || "No description mapped."}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => {
                      setEditingSubject(sub);
                      setSubjectForm({
                        name: sub.name,
                        category: sub.category,
                        gradeLevels: sub.gradeLevels || (sub.gradeLevel ? [sub.gradeLevel] : []),
                        description: sub.description || ""
                      });
                      setIsEditOpen(true);
                    }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => handleDeleteSubject(sub.id, sub.name)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleUpdateSubject}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold text-primary">Edit Subject Definition</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-6 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label>Subject Name</Label>
                <Input required value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={v => setSubjectForm({...subjectForm, category: v})} value={subjectForm.category}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUBJECT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>Target Grades</Label>
                <div className="grid grid-cols-2 gap-3 p-4 border rounded-xl bg-slate-50/50">
                  {availableGrades.map(grade => (
                    <div key={grade} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`edit-grade-${grade}`}
                        checked={subjectForm.gradeLevels.includes(grade)}
                        onCheckedChange={(checked) => {
                          const next = checked 
                            ? [...subjectForm.gradeLevels, grade]
                            : subjectForm.gradeLevels.filter(g => g !== grade);
                          setSubjectForm({...subjectForm, gradeLevels: next});
                        }}
                      />
                      <label htmlFor={`edit-grade-${grade}`} className="text-sm font-medium leading-none cursor-pointer">
                        {grade}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={subjectForm.description} onChange={e => setSubjectForm({...subjectForm, description: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Authorize Change"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
