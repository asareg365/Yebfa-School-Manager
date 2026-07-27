
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  HeartHandshake,
  Users,
  Phone,
  Briefcase,
  IdCard,
  AlertCircle,
  Camera,
  MapPin,
  Save,
  CheckCircle2
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, where, setDoc, doc } from "firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { initializeApp, getApp, getApps } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"

export default function AddParentPage() {
  const db = useFirestore()
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("personal")

  const initialForm = {
    parentNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "Female",
    dob: "",
    nationality: "Ghanaian",
    phone: "",
    alternatePhone: "",
    email: "",
    address: "",
    town: "",
    region: "",
    digitalAddress: "",
    occupation: "",
    employer: "",
    employerAddress: "",
    nationalId: "",
    passportNumber: "",
    emergencyContact: "",
    emergencyPhone: "",
    emergencyRelationship: "",
    photoURL: "",
    status: "Active"
  }

  const [parentForm, setParentForm] = useState(initialForm)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const parentsQuery = useMemo(() => institutionId ? query(collection(db, "parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const { data: parents = [], loading: parentsLoading } = useCollection(parentsQuery)

  // Sequential ID Generator: Finds the maximum numeric suffix in the current registry
  useEffect(() => {
    if (institutionId && !parentsLoading) {
      const numbers = parents
        .map(p => {
          const raw = p.parentNumber || "";
          const match = raw.match(/(\d+)/);
          return match ? parseInt(match[0]) : 0;
        })
        .filter(n => !isNaN(n));
      
      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextNum = maxNum + 1;
      const autoCode = `PAR-${String(nextNum).padStart(6, '0')}`;
      
      if (parentForm.parentNumber !== autoCode) {
        setParentForm(prev => ({ ...prev, parentNumber: autoCode }));
      }
    }
  }, [institutionId, parentsLoading, parents, parentForm.parentNumber])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    
    if (!parentForm.email) {
      toast({ variant: "destructive", title: "Email Required", description: "Parents must have an email for portal access." })
      return
    }

    setLoading(true)
    try {
      const secondaryAppName = `secondary-parent-${Date.now()}`
      const secondaryApp = getApps().find(a => a.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName)
      const secondaryAuth = getAuth(secondaryApp)
      
      let authUser;
      try {
        const credential = await createUserWithEmailAndPassword(secondaryAuth, parentForm.email, parentForm.phone)
        authUser = credential.user
      } catch (authErr: any) {
        if (authErr.code !== 'auth/email-already-in-use') throw authErr;
      }

      const parentRef = doc(collection(db, "parents"))
      const parentData = {
        ...parentForm,
        id: parentRef.id,
        tenantId: institutionId,
        institutionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await setDoc(parentRef, parentData)

      if (authUser) {
        await setDoc(doc(db, "users", authUser.uid), {
          uid: authUser.uid,
          name: `${parentForm.firstName} ${parentForm.lastName}`,
          email: parentForm.email,
          role: "parent",
          tenantId: institutionId,
          institutionId: institutionId,
          status: "active",
          createdAt: serverTimestamp()
        })
      }
      
      toast({ title: "Parent Registered", description: `Record active with ID ${parentForm.parentNumber}.` })
      router.push("/dashboard/parents")
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Registration Error", description: e.message }) 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11">
            <Link href="/dashboard/parents"><ArrowLeft className="size-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Guardian Enrollment</h1>
            <p className="text-muted-foreground font-medium">Registering a new parent in the institutional hub.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="max-w-5xl mx-auto border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
          <CardHeader className="bg-primary text-primary-foreground p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-accent"><HeartHandshake className="size-5" /></div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Strategic HR Operations</span>
            </div>
            <CardTitle className="text-3xl font-headline font-bold">New Parent Entry</CardTitle>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-muted/30 px-8 border-b overflow-x-auto no-scrollbar">
              <TabsList className="h-16 bg-transparent gap-8 justify-start p-0 min-w-max">
                <TabsTrigger value="personal" className="gap-2 text-xs uppercase font-bold"><Users className="size-4" /> Personal</TabsTrigger>
                <TabsTrigger value="contact" className="gap-2 text-xs uppercase font-bold"><Phone className="size-4" /> Contact</TabsTrigger>
                <TabsTrigger value="professional" className="gap-2 text-xs uppercase font-bold"><Briefcase className="size-4" /> Professional</TabsTrigger>
                <TabsTrigger value="id" className="gap-2 text-xs uppercase font-bold"><IdCard className="size-4" /> Identification</TabsTrigger>
                <TabsTrigger value="emergency" className="gap-2 text-xs uppercase font-bold"><AlertCircle className="size-4" /> Emergency</TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="p-8">
              <TabsContent value="personal" className="space-y-8 mt-0">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                   <div className="size-32 rounded-2xl bg-slate-50 border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground shrink-0"><Camera className="size-8 mb-1 opacity-20" /><span className="text-[10px] font-bold">Upload</span></div>
                   <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold">Parent ID Number</Label><Input readOnly value={parentForm.parentNumber} className="h-12 bg-slate-50 font-bold font-mono" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold">First Name</Label><Input required value={parentForm.firstName} onChange={e => setParentForm({...parentForm, firstName: e.target.value})} className="h-12 rounded-xl" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold">Last Name</Label><Input required value={parentForm.lastName} onChange={e => setParentForm({...parentForm, lastName: e.target.value})} className="h-12 rounded-xl" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold">Gender</Label>
                        <Select value={parentForm.gender} onValueChange={v => setParentForm({...parentForm, gender: v})}><SelectTrigger className="h-12"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select>
                      </div>
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] font-bold">Primary Phone</Label><Input required value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] font-bold">Email Address</Label><Input type="email" required value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="h-12 rounded-xl" /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-[10px] font-bold">Residential Address</Label><Input value={parentForm.address} onChange={e => setParentForm({...parentForm, address: e.target.value})} className="h-12 rounded-xl" /></div>
              </TabsContent>

              <TabsContent value="professional" className="space-y-6 mt-0">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold">Occupation</Label><Input value={parentForm.occupation} onChange={e => setParentForm({...parentForm, occupation: e.target.value})} className="h-12 rounded-xl" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold">Employer</Label><Input value={parentForm.employer} onChange={e => setParentForm({...parentForm, employer: e.target.value})} className="h-12 rounded-xl" /></div>
                 </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-6 mt-0">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold">Ghana Card ID</Label><Input value={parentForm.nationalId} onChange={e => setParentForm({...parentForm, nationalId: e.target.value})} className="h-12 rounded-xl font-mono" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold">Passport #</Label><Input value={parentForm.passportNumber} onChange={e => setParentForm({...parentForm, passportNumber: e.target.value})} className="h-12 rounded-xl font-mono" /></div>
                 </div>
              </TabsContent>

              <TabsContent value="emergency" className="space-y-6 mt-0">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold">Contact Name</Label><Input value={parentForm.emergencyContact} onChange={e => setParentForm({...parentForm, emergencyContact: e.target.value})} className="h-12 rounded-xl" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold">Phone</Label><Input value={parentForm.emergencyPhone} onChange={e => setParentForm({...parentForm, emergencyPhone: e.target.value})} className="h-12 rounded-xl" /></div>
                 </div>
              </TabsContent>
            </CardContent>

            <CardFooter className="bg-slate-50 p-8 border-t flex justify-between">
              <Button type="button" variant="ghost" asChild><Link href="/dashboard/parents">Cancel</Link></Button>
              <Button type="submit" disabled={loading} className="h-14 px-12 bg-primary font-bold shadow-xl">
                {loading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />} Authorize Registry Entry
              </Button>
            </CardFooter>
          </Tabs>
        </Card>
      </form>
    </div>
  )
}
