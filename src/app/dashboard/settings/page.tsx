
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { School, Shield, Building, Plus, Layers, Trash2, Save, Loader2, Upload, X, Wallet, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useFirestore, useDoc, useUser } from "@/firebase"
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { differenceInDays } from "date-fns"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [newDept, setNewDept] = useState("")
  const [logoPreview, setLogoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const instRef = useMemo(() => {
    if (!db || !institutionId) return null;
    return doc(db, "institutions", institutionId);
  }, [db, institutionId])
  
  const { data: institution, loading } = useDoc(instRef)

  useEffect(() => {
    if (institution?.logoUrl) setLogoUrl(institution.logoUrl)
  }, [institution])

  const trialDaysLeft = useMemo(() => {
    if (!institution?.createdAt) return null;
    const start = new Date(institution.createdAt.toMillis());
    const diff = differenceInDays(new Date(), start);
    return Math.max(0, 30 - diff);
  }, [institution]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 800000) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload a logo smaller than 800KB for system stability.",
        })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => setLogoUrl(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    if (!instRef || isSaving || !institution) return
    
    setIsSaving(true)
    const formData = new FormData(e.target as HTMLFormElement)
    
    const data: any = {
      name: (formData.get("schoolName") as string) || institution.name,
      location: (formData.get("location") as string) || institution.location,
      address: (formData.get("address") as string) || institution.address || "",
      phone: (formData.get("phone") as string) || institution.phone || "",
      academicYear: (formData.get("academicYear") as string) || institution.academicYear || "",
      currentTerm: (formData.get("currentTerm") as string) || institution.currentTerm || "Term 1",
    }

    if (logoPreview !== (institution.logoUrl || null)) {
      data.logoUrl = logoPreview;
    }

    updateDoc(instRef, data)
      .then(() => {
        toast({
          title: "Registry Synchronized",
          description: "Institutional profile updated successfully.",
        })
      })
      .catch(async (serverError: any) => {
        const permissionError = new FirestorePermissionError({
          path: instRef.path,
          operation: 'update',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  const handleAddDepartment = () => {
    if (!instRef || !newDept.trim()) return
    const updateData = { customDepartments: arrayUnion(newDept.trim()) }
    updateDoc(instRef, updateData)
      .then(() => {
        setNewDept("")
        toast({ title: "Department Registered", description: `${newDept} is now active.` })
      })
  }

  if (loading) return <div className="p-10 text-center animate-pulse font-headline font-bold text-primary">Synchronizing system...</div>
  if (!institutionId) return <div className="p-10 text-center font-bold text-destructive">No active institution context found</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">System Configuration Hub</h1>
        <p className="text-muted-foreground">Managing {institution?.name} • Global Ecosystem</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6 flex-wrap h-auto">
          <TabsTrigger value="profile" className="rounded-lg gap-2"><Building className="size-4" /> Identity</TabsTrigger>
          <TabsTrigger value="academic" className="rounded-lg gap-2"><School className="size-4" /> Academic</TabsTrigger>
          <TabsTrigger value="departments" className="rounded-lg gap-2"><Layers className="size-4" /> Departments</TabsTrigger>
          <TabsTrigger value="subscription" className="rounded-lg gap-2 text-accent"><Wallet className="size-4" /> Subscription</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg gap-2"><Shield className="size-4" /> Security</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSaveSettings}>
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="font-headline font-bold">Identity & Presence</CardTitle>
                <CardDescription>Logo and system branding used for official reports.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex items-center gap-8 p-6 border-2 border-dashed rounded-3xl bg-slate-50/50">
                  <div className="relative size-32 rounded-2xl bg-white border flex items-center justify-center overflow-hidden shadow-sm group">
                    {logoPreview ? (
                      <img src={logoPreview} className="w-full h-full object-contain p-2" alt="Logo" />
                    ) : (
                      <School className="size-10 text-muted-foreground/20" />
                    )}
                    {logoPreview && (
                      <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 rounded-full" onClick={() => setLogoUrl(null)}>
                        <X className="size-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-primary">System Branding</p>
                    <p className="text-xs text-muted-foreground">High resolution logo. Max 800KB.</p>
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2 rounded-xl h-10 px-4">
                      <Upload className="size-4" /> Upload Hub Image
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Official Institution Name</Label>
                    <Input name="schoolName" defaultValue={institution?.name} required className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">System Hub Location</Label>
                    <Input name="location" defaultValue={institution?.location} required className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Physical Address</Label>
                    <Input name="address" defaultValue={institution?.address} placeholder="e.g. Plot 15, System Hub" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Hub Phone</Label>
                    <Input name="phone" defaultValue={institution?.phone} placeholder="e.g. 024-000-0000" className="h-11 rounded-xl" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 bg-slate-50/50">
                <Button type="submit" disabled={isSaving} className="ml-auto gap-2 h-11 px-8 rounded-xl bg-primary font-bold shadow-lg">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Authorize Registry Update
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="space-y-6">
            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader><CardTitle className="font-headline font-bold">Academic Cycle Registry</CardTitle></CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Academic Session</Label>
                  <Input name="academicYear" defaultValue={institution?.academicYear} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">System Active Term</Label>
                  <Select name="currentTerm" defaultValue={institution?.currentTerm || "Term 1"}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 bg-slate-50/50">
                <Button type="submit" disabled={isSaving} className="ml-auto h-11 px-8 rounded-xl bg-primary font-bold">
                  Authorize Updates
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </form>

        <TabsContent value="subscription" className="space-y-6">
           <div className="grid gap-6 md:grid-cols-3">
              <Card className={`border-none shadow-lg ${institution?.subscriptionPlan === 'Trial' ? 'bg-blue-600 text-white' : 'bg-primary text-white'}`}>
                <CardHeader>
                   <CardDescription className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Active Plan</CardDescription>
                   <CardTitle className="text-3xl font-headline font-bold">{institution?.subscriptionPlan}</CardTitle>
                </CardHeader>
                <CardContent>
                   {institution?.subscriptionPlan === 'Trial' ? (
                     <div className="space-y-2">
                        <div className="flex justify-between text-xs"><span>Trial Duration</span><span>30 Days</span></div>
                        <div className="flex justify-between text-xs"><span>Days Remaining</span><span className="font-bold">{trialDaysLeft} Days</span></div>
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="size-4" /> Full Enterprise Access
                     </div>
                   )}
                </CardContent>
              </Card>

              {institution?.subscriptionPlan === 'Trial' && (
                <Card className="border-none shadow-md bg-white md:col-span-2">
                   <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="size-5 text-accent" /> Unlock Premium Features</CardTitle>
                      <CardDescription>Upgrade to Basic or Premium to remove trial limitations and activate AI forecasting.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-xl bg-slate-50 border flex flex-col gap-1">
                            <span className="text-xs font-bold">Basic</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">GH₵ 499 / Term</span>
                         </div>
                         <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col gap-1">
                            <span className="text-xs font-bold text-primary">Premium AI</span>
                            <span className="text-[10px] text-primary/60 uppercase font-bold">GH₵ 1,299 / Term</span>
                         </div>
                      </div>
                      <Button className="w-full bg-accent text-accent-foreground font-bold h-12 shadow-lg" asChild>
                         <a href="mailto:asareg365@gmail.com?subject=Institution Upgrade Request">Request Plan Upgrade</a>
                      </Button>
                   </CardContent>
                </Card>
              )}
           </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
            <CardHeader><CardTitle className="font-headline font-bold">System Access Protocols</CardTitle></CardHeader>
            <CardContent className="p-6 border-t">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                <div className="space-y-1">
                  <Label className="font-bold text-primary">Global Identity Verification</Label>
                  <p className="text-xs text-muted-foreground">Identity checks active across the institutional system hub.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
