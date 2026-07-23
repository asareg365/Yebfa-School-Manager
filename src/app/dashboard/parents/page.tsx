
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
  HeartHandshake,
  User,
  Mail,
  MoreVertical,
  ChevronRight,
  ShieldAlert,
  IdCard,
  Building2
} from "lucide-react"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, query, where, serverTimestamp, addDoc, doc, deleteDoc, updateDoc, getDocs } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ParentsRegistryPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingParent, setEditingParent] = useState<any>(null)
  const [selectedParent, setSelectedParent] = useState<any>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const initialForm = {
    parentNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "Female",
    dateOfBirth: "",
    nationality: "Ghanaian",
    phone: "",
    alternatePhone: "",
    email: "",
    address: "",
    town: "",
    region: "",
    district: "",
    digitalAddress: "",
    occupation: "",
    employer: "",
    officeAddress: "",
    nationalId: "",
    passportNumber: "",
    status: "Active",
    photoURL: ""
  }

  const [parentForm, setParentForm] = useState(initialForm)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const parentsQuery = useMemo(() => institutionId ? query(collection(db, "parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const relsQuery = useMemo(() => institutionId ? query(collection(db, "student_parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const studentsQuery = useMemo(() => institutionId ? query(collection(db, "students"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  
  const { data: parents, loading: pLoading } = useCollection(parentsQuery)
  const { data: rels } = useCollection(relsQuery)
  const { data: students } = useCollection(studentsQuery)

  const filteredParents = useMemo(() => {
    return parents.filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.parentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [parents, searchQuery])

  useEffect(() => {
    if (isAddOpen && !parentForm.parentNumber && !editingParent) {
      const count = parents.length + 1;
      const autoCode = `PAR-${String(count).padStart(6, '0')}`;
      setParentForm(prev => ({ ...prev, parentNumber: autoCode }));
    }
  }, [isAddOpen, parents.length, editingParent])

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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        toast({ title: "Parent Registered", description: `${parentForm.firstName} ${parentForm.lastName} added to hub.` })
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

  const openProfile = (p: any) => {
    setSelectedParent(p)
    setIsProfileOpen(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Parent Hub</h1>
          <p className="text-muted-foreground">Comprehensive guardian registry and family relationship management.</p>
        </div>
        <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2" onClick={() => { setEditingParent(null); setParentForm(initialForm); setIsAddOpen(true); }}>
          <Plus className="size-4" /> Register Parent
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b py-6 p-4 md:p-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, code or phone..." 
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
                  <TableHead className="py-4 font-bold whitespace-nowrap px-6">ID / GUARDIAN</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4">CONTACT</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4">LOCATION</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4 text-center">CHILDREN</TableHead>
                  <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.map((p: any) => {
                  const childrenCount = rels.filter(r => r.parentId === p.id).length;
                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => openProfile(p)}>
                      <TableCell className="px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary text-xs shrink-0 border overflow-hidden">
                             {p.photoURL ? <img src={p.photoURL} className="w-full h-full object-cover" /> : <User className="size-4" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-mono font-bold text-accent">{p.parentNumber}</span>
                            <span className="font-bold text-primary text-sm">{p.firstName} {p.lastName}</span>
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
                         <div className="flex flex-col">
                            <span className="text-xs font-medium">{p.town || "N/A"}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-bold">{p.region}</span>
                         </div>
                      </TableCell>
                      <TableCell className="px-4 text-center">
                         <Badge variant="secondary" className="gap-1.5 bg-blue-50 text-blue-700 border-none px-3 font-bold">
                            <Baby className="size-3" /> {childrenCount} Students
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right px-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => {
                            setEditingParent(p);
                            setParentForm({ ...initialForm, ...p });
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl md:rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleAddParent} className="flex flex-col h-full overflow-hidden">
             <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><HeartHandshake className="size-5" /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Registry Operations</span>
                </div>
                <DialogTitle className="text-3xl font-headline font-bold">{editingParent ? "Update Profile" : "Parent Registration"}</DialogTitle>
                <DialogDescription className="text-primary-foreground/70">Consolidate professional and personal guardian data.</DialogDescription>
             </DialogHeader>

             <ScrollArea className="flex-1">
                <div className="p-8 space-y-12">
                   <div className="grid gap-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2"><Users className="size-3.5" /> Personal Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">First Name</Label><Input required value={parentForm.firstName} onChange={e => setParentForm({...parentForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Middle Name</Label><Input value={parentForm.middleName} onChange={e => setParentForm({...parentForm, middleName: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Last Name</Label><Input required value={parentForm.lastName} onChange={e => setParentForm({...parentForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Gender</Label>
                            <Select value={parentForm.gender} onValueChange={v => setParentForm({...parentForm, gender: v})}>
                               <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                               <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                            </Select>
                         </div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Date of Birth</Label><Input type="date" value={parentForm.dateOfBirth} onChange={e => setParentForm({...parentForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Nationality</Label><Input value={parentForm.nationality} onChange={e => setParentForm({...parentForm, nationality: e.target.value})} className="h-11 rounded-xl" /></div>
                      </div>
                   </div>

                   <div className="grid gap-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2"><Phone className="size-3.5" /> Contact Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Phone</Label><Input required value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Alternate Phone</Label><Input value={parentForm.alternatePhone} onChange={e => setParentForm({...parentForm, alternatePhone: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Email</Label><Input type="email" value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="h-11 rounded-xl" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Address</Label><Input value={parentForm.address} onChange={e => setParentForm({...parentForm, address: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Digital Address (GPS)</Label><Input value={parentForm.digitalAddress} onChange={e => setParentForm({...parentForm, digitalAddress: e.target.value})} className="h-11 rounded-xl font-mono" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Town/City</Label><Input value={parentForm.town} onChange={e => setParentForm({...parentForm, town: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">District</Label><Input value={parentForm.district} onChange={e => setParentForm({...parentForm, district: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Region</Label><Input value={parentForm.region} onChange={e => setParentForm({...parentForm, region: e.target.value})} className="h-11 rounded-xl" /></div>
                      </div>
                   </div>

                   <div className="grid gap-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2"><Briefcase className="size-3.5" /> Employment Data</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Occupation</Label><Input value={parentForm.occupation} onChange={e => setParentForm({...parentForm, occupation: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Employer</Label><Input value={parentForm.employer} onChange={e => setParentForm({...parentForm, employer: e.target.value})} className="h-11 rounded-xl" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Office Address</Label><Input value={parentForm.officeAddress} onChange={e => setParentForm({...parentForm, officeAddress: e.target.value})} className="h-11 rounded-xl" /></div>
                      </div>
                   </div>

                   <div className="grid gap-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2"><IdCard className="size-3.5" /> Identification</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">National ID (Ghana Card)</Label><Input value={parentForm.nationalId} onChange={e => setParentForm({...parentForm, nationalId: e.target.value})} className="h-11 rounded-xl font-mono" /></div>
                         <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Passport Number</Label><Input value={parentForm.passportNumber} onChange={e => setParentForm({...parentForm, passportNumber: e.target.value})} className="h-11 rounded-xl font-mono" /></div>
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

      {/* Profile Modal */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col bg-background">
          <div className="flex flex-col h-full overflow-hidden">
             <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0 flex flex-row items-center gap-6">
                <div className="size-24 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border-2 border-white/20 overflow-hidden">
                  {selectedParent?.photoURL ? <img src={selectedParent.photoURL} className="w-full h-full object-cover" /> : <User className="size-12 opacity-50" />}
                </div>
                <div className="flex-1">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">Family Registry Profile</span>
                      <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[10px] font-bold">{selectedParent?.status}</Badge>
                   </div>
                   <DialogTitle className="text-3xl font-headline font-bold">{selectedParent?.firstName} {selectedParent?.lastName}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 mt-1 flex items-center gap-6 flex-wrap">
                      <span className="flex items-center gap-1.5 font-mono text-xs"><ShieldCheck className="size-3.5" /> {selectedParent?.parentNumber}</span>
                      <span className="flex items-center gap-1.5 font-bold text-xs"><Phone className="size-3.5" /> {selectedParent?.phone}</span>
                      <span className="flex items-center gap-1.5 font-bold text-xs"><Briefcase className="size-3.5" /> {selectedParent?.occupation || "Unspecified"}</span>
                   </DialogDescription>
                </div>
             </DialogHeader>

             <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="bg-muted/30 px-8 py-2 border-b shrink-0 overflow-x-auto no-scrollbar justify-start gap-4">
                   <TabsTrigger value="overview">Personal Data</TabsTrigger>
                   <TabsTrigger value="children" className="gap-2">Children <Badge className="bg-primary text-white h-4 w-4 p-0 flex items-center justify-center text-[8px] border-none">{rels.filter(r => r.parentId === selectedParent?.id).length}</Badge></TabsTrigger>
                   <TabsTrigger value="employment">Employment</TabsTrigger>
                   <TabsTrigger value="documents">IDs & Docs</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 p-8">
                   <TabsContent value="overview" className="mt-0 space-y-8">
                      <div className="grid gap-8 md:grid-cols-2">
                         <section className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Identification</h4>
                            <div className="space-y-3">
                               <p className="flex justify-between text-sm"><span>Full Name</span><span className="font-bold">{selectedParent?.firstName} {selectedParent?.middleName} {selectedParent?.lastName}</span></p>
                               <p className="flex justify-between text-sm"><span>Gender</span><span className="font-bold">{selectedParent?.gender}</span></p>
                               <p className="flex justify-between text-sm"><span>Date of Birth</span><span className="font-bold">{selectedParent?.dateOfBirth || "Not Specified"}</span></p>
                               <p className="flex justify-between text-sm"><span>Nationality</span><span className="font-bold">{selectedParent?.nationality}</span></p>
                            </div>
                         </section>
                         <section className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Location & GPS</h4>
                            <div className="space-y-3">
                               <p className="flex justify-between text-sm"><span>GPS Address</span><span className="font-mono font-bold text-accent">{selectedParent?.digitalAddress || "Unlisted"}</span></p>
                               <p className="flex justify-between text-sm"><span>Residential</span><span className="font-bold">{selectedParent?.address}</span></p>
                               <p className="flex justify-between text-sm"><span>Town/District</span><span className="font-bold">{selectedParent?.town}, {selectedParent?.district}</span></p>
                               <p className="flex justify-between text-sm"><span>Region</span><span className="font-bold">{selectedParent?.region}</span></p>
                            </div>
                         </section>
                      </div>
                   </TabsContent>

                   <TabsContent value="children" className="mt-0">
                      <div className="grid gap-6">
                         {rels.filter(r => r.parentId === selectedParent?.id).map((r: any) => {
                            const student = students.find(s => s.id === r.studentId);
                            return (
                              <Card key={r.id} className="border-none shadow-md bg-white hover:bg-slate-50 transition-colors overflow-hidden group">
                                 <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                       <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-primary border group-hover:scale-105 transition-transform">
                                          {student?.firstName?.charAt(0)}
                                       </div>
                                       <div>
                                          <p className="font-bold text-primary text-base">{student?.firstName} {student?.lastName}</p>
                                          <div className="flex items-center gap-3 mt-1">
                                             <Badge variant="outline" className="text-[8px] uppercase font-bold">{student?.gradeLevel}</Badge>
                                             <Badge className="bg-primary/5 text-primary border-none text-[8px] font-bold uppercase tracking-widest">{r.relationship}</Badge>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="flex gap-2">
                                       {r.primaryContact && <Badge className="bg-green-600 text-white text-[7px] font-bold uppercase">Primary</Badge>}
                                       {r.emergencyContact && <Badge className="bg-orange-500 text-white text-[7px] font-bold uppercase">Emergency</Badge>}
                                    </div>
                                 </CardContent>
                              </Card>
                            )
                         })}
                         {rels.filter(r => r.parentId === selectedParent?.id).length === 0 && (
                           <div className="p-20 text-center text-muted-foreground opacity-30 italic flex flex-col items-center gap-4">
                              <Baby className="size-12" />
                              <p>No active student relationships registered for this profile.</p>
                           </div>
                         )}
                      </div>
                   </TabsContent>

                   <TabsContent value="employment" className="mt-0">
                      <section className="p-6 rounded-2xl border bg-slate-50 space-y-4">
                         <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><Briefcase className="size-4" /> Professional Record</h4>
                         <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold uppercase text-muted-foreground">Occupation</p>
                               <p className="font-bold text-sm">{selectedParent?.occupation || "Not Specified"}</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold uppercase text-muted-foreground">Employer</p>
                               <p className="font-bold text-sm">{selectedParent?.employer || "Self-Employed / None"}</p>
                            </div>
                            <div className="space-y-1 col-span-2">
                               <p className="text-[10px] font-bold uppercase text-muted-foreground">Office Address</p>
                               <p className="font-bold text-sm italic">"{selectedParent?.officeAddress || "No office address on file."}"</p>
                            </div>
                         </div>
                      </section>
                   </TabsContent>

                   <TabsContent value="documents" className="mt-0">
                      <div className="grid gap-6 md:grid-cols-2">
                         <div className="p-6 rounded-2xl border bg-slate-50 space-y-3">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Ghana Card / National ID</p>
                            <p className="font-mono font-bold text-primary text-base">{selectedParent?.nationalId || "Not Registered"}</p>
                         </div>
                         <div className="p-6 rounded-2xl border bg-slate-50 space-y-3">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Passport Number</p>
                            <p className="font-mono font-bold text-primary text-base">{selectedParent?.passportNumber || "Not Registered"}</p>
                         </div>
                      </div>
                   </TabsContent>
                </ScrollArea>
             </Tabs>

             <DialogFooter className="bg-slate-50 p-6 border-t shrink-0 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Authorized Registry Access • {new Date().toLocaleDateString()}</p>
                <div className="flex gap-2">
                   <Button variant="outline" className="h-9 text-xs rounded-xl font-bold" onClick={() => setIsProfileOpen(false)}>Close Registry</Button>
                   <Button className="h-9 text-xs rounded-xl bg-primary font-bold px-6" onClick={() => { setIsProfileOpen(false); setEditingParent(selectedParent); setParentForm({...initialForm, ...selectedParent}); setIsAddOpen(true); }}>Modify Profile</Button>
                </div>
             </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
