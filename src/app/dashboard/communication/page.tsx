
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  MessageSquare, 
  Send, 
  Bell, 
  Users, 
  Megaphone, 
  Loader2, 
  History, 
  Trash2, 
  CalendarHeart,
  User,
  ShieldCheck,
  Search,
  CheckCircle2
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { 
  collection, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  orderBy, 
  writeBatch 
} from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors"

export default function CommunicationCenterPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msgForm, setMsgForm] = useState({ title: "", content: "", target: "All", targetStudentId: "" })
  const [studentSearch, setStudentSearch] = useState("")

  // Resolve Profile for Permissions
  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)
  
  const isParent = profile?.role === 'parent'
  const isStudent = profile?.role === 'student'
  const isRestricted = isParent || isStudent

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  // 1. Fetch Students for Staff (Targeting)
  const studentsQuery = useMemo(() => 
    institutionId && !isRestricted ? query(collection(db, "students"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId, isRestricted]
  )
  const { data: students = [] } = useCollection(studentsQuery)

  const filteredTargetStudents = useMemo(() => {
    return students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase())
    ).slice(0, 5)
  }, [students, studentSearch])

  // 2. Fetch Parent's Children (For filtering received messages)
  const parentRelsQuery = useMemo(() => 
    institutionId && isParent ? query(collection(db, "student_parents"), where("parentId", "==", user?.uid)) : null, 
    [db, institutionId, isParent, user?.uid]
  )
  const { data: parentRels = [] } = useCollection(parentRelsQuery)
  const childrenIds = useMemo(() => parentRels.map(r => r.studentId), [parentRels])

  // 3. Fetch Announcements
  const annQuery = useMemo(() => 
    institutionId ? query(collection(db, "announcements"), where("tenantId", "==", institutionId), orderBy("createdAt", "desc")) : null, 
    [db, institutionId]
  )
  const { data: allAnnouncements = [] } = useCollection(annQuery)

  // 4. Client-side filtering for Students & Parents
  const announcements = useMemo(() => {
    if (!isRestricted) return allAnnouncements
    return allAnnouncements.filter((ann: any) => {
      // Show Global
      if (ann.target === 'All') return true
      
      // Parent Logic
      if (isParent) {
        if (ann.target === 'Parents') return true
        if (ann.target === 'StudentParent' && childrenIds.includes(ann.targetStudentId)) return true
      }

      // Student Logic
      if (isStudent) {
        if (ann.target === 'StudentParent' && ann.targetStudentId === profile?.studentId) return true
      }

      return false
    })
  }, [allAnnouncements, isRestricted, isParent, isStudent, childrenIds, profile?.studentId])

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading || isRestricted) return
    if (msgForm.target === 'StudentParent' && !msgForm.targetStudentId) {
      toast({ variant: "destructive", title: "Student Selection Required" })
      return
    }

    setLoading(true)
    const batch = writeBatch(db)
    const annRef = doc(collection(db, "announcements"))
    
    const payload = {
      ...msgForm,
      tenantId: institutionId,
      institutionId,
      senderName: profile?.name || "Administration",
      createdAt: serverTimestamp()
    }

    batch.set(annRef, payload)

    const notifRef = doc(collection(db, "notifications"))
    batch.set(notifRef, {
      tenantId: institutionId,
      title: msgForm.title,
      description: msgForm.content.substring(0, 100),
      type: 'info',
      createdAt: serverTimestamp(),
      target: msgForm.target,
      targetStudentId: msgForm.targetStudentId || null
    })

    // Commit using non-blocking pattern for contextual error handling
    batch.commit()
      .then(() => {
        toast({ title: "Message Authorized", description: "Information synchronized with registry." })
        setMsgForm({ title: "", content: "", target: "All", targetStudentId: "" })
        setStudentSearch("")
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'announcements/notifications',
          operation: 'write',
          requestResourceData: payload,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const handleDelete = (id: string) => {
    if (isRestricted || !db) return
    if (!confirm("Are you sure you want to remove this record?")) return

    const docRef = doc(db, "announcements", id);
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
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Communication Hub</h1>
        <p className="text-muted-foreground font-medium">
          {isRestricted 
            ? "Official school announcements and personal academic notifications." 
            : "Strategic engagement for parents, staff, and students."}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {!isRestricted && (
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-primary text-primary-foreground p-8 shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><Megaphone className="size-5" /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Authorize Dispatch</span>
                </div>
                <CardTitle className="text-2xl font-headline font-bold">New Message</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleBroadcast} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Target Audience</Label>
                    <Select value={msgForm.target} onValueChange={v => setMsgForm({...msgForm, target: v, targetStudentId: ""})}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">Global (Everyone)</SelectItem>
                        <SelectItem value="Parents">All Guardians</SelectItem>
                        <SelectItem value="Teachers">All Faculty</SelectItem>
                        <SelectItem value="StudentParent">Specific Student / Parent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {msgForm.target === 'StudentParent' && (
                    <div className="space-y-3 animate-in slide-in-from-top-2">
                       <Label className="text-[10px] font-bold uppercase text-muted-foreground">Find Student</Label>
                       <div className="relative">
                          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                          <Input 
                            placeholder="Name or ID..." 
                            className="pl-10 h-11 rounded-xl"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                          />
                       </div>
                       {studentSearch.length > 1 && (
                         <div className="rounded-xl border bg-slate-50 p-2 space-y-1">
                            {filteredTargetStudents.map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setMsgForm({...msgForm, targetStudentId: s.id});
                                  setStudentSearch(`${s.firstName} ${s.lastName}`);
                                }}
                                className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${msgForm.targetStudentId === s.id ? 'bg-primary text-white' : 'hover:bg-white'}`}
                              >
                                <span>{s.firstName} {s.lastName}</span>
                                <span className="text-[9px] opacity-60">{s.admissionNumber}</span>
                              </button>
                            ))}
                         </div>
                       )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Title</Label>
                    <Input required value={msgForm.title} onChange={e => setMsgForm({...msgForm, title: e.target.value})} placeholder="e.g. End of Term Notice" className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Content</Label>
                    <Textarea required value={msgForm.content} onChange={e => setMsgForm({...msgForm, content: e.target.value})} placeholder="Type your message here..." className="min-h-[140px] rounded-xl" />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-16 text-lg font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20 gap-3">
                     {loading ? <Loader2 className="animate-spin" /> : <Send className="size-5" />} Authorize Dispatch
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-accent text-accent-foreground rounded-3xl overflow-hidden">
               <CardHeader className="pb-2 p-6"><CardTitle className="text-xs uppercase font-bold tracking-widest opacity-70">Security Protocol</CardTitle></CardHeader>
               <CardContent className="px-6 pb-6 space-y-4">
                  <div className="flex items-start gap-3">
                     <ShieldCheck className="size-5 shrink-0" />
                     <p className="text-xs leading-relaxed font-medium">Personal messages to specific students are isolated and only visible to the respective student and their authorized guardians.</p>
                  </div>
               </CardContent>
            </Card>
          </div>
        )}

        <div className={isRestricted ? "lg:col-span-3 space-y-6" : "lg:col-span-2 space-y-6"}>
          <Tabs defaultValue="announcements" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-2xl mb-8 flex-wrap h-auto">
              <TabsTrigger value="announcements" className="rounded-xl gap-2 px-8 py-3 text-xs font-bold uppercase tracking-widest"><Bell className="size-4" /> Announcements Registry</TabsTrigger>
              {!isRestricted && (
                <TabsTrigger value="reminders" className="rounded-xl gap-2 px-8 py-3 text-xs font-bold uppercase tracking-widest"><CalendarHeart className="size-4" /> Automated Triggers</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="announcements" className="space-y-6 mt-0">
              <div className="grid gap-6">
                {announcements.map((ann: any) => (
                  <Card key={ann.id} className="border-none shadow-md bg-white hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden group">
                    <div className={`h-1.5 w-full ${ann.target === 'StudentParent' ? 'bg-accent' : 'bg-primary'}`} />
                    <CardHeader className="p-8 pb-4">
                      <div className="flex justify-between items-start">
                         <div className="flex items-center gap-3">
                            <Badge className="bg-primary/5 text-primary border-none text-[8px] font-bold uppercase tracking-wider px-3 h-6 flex items-center">
                               {ann.target === 'StudentParent' ? 'Personal Alert' : ann.target}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                              {ann.createdAt ? new Date(ann.createdAt.toMillis()).toLocaleString() : 'Just now'}
                            </span>
                         </div>
                         {!isRestricted && (
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/5" onClick={() => handleDelete(ann.id)}>
                              <Trash2 className="size-4" />
                           </Button>
                         )}
                      </div>
                      <CardTitle className="text-2xl mt-4 font-headline font-bold text-primary">{ann.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic text-slate-700 font-medium leading-relaxed">
                        "{ann.content}"
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-primary/5 flex items-center justify-center"><User className="size-3.5 text-primary/40" /></div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">From: {ann.senderName || "Administration"}</span>
                         </div>
                         <CheckCircle2 className="size-4 text-green-600 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {announcements.length === 0 && (
                  <div className="p-40 text-center space-y-6 bg-white rounded-3xl border-2 border-dashed border-muted/50">
                    <div className="size-20 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
                      <MessageSquare className="size-10 text-muted-foreground/30" />
                    </div>
                    <div className="max-w-xs mx-auto">
                       <h3 className="text-xl font-headline font-bold text-primary/60">Registry Empty</h3>
                       <p className="text-sm text-muted-foreground italic mt-2">No relevant announcements or personal information detected in your current cycle feed.</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {!isRestricted && (
              <TabsContent value="reminders" className="mt-0">
                 <Card className="border-none shadow-md bg-white p-12 text-center space-y-6 rounded-3xl border-2 border-dashed">
                    <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center mx-auto text-primary/30"><History className="size-12" /></div>
                    <div className="max-md mx-auto space-y-2">
                       <h3 className="text-2xl font-headline font-bold text-primary">Automated Intelligence Dispatch</h3>
                       <p className="text-sm text-muted-foreground leading-relaxed">
                          Configure automated WhatsApp greetings, term reminders, and payment alerts. These triggers are synchronized with the institutional academic ledger and identity registry.
                       </p>
                    </div>
                    <Button variant="outline" className="rounded-xl px-10 h-12 font-bold text-xs uppercase tracking-widest border-primary text-primary hover:bg-primary/5">Configure Hub Automations</Button>
                 </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      <div className="flex justify-center pt-12 border-t no-print">
         <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
            <ShieldCheck className="size-3 text-green-600" /> Authorized Institutional Communication Sync • Registry Hub 2026
         </p>
      </div>
    </div>
  )
}
