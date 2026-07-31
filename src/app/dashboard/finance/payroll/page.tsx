
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Banknote, 
  Loader2, 
  ShieldCheck, 
  CheckCircle2, 
  Printer, 
  Search,
  ArrowUpRight,
  User,
  MoreVertical,
  Calendar,
  AlertCircle,
  Building2,
  Clock,
  X,
  FileText,
  BadgeCheck
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"

export default function PayrollProcessorPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isCycleOpen, setIsCycleOpen] = useState(false)
  const [isSlipOpen, setIsSlipOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState("July")
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const staffQuery = useMemo(() => institutionId ? query(collection(db, "staff"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const payrollQuery = useMemo(() => institutionId ? query(collection(db, "payroll_records"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: staff = [] } = useCollection(staffQuery)
  const { data: payrollRecords = [] } = useCollection(payrollQuery)

  const handleRunPayroll = async () => {
    if (!db || !institutionId || staff.length === 0) return

    setLoading(true)
    try {
      const batch = writeBatch(db)
      const year = "2026"

      staff.forEach((member: any) => {
        const fullName = `${member.firstName} ${member.lastName}`
        const payrollRef = doc(collection(db, "payroll_records"))
        
        batch.set(payrollRef, {
          tenantId: institutionId,
          institutionId,
          staffId: member.id,
          staffNumber: member.staffNumber || "N/A",
          staffName: fullName,
          staffRole: member.designation || "Faculty",
          baseSalary: member.salary || 0,
          allowances: 0,
          deductions: 0,
          netSalary: member.salary || 0,
          status: "Paid",
          month: selectedMonth,
          year,
          paidAt: serverTimestamp(),
          createdAt: serverTimestamp()
        })

        // Also record as institutional expense
        const expenseRef = doc(collection(db, "expenditure_vouchers"))
        batch.set(expenseRef, {
          tenantId: institutionId,
          institutionId,
          category: "Payroll",
          description: `Salary disbursement for ${fullName} - ${selectedMonth} ${year}`,
          amount: member.salary || 0,
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp()
        })
      })

      await batch.commit()
      toast({ title: "Payroll Authorized", description: `Disbursements finalized for ${staff.length} staff members.` })
      setIsCycleOpen(false)
    } catch (e: any) {
      console.error("Payroll Error:", e)
      toast({ variant: "destructive", title: "Payroll Error", description: e.message })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenSlip = (rec: any) => {
    setSelectedRecord(rec)
    setIsSlipOpen(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Payroll Processor</h1>
          <p className="text-muted-foreground font-medium">Automated salary management and HR financial auditing.</p>
        </div>
        <Dialog open={isCycleOpen} onOpenChange={setIsCycleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2 px-6 font-bold"><Calendar className="size-4" /> Run Monthly Cycle</Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl p-0 overflow-hidden border-none shadow-2xl max-w-md">
            <form onSubmit={(e) => { e.preventDefault(); handleRunPayroll(); }}>
              <DialogHeader className="p-8 bg-primary text-primary-foreground">
                <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                  <Banknote className="size-6 text-accent" />
                </div>
                <DialogTitle className="text-2xl font-headline font-bold">Authorize Payroll</DialogTitle>
                <DialogDescription className="text-primary-foreground/70">Generate salary records and expenditure vouchers for active faculty.</DialogDescription>
              </DialogHeader>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Disbursement Period</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["June", "July", "August", "September", "October", "November", "December"].map(m => <SelectItem key={m} value={m}>{m} 2026</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 text-[10px] leading-relaxed font-bold uppercase tracking-tight flex gap-3">
                  <ShieldCheck className="size-5 shrink-0 text-orange-600" />
                  <p>By authorizing, you confirm banking registry details and salary amounts are pre-verified for the 2026 cycle.</p>
                </div>
              </div>
              <DialogFooter className="p-8 bg-slate-50 border-t">
                <Button type="submit" className="w-full h-14 rounded-2xl font-bold bg-primary shadow-xl" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />} Confirm Disbursement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4 no-print">
        <Card className="border-none shadow-md bg-white border-l-4 border-primary">
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase tracking-widest">Faculty Registry</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold font-headline">{staff.length} Members</div></CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white border-l-4 border-accent">
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase tracking-widest">Cycle Liability</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold font-headline">GH₵ {staff.reduce((a, c: any) => a + (c.salary || 0), 0).toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white no-print">
        <CardHeader className="border-b bg-slate-50/50 py-6 px-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg font-headline font-bold text-primary">Disbursement History</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input placeholder="Search employee..." className="pl-10 h-11 bg-white border shadow-sm rounded-xl" />
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="py-4 font-bold px-6">STAFF MEMBER</TableHead>
                  <TableHead className="py-4 font-bold">ROLE</TableHead>
                  <TableHead className="py-4 font-bold">PERIOD</TableHead>
                  <TableHead className="py-4 font-bold">NET SALARY</TableHead>
                  <TableHead className="py-4 font-bold text-center">STATUS</TableHead>
                  <TableHead className="text-right py-4 font-bold px-6">PAY SLIP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords.sort((a:any, b:any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map((rec: any) => (
                  <TableRow key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="px-6">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-primary text-[10px] border">
                          {rec.staffName?.charAt(0) || "S"}
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold text-sm text-primary">{rec.staffName}</span>
                           <span className="text-[9px] font-mono font-bold text-accent uppercase tracking-tighter">{rec.staffNumber || "REG-NODE-001"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold text-primary border-primary/20 bg-primary/5">{rec.staffRole}</Badge></TableCell>
                    <TableCell><span className="text-xs font-bold text-slate-600 uppercase">{rec.month} {rec.year}</span></TableCell>
                    <TableCell><span className="text-sm font-bold text-primary">GH₵ {rec.netSalary.toLocaleString()}</span></TableCell>
                    <TableCell className="text-center">
                       <Badge className="bg-green-600 text-white border-none text-[8px] font-bold uppercase tracking-widest px-3 h-6">
                          {rec.status}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                       <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary hover:bg-primary/5" onClick={() => handleOpenSlip(rec)}>
                          <Printer className="size-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {payrollRecords.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-32 text-muted-foreground italic bg-slate-50/50">Awaiting cycle authorization for current institutional node.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Digital Payslip View */}
      <Dialog open={isSlipOpen} onOpenChange={setIsSlipOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
           <DialogHeader className="sr-only">
             <DialogTitle>Official Payslip Preview</DialogTitle>
             <DialogDescription>High-fidelity compensation record for faculty.</DialogDescription>
           </DialogHeader>
           <div className="payslip-view p-12 bg-white space-y-10" id="payslip-printable">
              <div className="flex justify-between items-start">
                 <div className="space-y-2">
                    <div className="flex items-center gap-3">
                       {institution?.logoUrl ? <img src={institution.logoUrl} className="size-14 object-contain" /> : <Building2 className="size-12 text-primary" />}
                       <div className="flex flex-col">
                          <h2 className="text-2xl font-headline font-bold text-primary tracking-tighter uppercase">{institution?.name || "Registry Hub"}</h2>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{institution?.location || "Ahafo Region, Ghana"}</p>
                       </div>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/10 mb-4">
                       <BadgeCheck className="size-3 text-green-600" /> Verified Disbursement
                    </div>
                    <h1 className="text-4xl font-headline font-black text-primary/5 uppercase italic tracking-tighter">OFFICIAL PAYSLIP</h1>
                    <p className="text-[11px] font-bold text-primary uppercase">{selectedRecord?.month} {selectedRecord?.year} Cycle</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-100">
                 <div className="space-y-4">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Faculty Employee Context</p>
                    <div className="space-y-1.5">
                       <p className="text-lg font-bold text-primary uppercase">{selectedRecord?.staffName}</p>
                       <div className="flex flex-col gap-1">
                          <p className="text-[11px] font-bold text-accent uppercase flex items-center gap-2">
                             <User className="size-3" /> {selectedRecord?.staffRole}
                          </p>
                          <p className="text-[10px] font-mono font-medium text-muted-foreground uppercase">ID: {selectedRecord?.staffNumber}</p>
                       </div>
                    </div>
                 </div>
                 <div className="text-right space-y-2">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Disbursement Summary</p>
                    <div className="pt-2">
                       <p className="text-[10px] text-muted-foreground uppercase font-bold">Registry Reference</p>
                       <p className="text-[10px] font-mono font-bold text-primary truncate">#{selectedRecord?.id?.toUpperCase()}</p>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4">
                 <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b pb-2">Earnings</h4>
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-slate-600 font-medium">Basic Net Salary</span>
                       <span className="font-bold text-primary">GH₵ {selectedRecord?.baseSalary?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-slate-600 font-medium">Verified Allowances</span>
                       <span className="font-bold text-primary">GH₵ {selectedRecord?.allowances?.toLocaleString() || "0.00"}</span>
                    </div>
                 </div>
                 <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-destructive border-b pb-2">Deductions</h4>
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-slate-600 font-medium">Statutory Deductions</span>
                       <span className="font-bold text-destructive">- GH₵ {selectedRecord?.deductions?.toLocaleString() || "0.00"}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl flex justify-between items-center border border-slate-100 shadow-sm">
                 <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Net Payable Amount</span>
                    <p className="text-[9px] text-primary/60 font-medium italic">"Institutional disbursement finalized via Registry Gateway"</p>
                 </div>
                 <div className="text-right">
                    <span className="text-4xl font-headline font-bold text-primary">GH₵ {selectedRecord?.netSalary?.toLocaleString()}</span>
                 </div>
              </div>

              <div className="pt-8 flex flex-col items-center gap-6 no-print">
                 <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center w-full">
                    <p className="text-[10px] font-bold text-primary uppercase">Authorization Verified</p>
                    <p className="text-[10px] text-muted-foreground mt-1">This document is electronically generated and synchronized with the 2026 Academic Ledger.</p>
                 </div>
                 <Button className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl gap-2 text-lg" onClick={() => window.print()}>
                    <Printer className="size-5" /> Generate Professional Document
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .payslip-view, .payslip-view * { visibility: visible; }
          .payslip-view { 
            position: fixed; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: 100%; 
            padding: 60px; 
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
