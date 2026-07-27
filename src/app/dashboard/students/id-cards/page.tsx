"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, User, Search, School as SchoolIcon, Phone, MapPin, Badge as BadgeIcon } from "lucide-react"
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
    return query(collection(db, "students"), where("tenantId", "==", institutionId));
  }, [db, institutionId]);

  const { data: students } = useCollection(studentsQuery)

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11">
              <Link href="/dashboard/students"><ArrowLeft className="size-5" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">ID Card Generator</h1>
              <p className="text-muted-foreground font-medium">Authorizing physical identification for the 2026 registry.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search registry..." className="pl-10 h-11 rounded-xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button className="gap-2 bg-primary h-11 px-6 rounded-xl shadow-lg shadow-primary/10 whitespace-nowrap font-bold" onClick={handlePrint}>
              <Printer className="size-4" /> Print Registry
            </Button>
          </div>
        </div>

        <Tabs defaultValue="front" className="w-full">
          <TabsList className="bg-muted/50 p-1 rounded-2xl mb-8 w-fit h-auto">
            <TabsTrigger value="front" className="rounded-xl px-10 py-2.5 text-xs font-bold uppercase tracking-widest">Card Fronts</TabsTrigger>
            <TabsTrigger value="back" className="rounded-xl px-10 py-2.5 text-xs font-bold uppercase tracking-widest">Card Backs</TabsTrigger>
          </TabsList>

          <TabsContent value="front" className="mt-0">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStudents.map((stu: any) => (
                <div key={stu.id} className="w-[3.375in] h-[2.125in] bg-white rounded-2xl shadow-xl border-2 border-primary/5 p-5 flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                  <div className="flex items-start gap-5 flex-1 relative z-10">
                    <div className="size-28 rounded-2xl border-2 border-white bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                      {stu.photoUrl ? <img src={stu.photoUrl} className="w-full h-full object-cover" alt="Student" /> : <User className="size-14 text-primary/10" />}
                    </div>
                    <div className="flex flex-col justify-between py-1 h-28 flex-1 min-w-0">
                      <div>
                        <h3 className="text-[13px] font-bold text-primary leading-tight uppercase truncate">{stu.firstName} {stu.lastName}</h3>
                        <p className="text-[10px] text-accent font-bold uppercase tracking-tighter mt-0.5">{stu.gradeLevel || "UNASSIGNED"}</p>
                      </div>
                      <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
                        <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-black">Student ID Number</p>
                        <p className="text-[12px] font-mono font-bold text-primary tracking-tight truncate">{stu.admissionNumber || "PENDING"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t pt-3 relative z-10">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {institution?.logoUrl ? (
                        <img src={institution.logoUrl} className="size-7 object-contain" alt="Logo" />
                      ) : (
                        <div className="size-7 bg-primary rounded-lg flex items-center justify-center text-[10px] text-white font-bold shrink-0 shadow-sm">Y</div>
                      )}
                      <span className="text-[10px] font-bold text-primary uppercase truncate max-w-[140px] tracking-tighter">{institution?.name || "System Hub"}</span>
                    </div>
                    <div className="text-[8px] text-muted-foreground font-bold uppercase opacity-40">2026 SESSION</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="back" className="mt-0">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStudents.map((stu: any) => (
                <div key={stu.id + '_back'} className="w-[3.375in] h-[2.125in] bg-slate-50 rounded-2xl shadow-xl border-2 border-primary/5 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] scale-[5]">
                    {institution?.logoUrl ? <img src={institution.logoUrl} className="size-12" alt="Logo Watermark" /> : <SchoolIcon className="size-12" />}
                  </div>
                  <div className="space-y-4 z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/10">
                      <ShieldCheck className="size-3" /> Security Authorization
                    </div>
                    <div className="space-y-1.5">
                      <p className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                        <MapPin className="size-3 text-accent" /> {institution?.location || "Ahafo Region, Ghana"}
                      </p>
                      <p className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                        <Phone className="size-3 text-accent" /> {institution?.phone || "Live System Support"}
                      </p>
                    </div>
                    <p className="text-[8px] text-muted-foreground px-6 leading-relaxed font-medium">
                      This digital identity token is the property of {institution?.name}. If found, please return to the school administration or contact the registry.
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
                      <span className="id-label">OFFICIAL REGISTRY ID</span>
                      <span className="id-value">{stu.admissionNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="print-card-footer">
                  <span>IDENTITY VERIFIED</span>
                  <span>SYSTEM 2026</span>
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
            border: 1px solid #1a1f2c;
            border-radius: 12px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            background: white;
            color: #1a1f2c;
            font-family: sans-serif;
            overflow: hidden;
            box-sizing: border-box;
          }

          .print-card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1.5px solid #f1f5f9;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }

          .card-logo {
            height: 30px;
            width: 30px;
            object-fit: contain;
          }

          .card-school-name {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: -0.02em;
          }

          .print-card-body {
            display: flex;
            gap: 15px;
            flex: 1;
          }

          .card-photo-box {
            width: 90px;
            height: 90px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            background: #f8fafc;
          }

          .card-photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .card-photo-placeholder {
            width: 100%;
            height: 100%;
            background: #f1f5f9;
          }

          .card-details {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            flex: 1;
            gap: 4px;
          }

          .card-student-name {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.1;
            margin-bottom: 2px;
          }

          .card-student-grade {
            font-size: 10px;
            color: #f59e0b;
            font-weight: 700;
            text-transform: uppercase;
          }

          .card-id-block {
            margin-top: auto;
            background: #f8fafc;
            padding: 5px 8px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
          }

          .id-label {
            display: block;
            font-size: 7px;
            font-weight: 900;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .id-value {
            font-size: 12px;
            font-family: monospace;
            font-weight: 800;
            color: #1a1f2c;
          }

          .print-card-footer {
            margin-top: auto;
            padding-top: 8px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            font-size: 7px;
            font-weight: 900;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
        }
      `}</style>
    </div>
  )
}
