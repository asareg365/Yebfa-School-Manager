
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { School, User, Bell, Shield, Wallet, Save, Loader2, Globe, Building, Plus, Layers, Trash2, Camera, Upload, X } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useFirestore, useDoc } from "@/firebase"
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

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

  const instRef = useMemo(() => institutionId ? doc(db!, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution, loading } = useDoc(instRef)

  useEffect(() => {
    if (institution?.logoUrl) setLogoUrl(institution.logoUrl)
  }, [institution])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setLogoUrl(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instRef || isSaving) return
    
    setIsSaving(true)
    const formData = new FormData(e.target as HTMLFormElement)
    const data = {
      name: formData.get("schoolName"),
      location: formData.get("location"),
      address: formData.get("address"),
      phone: formData.get("phone"),
      academicYear: formData.get("academicYear"),
      currentTerm: formData.get("currentTerm"),
      logoUrl: logoPreview
    }

    try {
      await updateDoc(instRef, data)
      toast({
        title: "Profile Synchronized",
        description: "Institutional identity node updated.",
      })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddDepartment = async () => {
    if (!instRef || !newDept.trim()) return
    try {
      await updateDoc(instRef, { customDepartments: arrayUnion(newDept.trim()) })
      setNewDept("")
      toast({ title: "Department Registered", description: `${newDept} is now active.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Access Denied", description: "You must be the institution owner." })
    }
  }

  const handleRemoveDepartment = async (dept: string) => {
    if (!instRef) return
    try {
      await updateDoc(instRef, { customDepartments: arrayRemove(dept) })
      toast({ title: "Department Removed", description: `${dept} has been de-provisioned.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed", description: error.message })
    }
  }

  if (loading) return <div className="p-10 text-center animate-pulse">Establishing Node Link...</div>
  if (!institutionId) return <div className="p-10 text-center font-bold text-destructive">No Active Instance Connected</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Institutional Configuration</h1>
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
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Branding & Details</CardTitle>
                <CardDescription>Logo and address details will appear on ID cards and letters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex items-center gap-8 p-6 border-2 border-dashed rounded-2xl bg-muted/20">
                  <div className="relative size-32 rounded-2xl bg-background border flex items-center justify-center overflow-hidden shadow-sm group">
                    {logoPreview ? (
                      <img src={logoPreview} className="w-full h-full object-contain p-2" />
                    ) : (
                      <School className="size-10 text-muted-foreground/20" />
                    )}
                    {logoPreview && (
                      <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100" onClick={() => setLogoUrl(null)}>
                        <X className="size-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-primary">School Logo</p>
                    <p className="text-xs text-muted-foreground">High resolution PNG or SVG recommended.</p>
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                      <Upload className="size-4" /> Upload Logo
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Official School Name</Label>
                    <Input name="schoolName" defaultValue={institution?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Location / Region</Label>
                    <Input name="location" defaultValue={institution?.location} required />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Physical Address (Back of ID Card)</Label>
                    <Input name="address" defaultValue={institution?.address} placeholder="e.g. Plot 15, Station Road, Goaso" />
                  </div>
                  <div className="space-y-2">
                    <Label>Official Phone (Back of ID Card)</Label>
                    <Input name="phone" defaultValue={institution?.phone} placeholder="e.g. 024-000-0000" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button type="submit" disabled={isSaving} className="ml-auto gap-2">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save Branding Node
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader><CardTitle>Term Cycles</CardTitle></CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2"><Label>Academic Year</Label><Input name="academicYear" defaultValue={institution?.academicYear} /></div>
                <div className="space-y-2">
                  <Label>Active Term</Label>
                  <Select name="currentTerm" defaultValue={institution?.currentTerm || "Term 1"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6"><Button type="submit" className="ml-auto">Update Cycle</Button></CardFooter>
            </Card>
          </TabsContent>
        </form>

        <TabsContent value="departments" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader><CardTitle>Departmental Registry</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Input placeholder="e.g. Guidance & Counseling" value={newDept} onChange={e => setNewDept(e.target.value)} />
                <Button onClick={handleAddDepartment}><Plus className="size-4 mr-2" /> Add Department</Button>
              </div>
              <div className="grid gap-2">
                {institution?.customDepartments?.map((dept: string) => (
                  <div key={dept} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                    <span className="text-sm font-semibold">{dept}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveDepartment(dept)}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader><CardTitle>Access Controls</CardTitle></CardHeader>
            <CardContent className="p-4 border rounded-xl flex items-center justify-between">
              <div><Label>Data Isolation Check</Label><p className="text-xs text-muted-foreground">Strict multi-tenant verification active.</p></div>
              <Switch defaultChecked />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
