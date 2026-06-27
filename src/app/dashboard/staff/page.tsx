
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Users, Mail, Phone, UserCog, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"

export default function StaffPage() {
  const handleAddStaff = () => {
    toast({
      title: "Human Resources Node",
      description: "Opening staff provisioning interface...",
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Staff Roster</h1>
          <p className="text-muted-foreground">Manage your institution's workforce and payroll links.</p>
        </div>
        <Button className="gap-2" onClick={handleAddStaff}>
          <Users className="size-4" /> Add Staff Member
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
              <TableRow>
                <TableCell colSpan={4} className="h-72 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <UserCog className="size-12 opacity-20 mb-2" />
                    <p className="font-bold text-primary">Staff Ledger Empty</p>
                    <p className="text-xs">No staff accounts have been provisioned for this institution yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
