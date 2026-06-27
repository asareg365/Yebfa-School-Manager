"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Users, Mail, Phone } from "lucide-react"

export default function StaffPage() {
  const staff = [
    { name: "John Doe", role: "Principal", email: "john@yebfa.com", phone: "0240000001" },
    { name: "Sarah Smith", role: "Mathematics Lead", email: "sarah@yebfa.com", phone: "0240000002" },
    { name: "Michael Kwame", role: "Admin Officer", email: "michael@yebfa.com", phone: "0240000003" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Staff Roster</h1>
          <p className="text-muted-foreground">Manage your institution's workforce and payroll links.</p>
        </div>
        <Button className="gap-2">
          <Users className="size-4" /> Add Staff
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.email}>
                  <TableCell className="font-bold">{member.name}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><Mail className="size-3" /> {member.email}</div>
                      <div className="flex items-center gap-1"><Phone className="size-3" /> {member.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Manage</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}