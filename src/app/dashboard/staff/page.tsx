
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Users, Mail, Phone, UserCog, Search, Trash2, Pencil, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, orderBy, deleteDoc, doc, where } from "firebase/firestore"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

export default function StaffPage() {
  const db = useFirestore()
  const [adding, setAdding] = useState(false)
  
  const institutionId = "demo-institution-2026"

  const staffQuery = query(
    collection(db, "staff"),
    where("institutionId", "==", institutionId),
    orderBy("fullName", "asc")
  )
  const { data: staff, loading } = useCollection(staffQuery)

  const handleAddStaff = async () => {
    if (!db || adding) return
    setAdding(true)
    
    try {
      const demoStaff = [
        { name: "John Asare", role: "Headmaster", dept: "Administration" },
        { name: "Sarah Mensah", role: "Senior Teacher", dept: "Mathematics" },
        { name: "Isaac Boateng", role: "Instructor", dept: "Science" },
        { name: "Grace Ofori", role: "Accountant", dept: "Finance" }
      ]
      const member = demoStaff[Math.floor(Math.random() * demoStaff.length)]
      
      await addDoc(collection(db, "staff"), {
        fullName: member.name,
        role: member.role,
        department: member.dept,
        email: `${member.name.toLowerCase().replace(/\s/g, ".")}@yebfa.edu`,
        institutionId: institutionId,
        createdAt: new Date().toISOString()
      })

      toast({
        title: "Staff Added",
        description: `${member.name} has been added to the roster.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      })
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, "staff", id))
      toast({
        title: "Staff Removed",
        description: `${name} has been removed from the node.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message
      })
    }
  }

  const handleEdit = (name: string) => {
    toast({
      title: "Staff Profile",
      description: `Editing credentials and payroll links for ${name}...`,
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Staff Roster</h1>
          <p className="text-muted-foreground">Manage your institution's workforce and payroll links.</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 shadow-lg shadow-primary/10" onClick={handleAddStaff} disabled={adding}>
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
          Add Staff Member
        </Button>
      </div>

      <Card className="border-none shadow-md overflow-hidden rounded-2xl">
        <CardHeader className="border-b bg-white p-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff records..." className="pl-9 h-11 bg-slate-50 border-none" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {staff.length === 0 && !loading ? (
            <div className="h-80 flex flex-col items-center justify-center gap-2 text-muted-foreground p-12">
              <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <UserCog className="size-10 text-primary opacity-20" />
              </div>
              <p className="font-bold text-primary text-lg">Staff Ledger Empty</p>
              <p className="text-sm">No staff accounts have been provisioned for this institution yet.</p>
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-primary h-8 w-8"
                          onClick={() => handleEdit(s.fullName)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                          onClick={() => handleDelete(s.id, s.fullName)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
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
