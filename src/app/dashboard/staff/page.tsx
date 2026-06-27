
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Users, Mail, Phone, UserCog, Search, Trash2, Loader2 } from "lucide-react"
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Staff Roster</h1>
          <p className="text-muted-foreground">Manage your institution's workforce and payroll links.</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={handleAddStaff} disabled={adding}>
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
          Add Staff Member
        </Button>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff records..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {staff.length === 0 && !loading ? (
            <div className="h-72 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <UserCog className="size-12 opacity-20 mb-2" />
              <p className="font-bold text-primary">Staff Ledger Empty</p>
              <p className="text-xs">No staff accounts have been provisioned for this institution yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Department / Role</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead className="text-right">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s: any) => (
                  <TableRow key={s.id} className="hover:bg-muted/10">
                    <TableCell className="font-bold text-primary">{s.fullName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-accent uppercase tracking-tighter">{s.department}</span>
                        <span className="text-sm">{s.role}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.email}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(s.id, s.fullName)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
