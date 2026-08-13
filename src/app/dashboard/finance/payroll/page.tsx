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
import { ScrollArea } from "@/components/ui/scroll-area"

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
      toast({ title: "Payroll Authorized", description: `Disbursements finalized.` })
      setIsCycleOpen(false)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Payroll Error" })
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
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Payroll Hub</h1>
          <p className="text-muted-foreground font-medium text-sm">Strategic faculty salary management and 2026 auditing.</p>
        </div>
        <Dialog open={isCycleOpen} onOpenChange={setIsCycleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2 px-6 font-bold w-full md:w-auto"><Calendar className="size-4" /> Run Monthly Cycle</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
            <form onSubmit={(e) => { e.preventDefault(); handleRunPayroll(); }}>
              <DialogHeader className="p-8 bg-primary text-primary-foreground">
                <DialogTitle className="text-2xl font-headline font-bold">Authorize Payroll</DialogTitle>
                <DialogDescription className="text-primary-foreground/70 text-xs">Generate salary records for active faculty.</DialogDescription>
              </DialogHeader>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Disbursement Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["June", "July", "August", "September", "October", "November", "December"].map(m => <SelectItem key={m} value={m}>{m} 2026</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-[10px] font-bold uppercase tracking-tight text-orange-800 flex gap-3">
                  <ShieldCheck className="size-5 shrink-0 text-orange-600" />
                  <p>By authorizing, you confirm banking details are pre-verified for this institutional node.</p>
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

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white no-print">
        <CardHeader className="border-b bg-slate-50/50 py-6 px-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg font-headline font-bold text-primary">Disbursement History</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input placeholder="Search employee..." className="pl-10 h-11 bg-white border shadow-sm rounded-xl text-sm" />
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="py-4 font-bold px-6">STAFF MEMBER</TableHead>
                  <TableHead className="py-4 font-bold">ROLE</TableHead>
                  <TableHead className="py-4 font-bold">PERIOD</TableHead>
                  <TableHead className="py-4 font-bold">NET SALARY</TableHead>
                  <TableHead className="py-4 font-bold text-center">STATUS</TableHead>
                  <TableHead className="text-right py-4 font-bold px-6">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords.sort((a:any, b:any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map((rec: any) => (
                  <TableRow key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="px-6">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-primary text-[10px] border shrink-0">
                          {rec.staffName?.charAt(0) || "S"}
                        </div>
                        <div className="flex flex-col min-w-0">
                           <span className="font-bold text-sm text-primary truncate">{rec.staffName}</span>
                           <span className="text-[9px] font-mono font-bold text-accent uppercase truncate">{rec.staffNumber}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold text-primary border-primary/20">{rec.staffRole}</Badge></TableCell>
                    <TableCell><span className="text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{rec.month} {rec.year}</span></TableCell>
                    <TableCell><span className="text-sm font-bold text-primary whitespace-nowrap">GH₵ {rec.netSalary.toLocaleString()}</span></TableCell>
                    <TableCell className="text-center">
                       <Badge className="bg-green-600 text-white border-none text-[8px] font-bold uppercase tracking-widest px-3 h-6">
                          {rec.status}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                       <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary" onClick={() => handleOpenSlip(rec)}>
                          <Printer className="size-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {payrollRecords.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-32 text-muted-foreground italic bg-slate-50/50">Awaiting cycle authorization.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isSlipOpen} onOpenChange={setIsSlipOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
           <ScrollArea className="max-h-[90vh]">
             <div className="p-8 md:p-12 bg-white space-y-10" id="payslip-printable">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
                   <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         {institution?.logoUrl ? <img src={institution.logoUrl} className="size-14 object-contain" /> : <Building2 className="size-12 text-primary" />}
                         <div className="flex flex-col">
                            <h2 className="text-xl font-headline font-bold text-primary uppercase tracking-tight">{institution?.name || "Registry Hub"}</h2>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">{institution?.location || "Ahafo Region"}</p>
                         </div>
                      </div>
                   </div>
                   <div className="text-left sm:text-right w-full sm:w-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/10 mb-4">
                         <BadgeCheck className="size-3 text-green-600" /> Verified Disbursement
                      </div>
                      <h1 className="text-3xl font-headline font-black text-primary/5 uppercase italic tracking-tighter">OFFICIAL PAYSLIP</h1>
                      <p className="text-[11px] font-bold text-primary uppercase">{selectedRecord?.month} {selectedRecord?.year}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                   <div className="space-y-4">
                      <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Faculty Employee</p>
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
                   <div className="text-left sm:text-right space-y-2">
                      <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Reference</p>
                      <p className="text-[10px] font-mono font-bold text-primary break-all">#{selectedRecord?.id?.toUpperCase()}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                   <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase text-primary border-b pb-2">Earnings</h4>
                      <div className="flex justify-between items-center text-xs font-medium">
                         <span>Basic Net Salary</span>
                         <span className="font-bold">GH₵ {selectedRecord?.baseSalary?.toLocaleString()}</span>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase text-destructive border-b pb-2">Deductions</h4>
                      <div className="flex justify-between items-center text-xs font-medium">
                         <span>Statutory Total</span>
                         <span className="font-bold text-destructive">- GH₵ {selectedRecord?.deductions?.toLocaleString() || "0.00"}</span>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 border border-slate-100">
                   <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Net Payable Amount</span>
                      <p className="text-[9px] text-primary/60 font-medium italic">"Institutional disbursement finalized via Gateway"</p>
                   </div>
                   <div className="text-center sm:text-right">
                      <span className="text-3xl sm:text-4xl font-headline font-bold text-primary">GH₵ {selectedRecord?.netSalary?.toLocaleString()}</span>
                   </div>
                </div>

                <Button className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl gap-2 text-lg no-print" onClick={() => window.print()}>
                  <Printer className="size-5" /> Generate PDF Document
                </Button>
             </div>
           </ScrollArea>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #payslip-printable, #payslip-printable * { visibility: visible; }
          #payslip-printable { 
            position: fixed; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: 100%; 
            padding: 40px; 
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
