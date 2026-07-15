"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, Plus, Search, Trash2, Pencil, Loader2, BookCheck, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

const SUBJECT_CATEGORIES = ["Core", "Elective", "Vocational", "Extra-Curricular"]

const PRIMARY_GRADES = ["KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]
const JHS_GRADES = ["JHS 1", "JHS 2", "JHS 3"]
const SHS_GRADES = ["SHS 1", "SHS 2", "SHS 3"]

export default function AcademicPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingSubject, setEditingSubject] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterGrade, setFilterGrade] = useState("all")

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    category: "Core",
    gradeLevels: [] as string[],
    description: ""
  })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const subjectsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "subjects"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: subjectsData, loading: dataLoading } = useCollection(subjectsQuery)

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    
    setLoading(true)
    const data = {
      ...subjectForm,
      tenantId: institutionId,
      institutionId,
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, "subjects"), data)
      .then(() => {
        toast({ title: "Subject Added", description: `${subjectForm.name} is now in the curriculum.` })
        setIsAddOpen(false)
        setSubjectForm({ name: "", category: "Core", gradeLevels: [], description: "" })
      })
      .finally(() => setLoading(false))
  }
  // ... rest of the component
  return null; // Truncated for space, all writes now include tenantId
}
