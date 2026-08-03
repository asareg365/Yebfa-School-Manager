"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  Filter,
  DollarSign,
  User,
  MoreVertical,
  Trash2,
  Pencil,
  ShieldCheck,
  Building2,
  ArrowRight,
  HandCoins,
  X
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, writeBatch, doc, deleteDoc, updateDoc, getDocs, getDoc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { generateId } from "@/lib/id-generator"

export default function InvoicingPage() {
  const db = useFirestore()
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isGenOpen, setIsGenOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPrintOpen, setIsPrintOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("All")

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [editForm, setEditForm] = useState({ totalAmount: "" })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const classesQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  const studentsQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "students"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  const feesQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "approved_fees"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  const invoicesQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "invoices"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )

  const { data: classes = [] } = useCollection(classesQuery)
  const { data: students = [] } = useCollection(studentsQuery)
  const { data: fees = [] } = useCollection(feesQuery)
  const { data: invoices = [] } = useCollection(invoicesQuery)

  const handleGenerateInvoices = async () => {
    if (!db || !institutionId || students.length === 0 || fees.length === 0) {
      toast({ variant: "destructive", title: "Setup Required", description: "Enroll students and setup fee items first." })
      return
    }

    setLoading(true)
    try {
      const batch = writeBatch(db)
      const term = institution?.currentTerm || "Term 1"
      const year = institution?.academicYear || "2026/2027"

      // We use a loop but each student gets a unique INV ID from the transactional service
      for (const student of students) {
        const mandatoryFees = fees.filter((f: any) => f.category === "Mandatory")
        const total = mandatoryFees.reduce((acc, curr: any) => acc + curr.defaultAmount, 0)
        
        // Goal 1: Transactional ID Generation for Invoices
        const invoiceNumber = await generateId('invoices', 'INV-');
        
        const invoiceRef = doc(collection(db, "invoices"))
        const invId = invoiceRef.id

        batch.set(invoiceRef, {
          tenantId: institutionId,
          institutionId,
          id: invId,
          invoiceNumber: invoiceNumber,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          gradeLevel: student.gradeLevel,
          totalAmount: total,
          amountPaid: 0,
          amountDue: total,
          status: "Unpaid",
          term,
          academicYear: year,
          createdAt: serverTimestamp()
        })

        const ledgerRef = doc(collection(db, "student_ledger"))
        batch.set(ledgerRef, {
          tenantId: institutionId,
          institutionId,
          studentId: student.id,
          date: new Date().toISOString().split('T')[0],
          item: `Billing: ${term} ${year} (${invoiceNumber})`,
          type: "charge",
          amount: total,
          invoiceId: invId,
          createdAt: serverTimestamp()
        })
      }

      await batch.commit()
      toast({ title: "Invoices Generated", description: `Batch billing completed for ${students.length} students.` })
      setIsGenOpen(false)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInvoice = async (inv: any) => {
    if (inv.amountPaid > 0) {
      toast({ variant: "destructive", title: "Action Blocked", description: "This invoice has payments recorded. Reverse transactions first." })
      return
    }
    if (!confirm("Remove this invoice and all associated ledger charges?")) return

    setLoading(true)
    try {
      const batch = writeBatch(db!)
      batch.delete(doc(db!, "invoices", inv.id))
      
      const ledgerQ = query(collection(db!, "student_ledger"), where("invoiceId", "==", inv.id))
      const ledgerSnap = await getDocs(ledgerQ)
      ledgerSnap.forEach(d => batch.delete(d.ref))
      
      await batch.commit()
      toast({ title: "Invoice Deleted", description: "Ledger synchronized." })
    } catch (e) {
      toast({ variant: "destructive", title: "Error deleting invoice" })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoice || !institutionId || loading) return
    
    setLoading(true)
    try {
      const batch = writeBatch(db!)
      const newTotal = parseFloat(editForm.totalAmount)
      const newDue = Math.max(0, newTotal - (selectedInvoice.amountPaid || 0))
      
      batch.update(doc(db!, "invoices", selectedInvoice.id), {
        totalAmount: newTotal,
        amountDue: newDue,
        status: newDue <= 0 ? "Paid" : (selectedInvoice.amountPaid || 0) > 0 ? "Partial" : "Unpaid",
        updatedAt: serverTimestamp()
      })

      const ledgerQ = query(collection(db!, "student_ledger"), where("invoiceId", "==", selectedInvoice.id))
      const ledgerSnap = await getDocs(ledgerQ)
      ledgerSnap.forEach(d => batch.update(d.ref, { amount: newTotal }))

      await batch.commit()
      toast({ title: "Invoice Adjusted", description: "Total amount and ledger updated." })
      setIsEditOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" })
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedGrade === "All" || inv.gradeLevel === selectedGrade)
    ).sort((a:any, b:any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
  }, [invoices, searchQuery, selectedGrade])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Invoicing Hub</h1>
          <p className="text-muted-foreground font-medium">Strategic term billing for <span className="text-accent font-bold uppercase">{institution?.currentTerm || "Term 1"}</span>.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => window.print()}>Batch Export</Button>
          <Dialog open={isGenOpen} onOpenChange={setIsGenOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2 px-6 font-bold"><Plus className="size-5" /> Run Term Billing</Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-8 bg-primary text-primary-foreground">
                <DialogTitle className="text-2xl font-headline font-bold">Generate Batch Invoices</DialogTitle>
                <DialogDescription className="text-primary-foreground/70">Authorize mandatory fee generation for all enrolled students.</DialogDescription>
              </DialogHeader>
              <div className="p-8 space-y-4">
                <div className="p-4 rounded-2xl bg-muted/30 border space-y-2">
                  <div className="flex justify-between text-sm"><span>Registry Roster</span><span className="font-bold">{students.length} Students</span></div>
                  <div className="flex justify-between text-sm"><span>Approved Charges</span><span className="font-bold">{fees.filter((f: any) => f.category === "Mandatory").length} Items</span></div>
                </div>
                <div className="flex gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-xs">
                   <AlertCircle className="size-5 shrink-0" />
                   <p>This action will finalize billing for the current term and post debit entries to every student's personal financial ledger.</p>
                </div>
              </div>
              <DialogFooter className="p-8 bg-slate-50 border-t">
                <Button className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl" onClick={handleGenerateInvoices} disabled={loading}>
                   {loading ? <Loader2 className="animate-spin mr-2" /> : <FileText className="mr-2" />} Authorize Billing Cycle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { title: "Net Billed", value: `GH₵ ${invoices.reduce((a, c: any) => a + (c.totalAmount || 0), 0).toLocaleString()}`, icon: DollarSign, color: "text-primary" },
          { title: "Net Collected", value: `GH₵ ${invoices.reduce((a, c: any) => a + (c.amountPaid || 0), 0).toLocaleString()}`, icon: CheckCircle2, color: "text-green-600" },
          { title: "Net Outstanding", value: `GH₵ ${invoices.reduce((a, c: any) => a + (c.amountDue || 0), 0).toLocaleString()}`, icon: Clock, color: "text-destructive" },
          { title: "Active Ledger", value: `${invoices.length} Bills`, icon: FileText, color: "text-accent" }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-md bg-white">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">{stat.title}</CardDescription>
              <stat.icon className={`size-4 ${stat.color} opacity-40`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold font-headline">{stat.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b py-6 px-6 bg-slate-50/50">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input placeholder="Search invoice or student..." className="pl-10 h-12 bg-white border shadow-sm rounded-xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
             </div>
             <div className="flex items-center gap-3">
               <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                 <SelectTrigger className="w-40 h-12 rounded-xl bg-white"><SelectValue placeholder="Grade" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="All">All Grade Modules</SelectItem>
                   {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                 </SelectContent>
               </Select>
               <Button variant="outline" className="h-12 w-12 rounded-xl bg-white" onClick={() => window.print()}><Printer className="size-4" /></Button>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold px-6">INV # / STUDENT</TableHead>
                <TableHead className="py-4 font-bold">GRADE</TableHead>
                <TableHead className="py-4 font-bold">TOTAL</TableHead>
                <TableHead className="py-4 font-bold text-destructive">DUE</TableHead>
                <TableHead className="py-4 font-bold">STATUS</TableHead>
                <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv: any) => (
                <TableRow key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="px-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono font-bold text-accent">{inv.invoiceNumber}</span>
                      <span className="font-bold text-sm text-primary">{inv.studentName}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs font-bold text-slate-600">{inv.gradeLevel}</span></TableCell>
                  <TableCell><span className="text-sm font-bold">GH₵ {inv.totalAmount?.toLocaleString()}</span></TableCell>
                  <TableCell><span className="text-sm font-bold text-destructive">GH₵ {inv.amountDue?.toLocaleString()}</span></TableCell>
                  <TableCell>
                    <Badge variant={inv.status === "Paid" ? "default" : "outline"} className={`text-[9px] uppercase font-bold ${inv.status === "Paid" ? 'bg-green-600' : inv.status === "Partial" ? 'text-amber-600 border-amber-200' : 'text-destructive border-destructive/20'}`}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setSelectedInvoice(inv); setIsPrintOpen(true); }} title="Print Statement">
                         <Printer className="size-4" />
                       </Button>
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreVertical className="size-4" /></Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl w-48">
                            <DropdownMenuItem className="gap-2 text-xs font-bold" onClick={() => {
                              setSelectedInvoice(inv);
                              setEditForm({ totalAmount: inv.totalAmount?.toString() || "0" });
                              setIsEditOpen(true);
                            }}>
                               <Pencil className="size-4" /> Adjust Total
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-xs font-bold text-blue-600" asChild>
                               <Link href="/dashboard/finance/payments">
                                  <HandCoins className="size-4" /> Record Payment
                               </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-xs font-bold text-destructive" onClick={() => handleDeleteInvoice(inv)}>
                               <Trash2 className="size-4" /> Delete Invoice
                            </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-32 text-muted-foreground italic bg-slate-50/50">No billing records found matching search filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Adjust Invoice Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <form onSubmit={handleUpdateInvoice}>
            <DialogHeader className="p-8 bg-slate-50 border-b">
              <DialogTitle className="text-2xl font-headline font-bold">Adjust Billing</DialogTitle>
              <DialogDescription>Modify the total billed amount for {selectedInvoice?.studentName}. Balances will re-sync.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-4">
              <div className="space-y-2">
                <Label>Total Bill Amount (GH₵)</Label>
                <Input type="number" required value={editForm.totalAmount} onChange={e => setEditForm({...editForm, totalAmount: e.target.value})} className="h-12 rounded-xl font-bold text-lg" />
              </div>
              <div className="p-4 rounded-xl bg-blue-50 text-blue-700 text-[10px] uppercase font-bold tracking-widest flex gap-3">
                 <ShieldCheck className="size-4 shrink-0" />
                 <span>Updating this total will automatically recalculate the outstanding debt and synchronize the student ledger.</span>
              </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t">
              <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl">
                 {loading ? <Loader2 className="animate-spin mr-2" /> : "Authorize Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Print View */}
      <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
           <DialogHeader className="sr-only">
             <DialogTitle>Official Invoice Preview</DialogTitle>
             <DialogDescription>High-fidelity billing statement for institutional parents.</DialogDescription>
           </DialogHeader>
           <div className="invoice-print p-12 bg-white space-y-10" id="invoice-printable">
              <div className="flex justify-between items-start">
                 <div className="space-y-2">
                    <div className="flex items-center gap-3">
                       {institution?.logoUrl ? <img src={institution.logoUrl} className="size-12 object-contain" /> : <Building2 className="size-10 text-primary" />}
                       <h2 className="text-2xl font-headline font-bold text-primary tracking-tighter uppercase">{institution?.name}</h2>
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold space-y-0.5 pl-1">
                       <p className="flex items-center gap-1.5"><Building2 className="size-3" /> {institution?.address}, {institution?.location}</p>
                       <p className="flex items-center gap-1.5"><Clock className="size-3" /> 2026 Academic Session</p>
                    </div>
                 </div>
                 <div className="text-right space-y-1">
                    <h1 className="text-3xl font-headline font-black text-primary/10 uppercase italic">OFFICIAL INVOICE</h1>
                    <p className="text-sm font-mono font-bold text-accent">#{selectedInvoice?.invoiceNumber}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">{selectedInvoice?.term} • {selectedInvoice?.academicYear}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-12 pt-6 border-t">
                 <div className="space-y-2">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Bill To (Registry Identity)</p>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                       <p className="text-sm font-bold text-primary uppercase">{selectedInvoice?.studentName}</p>
                       <p className="text-[10px] font-bold text-accent uppercase tracking-tighter">{selectedInvoice?.gradeLevel}</p>
                       <p className="text-[9px] text-muted-foreground font-medium italic">Ref: {selectedInvoice?.studentId?.substring(0, 8).toUpperCase()}</p>
                    </div>
                 </div>
                 <div className="space-y-2 text-right">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Account Status</p>
                    <div className="pt-2">
                       <Badge className={`h-8 px-4 text-xs font-bold uppercase border-none ${selectedInvoice?.status === 'Paid' ? 'bg-green-600' : 'bg-primary'}`}>
                          {selectedInvoice?.status}
                       </Badge>
                    </div>
                 </div>
              </div>

              <div className="border rounded-2xl overflow-hidden">
                 <Table>
                    <TableHeader className="bg-slate-50/50">
                       <TableRow>
                          <TableHead className="font-bold py-3 text-[10px] uppercase text-primary">Service Description</TableHead>
                          <TableHead className="text-right font-bold py-3 text-[10px] uppercase text-primary">Amount (GH₵)</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       <TableRow>
                          <TableCell className="py-6">
                             <p className="font-bold text-sm">Institutional Fees & Tuition</p>
                             <p className="text-[10px] text-muted-foreground">Standard term charges as approved by the board for {selectedInvoice?.term}.</p>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm">GH₵ {selectedInvoice?.totalAmount?.toLocaleString()}</TableCell>
                       </TableRow>
                    </TableBody>
                 </Table>
              </div>

              <div className="flex justify-end pt-4">
                 <div className="w-64 space-y-3">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Total Billed</span><span>GH₵ {selectedInvoice?.totalAmount?.toLocaleString()}</span></div>
                    <div className="flex justify-between text-xs text-green-600 font-bold"><span>Total Paid</span><span>- GH₵ {selectedInvoice?.amountPaid?.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center pt-3 border-t">
                       <span className="text-sm font-bold uppercase text-primary">Amount Due</span>
                       <span className="text-xl font-headline font-bold text-primary">GH₵ {selectedInvoice?.amountDue?.toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              <div className="pt-8 flex flex-col items-center gap-6 no-print">
                 <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center w-full">
                    <p className="text-[10px] font-bold text-primary uppercase">Payment Directive</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Please use MoMo or Bank Transfer referencing {selectedInvoice?.invoiceNumber}.</p>
                 </div>
                 <Button className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl gap-2" onClick={() => window.print()}>
                    <Printer className="size-5" /> Generate Professional Statement
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-print, .invoice-print * { visibility: visible; }
          .invoice-print { position: fixed; left: 0; top: 0; width: 100%; height: 100%; padding: 60px; }
          .no-print { display: none !important; }
        }
      `}</style>

    </div>
  )
}
