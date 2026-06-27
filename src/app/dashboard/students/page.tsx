
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, Filter, GraduationCap, Trash2, Pencil, Loader2, Upload, FileJson } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, orderBy, deleteDoc, doc, where, serverTimestamp } from "firebase/firestore"
import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export default function StudentsPage() {
  const db = useFirestore()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  
  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    gradeLevel: "SHS 1",
    studentId: ""
  })
  const [bulkData, setBulkData] = useState("")

  const institutionId = typeof window !== 'undefined' ? localStorage.getItem('selected_institution_id') || "demo-institution-2026" : "demo-institution-2026"
  
  const studentsQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collection(db, "students"), 
      where("institutionId", "==", institutionId),
      orderBy("createdAt", "desc")
    );
  }, [db, institutionId]);

  const { data: students, loading: dataLoading } = useCollection(studentsQuery)

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || loading) return
    setLoading(true)
    
    const data = {
      ...studentForm,
      status: "active",
      institutionId: institutionId,
      createdAt: serverTimestamp()
    }

    try {
      await addDoc(collection(db, "students"), data)
      toast({
        title: "Student Enrolled",
        description: `${studentForm.firstName} has been added successfully.`,
      })
      setIsEnrollOpen(false)
      setStudentForm({ firstName: "", lastName: "", gradeLevel: "SHS 1", studentId: "" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: error.message })
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
        const [first, last, grade, id] = line.split(',').map(s => s?.trim())
        if (first && last) {
          await addDoc(collection(db, "students"), {
            firstName: first,
            lastName: last,
            gradeLevel: grade || "Unassigned",
            studentId: id || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
            status: "active",
            institutionId,
            createdAt: serverTimestamp()
          })
          successCount++
        }
      }
      toast({
        title: "Bulk Import Complete",
        description: `Successfully enrolled ${successCount} students.`,
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
      await deleteDoc(doc(db!, "students", id))
      toast({ title: "Record Deleted", description: `${name} has been removed.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Student Directory</h1>
          <p className="text-muted-foreground">Manage individual and bulk enrollment records.</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 px-6">
                <Upload className="size-4" /> Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-bold text-primary">Bulk Student Import</DialogTitle>
                <DialogDescription>Paste comma-separated student data below (Format: FirstName, LastName, Grade, ID)</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Textarea 
                  placeholder="John, Doe, SHS 1, 10021&#10;Jane, Smith, JHS 3, 10022" 
                  className="min-h-[200px] font-mono text-sm"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground italic">One student per line. Student ID is optional and will be generated if missing.</p>
              </div>
              <DialogFooter>
                <Button onClick={handleBulkUpload} disabled={loading} className="w-full h-11">
                  {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <FileJson className="size-4 mr-2" />}
                  Import Records
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 shadow-lg shadow-primary/10">
                <UserPlus className="size-4" /> Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <form onSubmit={handleEnroll}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline font-bold text-primary">Enroll New Student</DialogTitle>
                  <DialogDescription>Enter academic credentials for the 2026 session.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first">First Name</Label>
                      <Input id="first" required value={studentForm.firstName} onChange={(e) => setStudentForm({...studentForm, firstName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last">Last Name</Label>
                      <Input id="last" required value={studentForm.lastName} onChange={(e) => setStudentForm({...studentForm, lastName: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade Level</Label>
                    <Select onValueChange={(v) => setStudentForm({...studentForm, gradeLevel: v})} defaultValue={studentForm.gradeLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Primary 1-6">Primary Node</SelectItem>
                        <SelectItem value="JHS 1-3">Junior High Node</SelectItem>
                        <SelectItem value="SHS 1">SHS 1</SelectItem>
                        <SelectItem value="SHS 2">SHS 2</SelectItem>
                        <SelectItem value="SHS 3">SHS 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sid">Student ID (Optional)</Label>
                    <Input id="sid" placeholder="STU-XXXX" value={studentForm.studentId} onChange={(e) => setStudentForm({...studentForm, studentId: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading} className="w-full h-11">
                    {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <GraduationCap className="size-4 mr-2" />}
                    Complete Enrollment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden rounded-2xl">
        <CardHeader className="border-b pb-6 bg-white">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search records..." className="pl-9 h-11 bg-slate-50 border-none" />
            </div>
            <Button variant="outline" className="gap-2 h-11">
              <Filter className="size-4" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 && !dataLoading ? (
            <div className="flex flex-col items-center justify-center text-center p-24 space-y-4">
              <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center">
                <GraduationCap className="size-10 text-primary opacity-20" />
              </div>
              <p className="font-bold text-primary text-lg">Empty Directory</p>
              <p className="text-sm text-muted-foreground max-w-xs">Use manual enrollment or bulk upload to populate the student node.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold py-4">ID</TableHead>
                  <TableHead className="font-bold py-4">Full Name</TableHead>
                  <TableHead className="font-bold py-4">Grade</TableHead>
                  <TableHead className="font-bold py-4">Status</TableHead>
                  <TableHead className="text-right font-bold py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((stu: any) => (
                  <TableRow key={stu.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-mono text-[11px] font-bold text-muted-foreground">{stu.studentId || 'NO ID'}</TableCell>
                    <TableCell className="font-bold text-primary">{stu.lastName}, {stu.firstName}</TableCell>
                    <TableCell className="text-sm font-medium">{stu.gradeLevel}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold text-green-600 bg-green-50 border-green-200">
                        {stu.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(stu.id, `${stu.firstName} ${stu.lastName}`)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></Button>
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
