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
  X,
  GraduationCap,
  Layers
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function InvoicingPage() {
  const db = useFirestore()
  const router = useRouter()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isGenOpen, setIsGenOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("All")

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [individualPrintData, setIndividualPrintData] = useState<any>(null)
  const [editForm, setEditForm] = useState({ totalAmount: "" })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const classesQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  const studentsQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "students"), where("tenantId", "==", institutionId), where("status", "==", "active")) : null, 
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
    if (!db || !institutionId || !institution || students.length === 0 || fees.length === 0) {
      toast({ variant: "destructive", title: "Setup Required", description: "Verify registry and fees first." })
      return
    }

    setLoading(true)
    try {
      const batch = writeBatch(db)
      const term = institution?.currentTerm || "Term 1"
      const year = institution?.academicYear || "2026/2027"

      for (const student of students) {
        const mandatoryFees = fees.filter((f: any) => f.category === "Mandatory")
        const total = mandatoryFees.reduce((acc, curr: any) => acc + (curr.defaultAmount || 0), 0)
        
        const invoiceNumber = await generateId('invoices', institution.schoolCode, 'INV');
        
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
          item: `Billing: ${term} (${invoiceNumber})`,
          type: "charge",
          amount: total,
          invoiceId: invId,
          createdAt: serverTimestamp()
        })
      }

      await batch.commit()
      toast({ title: "Invoices Generated", description: `Billed ${students.length} students.` })
      setIsGenOpen(false)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInvoice = async (inv: any) => {
    if (inv.amountPaid > 0) {
      toast({ variant: "destructive", title: "Action Blocked", description: "This invoice has payments recorded." })
      return
    }
    if (!confirm("Remove this invoice?")) return

    setLoading(true)
    try {
      const batch = writeBatch(db!)
      batch.delete(doc(db!, "invoices", inv.id))
      const ledgerQ = query(collection(db!, "student_ledger"), where("invoiceId", "==", inv.id))
      const ledgerSnap = await getDocs(ledgerQ)
      ledgerSnap.forEach(d => batch.delete(d.ref))
      await batch.commit()
      toast({ title: "Invoice Deleted" })
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
      toast({ title: "Invoice Adjusted" })
      setIsEditOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" })
    } finally {
      setLoading(false)
    }
  }

  const handlePrintIndividual = (inv: any) => {
    setIndividualPrintData(inv)
    setTimeout(() => {
      window.print()
      setIndividualPrintData(null)
    }, 100)
  }

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedGrade === "All" || inv.gradeLevel === selectedGrade)
    ).sort((a:any, b:any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
  }, [invoices, searchQuery, selectedGrade])

  const groupedInvoices = useMemo(() => {
    const groups: Record<string, any[]> = {}
    filteredInvoices.forEach(inv => {
      const grade = inv.gradeLevel || "Unassigned"
      if (!groups[grade]) groups[grade] = []
      groups[grade].push(inv)
    })
    return groups
  }, [filteredInvoices])

  const handlePrintLedger = () => {
    window.print();
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Invoicing Hub</h1>
          <p className="text-muted-foreground font-medium text-sm">Strategic term billing for <span className="text-accent font-bold uppercase">{institution?.currentTerm || "Term 1"}</span>.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl gap-2 font-bold" onClick={handlePrintLedger} disabled={filteredInvoices.length === 0}>
             <Printer className="size-5" /> Print Full Ledger
          </Button>
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
              </div>
              <DialogFooter className="p-8 bg-slate-50 border-t">
                <Button className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl" onClick={handleGenerateInvoices} disabled={loading}>
                   {loading ? <Loader2 className="animate-spin mr-2" /> : "Authorize Billing Cycle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white no-print">
        <CardHeader className="border-b py-6 px-6 bg-slate-50/50">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input placeholder="Search invoice or student..." className="pl-10 h-12 bg-white border-none shadow-sm rounded-xl text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
             </div>
             <div className="flex items-center gap-3">
               <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                 <SelectTrigger className="w-40 h-12 rounded-xl bg-white"><SelectValue placeholder="Grade" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="All">All Grades</SelectItem>
                   {classes.filter(c => !!c.id).map(c => (
                     <SelectItem key={c.id} value={c.name || c.id}>{c.name || "Unnamed Class"}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedInvoices)}>
             {Object.entries(groupedInvoices)
               .sort(([a], [b]) => a.localeCompare(b))
               .map(([grade, invoices]) => (
                 <AccordionItem key={grade} value={grade} className="border-b last:border-0">
                    <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/30">
                       <div className="flex items-center gap-3 text-left">
                          <Layers className="size-4 text-primary/60" />
                          <span className="text-sm font-bold text-primary uppercase tracking-tight">{grade}</span>
                          <Badge variant="secondary" className="h-4 px-1.5 text-[8px] bg-primary/5 text-primary border-none">{invoices.length}</Badge>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                       <div className="overflow-x-auto w-full">
                          <Table>
                             <TableHeader className="bg-muted/10">
                                <TableRow>
                                   <TableHead className="py-4 font-bold px-6">INV # / STUDENT</TableHead>
                                   <TableHead className="py-4 font-bold">TOTAL</TableHead>
                                   <TableHead className="py-4 font-bold text-destructive">DUE</TableHead>
                                   <TableHead className="py-4 font-bold">STATUS</TableHead>
                                   <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {invoices.map((inv: any) => (
                                  <TableRow key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                     <TableCell className="px-6">
                                        <div className="flex flex-col">
                                           <span className="text-[10px] font-mono font-bold text-accent">{inv.invoiceNumber}</span>
                                           <span className="font-bold text-sm text-primary">{inv.studentName}</span>
                                        </div>
                                     </TableCell>
                                     <TableCell><span className="text-sm font-bold">GH₵ {inv.totalAmount?.toLocaleString() || 0}</span></TableCell>
                                     <TableCell><span className="text-sm font-bold text-destructive">GH₵ {inv.amountDue?.toLocaleString() || 0}</span></TableCell>
                                     <TableCell>
                                        <Badge variant={inv.status === "Paid" ? "default" : "outline"} className={`text-[9px] uppercase font-bold ${inv.status === "Paid" ? 'bg-green-600' : 'text-destructive border-destructive/20'}`}>
                                           {inv.status}
                                        </Badge>
                                     </TableCell>
                                     <TableCell className="text-right px-6">
                                        <div className="flex items-center justify-end gap-1">
                                           <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handlePrintIndividual(inv)}>
                                              <Printer className="size-4" />
                                           </Button>
                                           <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreVertical className="size-4" /></Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl w-48">
                                                 <DropdownMenuItem className="gap-2 text-xs font-bold" onClick={() => handlePrintIndividual(inv)}>
                                                    <FileText className="size-4" /> Print Student Bill
                                                 </DropdownMenuItem>
                                                 <DropdownMenuItem className="gap-2 text-xs font-bold" onClick={() => { setSelectedInvoice(inv); setEditForm({ totalAmount: inv.totalAmount?.toString() || "0" }); setIsEditOpen(true); }}>
                                                    <Pencil className="size-4" /> Adjust Total
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
                             </TableBody>
                          </Table>
                       </div>
                    </AccordionContent>
                 </AccordionItem>
               ))}
          </Accordion>
          {Object.keys(groupedInvoices).length === 0 && (
            <div className="p-24 text-center text-muted-foreground italic">No invoice records found matching current context.</div>
          )}
        </CardContent>
      </Card>

      {/* FULL LEDGER PRINT VIEW */}
      <div id="printable-ledger-report" className="hidden print:block bg-white p-8">
         <div className="flex justify-between items-start border-b pb-8 mb-8">
            <div className="flex items-center gap-4">
               {institution?.logoUrl ? <img src={institution.logoUrl} className="size-16 object-contain" /> : <div className="size-16 bg-primary rounded-xl flex items-center justify-center text-white font-black text-2xl">Y</div>}
               <div>
                  <h1 className="text-2xl font-headline font-black text-primary uppercase tracking-tight">{institution?.name || "System Hub"}</h1>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{institution?.location}</p>
               </div>
            </div>
            <div className="text-right">
               <h2 className="text-xl font-headline font-bold text-primary">TERM FEE LEDGER</h2>
               <p className="text-[10px] font-bold text-muted-foreground uppercase">{institution?.currentTerm} • 2026/2027</p>
               <p className="text-[9px] font-medium text-slate-400 mt-1">Generated: {new Date().toLocaleString()}</p>
            </div>
         </div>

         <Table className="border rounded-xl overflow-hidden">
            <TableHeader className="bg-slate-50">
               <TableRow>
                  <TableHead className="font-black text-primary uppercase text-[9px] py-4">Invoice #</TableHead>
                  <TableHead className="font-black text-primary uppercase text-[9px] py-4">Student Name</TableHead>
                  <TableHead className="font-black text-primary uppercase text-[9px] py-4">Grade</TableHead>
                  <TableHead className="font-black text-primary uppercase text-[9px] py-4 text-right">Billed</TableHead>
                  <TableHead className="font-black text-primary uppercase text-[9px] py-4 text-right">Paid</TableHead>
                  <TableHead className="font-black text-primary uppercase text-[9px] py-4 text-right">Balance</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {filteredInvoices.map((inv: any) => (
                 <TableRow key={inv.id} className="border-b last:border-none">
                    <TableCell className="font-mono text-[9px] font-bold text-slate-600">{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-bold text-[10px] text-primary">{inv.studentName}</TableCell>
                    <TableCell className="text-[9px] font-medium text-slate-600 uppercase">{inv.gradeLevel}</TableCell>
                    <TableCell className="text-right text-[10px] font-medium">GH₵ {inv.totalAmount?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-[10px] font-bold text-green-600">GH₵ {inv.amountPaid?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-[10px] font-black text-primary">GH₵ {inv.amountDue?.toLocaleString()}</TableCell>
                 </TableRow>
               ))}
            </TableBody>
         </Table>

         <div className="mt-12 flex justify-between items-end border-t border-dashed pt-8 opacity-60">
            <div className="space-y-4">
               <div className="w-48 h-px bg-slate-300" />
               <p className="text-[8px] font-black uppercase tracking-widest">Registrar / Bursar Signature</p>
            </div>
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">
               Authorized Digital Registry Audit • Node 2026
            </p>
         </div>
      </div>

      {/* INDIVIDUAL BILL PRINT TEMPLATE */}
      {individualPrintData && (
        <div id="printable-individual-bill" className="hidden print:block bg-white p-12 space-y-12">
           <div className="flex justify-between items-start border-b pb-8">
              <div className="flex items-center gap-4">
                 {institution?.logoUrl ? <img src={institution.logoUrl} className="size-20 object-contain" /> : <div className="size-20 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-3xl">Y</div>}
                 <div>
                    <h1 className="text-3xl font-headline font-black text-primary uppercase tracking-tighter">{institution?.name || "System Hub"}</h1>
                    <p className="text-xs font-bold text-muted-foreground uppercase">{institution?.location || "Ahafo Region, Ghana"}</p>
                    <p className="text-xs font-bold text-muted-foreground">{institution?.phone || "Registry Hotline"}</p>
                 </div>
              </div>
              <div className="text-right space-y-1">
                 <Badge className="bg-primary text-white border-none font-black text-[10px] uppercase tracking-widest px-4 h-6">Official Bill</Badge>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2">Invoice Date: {new Date().toLocaleDateString()}</p>
                 <p className="text-lg font-mono font-black text-accent">{individualPrintData.invoiceNumber}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-12 bg-slate-50 p-8 rounded-[2rem] border">
              <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Billed To</p>
                 <div className="space-y-1">
                    <p className="text-2xl font-headline font-bold text-primary">{individualPrintData.studentName}</p>
                    <p className="text-xs font-bold text-accent uppercase">{individualPrintData.gradeLevel}</p>
                 </div>
              </div>
              <div className="text-right space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Academic Cycle</p>
                 <div className="space-y-1">
                    <p className="text-sm font-bold text-primary">{individualPrintData.term}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">{individualPrintData.academicYear}</p>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2 flex items-center gap-2">
                 <DollarSign className="size-4" /> Statement of Charges
              </h3>
              <div className="border rounded-2xl overflow-hidden">
                 <Table>
                    <TableHeader className="bg-muted/30">
                       <TableRow>
                          <TableHead className="py-4 font-black">DESCRIPTION</TableHead>
                          <TableHead className="py-4 text-right font-black">AMOUNT</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       <TableRow>
                          <TableCell className="py-6 font-bold text-primary">Terminal Mandatory Fees & Tuition</TableCell>
                          <TableCell className="py-6 text-right font-black text-lg">GH₵ {individualPrintData.totalAmount?.toLocaleString()}</TableCell>
                       </TableRow>
                    </TableBody>
                 </Table>
              </div>
           </div>

           <div className="grid grid-cols-3 gap-6 pt-12">
              <div className="col-span-1 p-6 rounded-3xl bg-slate-50 border flex flex-col justify-center gap-1">
                 <p className="text-[10px] font-black uppercase text-muted-foreground">Total Billed</p>
                 <p className="text-xl font-headline font-bold text-primary">GH₵ {individualPrintData.totalAmount?.toLocaleString()}</p>
              </div>
              <div className="col-span-1 p-6 rounded-3xl bg-green-50 border border-green-100 flex flex-col justify-center gap-1">
                 <p className="text-[10px] font-black uppercase text-green-700">Total Paid</p>
                 <p className="text-xl font-headline font-bold text-green-800">GH₵ {individualPrintData.amountPaid?.toLocaleString()}</p>
              </div>
              <div className="col-span-1 p-6 rounded-3xl bg-primary text-primary-foreground shadow-xl flex flex-col justify-center gap-1">
                 <p className="text-[10px] font-black uppercase text-white/60">Outstanding Balance</p>
                 <p className="text-2xl font-headline font-bold text-white">GH₵ {individualPrintData.amountDue?.toLocaleString()}</p>
              </div>
           </div>

           <div className="pt-24 border-t border-dashed flex justify-between items-end opacity-60">
              <div className="space-y-4">
                 <div className="w-48 h-px bg-primary mb-2" />
                 <p className="text-[9px] font-black uppercase tracking-widest">Registrar / Accountant Signature</p>
              </div>
              <div className="text-right">
                 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter flex items-center gap-2">
                    <ShieldCheck className="size-3 text-green-600" /> Authorized Registry Token • Node 2026
                 </p>
              </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #printable-ledger-report, #printable-ledger-report * { 
            visibility: ${individualPrintData ? 'hidden' : 'visible'}; 
            display: ${individualPrintData ? 'none' : 'block'} !important; 
          }
          #printable-individual-bill, #printable-individual-bill * { 
            visibility: ${individualPrintData ? 'visible' : 'hidden'}; 
            display: ${individualPrintData ? 'block' : 'none'} !important; 
          }
          #printable-ledger-report, #printable-individual-bill {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 30px;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <form onSubmit={handleUpdateInvoice}>
            <DialogHeader className="p-8 bg-slate-50 border-b">
              <DialogTitle className="text-2xl font-headline font-bold">Adjust Billing</DialogTitle>
              <DialogDescription>Modify the total billed amount for this record.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Total Charge (GH₵)</Label>
                <Input type="number" required value={editForm.totalAmount} onChange={e => setEditForm({...editForm, totalAmount: e.target.value})} className="h-12 rounded-xl font-bold text-lg" />
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
    </div>
  )
}
