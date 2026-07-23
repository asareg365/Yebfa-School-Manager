
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
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

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
  const { data: parents = [] } = useCollection(parentsQuery)

  // Sequential Parent Number Generator
  useEffect(() => {
    if (institutionId && parents.length >= 0 && !parentForm.parentNumber) {
      const nextCount = parents.length + 1
      const autoCode = `PAR-${String(nextCount).padStart(6, '0')}`
      setParentForm(prev => ({ ...prev, parentNumber: autoCode }))
    }
  }, [institutionId, parents.length, parentForm.parentNumber])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    
    setLoading(true)
    try {
      const parentData = {
        tenantId: institutionId,
        parentNumber: parentForm.parentNumber,
        firstName: parentForm.firstName,
        middleName: parentForm.middleName,
        lastName: parentForm.lastName,
        gender: parentForm.gender,
        dob: parentForm.dob,
        phone: parentForm.phone,
        alternatePhone: parentForm.alternatePhone,
        email: parentForm.email,
        address: parentForm.address,
        town: parentForm.town,
        region: parentForm.region,
        digitalAddress: parentForm.digitalAddress,
        occupation: parentForm.occupation,
        employer: parentForm.employer,
        employerAddress: parentForm.employerAddress,
        nationalId: parentForm.nationalId,
        passportNumber: parentForm.passportNumber,
        emergencyContact: parentForm.emergencyContact,
        emergencyPhone: parentForm.emergencyPhone,
        emergencyRelationship: parentForm.emergencyRelationship,
        photoURL: parentForm.photoURL,
        status: parentForm.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await addDoc(collection(db, "parents"), parentData)
      
      toast({ 
        title: "Parent Registry Authorized", 
        description: `${parentForm.firstName} ${parentForm.lastName} has been successfully provisioned with ID ${parentForm.parentNumber}.` 
      })
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
            <Link href="/dashboard/parents">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Guardian Enrollment</h1>
            <p className="text-muted-foreground font-medium">Authorizing a new guardian master profile in the registry.</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 text-primary border border-primary/10">
          <ShieldCheck className="size-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Multi-Tenant Partition Active</span>
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
            <CardDescription className="text-primary-foreground/70">Building a comprehensive relationship record for the institutional hub.</CardDescription>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-muted/30 px-8 border-b overflow-x-auto no-scrollbar">
              <TabsList className="h-16 bg-transparent gap-8 justify-start p-0 min-w-max">
                <TabsTrigger value="personal" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2 gap-2 text-xs uppercase font-bold tracking-widest"><Users className="size-4" /> Personal</TabsTrigger>
                <TabsTrigger value="contact" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2 gap-2 text-xs uppercase font-bold tracking-widest"><Phone className="size-4" /> Contact</TabsTrigger>
                <TabsTrigger value="professional" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2 gap-2 text-xs uppercase font-bold tracking-widest"><Briefcase className="size-4" /> Professional</TabsTrigger>
                <TabsTrigger value="id" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2 gap-2 text-xs uppercase font-bold tracking-widest"><IdCard className="size-4" /> Identification</TabsTrigger>
                <TabsTrigger value="emergency" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2 gap-2 text-xs uppercase font-bold tracking-widest"><AlertCircle className="size-4" /> Emergency</TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="p-8">
              <TabsContent value="personal" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                   <div className="size-32 rounded-2xl bg-slate-50 border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:bg-slate-100 transition-colors cursor-pointer shrink-0">
                      <Camera className="size-8 mb-1 opacity-20" />
                      <span className="text-[10px] font-bold uppercase">Upload Photo</span>
                   </div>
                   <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Parent ID Number</Label>
                        <Input readOnly value={parentForm.parentNumber} className="h-12 bg-slate-50 font-bold font-mono border-none text-primary" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">First Name</Label>
                        <Input required value={parentForm.firstName} onChange={e => setParentForm({...parentForm, firstName: e.target.value})} className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Middle Name</Label>
                        <Input value={parentForm.middleName} onChange={e => setParentForm({...parentForm, middleName: e.target.value})} className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Last Name</Label>
                        <Input required value={parentForm.lastName} onChange={e => setParentForm({...parentForm, lastName: e.target.value})} className="h-12 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Gender</Label>
                        <Select value={parentForm.gender} onValueChange={v => setParentForm({...parentForm, gender: v})}>
                           <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                           <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Date of Birth</Label>
                        <Input type="date" value={parentForm.dob} onChange={e => setParentForm({...parentForm, dob: e.target.value})} className="h-12 rounded-xl" />
                      </div>
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Primary Phone</Label>
                     <Input required type="tel" value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="h-12 rounded-xl" placeholder="+233..." />
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Alternative Phone</Label>
                     <Input type="tel" value={parentForm.alternatePhone} onChange={e => setParentForm({...parentForm, alternatePhone: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Email Address</Label>
                     <Input type="email" value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="h-12 rounded-xl" placeholder="example@email.com" />
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ghana Digital Address (GPS)</Label>
                     <Input value={parentForm.digitalAddress} onChange={e => setParentForm({...parentForm, digitalAddress: e.target.value})} className="h-12 rounded-xl font-mono" placeholder="e.g. GA-123-4567" />
                   </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Residential Address</Label>
                  <Input value={parentForm.address} onChange={e => setParentForm({...parentForm, address: e.target.value})} className="h-12 rounded-xl" placeholder="House No, Street Name" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Town / City</Label>
                     <Input value={parentForm.town} onChange={e => setParentForm({...parentForm, town: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Region</Label>
                     <Input value={parentForm.region} onChange={e => setParentForm({...parentForm, region: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="professional" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Occupation</Label>
                     <Input value={parentForm.occupation} onChange={e => setParentForm({...parentForm, occupation: e.target.value})} className="h-12 rounded-xl" placeholder="e.g. Civil Servant, Businessman" />
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Employer / Agency</Label>
                     <Input value={parentForm.employer} onChange={e => setParentForm({...parentForm, employer: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Employer Office Address</Label>
                  <Input value={parentForm.employerAddress} onChange={e => setParentForm({...parentForm, employerAddress: e.target.value})} className="h-12 rounded-xl" placeholder="Location of workplace" />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">National ID (Ghana Card)</Label>
                     <Input value={parentForm.nationalId} onChange={e => setParentForm({...parentForm, nationalId: e.target.value})} className="h-12 rounded-xl font-mono" placeholder="GHA-XXXXXXXXX-X" />
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Passport Number</Label>
                     <Input value={parentForm.passportNumber} onChange={e => setParentForm({...parentForm, passportNumber: e.target.value})} className="h-12 rounded-xl font-mono" />
                   </div>
                </div>
                <div className="p-12 rounded-3xl bg-slate-50 border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground text-center">
                   <IdCard className="size-12 mb-4 opacity-20" />
                   <p className="text-xs font-bold uppercase tracking-widest opacity-40">Identify Document Storage (Optional)</p>
                   <p className="text-[10px] mt-1 italic">Authorized for legal and safety verification in 2026.</p>
                </div>
              </TabsContent>

              <TabsContent value="emergency" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Emergency Contact Name</Label>
                     <Input value={parentForm.emergencyContact} onChange={e => setParentForm({...parentForm, emergencyContact: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Emergency Contact Phone</Label>
                     <Input type="tel" value={parentForm.emergencyPhone} onChange={e => setParentForm({...parentForm, emergencyPhone: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                   <div className="space-y-1.5 md:col-span-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Relationship to Parent</Label><Input value={parentForm.emergencyRelationship} onChange={e => setParentForm({...parentForm, emergencyRelationship: e.target.value})} className="h-12 rounded-xl" placeholder="e.g. Spouse, Brother, Business Partner" /></div>
                </div>
              </TabsContent>
            </CardContent>

            <CardFooter className="bg-slate-50 p-8 border-t flex items-center justify-between">
              <Button type="button" variant="ghost" className="h-12 rounded-xl font-bold px-8 text-xs uppercase tracking-widest" asChild>
                <Link href="/dashboard/parents">Cancel Enrollment</Link>
              </Button>
              <Button type="submit" disabled={loading} className="h-14 px-12 rounded-2xl bg-primary text-lg font-bold shadow-2xl transition-all active:scale-[0.98]">
                {loading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                Authorize Registry Entry
              </Button>
            </CardFooter>
          </Tabs>
        </Card>
      </form>
      
      <div className="flex justify-center mt-12">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
          <CheckCircle2 className="size-3 text-green-600" /> Authorized Institutional Access • Global Registry 2026
        </p>
      </div>
    </div>
  )
}
