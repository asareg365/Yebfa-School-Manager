
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Printer, Save, Loader2, CheckCircle2, User, Search, BookOpen, GraduationCap, Pencil, X, Trophy } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, getDocs, doc, setDoc, updateDoc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function ExaminationCenterPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [classScores, setClassScores] = useState<Record<string, number>>({})
  const [examScores, setExamScores] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId || !selectedGrade) return null;
    return query(collection(db, "students"), where("tenantId", "==", institutionId), where("gradeLevel", "==", selectedGrade));
  }, [db, institutionId, selectedGrade]);

  const subjectsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "subjects"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const { data: students, loading: studentsLoading } = useCollection(studentsQuery)
  const { data: subjects } = useCollection(subjectsQuery)

  const handleSaveAll = async () => {
    if (!db || !institutionId || !selectedSubject || !selectedGrade) return
    setIsSaving(true);
    try {
      const promises = students.map((stu) => {
        const recordId = `${stu.id}_${selectedSubject}_2026_Term2`;
        const cScore = classScores[stu.id] || 0;
        const eScore = examScores[stu.id] || 0;
        return setDoc(doc(db, "exam_records", recordId), {
          studentId: stu.id,
          tenantId: institutionId,
          studentName: `${stu.firstName} ${stu.lastName}`,
          subjectId: selectedSubject,
          gradeLevel: selectedGrade,
          classScore: cScore,
          examScore: eScore,
          totalScore: cScore + eScore,
          term: "Term 2",
          academicYear: "2026",
          institutionId,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });
      await Promise.all(promises);
      toast({ title: "Scores Recorded", description: "Batch synchronized successfully." });
    } catch (error: any) { toast({ variant: "destructive", title: "Sync Failed", description: error.message }); } finally { setIsSaving(false); }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-headline font-bold text-primary">Examination Center</h1><p className="text-muted-foreground">Capture results and track rankings.</p></div>
        <Button className="gap-2 bg-primary" onClick={handleSaveAll} disabled={isSaving || !selectedSubject}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Batch
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-md">
          <CardHeader><CardTitle className="text-sm">Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Grade</Label><Select onValueChange={setSelectedGrade} value={selectedGrade}><SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger><SelectContent><SelectItem value="Primary 1">Primary 1</SelectItem><SelectItem value="Primary 2">Primary 2</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Subject</Label><Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedGrade}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            {!selectedGrade ? (
              <div className="p-20 text-center opacity-20"><ClipboardList className="size-12 mx-auto mb-2" /><p>Select a grade module.</p></div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30"><TableRow><TableHead>Student</TableHead><TableHead className="w-24">Class (30)</TableHead><TableHead className="w-24">Exam (70)</TableHead><TableHead className="w-20">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {students.map((stu: any) => (
                    <TableRow key={stu.id}>
                      <TableCell className="font-bold text-primary">{stu.firstName} {stu.lastName}</TableCell>
                      <TableCell><Input type="number" value={classScores[stu.id] || ""} onChange={e => setClassScores({...classScores, [stu.id]: parseFloat(e.target.value)})} /></TableCell>
                      <TableCell><Input type="number" value={examScores[stu.id] || ""} onChange={e => setExamScores({...examScores, [stu.id]: parseFloat(e.target.value)})} /></TableCell>
                      <TableCell className="font-bold text-accent">{(classScores[stu.id] || 0) + (examScores[stu.id] || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
