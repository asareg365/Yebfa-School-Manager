
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { School, User, Bell, Shield, Wallet, Save, Loader2, Globe, Building, Plus, Layers, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useFirestore, useDoc } from "@/firebase"
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [newDept, setNewDept] = useState("")

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const instRef = institutionId ? doc(db, "institutions", institutionId) : null
  const { data: institution, loading } = useDoc(instRef)

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instRef || isSaving) return
    
    setIsSaving(true)
    const formData = new FormData(e.target as HTMLFormElement)
    const data = {
      name: formData.get("schoolName"),
      location: formData.get("location"),
      academicYear: formData.get("academicYear"),
      currentTerm: formData.get("currentTerm"),
    }

    try {
      await updateDoc(instRef, data)
      toast({
        title: "Settings Updated",
        description: "Your institutional profile has been synchronized with the global node.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddDepartment = async () => {
    if (!instRef || !newDept.trim()) return
    try {
      await updateDoc(instRef, {
        customDepartments: arrayUnion(newDept.trim())
      })
      setNewDept("")
      toast({ title: "Department Added", description: `${newDept} is now available in the registry.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed", description: error.message })
    }
  }

  const handleRemoveDepartment = async (dept: string) => {
    if (!instRef) return
    try {
      await updateDoc(instRef, {
        customDepartments: arrayRemove(dept)
      })
      toast({ title: "Department Removed", description: `${dept} has been archived.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed", description: error.message })
    }
  }

  if (loading) return <div className="p-10 text-center animate-pulse font-headline">Synchronizing Institutional Node...</div>
  if (!institutionId) return <div className="p-10 text-center font-bold text-destructive">No Active Institution Selected</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">System Configuration</h1>
        <p className="text-muted-foreground">Manage your institution's profile, academic cycles, and security settings.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="profile" className="rounded-lg gap-2">
            <Building className="size-4" /> Profile
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
            <Card className="border-none shadow-md bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Institutional Identity</CardTitle>
                <CardDescription>Update the public-facing details of your school instance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="schoolName">Official School Name</Label>
                    <Input id="schoolName" name="schoolName" defaultValue={institution?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Campus Location</Label>
                    <Input id="location" name="location" defaultValue={institution?.location} required />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 bg-slate-50/50">
                <Button type="submit" disabled={isSaving} className="gap-2 ml-auto">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save Profile Node
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="space-y-6">
            <Card className="border-none shadow-md bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Term Cycles</CardTitle>
                <CardDescription>Define the current academic period for reporting and financial data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Current Academic Year</Label>
                    <Input id="academicYear" name="academicYear" placeholder="e.g. 2025/2026" defaultValue={institution?.academicYear} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentTerm">Current Active Term</Label>
                    <Select name="currentTerm" defaultValue={institution?.currentTerm || "Term 1"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Term" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Term 1">Term 1 (First Term)</SelectItem>
                        <SelectItem value="Term 2">Term 2 (Second Term)</SelectItem>
                        <SelectItem value="Term 3">Term 3 (Third Term)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button type="submit" disabled={isSaving} className="gap-2 ml-auto">
                   <Save className="size-4" /> Synchronize Cycle
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </form>

        <TabsContent value="departments" className="space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-xl">Departmental Registry</CardTitle>
              <CardDescription>Manage custom departments available for faculty and staff assignments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>New Department Name</Label>
                  <Input 
                    placeholder="e.g. Guidance & Counseling" 
                    value={newDept} 
                    onChange={(e) => setNewDept(e.target.value)} 
                  />
                </div>
                <Button className="mt-8 gap-2" onClick={handleAddDepartment}>
                  <Plus className="size-4" /> Add Node
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Custom Departments</h4>
                {institution?.customDepartments?.length > 0 ? (
                  <div className="grid gap-2">
                    {institution.customDepartments.map((dept: string) => (
                      <div key={dept} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                        <span className="text-sm font-semibold">{dept}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveDepartment(dept)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic p-4 border rounded-lg border-dashed text-center">No custom departments added. Default registry is active.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-xl">Node Security & Access</CardTitle>
              <CardDescription>Manage how users interact with your school's private data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/5">
                <div className="space-y-0.5">
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for all administrative accounts.</p>
                </div>
                <Switch disabled />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/5">
                <div className="space-y-0.5">
                  <Label className="text-base">Data Isolation Check</Label>
                  <p className="text-sm text-muted-foreground">Force strict multi-tenant partition verification.</p>
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
