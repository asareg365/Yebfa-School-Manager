"use client"

import { useState, useEffect, useMemo, use } from "react"
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
  ShieldCheck
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useDoc } from "@/firebase"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default function EditParentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: parentId } = use(params)
  const db = useFirestore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const parentRef = useMemo(() => doc(db, "parents", parentId), [db, parentId])
  const { data: parent, loading: pLoading } = useDoc(parentRef)

  const [parentForm, setParentForm] = useState<any>(null)

  useEffect(() => {
    if (parent) {
      setParentForm(parent)
    }
  }, [parent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || loading || !parentForm) return
    setLoading(true)
    try {
      const { id, createdAt, tenantId, ...dataToUpdate } = parentForm
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
        <Button variant="ghost" size="icon" asChild className="rounded-xl">
          <Link href={`/dashboard/parents/${parentId}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Modify Guardian Registry</h1>
          <p className="text-muted-foreground font-medium">Updating metadata for {parent.firstName} {parent.lastName}.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="max-w-4xl mx-auto border-none shadow-2xl overflow-hidden rounded-3xl">
          <CardHeader className="bg-primary text-primary-foreground p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><ShieldCheck className="size-5" /></div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Record Synchronization</span>
            </div>
            <CardTitle className="text-3xl font-headline font-bold">Edit Profile</CardTitle>
          </CardHeader>

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="bg-muted/30 px-8 py-2 border-b gap-4 justify-start">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="id">Identification</TabsTrigger>
            </TabsList>

            <CardContent className="p-8">
              <TabsContent value="personal" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">First Name</Label><Input required value={parentForm.firstName || ""} onChange={e => setParentForm({...parentForm, firstName: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Middle Name</Label><Input value={parentForm.middleName || ""} onChange={e => setParentForm({...parentForm, middleName: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Last Name</Label><Input required value={parentForm.lastName || ""} onChange={e => setParentForm({...parentForm, lastName: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Gender</Label>
                      <Select value={parentForm.gender} onValueChange={v => setParentForm({...parentForm, gender: v})}>
                         <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                         <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Date of Birth</Label><Input type="date" value={parentForm.dateOfBirth || ""} onChange={e => setParentForm({...parentForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Nationality</Label><Input value={parentForm.nationality || ""} onChange={e => setParentForm({...parentForm, nationality: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Phone Number</Label><Input required value={parentForm.phone || ""} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Email Address</Label><Input type="email" value={parentForm.email || ""} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Residential Address</Label><Input value={parentForm.address || ""} onChange={e => setParentForm({...parentForm, address: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Town/City</Label><Input value={parentForm.town || ""} onChange={e => setParentForm({...parentForm, town: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Region</Label><Input value={parentForm.region || ""} onChange={e => setParentForm({...parentForm, region: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Digital Address (GPS)</Label><Input value={parentForm.digitalAddress || ""} onChange={e => setParentForm({...parentForm, digitalAddress: e.target.value})} className="h-11 rounded-xl font-mono" /></div>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Occupation</Label><Input value={parentForm.occupation || ""} onChange={e => setParentForm({...parentForm, occupation: e.target.value})} className="h-11 rounded-xl" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Employer</Label><Input value={parentForm.employer || ""} onChange={e => setParentForm({...parentForm, employer: e.target.value})} className="h-11 rounded-xl" /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Office Address</Label><Input value={parentForm.officeAddress || ""} onChange={e => setParentForm({...parentForm, officeAddress: e.target.value})} className="h-11 rounded-xl" /></div>
              </TabsContent>

              <TabsContent value="id" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">National ID (Ghana Card)</Label><Input value={parentForm.nationalId || ""} onChange={e => setParentForm({...parentForm, nationalId: e.target.value})} className="h-11 rounded-xl font-mono" /></div>
                   <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold">Passport Number</Label><Input value={parentForm.passportNumber || ""} onChange={e => setParentForm({...parentForm, passportNumber: e.target.value})} className="h-11 rounded-xl font-mono" /></div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>

          <CardFooter className="bg-slate-50 p-8 border-t flex justify-between items-center">
            <Button variant="ghost" type="button" asChild className="h-12 rounded-xl">
              <Link href={`/dashboard/parents/${parentId}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="h-14 px-12 text-lg font-bold rounded-2xl bg-primary shadow-xl">
              {loading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
              Save Registry Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
