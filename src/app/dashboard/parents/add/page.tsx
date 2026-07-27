
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
  HeartHandshake,
  Users,
  Phone,
  Briefcase,
  IdCard,
  AlertCircle,
  Camera,
  Save,
  ShieldCheck
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useDoc } from "@/firebase"
import { collection, serverTimestamp, doc, setDoc } from "firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { initializeApp, getApps } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"
import { generateInstitutionId, normalizeSecurityPhone } from "@/lib/identity-service"
import { Badge } from "@/components/ui/badge"

export default function AddParentPage() {
  const db = useFirestore()
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const [parentForm, setParentForm] = useState({
    parentNumber: "PENDING AUTHORIZATION",
    firstName: "",
    lastName: "",
    gender: "Female",
    phone: "",
    email: "",
    occupation: "",
    address: "",
    status: "Active"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading || !institution?.schoolCode) {
      toast({ variant: "destructive", title: "Setup Error", description: "Institution school code is required for identity generation." });
      return
    }
    
    setLoading(true)
    try {
      // 1. Transactional Sequential ID Generation
      const finalParentNumber = await generateInstitutionId('PAR', institutionId, institution.schoolCode);
      const cleanPass = normalizeSecurityPhone(parentForm.phone)
      
      const secondaryAppName = `sec-par-add-${Date.now()}`
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName)
      const secondaryAuth = getAuth(secondaryApp)
      
      let authUser;
      try {
        const credential = await createUserWithEmailAndPassword(secondaryAuth, parentForm.email, cleanPass)
        authUser = credential.user
      } catch (authErr: any) {
        if (authErr.code !== 'auth/email-already-in-use') throw authErr;
      }

      const parentRef = doc(collection(db, "parents"))
      await setDoc(parentRef, {
        ...parentForm,
        parentNumber: finalParentNumber,
        phone: normalizeSecurityPhone(parentForm.phone),
        id: parentRef.id,
        tenantId: institutionId,
        institutionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

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
      
      toast({ title: "Guardian Registered", description: `Transactional ID: ${finalParentNumber} assigned.` })
      router.push("/dashboard/parents")
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Registration Error", description: e.message }) 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11"><Link href="/dashboard/parents"><ArrowLeft className="size-5" /></Link></Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Guardian Enrollment</h1>
          <p className="text-muted-foreground font-medium">Transactional IDs ensure unique institutional records for 2026.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="max-w-5xl mx-auto border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
          <CardHeader className="bg-primary text-primary-foreground p-8">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="size-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Identity Handshake Active</span>
            </div>
            <CardTitle className="text-3xl font-headline font-bold">New Parent Entry</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1.5">
                 <Label className="text-[10px] uppercase font-bold text-muted-foreground">Parent ID (Transactional)</Label>
                 <div className="h-12 px-4 rounded-xl bg-slate-50 flex items-center border border-dashed border-slate-200">
                    <Badge variant="secondary" className="font-mono text-xs font-bold uppercase bg-slate-200 text-slate-600 border-none">
                       {parentForm.parentNumber}
                    </Badge>
                 </div>
               </div>
               <div className="space-y-1.5"><Label>First Name</Label><Input required value={parentForm.firstName} onChange={e => setParentForm({...parentForm, firstName: e.target.value})} className="h-12 rounded-xl" /></div>
               <div className="space-y-1.5"><Label>Last Name</Label><Input required value={parentForm.lastName} onChange={e => setParentForm({...parentForm, lastName: e.target.value})} className="h-12 rounded-xl" /></div>
               <div className="space-y-1.5"><Label>Phone Number</Label><Input required value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
               <div className="space-y-1.5 md:col-span-2"><Label>Email Address (Portal ID)</Label><Input type="email" required value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="h-12 rounded-xl" /></div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 p-8 border-t">
            <Button type="submit" disabled={loading} className="w-full h-14 bg-primary font-bold shadow-xl text-lg gap-2">
              {loading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />} Authorize Registration
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
