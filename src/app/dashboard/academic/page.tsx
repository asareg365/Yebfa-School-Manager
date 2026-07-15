
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

export default function AcademicPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    category: "Core",
    gradeLevel: "Primary 1",
    description: ""
  })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const subjectsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "subjects"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: subjects, loading: dataLoading } = useCollection(subjectsQuery)

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    
    setLoading(true)
    const data = {
      ...subjectForm,
      tenantId: institutionId,
      institutionId,
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, "subjects"), data)
      .then(() => {
        toast({ title: "Subject Added", description: `${subjectForm.name} added to curriculum.` })
        setIsAddOpen(false)
        setSubjectForm({ name: "", category: "Core", gradeLevel: "Primary 1", description: "" })
      })
      .finally(() => setLoading(false))
  }

  const handleDelete = (id: string) => {
    deleteDoc(doc(db!, "subjects", id))
      .then(() => toast({ title: "Subject Removed" }))
  }

  if (dataLoading) return <div className="p-12 text-center animate-pulse font-bold text-muted-foreground">Loading Curriculum...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-headline font-bold text-primary">Departmental Links</h1><p className="text-muted-foreground">Managing academic subjects and modules.</p></div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button className="gap-2 bg-primary"><Plus className="size-4" /> Add Subject</Button></DialogTrigger>
          <DialogContent><form onSubmit={handleAddSubject}><DialogHeader><DialogTitle>New Subject Module</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Subject Name</Label><Input required value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Category</Label><Select onValueChange={v => setSubjectForm({...subjectForm, category: v})} value={subjectForm.category}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SUBJECT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Target Grade</Label><Input value={subjectForm.gradeLevel} onChange={e => setSubjectForm({...subjectForm, gradeLevel: e.target.value})} placeholder="e.g. JHS 1" /></div>
              </div>
            </div>
            <DialogFooter><Button type="submit" disabled={loading} className="w-full">Register Subject</Button></DialogFooter>
          </form></DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {subjects.map((sub: any) => (
          <Card key={sub.id} className="border-none shadow-md">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant="secondary" className="text-[10px] uppercase">{sub.category}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(sub.id)}><Trash2 className="size-3" /></Button>
              </div>
              <CardTitle className="text-lg font-bold mt-2">{sub.name}</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">{sub.gradeLevel}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
