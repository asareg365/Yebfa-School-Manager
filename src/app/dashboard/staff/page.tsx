
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Users, Mail, UserCog, Search, Trash2, Pencil, Loader2, Upload, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, orderBy, deleteDoc, doc, where, serverTimestamp } from "firebase/firestore"
import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export default function StaffPage() {
  const db = useFirestore()
  const [loading, setLoading] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  
  const [staffForm, setStaffForm] = useState({
    fullName: "",
    role: "",
    department: "Administration",
    email: ""
  })
  const [bulkData, setBulkData] = useState("")

  const institutionId = typeof window !== 'undefined' ? localStorage.getItem('selected_institution_id') || "demo-institution-2026" : "demo-institution-2026"

  const staffQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collection(db, "staff"),
      where("institutionId", "==", institutionId),
      orderBy("createdAt", "desc")
    );
  }, [db, institutionId]);

  const { data: staff, loading: dataLoading } = useCollection(staffQuery)

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || loading) return
    setLoading(true)
    
    try {
      await addDoc(collection(db, "staff"), {
        ...staffForm,
        institutionId: institutionId,
        createdAt: serverTimestamp()
      })
      toast({
        title: "Staff Member Added",
        description: `${staffForm.fullName} has joined the roster.`,
      })
      setIsAddOpen(false)
      setStaffForm({ fullName: "", role: "", department: "Administration", email: "" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!db || loading || !bulkData.trim()) return
    setLoading(true)

    const lines = bulkData.split('\n').filter(line => line.trim() !== '')
    let successCount = 0

    try {
      for (const line of lines) {
        const [name, role, dept, email] = line.split(',').map(s => s?.trim())
        if (name && role) {
          await addDoc(collection(db, "staff"), {
            fullName: name,
            role: role,
            department: dept || "General",
            email: email || `${name.toLowerCase().replace(/\s/g, '.')}@yebfa.edu`,
            institutionId,
            createdAt: serverTimestamp()
          })
          successCount++
        }
      }
      toast({
        title: "Bulk Import Complete",
        description: `Successfully added ${successCount} staff members.`,
      })
      setIsBulkOpen(false)
      setBulkData("")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Import Error", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db!, "staff", id))
      toast({ title: "Staff Removed", description: `${name} has been de-provisioned.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Staff Roster</h1>
          <p className="text-muted-foreground">Manage institutional workforce and personnel links.</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 px-6">
                <Upload className="size-4" /> Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-bold text-primary">Bulk Staff Import</DialogTitle>
                <DialogDescription>Format: FullName, Role, Department, Email</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Textarea 
                  placeholder="Isaac Boateng, Senior Teacher, Science, isaac@yebfa.edu&#10;Sarah Mensah, Accountant, Finance, sarah@yebfa.edu" 
                  className="min-h-[200px] font-mono text-sm"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={handleBulkUpload} disabled={loading} className="w-full h-11">
                  {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Users className="size-4 mr-2" />}
                  Add All Staff
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 shadow-lg shadow-primary/10">
                <UserPlus className="size-4" /> Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <form onSubmit={handleAddStaff}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline font-bold text-primary">Add Faculty/Staff</DialogTitle>
                  <DialogDescription>Create a new personnel node for your institution.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                  <div className="space-y-2">
                    <Label htmlFor="sname">Full Name</Label>
                    <Input id="sname" required value={staffForm.fullName} onChange={(e) => setStaffForm({...staffForm, fullName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="srole">Role / Designation</Label>
                      <Input id="srole" required value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sdept">Department</Label>
                      <Select onValueChange={(v) => setStaffForm({...staffForm, department: v})} defaultValue={staffForm.department}>
                        <SelectTrigger>
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Administration">Administration</SelectItem>
                          <SelectItem value="Mathematics">Mathematics</SelectItem>
                          <SelectItem value="Science">Science</SelectItem>
                          <SelectItem value="Languages">Languages</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="semail">Professional Email</Label>
                    <Input id="semail" type="email" required value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading} className="w-full h-11">
                    {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <UserCog className="size-4 mr-2" />}
                    Confirm Personnel
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden rounded-2xl">
        <CardHeader className="border-b bg-white p-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff records..." className="pl-9 h-11 bg-slate-50 border-none" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {staff.length === 0 && !dataLoading ? (
            <div className="h-80 flex flex-col items-center justify-center gap-2 text-muted-foreground p-12">
              <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <UserCog className="size-10 text-primary opacity-20" />
              </div>
              <p className="font-bold text-primary text-lg">Staff Ledger Empty</p>
              <p className="text-sm">No personnel accounts detected in this institutional node.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold py-4">Staff Name</TableHead>
                  <TableHead className="font-bold py-4">Department / Role</TableHead>
                  <TableHead className="font-bold py-4">Credentials</TableHead>
                  <TableHead className="text-right font-bold py-4">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s: any) => (
                  <TableRow key={s.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-bold text-primary">{s.fullName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{s.department}</span>
                        <span className="text-sm font-medium">{s.role}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">{s.email}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id, s.fullName)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
