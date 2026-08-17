
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, User, Search, School as SchoolIcon, Phone, MapPin, ShieldCheck, Camera, Upload, Loader2, Calendar } from "lucide-react"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

export default function StudentIDCardsPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [targetStudentId, setTargetStudentId] = useState<string | null>(null)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db!, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(collection(db, "students"), where("tenantId", "==", institutionId), where("status", "==", "active"));
  }, [db, institutionId]);

  const { data: students = [] } = useCollection(studentsQuery)

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (a.admissionNumber || "").localeCompare(b.admissionNumber || ""))
  }, [students, searchQuery])

  const handlePrint = () => {
    window.print()
  }

  const getValidityDates = (stuCreatedAt: any) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };

    // Priority 1: Institutional Global Settings (Managed in Security Settings)
    if (institution?.idCardIssuedDate && institution?.idCardExpiryDate) {
      const issued = new Date(institution.idCardIssuedDate);
      const expires = new Date(institution.idCardExpiryDate);
      return {
        issued: issued.toLocaleDateString('en-GB', options),
        expires: expires.toLocaleDateString('en-GB', options)
      }
    }

    // Priority 2: Automatic Cycle Fallback
    const issued = stuCreatedAt ? new Date(stuCreatedAt.toMillis()) : new Date();
    const expires = new Date(issued);
    expires.setFullYear(issued.getFullYear() + 3); // Standard 3-year academic cycle
    
    return {
      issued: issued.toLocaleDateString('en-GB', options),
      expires: expires.toLocaleDateString('en-GB', options)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !targetStudentId || !db) return

    if (file.size > 800000) {
      toast({ variant: "destructive", title: "File Too Large", description: "Portrait must be under 800KB." })
      return
    }

    setUpdatingId(targetStudentId)
    const reader = new FileReader()
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string
        await updateDoc(doc(db, "students", targetStudentId), {
          photoUrl: base64,
          updatedAt: serverTimestamp()
        })
        toast({ title: "Identity Synchronized", description: "Portrait updated in registry." })
      } catch (err) {
        toast({ variant: "destructive", title: "Sync Failed" })
      } finally {
        setUpdatingId(null)
        setTargetStudentId(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsDataURL(file)
  }

  const triggerUpload = (studentId: string) => {
    setTargetStudentId(studentId)
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        accept="image/*" 
        className="hidden" 
      />

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
              {filteredStudents.map((stu: any) => {
                const validity = getValidityDates(stu.createdAt);
                return (
                  <div key={stu.id} className="w-[3.375in] h-[2.125in] bg-white rounded-2xl shadow-xl border-2 border-primary/5 p-5 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <div className="flex items-start gap-5 flex-1 relative z-10">
                      <div 
                        className="size-28 rounded-2xl border-2 border-white bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center shadow-md relative group/photo cursor-pointer"
                        onClick={() => triggerUpload(stu.id)}
                        title="Update Portrait (Gallery/Camera)"
                      >
                        {stu.photoUrl ? (
                          <img src={stu.photoUrl} className="w-full h-full object-cover" alt="Student" />
                        ) : (
                          <User className="size-14 text-primary/10" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity gap-1">
                          {updatingId === stu.id ? (
                            <Loader2 className="size-6 text-white animate-spin" />
                          ) : (
                            <>
                              <Camera className="size-5 text-white" />
                              <span className="text-[7px] text-white font-bold uppercase tracking-widest text-center px-2">Gallery/Camera</span>
                            </>
                          )}
                        </div>
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
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {institution?.logoUrl ? (
                          <img src={institution.logoUrl} className="size-7 object-contain" alt="Logo" />
                        ) : (
                          <div className="size-7 bg-primary rounded-lg flex items-center justify-center text-[10px] text-white font-bold shrink-0 shadow-sm">Y</div>
                        )}
                        <span className="text-[9px] font-black text-primary uppercase tracking-tighter leading-tight break-words">{institution?.name || "System Hub"}</span>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="text-[6px] text-muted-foreground font-black uppercase">Issued: {validity.issued}</p>
                        <p className="text-[6px] text-accent font-black uppercase">Expires: {validity.expires}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                        <Phone className="size-3 text-accent" /> {institution?.phone || "Registry Hotline"}
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

      <div className="print-actual-view">
        <div className="print-grid">
          {filteredStudents.map((stu: any) => {
            const validity = getValidityDates(stu.createdAt);
            return (
              <div key={stu.id + '_print'} className="print-pair-wrapper">
                <div className="print-item-wrapper">
                  <div className="print-id-card">
                    <div className="print-card-header">
                      {institution?.logoUrl ? <img src={institution.logoUrl} className="card-logo" /> : <div className="card-logo-placeholder">Y</div>}
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
                      <div className="footer-validity">
                        <span>Issued: {validity.issued}</span>
                        <span>Expires: {validity.expires}</span>
                      </div>
                      <span className="footer-status">IDENTITY VERIFIED</span>
                    </div>
                  </div>
                </div>
                
                <div className="print-item-wrapper">
                  <div className="print-id-card print-id-card-back">
                    <div className="card-back-watermark">
                       {institution?.logoUrl ? <img src={institution.logoUrl} /> : <SchoolIcon />}
                    </div>
                    <div className="card-back-content">
                      <div className="back-security-badge">SECURITY AUTHORIZATION</div>
                      <div className="back-info-row">
                        <MapPin className="back-icon" />
                        <span>{institution?.location}</span>
                      </div>
                      <div className="back-info-row">
                        <Phone className="back-icon" />
                        <span>{institution?.phone || "Registry Hotline"}</span>
                      </div>
                      <p className="back-disclaimer">
                        Property of {institution?.name}. If found, please return to the school administration.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        .print-actual-view {
          display: none;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          
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
            gap: 0.25in;
            justify-content: center;
            padding: 0.5in;
          }

          .print-pair-wrapper {
            display: contents;
          }

          .print-item-wrapper {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 0.2in;
          }

          .print-id-card {
            width: 3.375in;
            height: 2.125in;
            border: 0.5pt solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            background: white;
            color: #1a1f2c;
            font-family: sans-serif;
            overflow: hidden;
            box-sizing: border-box;
            position: relative;
          }

          .print-id-card-back {
            background: #f8fafc;
            text-align: center;
            align-items: center;
            justify-content: center;
          }

          .card-back-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(5);
            opacity: 0.03;
          }

          .card-back-content {
            position: relative;
            z-index: 10;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: center;
          }

          .back-security-badge {
            font-size: 7px;
            font-weight: 800;
            padding: 2px 8px;
            background: rgba(26, 31, 44, 0.05);
            border: 0.5pt solid rgba(26, 31, 44, 0.1);
            border-radius: 10px;
            margin-bottom: 4px;
          }

          .back-info-row {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 8px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
          }

          .back-icon {
            width: 8px;
            height: 8px;
            color: #f59e0b;
          }

          .back-disclaimer {
            font-size: 6.5px;
            color: #64748b;
            line-height: 1.4;
            max-width: 80%;
            margin-top: 5px;
          }

          .print-card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }

          .card-logo {
            height: 25px;
            width: 25px;
            object-fit: contain;
          }

          .card-logo-placeholder {
            height: 25px;
            width: 25px;
            background: #1a1f2c;
            color: white;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
          }

          .card-school-name {
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.01em;
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.1;
          }

          .print-card-body {
            display: flex;
            gap: 12px;
            flex: 1;
          }

          .card-photo-box {
            width: 85px;
            height: 85px;
            border: 0.5pt solid #e2e8f0;
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
            gap: 3px;
          }

          .card-student-name {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.1;
            margin-bottom: 1px;
          }

          .card-student-grade {
            font-size: 8px;
            color: #f59e0b;
            font-weight: 700;
            text-transform: uppercase;
          }

          .card-id-block {
            margin-top: auto;
            background: #f8fafc;
            padding: 4px 6px;
            border-radius: 4px;
            border: 0.5pt solid #e2e8f0;
          }

          .id-label {
            display: block;
            font-size: 6px;
            font-weight: 900;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }

          .id-value {
            font-size: 10px;
            font-family: monospace;
            font-weight: 800;
            color: #1a1f2c;
          }

          .print-card-footer {
            margin-top: auto;
            padding-top: 6px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 5px;
            font-weight: 900;
            color: #94a3b8;
            text-transform: uppercase;
          }

          .footer-validity {
            display: flex;
            flex-direction: column;
            gap: 1px;
          }

          .footer-status {
            letter-spacing: 0.05em;
          }
        }
      `}</style>
    </div>
  )
}
