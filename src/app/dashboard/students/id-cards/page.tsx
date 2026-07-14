"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, User, Search, School as SchoolIcon, Phone, MapPin } from "lucide-react"
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
      {/* Screen view content */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/students"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">ID Card Generator</h1>
            <p className="text-muted-foreground">Preview and authorize student identification.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search system registry..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <Button className="gap-2 bg-primary shadow-lg shadow-primary/20" onClick={handlePrint}>
            <Printer className="size-4" /> Print Cards
          </Button>
        </div>
      </div>

      <Tabs defaultValue="front" className="print:hidden">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="front" className="rounded-lg px-8">Card Fronts</TabsTrigger>
          <TabsTrigger value="back" className="rounded-lg px-8">Card Backs</TabsTrigger>
        </TabsList>

        <TabsContent value="front">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((stu: any) => (
              <div key={stu.id} className="w-[3.375in] h-[2.125in] bg-white rounded-xl shadow-lg border-2 border-primary/10 p-4 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12" />
                <div className="flex items-start gap-4 flex-1">
                  <div className="size-24 rounded-lg border-2 border-primary/20 bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {stu.photoUrl ? <img src={stu.photoUrl} className="w-full h-full object-cover" alt="Student" /> : <User className="size-12 text-primary/10" />}
                  </div>
                  <div className="flex flex-col justify-between h-24 py-1">
                    <div>
                      <h3 className="text-sm font-bold text-primary leading-tight uppercase">{stu.firstName} {stu.lastName}</h3>
                      <p className="text-[10px] text-muted-foreground font-bold">{stu.gradeLevel}</p>
                    </div>
                    <div>
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Registry ID</p>
                      <p className="text-xs font-mono font-bold text-accent">{stu.studentId}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t pt-2">
                  <div className="flex items-center gap-1.5">
                    {institution?.logoUrl ? (
                      <img src={institution.logoUrl} className="size-6 object-contain" alt="Logo" />
                    ) : (
                      <div className="size-6 bg-primary rounded flex items-center justify-center text-[8px] text-white font-bold">Y</div>
                    )}
                    <span className="text-[9px] font-bold text-primary uppercase">{institution?.name || "System Hub"}</span>
                  </div>
                  <div className="text-[7px] text-muted-foreground italic">Authenticated 2026</div>
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
                  {institution?.logoUrl ? <img src={institution.logoUrl} className="size-12" alt="Logo Watermark" /> : <SchoolIcon className="size-12" />}
                </div>
                <div className="space-y-3 z-10">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b pb-1">Institutional Registry</h4>
                  <div className="space-y-1">
                    <p className="flex items-center justify-center gap-1.5 text-[9px] font-medium text-muted-foreground">
                      <MapPin className="size-2.5 text-accent" /> {institution?.address || "System Location, Ghana"}
                    </p>
                    <p className="flex items-center justify-center gap-1.5 text-[9px] font-medium text-muted-foreground">
                      <Phone className="size-2.5 text-accent" /> {institution?.phone || "Hub Authorization Required"}
                    </p>
                  </div>
                  <p className="text-[7px] text-muted-foreground px-4 leading-relaxed">
                    This document remains the property of {institution?.name}. If found, please return to the system hub.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Actual Print View (Hidden on screen, shown only on print) */}
      <div className="hidden print:block print-registry-container">
        <div className="flex flex-wrap justify-center gap-4">
          {filteredStudents.map((stu: any) => (
            <div key={stu.id + '_print_pair'} className="flex flex-col gap-4 mb-8 break-inside-avoid page-break-after-always">
              {/* Card Front */}
              <div className="print-id-card border border-black/10">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-3">
                  {institution?.logoUrl && <img src={institution.logoUrl} className="h-8 object-contain" alt="Logo" />}
                  <span className="text-[10px] font-bold uppercase truncate">{institution?.name}</span>
                </div>
                <div className="flex gap-4">
                  <div className="size-24 rounded border border-gray-100 overflow-hidden flex items-center justify-center bg-gray-50">
                    {stu.photoUrl ? <img src={stu.photoUrl} className="w-full h-full object-cover" alt="Student" /> : <User className="size-10 opacity-10" />}
                  </div>
                  <div className="flex flex-col justify-between py-1 flex-1">
                    <div>
                      <h3 className="text-sm font-bold uppercase text-primary leading-tight">{stu.firstName} {stu.lastName}</h3>
                      <p className="text-[9px] font-bold text-gray-500 mt-1">{stu.gradeLevel}</p>
                    </div>
                    <div>
                      <p className="text-[7px] uppercase text-gray-400 font-bold">System ID</p>
                      <p className="text-[11px] font-mono font-bold">{stu.studentId}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-[6px] uppercase font-bold text-gray-400">Authenticated System Registry</span>
                  <span className="text-[6px] italic text-gray-400">Session 2026</span>
                </div>
              </div>
              
              {/* Card Back */}
              <div className="print-id-card border border-black/10 flex flex-col items-center justify-center text-center p-6 bg-gray-50/30">
                <h4 className="text-[9px] font-bold uppercase tracking-widest border-b border-gray-200 pb-1 mb-3 w-full">Institutional Authorization</h4>
                <div className="space-y-1">
                  <p className="text-[8px] font-medium">{institution?.address || "Ahafo Region, Ghana"}</p>
                  <p className="text-[8px] font-medium">{institution?.phone}</p>
                </div>
                <p className="text-[7px] text-gray-500 mt-4 leading-relaxed">
                  This card is the property of {institution?.name}. Return if found. Unauthorized use is prohibited by system protocols.
                </p>
                <div className="mt-auto pt-2 text-[5px] text-gray-300 font-bold uppercase">Yebfa School Manager v2026</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-id-card { 
            width: 3.375in !important; 
            height: 2.125in !important; 
            padding: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            background: white !important;
            box-sizing: border-box !important;
            border-radius: 8px !important;
            position: relative !important;
          }
        }
      `}} />
    </div>
  )
}