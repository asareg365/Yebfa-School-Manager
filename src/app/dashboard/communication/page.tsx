
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, Bell, Mail, Smartphone, Users, Megaphone, Loader2, CheckCircle2, History, Trash2, CalendarHeart } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, where, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CommunicationCenterPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msgForm, setMsgForm] = useState({ title: "", content: "", target: "All" })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const annQuery = useMemo(() => institutionId ? query(collection(db!, "announcements"), where("tenantId", "==", institutionId), orderBy("createdAt", "desc")) : null, [db, institutionId])
  const { data: announcements } = useCollection(annQuery)

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    try {
      await addDoc(collection(db, "announcements"), {
        ...msgForm,
        tenantId: institutionId,
        createdAt: serverTimestamp()
      })
      toast({ title: "Broadcast Sent", description: "Notification dispatched to ecosystem." })
      setMsgForm({ title: "", content: "", target: "All" })
    } catch (e: any) { toast({ variant: "destructive", title: "Dispatch Failed" }) } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db!, "announcements", id))
      toast({ title: "Announcement Removed" })
    } catch (e) { toast({ variant: "destructive", title: "Failed to remove" }) }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Communication Hub</h1>
        <p className="text-muted-foreground">Strategic engagement for parents, staff, and students.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground">
              <CardTitle className="text-lg flex items-center gap-2"><Megaphone className="size-5" /> New Broadcast</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleBroadcast} className="space-y-6">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={msgForm.target} onValueChange={v => setMsgForm({...msgForm, target: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Participants</SelectItem>
                      <SelectItem value="Teachers">Faculty Members</SelectItem>
                      <SelectItem value="Parents">Guardians / Parents</SelectItem>
                      <SelectItem value="Students">Active Students</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Title</Label><Input required value={msgForm.title} onChange={e => setMsgForm({...msgForm, title: e.target.value})} placeholder="Subject of announcement" className="h-11 rounded-xl" /></div>
                <div className="space-y-2"><Label>Content</Label><Textarea required value={msgForm.content} onChange={e => setMsgForm({...msgForm, content: e.target.value})} placeholder="Type your message here..." className="min-h-[120px] rounded-xl" /></div>
                <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20 gap-2">
                   {loading ? <Loader2 className="animate-spin" /> : <Send className="size-5" />} Authorize Dispatch
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-accent text-accent-foreground rounded-2xl">
             <CardHeader className="pb-2"><CardTitle className="text-xs uppercase opacity-70">Engagement Stats</CardTitle></CardHeader>
             <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm font-bold"><span>Emails Dispatched</span><span>0</span></div>
                <div className="flex justify-between items-center text-sm font-bold"><span>WhatsApp Alerts</span><span>0</span></div>
                <div className="flex justify-between items-center text-sm font-bold"><span>SMS Notifications</span><span>0</span></div>
             </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="announcements" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
              <TabsTrigger value="announcements" className="rounded-lg gap-2"><Bell className="size-4" /> Announcements</TabsTrigger>
              <TabsTrigger value="reminders" className="rounded-lg gap-2"><CalendarHeart className="size-4" /> Automated Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="announcements" className="space-y-6">
              <div className="grid gap-4">
                {announcements.map((ann: any) => (
                  <Card key={ann.id} className="border-none shadow-md bg-white hover:shadow-lg transition-shadow rounded-2xl group">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                         <div className="flex items-center gap-3">
                            <Badge className="bg-primary/5 text-primary border-none text-[9px] font-bold uppercase tracking-wider">{ann.target}</Badge>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase">{new Date(ann.createdAt?.toMillis()).toLocaleString()}</span>
                         </div>
                         <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleDelete(ann.id)}>
                            <Trash2 className="size-3.5" />
                         </Button>
                      </div>
                      <CardTitle className="text-xl mt-2 font-headline">{ann.title}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-slate-600 leading-relaxed">{ann.content}</p></CardContent>
                  </Card>
                ))}
                {announcements.length === 0 && <div className="p-24 text-center text-muted-foreground opacity-20 italic">No ecosystem announcements found.</div>}
              </div>
            </TabsContent>

            <TabsContent value="reminders" className="space-y-6">
               <Card className="border-none shadow-md bg-white p-8 text-center space-y-4">
                  <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto text-primary/30"><History className="size-10" /></div>
                  <div className="max-w-sm mx-auto">
                     <h3 className="text-lg font-bold">Automated Notification Engine</h3>
                     <p className="text-sm text-muted-foreground mt-2">
                        Configure automated WhatsApp wishes, fee reminders, and absent alerts. These triggers are synchronized with the 2026 academic ledger.
                     </p>
                  </div>
                  <Button variant="outline" className="rounded-xl px-8 h-11">Configure Automations</Button>
               </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
