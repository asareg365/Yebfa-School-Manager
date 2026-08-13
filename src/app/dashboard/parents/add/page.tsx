
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
  ShieldCheck,
  Upload
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore, useDoc } from "@/firebase"
import { collection, serverTimestamp, doc, setDoc } from "firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { initializeApp, deleteApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"
import { normalizeSecurityPhone, getInstitutionEmailDomain } from "@/lib/identity-service"
import { generateId } from "@/lib/id-generator"
import { Badge } from "@/components/ui/badge"

export default function AddParentPage() {
  const db = useFirestore()
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const [parentForm, setParentForm] = useState({
    parentNumber: "PENDING",
    firstName: "",
    lastName: "",
    gender: "Female",
    phone: "",
    email: "",
    occupation: "",
    address: "",
    status: "Active",
    photoURL: ""
  })

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 800000) {
        toast({ variant: "destructive", title: "File Too Large", description: "Image must be under 800KB." })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => setParentForm(prev => ({ ...prev, photoURL: reader.result as string }))
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || !institution || loading) return
    
    setLoading(true)
    const provisionAppName = `par-enroll-${Date.now()}`;
    const provisionApp = initializeApp(firebaseConfig, provisionAppName);
    const provisionAuth = getAuth(provisionApp);

    try {
      const finalParentNumber = await generateId('parents', institution.schoolCode, 'PR');
      
      let cleanPass = normalizeSecurityPhone(parentForm.phone)
      if (cleanPass.length < 6) cleanPass = cleanPass.padEnd(6, '0');
      
      const domain = getInstitutionEmailDomain(institution);
      
      const authEmail = `${finalParentNumber.trim()}@${domain}`.toLowerCase();
      const contactEmail = parentForm.email?.trim().toLowerCase() || authEmail;
      
      let authUser;
      let authUid = null;
      try {
        const credential = await createUserWithEmailAndPassword(provisionAuth, authEmail, cleanPass)
        authUser = credential.user
        authUid = authUser.uid;
      } catch (authErr: any) {
        console.log("Parent Auth Error");
        throw authErr;
      }

      const parentRef = doc(collection(db, "parents"))
      await setDoc(parentRef, {
        ...parentForm,
        parentNumber: finalParentNumber,
        phone: normalizeSecurityPhone(parentForm.phone),
        email: contactEmail,
        authEmail: authEmail,
        id: parentRef.id,
        authUid,
        tenantId: institutionId,
        institutionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const finalUid = authUid || parentRef.id;
      await setDoc(doc(db, "users", finalUid), {
        uid: finalUid,
        name: `${parentForm.firstName} ${parentForm.lastName}`,
        email: contactEmail,
        authEmail: authEmail,
        role: "parent",
        tenantId: institutionId,
        institutionId: institutionId,
        status: "active",
        createdAt: serverTimestamp()
      })
      
      if (authUser) await signOut(provisionAuth);
      
      toast({ title: "Guardian Registered", description: `Access active via ${finalParentNumber}.` })
      router.push("/dashboard/parents")
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Registration Error", description: e.message }) 
    } finally { 
      setLoading(false);
      try { await deleteApp(provisionApp); } catch (e) {}
    }
  }

  return (
    <div className="container max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11"><Link href="/dashboard/parents"><ArrowLeft className="size-5" /></Link></Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Guardian Enrollment</h1>
          <p className="text-muted-foreground font-medium">Automatic portal provisioning active for new guardians.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
          <CardHeader className="bg-primary text-primary-foreground p-8">
            <CardTitle className="text-3xl font-headline font-bold">New Parent Entry</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-10 space-y-10">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl bg-slate-50/50">
              <div className="relative size-32 md:size-40 rounded-2xl bg-white border flex items-center justify-center overflow-hidden shadow-sm group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                {parentForm.photoURL ? (
                  <img src={parentForm.photoURL} className="w-full h-full object-cover" alt="Parent Preview" />
                ) : (
                  <Camera className="size-12 text-muted-foreground/20" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="size-8 text-white" />
                </div>
              </div>
              <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
              <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Guardian Photo (Under 800KB)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-2">
                 <Label className="text-[10px] uppercase font-bold text-muted-foreground">Parent Number</Label>
                 <div className="h-12 px-4 rounded-xl bg-slate-50 flex items-center border border-dashed border-slate-200">
                    <Badge variant="secondary" className="font-mono text-xs font-bold uppercase bg-slate-200 text-slate-600 border-none">
                       {parentForm.parentNumber}
                    </Badge>
                 </div>
               </div>
               <div className="space-y-2"><Label>First Name</Label><Input required value={parentForm.firstName} onChange={e => setParentForm({...parentForm, firstName: e.target.value})} className="h-12 rounded-xl" /></div>
               <div className="space-y-2"><Label>Last Name</Label><Input required value={parentForm.lastName} onChange={e => setParentForm({...parentForm, lastName: e.target.value})} className="h-12 rounded-xl" /></div>
               <div className="space-y-2"><Label>Phone Number</Label><Input required value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
               <div className="space-y-2 md:col-span-2"><Label>Email Address (Optional)</Label><Input type="email" value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="h-12 rounded-xl" /></div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 p-8 border-t">
            <Button type="submit" disabled={loading} className="w-full h-14 bg-primary font-bold shadow-xl text-lg gap-2 rounded-2xl">
              {loading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />} Authorize Enrollment
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
