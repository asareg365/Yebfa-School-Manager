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
      <div className="no-print space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/students"><ArrowLeft className="size-4" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-headline font-bold text-primary">ID Card Generator</h1>
              <p className="text-muted-foreground">Authorize and print student identification badges.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search registry..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button className="gap-2 bg-primary shadow-lg shadow-primary/10 whitespace-nowrap" onClick={handlePrint}>
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
                        <h3 className="text-[12px] font-bold text-primary leading-tight uppercase truncate w-32">{stu.firstName} {stu.lastName}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold">{stu.gradeLevel}</p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">Registry ID</p>
                        <p className="text-[11px] font-mono font-bold text-accent">{stu.studentId}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t pt-2">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {institution?.logoUrl ? (
                        <img src={institution.logoUrl} className="size-6 object-contain" alt="Logo" />
                      ) : (
                        <div className="size-6 bg-primary rounded flex items-center justify-center text-[8px] text-white font-bold shrink-0">Y</div>
                      )}
                      <span className="text-[9px] font-bold text-primary uppercase truncate max-w-[120px]">{institution?.name || "System Hub"}</span>
                    </div>
                    <div className="text-[7px] text-muted-foreground italic shrink-0">Live System 2026</div>
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
                    <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b pb-1">Institutional Authorization</h4>
                    <div className="space-y-1">
                      <p className="flex items-center justify-center gap-1.5 text-[9px] font-medium text-muted-foreground">
                        <MapPin className="size-2.5 text-accent" /> {institution?.address || "Ahafo Region, Ghana"}
                      </p>
                      <p className="flex items-center justify-center gap-1.5 text-[9px] font-medium text-muted-foreground">
                        <Phone className="size-2.5 text-accent" /> {institution?.phone || "Registry Active"}
                      </p>
                    </div>
                    <p className="text-[7px] text-muted-foreground px-4 leading-relaxed">
                      This document is the property of {institution?.name}. Return if found.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dedicated Print Container */}
      <div className="print-actual-view">
        <div className="print-grid">
          {filteredStudents.map((stu: any) => (
            <div key={stu.id + '_print'} className="print-item-wrapper">
              {/* Card Front */}
              <div className="print-id-card">
                <div className="print-card-header">
                  {institution?.logoUrl && <img src={institution.logoUrl} className="card-logo" />}
                  <span className="card-school-name">{institution?.name}</span>
                </div>
                <div className="print-card-body">
                  <div className="card-photo-box">
                    {stu.photoUrl ? <img src={stu.photoUrl} className="card-photo" /> : <div className="card-photo-placeholder" />}
                  </div>
                  <div className="card-details">
                    <h3 className="card-student-name">{stu.firstName} {stu.lastName}</h3>
                    <p className="card-student-grade">{stu.gradeLevel}</p>
                    <div className="card-id-block">
                      <span className="id-label">REGISTRY ID</span>
                      <span className="id-value">{stu.studentId}</span>
                    </div>
                  </div>
                </div>
                <div className="print-card-footer">
                  <span>OFFICIAL DOCUMENT</span>
                  <span>SESSION 2026</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        /* Screen visibility */
        .print-actual-view {
          display: none;
        }

        @media print {
          /* Hide EVERYTHING by default */
          body * {
            visibility: hidden;
          }
          
          /* Show only our dedicated print view */
          .print-actual-view, .print-actual-view * {
            visibility: visible;
          }

          .print-actual-view {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white;
          }

          .print-grid {
            display: grid;
            grid-template-columns: repeat(2, 3.375in);
            gap: 0.5in;
            justify-content: center;
            padding: 0.5in;
          }

          .print-item-wrapper {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 0.3in;
          }

          .print-id-card {
            width: 3.375in;
            height: 2.125in;
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            background: white;
            color: black;
            font-family: sans-serif;
            overflow: hidden;
            box-sizing: border-box;
          }

          .print-card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }

          .card-logo {
            height: 25px;
            width: 25px;
            object-fit: contain;
          }

          .card-school-name {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
          }

          .print-card-body {
            display: flex;
            gap: 15px;
            flex: 1;
          }

          .card-photo-box {
            width: 85px;
            height: 85px;
            border: 1px solid #eee;
            border-radius: 4px;
            overflow: hidden;
            background: #f9f9f9;
          }

          .card-photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .card-photo-placeholder {
            width: 100%;
            height: 100%;
            background: #eee;
          }

          .card-details {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            flex: 1;
          }

          .card-student-name {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            line-height: 1.2;
          }

          .card-student-grade {
            font-size: 10px;
            color: #555;
          }

          .card-id-block {
            margin-top: 5px;
          }

          .id-label {
            display: block;
            font-size: 7px;
            font-weight: bold;
            color: #888;
          }

          .id-value {
            font-size: 11px;
            font-family: monospace;
            font-weight: bold;
          }

          .print-card-footer {
            margin-top: auto;
            padding-top: 5px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            font-size: 7px;
            font-weight: bold;
            color: #999;
          }
        }
      `}</style>
    </div>
  )
}
