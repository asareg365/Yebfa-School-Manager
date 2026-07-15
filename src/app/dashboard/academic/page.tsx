
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar, 
  Layers, 
  BookOpen, 
  UserCheck, 
  FileText,
  ListTodo,
  Sparkles,
  Bot,
  Wand2
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
import { useFirestore, useCollection, useUser } from "@/firebase"
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
import { generateLessonPlan } from "@/ai/flows/generate-lesson-plan"

export default function AcademicStructurePage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("cycle")
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const [lessonForm, setLessonForm] = useState({ subjectId: "", classId: "", topic: "", objectives: "", date: "" })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const yearsQuery = useMemo(() => institutionId ? query(collection(db, "academic_years"), where("tenantId", "==", institutionId), orderBy("year", "desc")) : null, [db, institutionId])
  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const subjectsQuery = useMemo(() => institutionId ? query(collection(db, "subjects"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const plansQuery = useMemo(() => institutionId ? query(collection(db, "lesson_plans"), where("tenantId", "==", institutionId), orderBy("createdAt", "desc")) : null, [db, institutionId])

  const { data: years = [] } = useCollection(yearsQuery)
  const { data: classes = [] } = useCollection(classesQuery)
  const { data: subjects = [] } = useCollection(subjectsQuery)
  const { data: plans = [] } = useCollection(plansQuery)

  const handleAiAssist = async () => {
    if (!lessonForm.topic || !lessonForm.subjectId) {
      toast({ variant: "destructive", title: "Missing Info", description: "Select subject and topic first." })
      return
    }
    setAiLoading(true)
    try {
      const subName = subjects.find(s => s.id === lessonForm.subjectId)?.name || "Academic"
      const result = await generateLessonPlan({
        subject: subName,
        gradeLevel: "Standard",
        topic: lessonForm.topic
      })
      setLessonForm(prev => ({ ...prev, objectives: result.objectives.join('\n') }))
      toast({ title: "AI Assistance Successful", description: "Lesson objectives drafted." })
    } catch (e) {
      toast({ variant: "destructive", title: "AI Hub Offline" })
    } finally {
      setAiLoading(false)
    }
  }

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!institutionId || !user) return
    try {
      await addDoc(collection(db, "lesson_plans"), {
        tenantId: institutionId,
        staffId: user.uid,
        ...lessonForm,
        status: "draft",
        createdAt: serverTimestamp()
      })
      toast({ title: "Lesson Plan Drafted" })
      setLessonForm({ subjectId: "", classId: "", topic: "", objectives: "", date: "" })
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }) }
  }

  const handleDelete = async (coll: string, id: string) => {
    try {
      await deleteDoc(doc(db, coll, id))
      toast({ title: "Record Removed" })
    } catch (err: any) { toast({ variant: "destructive", title: "Action Denied" }) }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Academic Hub</h1>
        <p className="text-muted-foreground">Strategic instructional planning and curriculum management.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-8 flex-wrap h-auto">
          <TabsTrigger value="cycle" className="rounded-lg gap-2"><Calendar className="size-4" /> Cycle</TabsTrigger>
          <TabsTrigger value="curriculum" className="rounded-lg gap-2"><BookOpen className="size-4" /> Curriculum</TabsTrigger>
          <TabsTrigger value="plans" className="rounded-lg gap-2"><Bot className="size-4" /> AI Lesson Plans</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-lg gap-2"><ListTodo className="size-4" /> Tasks & HW</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-8">
           <div className="grid gap-6 md:grid-cols-3">
             <Card className="md:col-span-1 border-none shadow-md h-fit">
               <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle className="text-lg">New Lesson Plan</CardTitle>
                 <Sparkles className="size-4 text-accent animate-pulse" />
               </CardHeader>
               <CardContent>
                 <form onSubmit={handleAddPlan} className="space-y-4">
                   <div className="space-y-2"><Label>Subject</Label>
                    <Select onValueChange={v => setLessonForm({...lessonForm, subjectId: v})} value={lessonForm.subjectId} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                   </div>
                   <div className="space-y-2"><Label>Topic</Label>
                    <div className="flex gap-2">
                      <Input value={lessonForm.topic} onChange={e => setLessonForm({...lessonForm, topic: e.target.value})} placeholder="e.g. Photosynthesis" required />
                      <Button type="button" variant="outline" size="icon" onClick={handleAiAssist} disabled={aiLoading}>
                        {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4 text-accent" />}
                      </Button>
                    </div>
                   </div>
                   <div className="space-y-2"><Label>Objectives</Label><Textarea value={lessonForm.objectives} onChange={e => setLessonForm({...lessonForm, objectives: e.target.value})} placeholder="What should students learn?" className="min-h-[100px]" required /></div>
                   <div className="space-y-2"><Label>Date</Label><Input type="date" value={lessonForm.date} onChange={e => setLessonForm({...lessonForm, date: e.target.value})} required /></div>
                   <Button type="submit" className="w-full bg-primary font-bold">Register Plan</Button>
                 </form>
               </CardContent>
             </Card>

             <Card className="md:col-span-2 border-none shadow-md overflow-hidden">
                <CardHeader className="bg-white border-b"><CardTitle>Instructional History</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {plans.map(p => (
                      <div key={p.id} className="p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex flex-col">
                             <span className="font-bold text-primary">{p.topic}</span>
                             <span className="text-[10px] uppercase font-bold text-muted-foreground">
                               {subjects.find(s => s.id === p.subjectId)?.name}
                             </span>
                           </div>
                           <Badge variant="outline" className="text-[9px] uppercase">{p.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground italic line-clamp-2">{p.objectives}</p>
                        <div className="flex items-center justify-between mt-4">
                           <span className="text-[10px] font-mono">{p.date}</span>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete("lesson_plans", p.id)}><Trash2 className="size-4" /></Button>
                        </div>
                      </div>
                    ))}
                    {plans.length === 0 && <div className="p-20 text-center text-muted-foreground opacity-30 italic">No plans registered.</div>}
                  </div>
                </CardContent>
             </Card>
           </div>
        </TabsContent>

        <TabsContent value="cycle" className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-md">
              <CardHeader><CardTitle className="text-lg">Academic Sessions</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {years.map(y => (
                    <div key={y.id} className="flex items-center justify-between p-4 rounded-xl border bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <Calendar className="size-4 text-primary" />
                        <span className="font-bold text-primary">{y.year}</span>
                        <Badge className="text-[10px] uppercase">{y.status}</Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete("academic_years", y.id)} className="h-8 w-8 text-destructive"><Trash2 className="size-4" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
