
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

  const instRef = institutionId ? doc(db!, "institutions", institutionId) : null
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
        title: "Profile Synchronized",
        description: "Institutional node updated successfully.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Insufficient permissions or network error.",
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
      toast({ title: "Department Registered", description: `${newDept} is now active.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Access Denied", description: "You must be the institution owner." })
    }
  }

  const handleRemoveDepartment = async (dept: string) => {
    if (!instRef) return
    try {
      await updateDoc(instRef, {
        customDepartments: arrayRemove(dept)
      })
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
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">System Configuration</h1>
        <p className="text-muted-foreground">Managing {institution?.name} • Ahafo Regional Hub</p>
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
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Institutional Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>School Name</Label>
                    <Input name="schoolName" defaultValue={institution?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input name="location" defaultValue={institution?.location} required />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button type="submit" disabled={isSaving} className="ml-auto">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4 mr-2" />}
                  Save Profile
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Term Cycles</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input name="academicYear" defaultValue={institution?.academicYear} />
                </div>
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
              <CardFooter className="border-t pt-6">
                <Button type="submit" className="ml-auto">Update Cycle</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </form>

        <TabsContent value="departments" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Departmental Registry</CardTitle>
              <CardDescription>Add specialized faculty nodes to your roster picker.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Input 
                    placeholder="e.g. Guidance & Counseling" 
                    value={newDept} 
                    onChange={e => setNewDept(e.target.value)} 
                  />
                </div>
                <Button className="gap-2" onClick={handleAddDepartment}>
                  <Plus className="size-4" /> Add Department
                </Button>
              </div>

              <div className="grid gap-2">
                {institution?.customDepartments?.map((dept: string) => (
                  <div key={dept} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                    <span className="text-sm font-semibold">{dept}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveDepartment(dept)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader><CardTitle>Access Controls</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <Label>Data Isolation Check</Label>
                  <p className="text-xs text-muted-foreground">Strict multi-tenant verification active.</p>
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
