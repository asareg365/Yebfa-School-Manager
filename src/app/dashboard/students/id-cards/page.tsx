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
      {/* Screen view content - Hidden during print via global CSS in layout */}
      <div className="no-print space-y-6">
        <div className="flex items-center justify-between">
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
            <Button className="gap-2 bg-primary shadow-lg shadow-primary/10" onClick={handlePrint}>
              <Printer className="size-4" /> Print Registry
            </Button>
          </div>
        </div>

        <Tabs defaultValue="front">
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
      </div>

      {/* Dedicated Print View - Visible only when printing */}
      <div className="print-only">
        <div className="print-grid">
          {filteredStudents.map((stu: any) => (
            <div key={stu.id + '_print_pair'} className="print-card-wrapper">
              {/* Card Front */}
              <div className="id-card-print">
                <div className="card-header-print">
                  {institution?.logoUrl && <img src={institution.logoUrl} className="print-logo" alt="Logo" />}
                  <span className="print-school-name">{institution?.name}</span>
                </div>
                <div className="card-body-print">
                  <div className="print-photo-container">
                    {stu.photoUrl ? <img src={stu.photoUrl} className="print-photo" alt="Student" /> : <div className="print-photo-placeholder" />}
                  </div>
                  <div className="print-info">
                    <h3 className="print-student-name">{stu.firstName} {stu.lastName}</h3>
                    <p className="print-student-grade">{stu.gradeLevel}</p>
                    <div className="print-id-section">
                      <span className="print-id-label">SYSTEM ID</span>
                      <span className="print-id-value">{stu.studentId}</span>
                    </div>
                  </div>
                </div>
                <div className="card-footer-print">
                  <span>OFFICIAL REGISTRY</span>
                  <span>SESSION 2026</span>
                </div>
              </div>
              
              {/* Card Back */}
              <div className="id-card-print back">
                <h4 className="print-back-title">INSTITUTIONAL AUTHORIZATION</h4>
                <div className="print-contact-info">
                  <p>{institution?.address || "Ahafo Region, Ghana"}</p>
                  <p>{institution?.phone}</p>
                </div>
                <p className="print-disclaimer">
                  This card is the property of {institution?.name}. Return if found. Unauthorized use is prohibited.
                </p>
                <div className="print-version">Yebfa School Manager v2026</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media screen {
          .print-only { display: none !important; }
        }

        @media print {
          .no-print, header, aside, [data-sidebar="trigger"] {
            display: none !important;
          }
          
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-only {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }

          .print-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 40px !important;
          }

          .print-card-wrapper {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .id-card-print {
            width: 3.375in !important;
            height: 2.125in !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            padding: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            background: white !important;
            color: black !important;
          }

          .card-header-print {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding-bottom: 6px !important;
            margin-bottom: 8px !important;
          }

          .print-logo {
            height: 24px !important;
            width: 24px !important;
            object-fit: contain !important;
          }

          .print-school-name {
            font-size: 10px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
          }

          .card-body-print {
            display: flex !important;
            gap: 12px !important;
            flex: 1 !important;
          }

          .print-photo-container {
            width: 80px !important;
            height: 80px !important;
            border: 1px solid #f1f5f9 !important;
            border-radius: 4px !important;
            overflow: hidden !important;
            background: #f8fafc !important;
          }

          .print-photo {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }

          .print-info {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
          }

          .print-student-name {
            font-size: 12px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            line-height: 1.2 !important;
          }

          .print-student-grade {
            font-size: 9px !important;
            color: #64748b !important;
            margin-top: 2px !important;
          }

          .print-id-section {
            margin-top: 8px !important;
          }

          .print-id-label {
            display: block !important;
            font-size: 7px !important;
            color: #94a3b8 !important;
            font-weight: bold !important;
          }

          .print-id-value {
            font-size: 10px !important;
            font-family: monospace !important;
            font-weight: bold !important;
          }

          .card-footer-print {
            margin-top: auto !important;
            padding-top: 4px !important;
            border-top: 1px solid #f1f5f9 !important;
            display: flex !important;
            justify-content: space-between !important;
            font-size: 6px !important;
            font-weight: bold !important;
            color: #94a3b8 !important;
          }

          .id-card-print.back {
            text-align: center !important;
            justify-content: center !important;
            background-color: #f8fafc !important;
          }

          .print-back-title {
            font-size: 9px !important;
            font-weight: bold !important;
            letter-spacing: 0.05em !important;
            margin-bottom: 8px !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding-bottom: 4px !important;
          }

          .print-contact-info {
            font-size: 8px !important;
            font-weight: 500 !important;
            margin-bottom: 12px !important;
          }

          .print-disclaimer {
            font-size: 7px !important;
            color: #64748b !important;
            padding: 0 12px !important;
            line-height: 1.4 !important;
          }

          .print-version {
            margin-top: auto !important;
            font-size: 5px !important;
            color: #cbd5e1 !important;
            font-weight: bold !important;
          }
        }
      `}</style>
    </div>
  )
}