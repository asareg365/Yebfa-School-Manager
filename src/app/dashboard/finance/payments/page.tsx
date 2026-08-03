"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
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
  RotateCcw
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

export default function PaymentsProcessorPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  
  // UI Dialog States
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [invoiceFilter, setInvoiceFilter] = useState("")
  
  const [selectedTxn, setSelectedTxn] = useState<any>(null)
  
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: "",
    amount: "",
    method: "MTN MoMo",
    reference: "RCPT-XXXXXX"
  })

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)

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
    if (!db || !institutionId || !paymentForm.invoiceId || !paymentForm.amount) return

    setLoading(true)
    const amount = parseFloat(paymentForm.amount)
    const selectedInvoice = pendingInvoices.find((i: any) => i.id === paymentForm.invoiceId)
    
    if (!selectedInvoice) {
      setLoading(false)
      return
    }

    // Goal 1: Transactional ID Generation for Receipts
    const receiptNumber = await generateId('receipts', 'RCPT-');

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

    try {
      const batch = writeBatch(db)
      const txnRef = doc(collection(db, "transactions"))
      const txnId = txnRef.id

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
      toast({ title: "Payment Authorized", description: `Receipt ${receiptNumber} generated.` })
      setIsPayOpen(false)
      setPaymentForm({ invoiceId: "", amount: "", method: "MTN MoMo", reference: "RCPT-XXXXXX" })
    } catch (serverError: any) {
      const permissionError = new FirestorePermissionError({
        path: 'transactions/invoices',
        operation: 'write',
        requestResourceData: payload,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTransaction = async (txn: any) => {
    if (!db || !confirm("Are you sure you want to reverse this payment? This will increase the student's debt and synchronize the ledger.")) return
    
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
          status: newDue <= 0 ? "Paid" : newPaid > 0 ? "Partial" : "Unpaid"
        })
      }

      const ledgerQ = query(collection(db, "student_ledger"), where("transactionId", "==", txn.id))
      const ledgerSnap = await getDocs(ledgerQ)
      ledgerSnap.forEach(d => batch.delete(d.ref))

      batch.delete(doc(db, "transactions", txn.id))

      await batch.commit()
      toast({ title: "Transaction Reversed", description: "Audit trail and invoice balance restored." })
    } catch (serverError: any) {
       const permissionError = new FirestorePermissionError({
        path: `transactions/${txn.id}`,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !selectedTxn || loading) return
    
    setLoading(true)
    const newAmount = parseFloat(paymentForm.amount)
    try {
      const batch = writeBatch(db)
      const oldAmount = selectedTxn.amount
      const diff = newAmount - oldAmount

      batch.update(doc(db, "transactions", selectedTxn.id), {
        amount: newAmount,
        paymentMethod: paymentForm.method,
        updatedAt: serverTimestamp()
      })

      const invoiceRef = doc(db, "invoices", selectedTxn.invoiceId)
      const invSnap = await getDoc(invoiceRef)
      if (invSnap.exists()) {
        const inv = invSnap.data()
        const newPaid = (inv.amountPaid || 0) + diff
        const newDue = Math.max(0, (inv.totalAmount || 0) - newPaid)
        batch.update(invoiceRef, {
          amountPaid: newPaid,
          amountDue: newDue,
          status: newDue <= 0 ? "Paid" : newPaid > 0 ? "Partial" : "Unpaid"
        })
      }

      const ledgerQ = query(collection(db, "student_ledger"), where("transactionId", "==", selectedTxn.id))
      const ledgerSnap = await getDocs(ledgerQ)
      ledgerSnap.forEach(d => batch.update(d.ref, { amount: newAmount }))

      await batch.commit()
      toast({ title: "Registry Corrected", description: "Payment details and balances updated." })
      setIsEditOpen(false)
    } catch (serverError: any) {
      const permissionError = new FirestorePermissionError({
        path: `transactions/${selectedTxn.id}`,
        operation: 'update',
        requestResourceData: { amount: newAmount },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Payment Hub</h1>
          <p className="text-muted-foreground font-medium">Digital collection processing and institutional cash management.</p>
        </div>
        <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2 px-6 font-bold" onClick={() => {
          setPaymentForm({ invoiceId: "", amount: "", method: "MTN MoMo", reference: "RCPT-XXXXXX" });
          setIsPayOpen(true);
        }}>
          <ArrowDownLeft className="size-5" /> Receive Payment
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-md bg-green-50/50 border-green-100 group">
          <CardHeader className="pb-2">
             <div className="flex justify-between items-center">
                <CardTitle className="text-xs uppercase text-green-700 font-bold tracking-widest">Gross Collections</CardTitle>
                <Banknote className="size-4 text-green-600 opacity-40 group-hover:scale-110 transition-transform" />
             </div>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline text-green-700">GH₵ {rawTransactions.reduce((a, c: any) => a + (c.amount || 0), 0).toLocaleString()}</div></CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground font-bold tracking-widest">Entry Registry</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline">{rawTransactions.length} Items</div></CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b py-6 px-6 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-headline font-bold text-primary">Transaction History</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search ref or student..." 
                className="pl-10 h-11 bg-white border shadow-sm rounded-xl" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold py-4 px-6">REFERENCE / DATE</TableHead>
                <TableHead className="font-bold py-4">STUDENT</TableHead>
                <TableHead className="font-bold py-4">METHOD</TableHead>
                <TableHead className="font-bold py-4">AMOUNT</TableHead>
                <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t: any) => (
                <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="px-6">
                    <div className="flex flex-col">
                      <span className="font-mono text-[10px] font-bold text-accent">{t.reference}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">{new Date(t.date).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm font-bold text-primary">{t.studentName}</span></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       {t.paymentMethod?.includes('MoMo') ? <Smartphone className="size-3 text-blue-600" /> : <CreditCard className="size-3 text-slate-600" />}
                       <span className="text-xs font-medium">{t.paymentMethod}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm font-bold text-green-600">GH₵ {t.amount?.toLocaleString()}</span></TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary" onClick={() => { setSelectedTxn(t); setIsReceiptOpen(true); }} title="Generate Receipt">
                        <Receipt className="size-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl w-40">
                          <DropdownMenuItem className="gap-2 text-xs font-bold" onSelect={() => {
                            setSelectedTxn(t);
                            setPaymentForm({ invoiceId: t.invoiceId, amount: t.amount.toString(), method: t.paymentMethod, reference: t.reference });
                            setIsEditOpen(true);
                          }}>
                            <Pencil className="size-4" /> Edit Record
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs font-bold text-destructive" onSelect={() => handleDeleteTransaction(t)}>
                            <RotateCcw className="size-4" /> Reverse Payment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-32 text-muted-foreground italic bg-slate-50/50">No transaction records found in current term registry.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Processing Dialog */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <form onSubmit={handleProcessPayment}>
            <DialogHeader className="p-8 bg-primary text-primary-foreground">
              <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                 <ArrowDownLeft className="size-6 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-headline font-bold">Receive Payment</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Authorize institutional fee collection and update registry ledger.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Student Invoice Lookup</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search name or INV#..." 
                    className="pl-10 h-12 rounded-xl"
                    value={invoiceFilter}
                    onChange={(e) => setInvoiceFilter(e.target.value)}
                  />
                </div>
                <Select value={paymentForm.invoiceId} onValueChange={v => {
                  const inv = pendingInvoices.find((i: any) => i.id === v)
                  setPaymentForm({...paymentForm, invoiceId: v, amount: inv?.amountDue.toString() || ""})
                }}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Unpaid Invoice" /></SelectTrigger>
                  <SelectContent>
                    {filteredInvoices.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        <div className="flex flex-col">
                           <span className="font-bold">{inv.studentName}</span>
                           <span className="text-[10px] opacity-60">{inv.invoiceNumber} • Due: GH₵{inv.amountDue}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {filteredInvoices.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">No matching unpaid invoices found.</div>}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Amount (GH₵)</Label>
                  <Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="h-12 rounded-xl font-bold text-primary" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Method</Label>
                  <Select value={paymentForm.method} onValueChange={v => setPaymentForm({...paymentForm, method: v})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN MoMo">MTN MoMo</SelectItem>
                      <SelectItem value="Telecel Cash">Telecel Cash</SelectItem>
                      <SelectItem value="AirtelTigo">AirtelTigo</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Physical Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Transaction ID</Label>
                <div className="h-12 px-4 rounded-xl bg-slate-50 flex items-center border border-dashed border-slate-200">
                  <Badge variant="secondary" className="font-mono text-xs font-bold uppercase bg-slate-200 text-slate-600 border-none">
                    {paymentForm.reference}
                  </Badge>
                </div>
              </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t">
              <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold bg-primary shadow-xl" disabled={loading || !paymentForm.invoiceId}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />} Authorize Collection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <form onSubmit={handleUpdateTransaction}>
            <DialogHeader className="p-8 bg-slate-50 border-b">
              <DialogTitle className="text-2xl font-headline font-bold">Edit Transaction</DialogTitle>
              <DialogDescription>Correct errors in payment amount or method for {selectedTxn?.studentName}.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label>Amount (GH₵)</Label>
                <Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="h-12 rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentForm.method} onValueChange={v => setPaymentForm({...paymentForm, method: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN MoMo">MTN MoMo</SelectItem>
                    <SelectItem value="Telecel Cash">Telecel Cash</SelectItem>
                    <SelectItem value="AirtelTigo">AirtelTigo</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t">
              <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl font-bold bg-primary shadow-xl">
                 {loading ? <Loader2 className="animate-spin mr-2" /> : "Authorize Correction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Digital Receipt View */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
           <DialogHeader className="sr-only">
             <DialogTitle>Digital Receipt Preview</DialogTitle>
             <DialogDescription>Verified transaction record for fee collection.</DialogDescription>
           </DialogHeader>
           <div className="receipt-view p-10 space-y-8 bg-white" id="receipt-printable">
              <div className="flex justify-between items-start">
                 <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                       {institution?.logoUrl ? <img src={institution.logoUrl} className="size-10 object-contain" /> : <Building2 className="size-10 text-primary" />}
                       <h2 className="text-xl font-headline font-bold text-primary uppercase tracking-tighter">{institution?.name || "Registry Hub"}</h2>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{institution?.location || "Ahafo Region, Ghana"}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">{institution?.phone}</p>
                 </div>
                 <div className="text-right">
                    <Badge className="bg-primary text-white border-none text-[8px] font-bold uppercase mb-2">Verified Receipt</Badge>
                    <p className="text-[10px] font-mono font-bold text-accent">#{selectedTxn?.reference}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedTxn?.date ? new Date(selectedTxn.date).toLocaleString() : ''}</p>
                 </div>
              </div>

              <div className="py-6 border-y border-dashed space-y-4">
                 <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground uppercase font-bold">Received From</span>
                    <span className="font-bold text-primary">{selectedTxn?.studentName}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground uppercase font-bold">Payment Method</span>
                    <span className="font-bold text-primary">{selectedTxn?.paymentMethod}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground uppercase font-bold">Invoice Reference</span>
                    <span className="font-mono font-bold text-accent">{selectedTxn?.invoiceNumber}</span>
                 </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl flex justify-between items-center">
                 <span className="text-sm font-bold uppercase text-primary">Amount Paid</span>
                 <span className="text-3xl font-headline font-bold text-primary">GH₵ {selectedTxn?.amount?.toLocaleString()}</span>
              </div>

              <div className="pt-4 flex flex-col items-center gap-4">
                 <div className="size-16 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="size-10" />
                 </div>
                 <p className="text-[10px] text-center text-muted-foreground leading-relaxed italic max-w-xs">
                    This is an electronically generated receipt for fees processed in the 2026 Registry Hub. No physical signature required.
                 </p>
              </div>

              <div className="flex justify-center pt-6 no-print">
                 <Button className="gap-2 rounded-xl h-11 px-8 bg-primary" onClick={() => window.print()}>
                    <Printer className="size-4" /> Print Registry Receipt
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-view, .receipt-view * { visibility: visible; }
          .receipt-view { position: fixed; left: 0; top: 0; width: 100%; height: 100%; padding: 40px; }
          .no-print { display: none !important; }
        }
      `}</style>

    </div>
  )
}
