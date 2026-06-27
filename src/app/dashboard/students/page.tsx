
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, Filter, GraduationCap } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function StudentsPage() {
  const handleAddStudent = () => {
    toast({
      title: "Enrollment Module Active",
      description: "Redirecting to student registration form...",
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Student Directory</h1>
          <p className="text-muted-foreground">Manage student records and academic enrollment for 2026.</p>
        </div>
        <Button className="gap-2" onClick={handleAddStudent}>
          <UserPlus className="size-4" /> Add New Student
        </Button>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="border-b pb-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, ID or class..." className="pl-9" />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button variant="outline" className="gap-2 flex-1 md:flex-none">
                <Filter className="size-4" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Grade Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Financials</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="h-72 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <GraduationCap className="size-12 opacity-20 mb-2" />
                    <p className="font-bold text-primary">No Registered Students</p>
                    <p className="text-xs">No students have been enrolled in the current term node.</p>
                    <Button variant="link" className="text-accent" onClick={handleAddStudent}>Enroll first student</Button>
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
