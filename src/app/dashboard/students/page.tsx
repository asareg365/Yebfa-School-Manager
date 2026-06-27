
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, Filter, GraduationCap, Trash2, Loader2, MoreVertical } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser } from "@/firebase"
import { collection, addDoc, query, orderBy, deleteDoc, doc, where } from "firebase/firestore"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

export default function StudentsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [enrolling, setEnrolling] = useState(false)

  // In a real app, institutionId would come from user profile
  const institutionId = "demo-institution-2026"
  
  const studentsQuery = query(
    collection(db, "students"), 
    where("institutionId", "==", institutionId),
    orderBy("lastName", "asc")
  )
  const { data: students, loading } = useCollection(studentsQuery)

  const handleEnroll = async () => {
    if (!db || enrolling) return
    setEnrolling(true)
    
    try {
      const demoStudents = [
        { first: "Kofi", last: "Mensah", grade: "SHS 2" },
        { first: "Abena", last: "Adu", grade: "JHS 3" },
        { first: "Kwame", last: "Boateng", grade: "SHS 1" },
        { first: "Akosua", last: "Dapaah", grade: "Primary 6" }
      ]
      const student = demoStudents[Math.floor(Math.random() * demoStudents.length)]
      
      await addDoc(collection(db, "students"), {
        firstName: student.first,
        lastName: student.last,
        gradeLevel: student.grade,
        studentId: `STU-${Math.floor(Math.random() * 9000) + 1000}`,
        status: "active",
        institutionId: institutionId,
        createdAt: new Date().toISOString()
      })

      toast({
        title: "Student Enrolled",
        description: `${student.first} ${student.last} has been added to the directory.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Enrollment Failed",
        description: error.message
      })
    } finally {
      setEnrolling(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, "students", id))
      toast({
        title: "Record Deleted",
        description: `${name} has been removed from the directory.`,
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Student Directory</h1>
          <p className="text-muted-foreground">Manage student records and academic enrollment for 2026.</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={handleEnroll} disabled={enrolling}>
          {enrolling ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Enroll Student
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
          {students.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center text-center p-20 space-y-4">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                <GraduationCap className="size-8 text-muted-foreground/30" />
              </div>
              <div className="max-w-xs">
                <p className="font-bold text-primary">No Registered Students</p>
                <p className="text-xs text-muted-foreground">No students have been enrolled in the current term node.</p>
                <Button variant="link" className="text-accent" onClick={handleEnroll}>Enroll first student</Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[120px]">ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((stu: any) => (
                  <TableRow key={stu.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs font-bold text-muted-foreground">{stu.studentId}</TableCell>
                    <TableCell className="font-bold text-primary">{stu.lastName}, {stu.firstName}</TableCell>
                    <TableCell>{stu.gradeLevel}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold text-green-600 bg-green-50 border-green-200">
                        {stu.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(stu.id, `${stu.firstName} ${stu.lastName}`)}
                        className="text-muted-foreground hover:text-destructive"
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
