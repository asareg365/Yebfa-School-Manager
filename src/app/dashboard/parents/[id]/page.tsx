"use client"

import { useState, useEffect, useMemo, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  Briefcase, 
  ShieldCheck, 
  Baby,
  Building2,
  IdCard,
  MapPin,
  Pencil,
  HeartHandshake,
  Navigation
} from "lucide-react"
import { useFirestore, useDoc, useCollection } from "@/firebase"
import { doc, collection, query, where } from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"

export default function ParentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: parentId } = use(params)
  const db = useFirestore()
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState<string | null>(null)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const parentRef = useMemo(() => doc(db, "parents", parentId), [db, parentId])
  const { data: parent, loading: pLoading } = useDoc(parentRef)

  const relsQuery = useMemo(() => 
    institutionId ? query(collection(db, "student_parents"), where("parentId", "==", parentId)) : null, 
    [db, parentId, institutionId]
  )
  const { data: rels = [] } = useCollection(relsQuery)

  const studentsQuery = useMemo(() => {
    if (!institutionId || rels.length === 0) return null
    const ids = rels.map(r => r.studentId)
    return query(collection(db, "students"), where("id", "in", ids))
  }, [db, rels, institutionId])
  const { data: children = [] } = useCollection(studentsQuery)

  if (pLoading) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse">Syncing Guardian Profile...</p>
    </div>
  )

  if (!parent) return (
    <div className="p-12 text-center space-y-4">
      <p className="text-xl font-bold text-destructive">Profile Not Found</p>
      <Button asChild><Link href="/dashboard/parents">Return to Hub</Link></Button>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link href="/dashboard/parents">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Parent Command Center</h1>
            <p className="text-muted-foreground font-medium">Strategic oversight for {parent.firstName} {parent.lastName}.</p>
          </div>
        </div>
        <Button className="h-11 rounded-xl gap-2" asChild>
          <Link href={`/dashboard/parents/edit/${parentId}`}>
            <Pencil className="size-4" /> Modify Profile
          </Link>
        </Button>
      </div>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-primary text-primary-foreground p-8 flex flex-row items-center gap-6 shrink-0">
          <div className="size-24 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border-2 border-white/20 overflow-hidden shadow-inner">
            {parent.photoURL ? <img src={parent.photoURL} className="w-full h-full object-cover" /> : <User className="size-12 opacity-50" />}
          </div>
          <div className="flex-1">
             <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Family Registry Profile</span>
                <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[10px] font-bold">{parent.status}</Badge>
             </div>
             <CardTitle className="text-3xl font-headline font-bold">{parent.firstName} {parent.lastName}</CardTitle>
             <div className="text-primary-foreground/70 mt-1 flex items-center gap-6 flex-wrap">
                <span className="flex items-center gap-1.5 font-mono text-xs"><ShieldCheck className="size-3.5" /> {parent.parentNumber}</span>
                <span className="flex items-center gap-1.5 font-bold text-xs"><Phone className="size-3.5" /> {parent.phone}</span>
                <span className="flex items-center gap-1.5 font-bold text-xs"><Briefcase className="size-3.5" /> {parent.occupation || "Unspecified"}</span>
             </div>
          </div>
        </CardHeader>

        <Tabs defaultValue="overview" className="w-full">
           <TabsList className="bg-muted/30 px-8 py-2 border-b justify-start gap-4 h-14">
              <TabsTrigger value="overview" className="text-xs uppercase font-bold tracking-widest">Identity</TabsTrigger>
              <TabsTrigger value="children" className="gap-2 text-xs uppercase font-bold tracking-widest">Children <Badge className="bg-primary text-white h-4 w-4 p-0 flex items-center justify-center text-[8px] border-none">{rels.length}</Badge></TabsTrigger>
              <TabsTrigger value="professional" className="text-xs uppercase font-bold tracking-widest">Employment</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs uppercase font-bold tracking-widest">IDs & GPS</TabsTrigger>
           </TabsList>

           <CardContent className="p-8">
              <TabsContent value="overview" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div className="grid gap-8 md:grid-cols-2">
                    <section className="space-y-4">
                       <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2"><User className="size-4" /> Personal Identification</h4>
                       <div className="space-y-3">
                          <p className="flex justify-between text-sm"><span>Legal Name</span><span className="font-bold text-primary">{parent.firstName} {parent.middleName} {parent.lastName}</span></p>
                          <p className="flex justify-between text-sm"><span>Gender</span><span className="font-bold">{parent.gender}</span></p>
                          <p className="flex justify-between text-sm"><span>Date of Birth</span><span className="font-bold">{parent.dateOfBirth || "Not Specified"}</span></p>
                          <p className="flex justify-between text-sm"><span>Nationality</span><span className="font-bold">{parent.nationality}</span></p>
                       </div>
                    </section>
                    <section className="space-y-4">
                       <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2"><Phone className="size-4" /> Reach Protocols</h4>
                       <div className="space-y-3">
                          <p className="flex justify-between text-sm"><span>Primary Phone</span><span className="font-bold text-primary">{parent.phone}</span></p>
                          <p className="flex justify-between text-sm"><span>Alternate</span><span className="font-bold">{parent.alternatePhone || "None"}</span></p>
                          <p className="flex justify-between text-sm"><span>Email</span><span className="font-bold">{parent.email || "Unlisted"}</span></p>
                       </div>
                    </section>
                 </div>
              </TabsContent>

              <TabsContent value="children" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                 <div className="grid gap-4">
                    {rels.map((r: any) => {
                       const student = children.find(s => s.id === r.studentId);
                       return (
                         <Card key={r.id} className="border-none shadow-sm bg-slate-50/50 hover:bg-slate-50 transition-colors group">
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
                                  {r.primaryContact && <Badge className="bg-green-600 text-white text-[7px] uppercase font-bold px-2 h-4 flex items-center">Primary</Badge>}
                                  <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-xl"><Link href={`/dashboard/students?id=${r.studentId}`}><ArrowLeft className="size-4 rotate-180" /></Link></Button>
                               </div>
                            </CardContent>
                         </Card>
                       )
                    })}
                    {rels.length === 0 && (
                      <div className="p-20 text-center text-muted-foreground opacity-30 italic flex flex-col items-center gap-4">
                         <Baby className="size-12" />
                         <p>No student relationships detected in registry.</p>
                      </div>
                    )}
                 </div>
              </TabsContent>

              <TabsContent value="professional" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                 <div className="p-8 rounded-3xl border bg-slate-50/50 space-y-8">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><Briefcase className="size-4" /> Professional Record</h4>
                    <div className="grid gap-8 md:grid-cols-2">
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Current Occupation</p>
                          <p className="font-bold text-primary text-lg">{parent.occupation || "Not Specified"}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Employer / Agency</p>
                          <p className="font-bold text-primary text-lg">{parent.employer || "Self-Employed"}</p>
                       </div>
                       <div className="space-y-1 md:col-span-2">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Employer Office Address</p>
                          <p className="font-medium text-slate-600 italic">"{parent.officeAddress || "No office address registered."}"</p>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div className="grid gap-8 md:grid-cols-2">
                    <section className="space-y-4">
                       <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2"><MapPin className="size-4" /> Residential GPS</h4>
                       <div className="space-y-4 p-6 rounded-2xl bg-slate-50 border">
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase text-muted-foreground">Digital Address</p>
                             <p className="font-mono font-bold text-accent text-lg">{parent.digitalAddress || "GA-000-0000"}</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase text-muted-foreground">Residential Area</p>
                             <p className="text-sm font-bold text-primary">{parent.address}</p>
                             <p className="text-xs text-muted-foreground font-medium">{parent.town}, {parent.district}, {parent.region}</p>
                          </div>
                       </div>
                    </section>
                    <section className="space-y-4">
                       <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2"><IdCard className="size-4" /> Identity Repository</h4>
                       <div className="grid gap-4">
                          <div className="p-4 rounded-xl border bg-white flex justify-between items-center">
                             <span className="text-[10px] font-bold uppercase text-muted-foreground">National ID</span>
                             <span className="font-mono font-bold text-primary">{parent.nationalId || "GHA-000000000-0"}</span>
                          </div>
                          <div className="p-4 rounded-xl border bg-white flex justify-between items-center">
                             <span className="text-[10px] font-bold uppercase text-muted-foreground">Passport</span>
                             <span className="font-mono font-bold text-primary">{parent.passportNumber || "NOT REGISTERED"}</span>
                          </div>
                       </div>
                    </section>
                 </div>
              </TabsContent>
           </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
