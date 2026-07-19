"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  Search, 
  Plus, 
  Loader2, 
  Phone, 
  Baby, 
  ShieldCheck, 
  Trash2, 
  Pencil,
  Briefcase,
  MapPin,
  HeartHandshake
} from "lucide-react"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, query, where, serverTimestamp, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function ParentsRegistryPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingParent, setEditingParent] = useState<any>(null)

  const initialForm = {
    fatherName: "",
    motherName: "",
    guardianName: "",
    phone: "",
    alternativePhone: "",
    email: "",
    occupation: "",
    gpsAddress: "",
    relationship: "Father"
  }

  const [parentForm, setParentForm] = useState(initialForm)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const parentsQuery = useMemo(() => institutionId ? query(collection(db, "parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const studentsQuery = useMemo(() => institutionId ? query(collection(db, "students"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  
  const { data: parents, loading: pLoading } = useCollection(parentsQuery)
  const { data: students } = useCollection(studentsQuery)

  const filteredParents = useMemo(() => {
    return parents.filter(p => 
      p.guardianName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [parents, searchQuery])

  const handleAddParent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    try {
      if (editingParent) {
        const { id, ...dataToUpdate } = { ...parentForm, updatedAt: serverTimestamp() } as any;
        await updateDoc(doc(db, "parents", editingParent.id), dataToUpdate)
        toast({ title: "Registry Updated", description: "Guardian profile synchronized." })
      } else {
        await addDoc(collection(db, "parents"), {
          ...parentForm,
          tenantId: institutionId,
          institutionId,
          createdAt: serverTimestamp()
        })
        toast({ title: "Parent Registered", description: `${parentForm.guardianName} added to hub.` })
      }
      setIsAddOpen(false)
      setEditingParent(null)
      setParentForm(initialForm)
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }) } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db!, "parents", id))
      toast({ title: "Profile Removed" })
    } catch (e) { toast({ variant: "destructive", title: "Action Failed" }) }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Guardian Registry</h1>
          <p className="text-muted-foreground">Managing {parents.length} institutional parent profiles.</p>
        </div>
        <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2" onClick={() => { setEditingParent(null); setParentForm(initialForm); setIsAddOpen(true); }}>
          <Plus className="size-4" /> Register New Parent
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b py-6 p-4 md:p-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, phone or email..." 
              className="pl-10 h-12 bg-slate-50 border-none rounded-xl" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-6">GUARDIAN / FAMILY</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4">CONTACT</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4">PROFESSION</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4 text-center">SIBLINGS</TableHead>
                  <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.map((p: any) => {
                  const linkedStudents = students.filter(s => s.parentId === p.id);
                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <TableCell className="px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary text-xs">
                            {p.guardianName?.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-primary text-sm">{p.guardianName}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">{p.relationship}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold flex items-center gap-1.5"><Phone className="size-3 text-muted-foreground" /> {p.phone}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{p.email || "No Email"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                         <div className="flex items-center gap-2">
                            <Briefcase className="size-3 text-muted-foreground" />
                            <span className="text-xs font-medium">{p.occupation || "Unspecified"}</span>
                         </div>
                      </TableCell>
                      <TableCell className="px-4 text-center">
                         <Badge variant="secondary" className="gap-1.5 bg-blue-50 text-blue-700 border-none px-3 font-bold">
                            <Baby className="size-3" /> {linkedStudents.length} Students
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => {
                            setEditingParent(p);
                            setParentForm({ ...p });
                            setIsAddOpen(true);
                          }}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => handleDelete(p.id)}><Trash2 className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredParents.length === 0 && !pLoading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic">No guardian records found matching your search.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={(val) => { if(!val) setIsAddOpen(false); }}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl md:rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleAddParent} className="flex flex-col h-full overflow-hidden">
             <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><HeartHandshake className="size-5" /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Guardian Registry</span>
                </div>
                <DialogTitle className="text-3xl font-headline font-bold">{editingParent ? "Edit Profile" : "New Parent Entry"}</DialogTitle>
                <DialogDescription className="text-primary-foreground/70">Consolidate family contact and identification data.</DialogDescription>
             </DialogHeader>

             <ScrollArea className="flex-1">
                <div className="p-8 grid gap-8">
                   <div className="grid gap-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2"><Users className="size-3.5" /> Identity Hub</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Primary Guardian Name</Label><Input required value={parentForm.guardianName} onChange={e => setParentForm({...parentForm, guardianName: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Relationship to Student</Label>
                            <Select value={parentForm.relationship} onValueChange={v => setParentForm({...parentForm, relationship: v})}>
                               <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                               <SelectContent><SelectItem value="Father">Father</SelectItem><SelectItem value="Mother">Mother</SelectItem><SelectItem value="Guardian">Guardian</SelectItem></SelectContent>
                            </Select>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Father's Name (Optional)</Label><Input value={parentForm.fatherName} onChange={e => setParentForm({...parentForm, fatherName: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Mother's Name (Optional)</Label><Input value={parentForm.motherName} onChange={e => setParentForm({...parentForm, motherName: e.target.value})} className="h-11 rounded-xl" /></div>
                      </div>
                   </div>

                   <div className="grid gap-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2"><Phone className="size-3.5" /> Contact Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Primary Phone</Label><Input required value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Alternative Phone</Label><Input value={parentForm.alternativePhone} onChange={e => setParentForm({...parentForm, alternativePhone: e.target.value})} className="h-11 rounded-xl" /></div>
                      </div>
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Email Address</Label><Input type="email" value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="h-11 rounded-xl" /></div>
                   </div>

                   <div className="grid gap-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2"><MapPin className="size-3.5" /> Professional & GPS</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Occupation</Label><Input value={parentForm.occupation} onChange={e => setParentForm({...parentForm, occupation: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">GPS Digital Address</Label><Input value={parentForm.gpsAddress} onChange={e => setParentForm({...parentForm, gpsAddress: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. GA-123-4567" /></div>
                      </div>
                   </div>
                </div>
             </ScrollArea>

             <DialogFooter className="bg-slate-50 p-8 border-t shrink-0">
                <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-bold rounded-2xl bg-primary shadow-xl">
                   {loading ? <Loader2 className="mr-2 animate-spin" /> : <ShieldCheck className="mr-2" />}
                   {editingParent ? "Update Profile" : "Register Guardian"}
                </Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}