
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, User, Search } from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"

export default function StudentIDCardsPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "students"), where("institutionId", "==", institutionId));
  }, [db, institutionId]);

  const { data: students } = useCollection(studentsQuery)

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [students, searchQuery])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/students"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">ID Card Generator</h1>
            <p className="text-muted-foreground">Preview and print student identification cards.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search students..." 
              className="pl-9" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button className="gap-2" onClick={handlePrint}>
            <Printer className="size-4" /> Print All
          </Button>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
        {filteredStudents.map((stu: any) => (
          <div key={stu.id} className="w-[3.375in] h-[2.125in] bg-white rounded-xl shadow-lg border-2 border-primary/20 p-4 flex flex-col relative overflow-hidden break-inside-avoid mb-4">
            {/* Design elements */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-accent/10 rounded-full -ml-8 -mb-8" />
            
            <div className="flex items-start gap-4 flex-1">
              <div className="size-20 rounded-lg border-2 border-primary bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {stu.photoUrl ? (
                  <img src={stu.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="size-10 text-primary/20" />
                )}
              </div>
              <div className="flex flex-col justify-between h-20 py-1">
                <div>
                  <h3 className="text-sm font-bold text-primary leading-tight uppercase">{stu.firstName} {stu.lastName}</h3>
                  <p className="text-[10px] text-muted-foreground font-bold">{stu.gradeLevel}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Student ID</p>
                  <p className="text-xs font-mono font-bold text-accent">{stu.studentId}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-auto flex items-center justify-between border-t pt-2">
              <div className="flex items-center gap-1.5">
                <div className="size-5 bg-primary rounded flex items-center justify-center text-[8px] text-white font-bold">Y</div>
                <span className="text-[8px] font-bold text-primary uppercase">Yebfa School Manager</span>
              </div>
              <div className="text-[7px] text-muted-foreground text-right italic font-medium">
                Issued 2026 Academic Cycle
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          main { padding: 0 !important; max-width: none !important; margin: 0 !important; }
          .grid { gap: 1in !important; padding: 0.5in !important; }
        }
      `}</style>
    </div>
  )
}
