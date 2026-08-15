"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Search, 
  CheckCircle2, 
  Receipt, 
  Loader2, 
  Wallet,
  ArrowDownLeft,
  Calendar,
  MoreVertical,
  Printer,
  X,
  Pencil,
  Trash2,
  ShieldCheck,
  Building2,
  User,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Lock
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, getDocs, updateDoc, doc, writeBatch, deleteDoc, getDoc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { generateId } from "@/lib/id-generator"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function PaymentsProcessorPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  
  // UI Dialog States
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [invoiceFilter, setInvoiceFilter] = useState("")
  
  const [selectedTxn, setSelectedTxn] = useState<any>(null)
  
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: "",
    amount: "",
    method: "MTN MoMo",
    reference: "PENDING"
  })

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)

  const isAuthorizer = useMemo(() => {
    const role = profile?.role || "";
    return ['super_admin', 'school_owner', 'administrator'].includes(role);
  }, [profile]);

  useEffect(() => {
    if (profile) {
      if (profile.role === 'super_admin') {
        setInstitutionId(localStorage.getItem('selected_institution_id'))
      } else {
        setInstitutionId(profile.tenantId || null)
      }
    }
  }, [profile])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  // Queries
  const allInvoicesQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "invoices"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  const txnsQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "transactions"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )

  const { data: allInvoices = [] } = useCollection(allInvoicesQuery)
  const { data: rawTransactions = [] } = useCollection(txnsQuery)

  const pendingInvoices = useMemo(() => allInvoices.filter(i => i.status !== "Paid"), [allInvoices])

  const filteredInvoices = useMemo(() => {
    return pendingInvoices.filter(inv => 
      inv.studentName?.toLowerCase().includes(invoiceFilter.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(invoiceFilter.toLowerCase())
    )
  }, [pendingInvoices, invoiceFilter])

  const transactions = useMemo(() => {
    return [...rawTransactions].filter(t => 
      t.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.paymentMethod?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
  }, [rawTransactions, searchQuery])

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || !institution || !paymentForm.invoiceId || !paymentForm.amount) return

    setLoading(true)
    const amount = parseFloat(paymentForm.amount)
    const selectedInvoice = pendingInvoices.find((i: any) => i.id === paymentForm.invoiceId)
    
    if (!selectedInvoice) {
      setLoading(false)
      return
    }

    const receiptNumber = await generateId('receipts', institution.schoolCode, 'RCPT');

    try {
      const batch = writeBatch(db)
      const txnRef = doc(collection(db, "transactions"))
      const txnId = txnRef.id

      const payload = {
        tenantId: institutionId,
        institutionId,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        studentId: selectedInvoice.studentId,
        studentName: selectedInvoice.studentName,
        amount,
        paymentMethod: paymentForm.method,
        reference: receiptNumber,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      }

      batch.set(txnRef, { ...payload, id: txnId })

      const newPaid = (selectedInvoice.amountPaid || 0) + amount
      const newDue = Math.max(0, (selectedInvoice.totalAmount || 0) - newPaid)
      const newStatus = newDue <= 0 ? "Paid" : "Partial"

      batch.update(doc(db, "invoices", selectedInvoice.id), {
        amountPaid: newPaid,
        amountDue: newDue,
        status: newStatus,
        updatedAt: serverTimestamp()
      })

      const ledgerRef = doc(collection(db, "student_ledger"))
      batch.set(ledgerRef, {
        tenantId: institutionId,
        institutionId,
        studentId: selectedInvoice.studentId,
        date: new Date().toISOString().split('T')[0],
        item: `Payment: ${receiptNumber}`,
        type: "payment",
        amount,
        transactionId: txnId,
        createdAt: serverTimestamp()
      })

      await batch.commit()
      toast({ title: "Authorized", description: `Receipt ${receiptNumber} generated.` })
      setIsPayOpen(false)
      setPaymentForm({ invoiceId: "", amount: "", method: "MTN MoMo", reference: "PENDING" })
    } catch (serverError: any) {
      toast({ variant: "destructive", title: "Transaction Failed" })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTransaction = async (txn: any) => {
    if (!isAuthorizer) {
      toast({ 
        variant: "destructive", 
        title: "Security Authorization Required", 
        description: "Only a Headmaster or Administrator can authorize payment reversals." 
      });
      return;
    }

    if (!db || !confirm("Reverse this payment? This will update the student's invoice and ledger balance.")) return
    
    setLoading(true)
    try {
      const batch = writeBatch(db)
      const invoiceRef = doc(db, "invoices", txn.invoiceId)
      const invSnap = await getDoc(invoiceRef)
      
      if (invSnap.exists()) {
        const inv = invSnap.data()
        const newPaid = Math.max(0, (inv.amountPaid || 0) - txn.amount)
        const newDue = (inv.totalAmount || 0) - newPaid
        batch.update(invoiceRef, { 
          amountPaid: newPaid, 
          amountDue: newDue, 
          status: newDue <= 0 ? "Paid" : newPaid > 0 ? "Partial" : "Unpaid",
          updatedAt: serverTimestamp()
        })
      }
      
      const ledgerQ = query(collection(db, "student_ledger"), where("transactionId", "==", txn.id))
      const ledgerSnap = await getDocs(ledgerQ)
      ledgerSnap.forEach(d => batch.delete(d.ref))
      
      batch.delete(doc(db, "transactions", txn.id))
      
      await batch.commit()
      toast({ title: "Transaction Reversed", description: "Ledger and invoice have been adjusted." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reversal Failed" })
    } finally {
      setLoading(false)
    }
  }

  const handlePrintReceipt = () => {
    window.print();
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Payment Hub</h1>
          <p className="text-muted-foreground font-medium text-sm">Strategic collection processing for the 2026 cycle.</p>
        </div>
        <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2 px-6 font-bold w-full md:w-auto" onClick={() => setIsPayOpen(true)}>
          <ArrowDownLeft className="size-5" /> Receive Payment
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white no-print">
        <CardHeader className="border-b py-6 px-6 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-headline font-bold text-primary">Transaction History</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search ref or student..." className="pl-10 h-11 bg-white border shadow-sm rounded-xl text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[700px]">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold py-4 px-6 uppercase text-[10px] tracking-widest">Reference / Date</TableHead>
                  <TableHead className="font-bold py-4 uppercase text-[10px] tracking-widest">Student</TableHead>
                  <TableHead className="font-bold py-4 uppercase text-[10px] tracking-widest">Method</TableHead>
                  <TableHead className="font-bold py-4 uppercase text-[10px] tracking-widest">Amount</TableHead>
                  <TableHead className="text-right py-4 font-bold px-6 uppercase text-[10px] tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t: any) => (
                  <TableRow key={t.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="px-6">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] font-bold text-accent">{t.reference}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">{new Date(t.date).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm font-bold text-primary">{t.studentName}</span></TableCell>
                    <TableCell><span className="text-xs font-medium">{t.paymentMethod}</span></TableCell>
                    <TableCell><span className="text-sm font-bold text-green-600">GH₵ {t.amount?.toLocaleString()}</span></TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setSelectedTxn(t); setIsReceiptOpen(true); }}><Receipt className="size-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl w-48">
                            <DropdownMenuItem 
                              className="gap-2 text-xs font-bold text-destructive" 
                              onSelect={() => handleDeleteTransaction(t)}
                            >
                              <RotateCcw className="size-4" /> 
                              {isAuthorizer ? 'Reverse Transaction' : 'Authorize Reversal'}
                              {!isAuthorizer && <Lock className="size-3 ml-auto opacity-50" />}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic">No transactional records detected for current cycle.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl h-[90vh] flex flex-col">
          <form onSubmit={handleProcessPayment} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-8 bg-primary text-primary-foreground shrink-0">
              <DialogTitle className="text-2xl font-headline font-bold">Receive Payment</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Authorize fee collection for registry mapping.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1">
              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase">Invoice Lookup</Label>
                  <Select value={paymentForm.invoiceId} onValueChange={v => {
                    const inv = pendingInvoices.find((i: any) => i.id === v)
                    setPaymentForm({...paymentForm, invoiceId: v, amount: inv?.amountDue.toString() || ""})
                  }}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Unpaid Invoice" /></SelectTrigger>
                    <SelectContent>
                      {filteredInvoices.map((inv: any) => (
                        <SelectItem key={inv.id} value={inv.id || "unspecified"}>{inv.studentName} ({inv.invoiceNumber}) • GH₵{inv.amountDue}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-6">
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Amount (GH₵)</Label><Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="h-12 rounded-xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Method</Label>
                    <Select value={paymentForm.method} onValueChange={v => setPaymentForm({...paymentForm, method: v})}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN MoMo">MTN MoMo</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-8 bg-slate-50 border-t shrink-0">
              <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold bg-primary shadow-xl" disabled={loading || !paymentForm.invoiceId}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Authorize Collection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
           <ScrollArea className="max-h-[90vh]">
             <div className="p-10 bg-white space-y-8" id="printable-receipt">
                <div className="text-center space-y-2">
                   <div className="size-16 bg-primary rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg mb-4">
                      <Receipt className="size-8" />
                   </div>
                   <h2 className="text-2xl font-headline font-bold text-primary uppercase">{institution?.name || "Registry Hub"}</h2>
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Official Electronic Receipt</p>
                </div>

                <div className="space-y-4 pt-6 border-t border-dashed">
                   <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-bold uppercase">Reference</span>
                      <span className="font-mono font-bold text-primary">{selectedTxn?.reference}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-bold uppercase">Date</span>
                      <span className="font-bold">{selectedTxn?.date ? new Date(selectedTxn.date).toLocaleDateString() : 'N/A'}</span>
                   </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                   <div className="space-y-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Billed Student</p>
                      <p className="text-sm font-bold text-primary">{selectedTxn?.studentName}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Payment Method</p>
                      <p className="text-sm font-bold text-primary">{selectedTxn?.paymentMethod}</p>
                   </div>
                </div>

                <div className="text-center space-y-2 pt-4">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">Amount Paid</p>
                   <p className="text-4xl font-headline font-bold text-primary">GH₵ {selectedTxn?.amount?.toLocaleString()}</p>
                </div>

                <div className="pt-8 border-t border-dashed text-center">
                   <p className="text-[9px] text-muted-foreground italic font-medium leading-relaxed">
                     "This is an automated transaction record from the 2026 Registry Hub. Please retain for your academic records."
                   </p>
                </div>

                <Button className="w-full h-12 rounded-xl bg-primary font-bold shadow-lg gap-2 no-print" onClick={handlePrintReceipt}>
                  <Printer className="size-4" /> Print Document
                </Button>
             </div>
           </ScrollArea>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 40px;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
