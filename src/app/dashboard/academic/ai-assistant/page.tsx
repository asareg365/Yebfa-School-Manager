"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Bot, 
  Sparkles, 
  Loader2, 
  BookOpen, 
  Copy, 
  Check, 
  Printer, 
  ListChecks, 
  Layers, 
  FileText, 
  Users,
  Target,
  Lightbulb,
  GraduationCap
} from "lucide-react"
import { generateLessonPlan, GenerateLessonPackOutput } from "@/ai/flows/generate-lesson-plan"
import { useFirestore, useCollection, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function AiTeacherAssistantPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateLessonPackOutput | null>(null)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    subjectId: "",
    gradeLevel: "",
    topic: "",
    duration: "60 minutes",
    focusArea: ""
  })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)
  const isTeacher = profile?.role === 'teacher'
  const staffId = profile?.staffId

  // Teacher Assignments Filter
  const assignmentsQuery = useMemoFirebase(() => 
    institutionId && isTeacher && staffId 
      ? query(collection(db, "teacher_assignments"), where("tenantId", "==", institutionId), where("teacherId", "==", staffId)) 
      : null, 
    [db, institutionId, isTeacher, staffId]
  )
  const { data: assignments = [] } = useCollection(assignmentsQuery)
  const assignedClassIds = useMemo(() => new Set(assignments.map((a: any) => a.classId)), [assignments])
  const assignedSubjectIds = useMemo(() => new Set(assignments.map((a: any) => a.subjectId)), [assignments])

  const classesQuery = useMemoFirebase(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const subjectsQuery = useMemoFirebase(() => institutionId ? query(collection(db, "subjects"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: allClasses = [] } = useCollection(classesQuery)
  const { data: allSubjects = [] } = useCollection(subjectsQuery)

  const classes = useMemo(() => isTeacher ? allClasses.filter(c => assignedClassIds.has(c.id)) : allClasses, [allClasses, isTeacher, assignedClassIds])
  const subjects = useMemo(() => isTeacher ? allSubjects.filter(s => assignedSubjectIds.has(s.id)) : allSubjects, [allSubjects, isTeacher, assignedSubjectIds])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subjectId || !form.gradeLevel || !form.topic) {
      toast({ variant: "destructive", title: "Missing Parameters", description: "Complete the context fields to activate AI assistance." })
      return
    }

    setLoading(true)
    try {
      const subName = subjects.find(s => s.id === form.subjectId)?.name || "Academic"
      const res = await generateLessonPlan({
        ...form,
        subject: subName
      })
      setResult(res)
      toast({ title: "Bundle Generated", description: "Instructional materials are ready for review." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Sync Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: "Copied to Clipboard" })
    } catch (err) {
      toast({ variant: "destructive", title: "Copy Failed", description: "Operation restricted in this environment." })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">AI Teacher Assistant</h1>
          <p className="text-muted-foreground font-medium">Generating high-fidelity lesson notes, plans, and pedagogical activities.</p>
        </div>
        <div className="flex gap-3">
          {result && (
            <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={() => window.print()}>
              <Printer className="size-4" /> Print Pack
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-primary text-primary-foreground p-8 shrink-0">
               <div className="flex items-center gap-3 mb-2">
                 <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><Bot className="size-5" /></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Instructional Context</span>
               </div>
               <CardTitle className="text-2xl font-headline font-bold">Assist Parameters</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleGenerate} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subject</Label>
                  <Select value={form.subjectId} onValueChange={v => setForm({...form, subjectId: v})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.filter(s => !!s.id).map(s => <SelectItem key={s.id} value={s.id || s.name || "unspecified"}>{s.name || "Unnamed Subject"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Grade Level</Label>
                  <Select value={form.gradeLevel} onValueChange={v => setForm({...form, gradeLevel: v})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                    <SelectContent>
                      {classes.filter(c => !!c.id).map(c => (
                        <SelectItem key={c.id} value={c.name || c.id || "unspecified"}>
                          {c.name || "Unnamed Class"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Topic / Theme</Label>
                  <Input 
                    required 
                    placeholder="e.g. Introduction to Fractions" 
                    className="h-12 rounded-xl" 
                    value={form.topic}
                    onChange={e => setForm({...form, topic: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Focus Skill (Optional)</Label>
                  <Input 
                    placeholder="e.g. Adding like denominators" 
                    className="h-12 rounded-xl" 
                    value={form.focusArea}
                    onChange={e => setForm({...form, focusArea: e.target.value})}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-16 text-lg font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20 gap-3">
                  {loading ? <Loader2 className="size-6 animate-spin" /> : <Sparkles className="size-6 text-accent" />}
                  Generate Pack
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!result ? (
            <Card className="border-none shadow-md h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 space-y-6 rounded-3xl bg-muted/5 border-2 border-dashed">
              <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center">
                <BookOpen className="size-12 text-primary/20" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-xl font-bold text-primary/60 font-headline">Awaiting Instructional Parameters</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Provide a subject, grade, and topic to authorize the AI Teacher Assistant to construct a full instructional bundle.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <Tabs defaultValue="notes" className="w-full">
                <TabsList className="bg-muted/50 p-1 rounded-xl mb-6 grid grid-cols-4 h-auto">
                  <TabsTrigger value="notes" className="rounded-lg gap-2 text-xs py-2.5"><FileText className="size-4" /> Lesson Notes</TabsTrigger>
                  <TabsTrigger value="plan" className="rounded-lg gap-2 text-xs py-2.5"><ListChecks className="size-4" /> Lesson Plan</TabsTrigger>
                  <TabsTrigger value="activities" className="rounded-lg gap-2 text-xs py-2.5"><Users className="size-4" /> Activities</TabsTrigger>
                  <TabsTrigger value="assessment" className="rounded-lg gap-2 text-xs py-2.5"><Target className="size-4" /> Assessment</TabsTrigger>
                </TabsList>

                <TabsContent value="notes" className="mt-0">
                  <Card className="border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between p-8">
                       <div>
                         <CardTitle className="text-xl font-headline font-bold">Student Lesson Notes</CardTitle>
                         <CardDescription>Comprehensive content ready for classroom instruction.</CardDescription>
                       </div>
                       <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handleCopy(result.lessonNotes)}>
                         {copied ? <Check className="size-5 text-green-600" /> : <Copy className="size-5" />}
                       </Button>
                    </CardHeader>
                    <CardContent className="p-10">
                       <ScrollArea className="h-[500px] pr-6">
                          <div className="prose prose-slate max-w-none">
                             <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-medium">
                               {result.lessonNotes}
                             </div>
                          </div>
                       </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="plan" className="mt-0 space-y-6">
                  <Card className="border-none shadow-xl rounded-3xl bg-white">
                    <CardHeader className="p-8 pb-0">
                       <CardTitle className="text-lg font-bold flex items-center gap-2">
                         <Target className="size-5 text-primary" /> Learning Objectives
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                       <div className="grid gap-3">
                          {result.objectives.map((obj, i) => (
                            <div key={i} className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm font-medium">
                               <span className="text-primary font-bold">{i+1}.</span>
                               {obj}
                            </div>
                          ))}
                       </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b p-8">
                       <CardTitle className="text-lg font-bold">Instructional Procedure</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       <div className="divide-y">
                          {result.procedure.map((step, i) => (
                            <div key={i} className="p-6 flex gap-6 hover:bg-slate-50 transition-colors">
                               <div className="flex flex-col items-center gap-1 shrink-0">
                                  <Badge className="bg-primary text-white h-7 w-7 flex items-center justify-center rounded-full border-none">{i+1}</Badge>
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{step.duration}</span>
                               </div>
                               <div className="space-y-1">
                                  <p className="font-bold text-primary text-sm">{step.step}</p>
                                  <p className="text-sm text-slate-600 leading-relaxed">{step.activity}</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activities" className="mt-0">
                   <div className="grid gap-6">
                      {result.classActivities.map((act, i) => (
                        <Card key={i} className="border-none shadow-md rounded-2xl bg-white overflow-hidden group">
                           <div className="h-1 bg-accent/30 group-hover:bg-accent transition-colors" />
                           <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                              <CardTitle className="text-base font-bold text-primary">{act.name}</CardTitle>
                              <Badge variant="secondary" className="text-[10px] uppercase">{act.interactionType}</Badge>
                           </CardHeader>
                           <CardContent className="p-6 pt-0">
                              <p className="text-sm text-slate-600 leading-relaxed">{act.description}</p>
                           </CardContent>
                        </Card>
                      ))}
                   </div>
                </TabsContent>

                <TabsContent value="assessment" className="mt-0 space-y-6">
                  <Card className="border-none shadow-md rounded-3xl bg-white p-8">
                     <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                       <Lightbulb className="size-4" /> Formative Assessment
                     </h4>
                     <p className="text-sm leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">{result.assessment}</p>
                  </Card>
                  <Card className="border-none shadow-md rounded-3xl bg-white p-8 border-l-4 border-accent">
                     <h4 className="text-xs font-bold uppercase tracking-widest text-accent mb-4 flex items-center gap-2">
                       <GraduationCap className="size-4" /> Homework / Extended Learning
                     </h4>
                     <p className="text-sm leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">{result.homework}</p>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
