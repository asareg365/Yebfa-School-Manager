"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, User, Search, RefreshCw, School as SchoolIcon, Phone, MapPin } from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function StudentIDCardsPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db!, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

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
            <p className="text-muted-foreground">Preview and print student identification.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search students..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <Button className="gap-2" onClick={handlePrint}>
            <Printer className="size-4" /> Print Registry
          </Button>
        </div>
      </div>

      <Tabs defaultValue="front" className="no-print">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="front" className="rounded-lg">Card Fronts</TabsTrigger>
          <TabsTrigger value="back" className="rounded-lg">Card Backs</TabsTrigger>
        </TabsList>

        <TabsContent value="front">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
            {filteredStudents.map((stu: any) => (
              <div key={stu.id} className="w-[3.375in] h-[2.125in] bg-white rounded-xl shadow-lg border-2 border-primary/10 p-4 flex flex-col relative overflow-hidden break-inside-avoid">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12" />
                <div className="flex items-start gap-4 flex-1">
                  <div className="size-24 rounded-lg border-2 border-primary/20 bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {stu.photoUrl ? <img src={stu.photoUrl} className="w-full h-full object-cover" /> : <User className="size-12 text-primary/10" />}
                  </div>
                  <div className="flex flex-col justify-between h-24 py-1">
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
                    {institution?.logoUrl ? (
                      <img src={institution.logoUrl} className="size-6 object-contain" />
                    ) : (
                      <div className="size-6 bg-primary rounded flex items-center justify-center text-[8px] text-white font-bold">Y</div>
                    )}
                    <span className="text-[9px] font-bold text-primary uppercase">{institution?.name || "Yebfa School"}</span>
                  </div>
                  <div className="text-[7px] text-muted-foreground italic">Issued 2026</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="back">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((stu: any) => (
              <div key={stu.id + '_back'} className="w-[3.375in] h-[2.125in] bg-slate-50 rounded-xl shadow-lg border-2 border-primary/5 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] scale-[4]">
                  {institution?.logoUrl ? <img src={institution.logoUrl} className="size-12" /> : <SchoolIcon className="size-12" />}
                </div>
                <div className="space-y-3 z-10">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b pb-1">Institutional Hub</h4>
                  <div className="space-y-1">
                    <p className="flex items-center justify-center gap-1.5 text-[9px] font-medium text-muted-foreground">
                      <MapPin className="size-2.5 text-accent" /> {institution?.address || "Ahafo Region, Ghana"}
                    </p>
                    <p className="flex items-center justify-center gap-1.5 text-[9px] font-medium text-muted-foreground">
                      <Phone className="size-2.5 text-accent" /> {institution?.phone || "Contact Principal Hub"}
                    </p>
                  </div>
                  <p className="text-[7px] text-muted-foreground px-4 leading-relaxed">
                    This card remains the property of {institution?.name}. If found, please return to the address above.
                  </p>
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[6px] font-bold text-primary/30 uppercase">
                  Authenticated by Yebfa School Manager
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Actual Print View (Hidden in UI) */}
      <div className="hidden print:block space-y-[0.5in]">
        {filteredStudents.map((stu: any) => (
          <div key={stu.id + '_print'} className="flex gap-[0.5in] justify-center break-inside-avoid h-[2.125in]">
            {/* Front */}
            <div className="w-[3.375in] h-[2.125in] bg-white rounded-xl border-2 border-black/10 p-4 flex flex-col relative overflow-hidden">
               <div className="flex items-start gap-4 flex-1">
                  <div className="size-24 rounded-lg border-2 border-black/10 bg-slate-50 overflow-hidden flex items-center justify-center">
                    {stu.photoUrl ? <img src={stu.photoUrl} className="w-full h-full object-cover" /> : <User className="size-12 opacity-10" />}
                  </div>
                  <div className="flex flex-col justify-between h-24 py-1">
                    <div>
                      <h3 className="text-sm font-bold text-black leading-tight uppercase">{stu.firstName} {stu.lastName}</h3>
                      <p className="text-[10px] text-slate-600 font-bold">{stu.gradeLevel}</p>
                    </div>
                    <div>
                      <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Student ID</p>
                      <p className="text-xs font-mono font-bold text-black">{stu.studentId}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t pt-2 border-black/10">
                  <div className="flex items-center gap-1.5">
                    {institution?.logoUrl && <img src={institution.logoUrl} className="size-6 object-contain" />}
                    <span className="text-[9px] font-bold text-black uppercase">{institution?.name}</span>
                  </div>
                </div>
            </div>
            {/* Back */}
            <div className="w-[3.375in] h-[2.125in] bg-white rounded-xl border-2 border-black/10 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-black uppercase tracking-widest border-b border-black/10 pb-1">Institutional Hub</h4>
                  <div className="space-y-1">
                    <p className="text-[9px] font-medium text-slate-700">{institution?.address}</p>
                    <p className="text-[9px] font-medium text-slate-700">{institution?.phone}</p>
                  </div>
                  <p className="text-[7px] text-slate-500 px-4 leading-relaxed">
                    Card property of {institution?.name}. Return if found.
                  </p>
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
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  )
}
