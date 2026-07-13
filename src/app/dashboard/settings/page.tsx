
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { School, Shield, Building, Plus, Layers, Trash2, Save, Loader2, Upload, X } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useFirestore, useDoc } from "@/firebase"
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function SettingsPage() {
  const db = useFirestore()
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 800000) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload a logo smaller than 800KB for system performance.",
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
    
    // Explicitly maintain existing values to prevent null overwrites
    // This ensures data integrity and satisfies security rules
    const data = {
      name: (formData.get("schoolName") as string) || institution.name || "",
      location: (formData.get("location") as string) || institution.location || "",
      address: (formData.get("address") as string) || institution.address || "",
      phone: (formData.get("phone") as string) || institution.phone || "",
      academicYear: (formData.get("academicYear") as string) || institution.academicYear || "",
      currentTerm: (formData.get("currentTerm") as string) || institution.currentTerm || "Term 1",
      logoUrl: logoPreview || institution.logoUrl || ""
    }

    updateDoc(instRef, data)
      .then(() => {
        toast({
          title: "Profile Synchronized",
          description: "Institutional identity profile updated.",
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
      .catch(async (error: any) => {
        const permissionError = new FirestorePermissionError({
          path: instRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
  }

  const handleRemoveDepartment = (dept: string) => {
    if (!instRef) return
    const updateData = { customDepartments: arrayRemove(dept) }
    updateDoc(instRef, updateData)
      .then(() => {
        toast({ title: "Department Removed", description: `${dept} has been removed.` })
      })
      .catch(async (error: any) => {
        const permissionError = new FirestorePermissionError({
          path: instRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
  }

  if (loading) return <div className="p-10 text-center animate-pulse font-headline font-bold text-primary">Loading configuration...</div>
  if (!institutionId) return <div className="p-10 text-center font-bold text-destructive">No active institution connected</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Configuration</h1>
        <p className="text-muted-foreground">Managing {institution?.name} • Ahafo Regional Hub</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="profile" className="rounded-lg gap-2">
            <Building className="size-4" /> Identity & Branding
          </TabsTrigger>
          <TabsTrigger value="academic" className="rounded-lg gap-2">
            <School className="size-4" /> Academic Cycle
          </TabsTrigger>
          <TabsTrigger value="departments" className="rounded-lg gap-2">
            <Layers className="size-4" /> Departments
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg gap-2">
            <Shield className="size-4" /> Security
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSaveSettings}>
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="font-headline font-bold">Branding & Details</CardTitle>
                <CardDescription>Logo and address details will appear on ID cards and letters.</CardDescription>
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
                    <p className="text-sm font-bold text-primary">School Logo</p>
                    <p className="text-xs text-muted-foreground">High resolution PNG or JPG recommended. Max 800KB.</p>
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2 rounded-xl h-10 px-4">
                      <Upload className="size-4" /> Upload Logo
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Official School Name</Label>
                    <Input name="schoolName" defaultValue={institution?.name} required className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Location / Region</Label>
                    <Input name="location" defaultValue={institution?.location} required className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Physical Address (ID Card)</Label>
                    <Input name="address" defaultValue={institution?.address} placeholder="e.g. Plot 15, Station Road, Goaso" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Official Phone (ID Card)</Label>
                    <Input name="phone" defaultValue={institution?.phone} placeholder="e.g. 024-000-0000" className="h-11 rounded-xl" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 bg-slate-50/50">
                <Button type="submit" disabled={isSaving} className="ml-auto gap-2 h-11 px-8 rounded-xl bg-primary font-bold shadow-lg shadow-primary/10 transition-all active:scale-95">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save Branding
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="space-y-6">
            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader><CardTitle className="font-headline font-bold">Academic Cycle</CardTitle></CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Academic Year</Label>
                  <Input name="academicYear" defaultValue={institution?.academicYear} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Active Term</Label>
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
                <Button type="submit" disabled={isSaving} className="ml-auto h-11 px-8 rounded-xl bg-primary font-bold shadow-lg shadow-primary/10 transition-all active:scale-95">
                  Authorize Update
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </form>

        <TabsContent value="departments" className="space-y-6">
          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
            <CardHeader><CardTitle className="font-headline font-bold">Departments</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Input placeholder="e.g. Guidance & Counseling" value={newDept} onChange={e => setNewDept(e.target.value)} className="h-11 rounded-xl" />
                <Button onClick={handleAddDepartment} className="h-11 rounded-xl gap-2"><Plus className="size-4" /> Add Department</Button>
              </div>
              <div className="grid gap-3">
                {institution?.customDepartments?.map((dept: string) => (
                  <div key={dept} className="flex items-center justify-between p-4 rounded-xl border bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-bold text-primary">{dept}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveDepartment(dept)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                {(!institution?.customDepartments || institution.customDepartments.length === 0) && (
                   <p className="text-center py-12 text-sm text-muted-foreground italic">No custom departments registered.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
            <CardHeader><CardTitle className="font-headline font-bold">Access Controls</CardTitle></CardHeader>
            <CardContent className="p-6 border-t">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                <div className="space-y-1">
                  <Label className="font-bold text-primary">Security Verification</Label>
                  <p className="text-xs text-muted-foreground">Multi-tenant verification active across all clusters.</p>
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
