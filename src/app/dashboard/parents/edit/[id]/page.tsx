"use client"

import { useState, useEffect, useMemo, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  ShieldCheck,
  Users,
  Phone,
  Briefcase,
  IdCard,
  AlertCircle,
  Camera,
  Upload
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore, useDoc } from "@/firebase"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default function EditParentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: parentId } = use(params)
  const db = useFirestore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const parentRef = useMemo(() => doc(db, "parents", parentId), [db, parentId])
  const { data: parent, loading: pLoading } = useDoc(parentRef)

  const [parentForm, setParentForm] = useState<any>(null)

  useEffect(() => {
    if (parent) {
      setParentForm(parent)
    }
  }, [parent])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 800000) {
        toast({ variant: "destructive", title: "File Too Large", description: "Image must be under 800KB." })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => setParentForm((prev: any) => ({ ...prev, photoURL: reader.result as string }))
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || loading || !parentForm) return
    setLoading(true)
    try {
      const { id, createdAt, tenantId, institutionId, ...dataToUpdate } = parentForm
      await updateDoc(parentRef, {
        ...dataToUpdate,
        updatedAt: serverTimestamp()
      })
      toast({ title: "Registry Updated", description: "Guardian profile synchronized successfully." })
      router.push(`/dashboard/parents/${parentId}`)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message })
    } finally {
      setLoading(false)
    }
  }

  if (pLoading || !parentForm) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse">Loading Registry Record...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11">
          <Link href={`/dashboard/parents/${parentId}`}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Modify Guardian Registry</h1>
          <p className="text-muted-foreground font-medium">Updating metadata for {parent.firstName} {parent.lastName}.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="max-w-5xl mx-auto border-none shadow-2xl overflow-hidden rounded-3xl">
          <CardHeader className="bg-primary text-primary-foreground p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><ShieldCheck className="size-5" /></div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Record Synchronization</span>
            </div>
            <CardTitle className="text-3xl font-headline font-bold">Edit Profile</CardTitle>
          </CardHeader>

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="bg-muted/30 px-8 py-2 border-b gap-4 justify-start overflow-x-auto no-scrollbar min-w-max h-14">
              <TabsTrigger value="personal" className="gap-2 text-xs font-bold uppercase tracking-widest"><Users className="size-3.5" /> Personal</TabsTrigger>
              <TabsTrigger value="contact" className="gap-2 text-xs font-bold uppercase tracking-widest"><Phone className="size-3.5" /> Contact</TabsTrigger>
              <TabsTrigger value="employment" className="gap-2 text-xs font-bold uppercase tracking-widest"><Briefcase className="size-3.5" /> Employment</TabsTrigger>
              <TabsTrigger value="id" className="gap-2 text-xs font-bold uppercase tracking-widest"><IdCard className="size-3.5" /> Identity</TabsTrigger>
              <TabsTrigger value="emergency" className="gap-2 text-xs font-bold uppercase tracking-widest"><AlertCircle className="size-3.5" /> Emergency</TabsTrigger>
            </TabsList>

            <CardContent className="p-8">
              <TabsContent value="personal" className="space-y-6 mt-0">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl bg-slate-50/50 mb-6">
                  <div className="relative size-32 rounded-2xl bg-white border flex items-center justify-center overflow-hidden shadow-sm group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                    {parentForm.photoURL ? (
                      <img src={parentForm.photoURL} className="w-full h-full object-cover" alt="Parent Preview" />
                    ) : (
                      <Camera className="size-10 text-muted-foreground/20" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="size-6 text-white" />
                    </div>
                  </div>
                  <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                  <p className="mt-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">Update Photo (Optional)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">First Name</Label><Input required value={parentForm.firstName || ""} onChange={e => setParentForm({...parentForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Middle Name</Label><Input value={parentForm.middleName || ""} onChange={e => setParentForm({...parentForm, middleName: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Last Name</Label><Input required value={parentForm.lastName || ""} onChange={e => setParentForm({...parentForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Gender</Label>
                      <Select value={parentForm.gender} onValueChange={v => setParentForm({...parentForm, gender: v})}>
                         <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                         <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Date of Birth</Label><Input type="date" value={parentForm.dob || ""} onChange={e => setParentForm({...parentForm, dob: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Primary Phone</Label><Input required value={parentForm.phone || ""} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Email Address</Label><Input type="email" value={parentForm.email || ""} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Residential Address</Label><Input value={parentForm.address || ""} onChange={e => setParentForm({...parentForm, address: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Town / City</Label><Input value={parentForm.town || ""} onChange={e => setParentForm({...parentForm, town: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Region</Label><Input value={parentForm.region || ""} onChange={e => setParentForm({...parentForm, region: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Digital Address (GPS)</Label><Input value={parentForm.digitalAddress || ""} onChange={e => setParentForm({...parentForm, digitalAddress: e.target.value})} className="h-11 rounded-xl font-mono" /></div>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Occupation</Label><Input value={parentForm.occupation || ""} onChange={e => setParentForm({...parentForm, occupation: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Employer</Label><Input value={parentForm.employer || ""} onChange={e => setParentForm({...parentForm, employer: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Employer Address (Office)</Label><Input value={parentForm.employerAddress || ""} onChange={e => setParentForm({...parentForm, employerAddress: e.target.value})} className="h-11 rounded-xl" /></div>
              </TabsContent>

              <TabsContent value="id" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">National ID (Ghana Card)</Label><Input value={parentForm.nationalId || ""} onChange={e => setParentForm({...parentForm, nationalId: e.target.value})} className="h-11 rounded-xl font-mono" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Passport Number</Label><Input value={parentForm.passportNumber || ""} onChange={e => setParentForm({...parentForm, passportNumber: e.target.value})} className="h-11 rounded-xl font-mono" /></div>
                </div>
              </TabsContent>

              <TabsContent value="emergency" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Emergency Contact Name</Label><Input value={parentForm.emergencyContact || ""} onChange={e => setParentForm({...parentForm, emergencyContact: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Emergency Phone</Label><Input value={parentForm.emergencyPhone || ""} onChange={e => setParentForm({...parentForm, emergencyPhone: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5 md:col-span-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Relationship</Label><Input value={parentForm.emergencyRelationship || ""} onChange={e => setParentForm({...parentForm, emergencyRelationship: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>

          <CardFooter className="bg-slate-50 p-8 border-t flex justify-between items-center">
            <Button variant="ghost" type="button" asChild className="h-12 rounded-xl px-8 font-bold text-xs uppercase tracking-widest">
              <Link href={`/dashboard/parents/${parentId}`}>Discard Changes</Link>
            </Button>
            <Button type="submit" disabled={loading} className="h-14 px-12 text-lg font-bold rounded-2xl bg-primary shadow-xl">
              {loading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
              Synchronize Profile
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
