"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Activity, Clock, CheckCircle, Save, Loader2, Calendar as CalendarIcon, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, setDoc, doc, getDocs } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"
// ... imports

export default function AttendancePage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [presentStudents, setPresentStudents] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const handleSaveAttendance = () => {
    if (!db || !institutionId || !selectedGrade || !selectedDate) return
    setIsSaving(true)
    
    const promises = students.map(student => {
      const status = presentStudents[student.id] ? "present" : "absent"
      const recordId = `${student.id}_${selectedDate}`
      const data = {
        studentId: student.id,
        tenantId: institutionId,
        studentName: `${student.firstName} ${student.lastName}`,
        gradeLevel: selectedGrade,
        date: selectedDate,
        status: status,
        institutionId: institutionId,
        updatedAt: serverTimestamp()
      }
      
      return setDoc(doc(db, "attendance", recordId), data, { merge: true })
    })

    Promise.all(promises)
      .then(() => toast({ title: "Attendance Recorded", description: "Daily roll call synchronized." }))
      .finally(() => setIsSaving(false))
  }
  // ... rest of component
  return null;
}
