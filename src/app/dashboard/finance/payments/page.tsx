
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
    reference: "PENDING"
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
    if (!db || !institutionId || !institution || !paymentForm.invoiceId || !paymentForm.amount) return

    setLoading(true)
    const amount = parseFloat(paymentForm.amount)
    const selectedInvoice = pendingInvoices.find((i: any) => i.id === paymentForm.invoiceId)
    
    if (!selectedInvoice) {
      setLoading(false)
      return
    }

    const receiptNumber = await generateId('receipts', institution.schoolCode, 'RCPT');

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
      setPaymentForm({ invoiceId: "", amount: "", method: "MTN MoMo", reference: "PENDING" })
    } catch (serverError: any) {
      toast({ variant: "destructive", title: "Transaction Failed", description: serverError.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTransaction = async (txn: any) => {
    if (!db || !confirm("Reverse this payment?")) return
    setLoading(true)
    try {
      const batch = writeBatch(db)
      const invoiceRef = doc(db, "invoices", txn.invoiceId)
      const invSnap = await getDoc(invoiceRef)
      if (invSnap.exists()) {
        const inv = invSnap.data()
        const newPaid = Math.max(0, (inv.amountPaid || 0) - txn.amount)
        const newDue = (inv.totalAmount || 0) - newPaid
        batch.update(invoiceRef, { amountPaid: newPaid, amountDue: newDue, status: newDue <= 0 ? "Paid" : newPaid > 0 ? "Partial" : "Unpaid" })
      }
      const ledgerQ = query(collection(db, "student_ledger"), where("transactionId", "==", txn.id))
      const ledgerSnap = await getDocs(ledgerQ)
      ledgerSnap.forEach(d => batch.delete(d.ref))
      batch.delete(doc(db, "transactions", txn.id))
      await batch.commit()
      toast({ title: "Transaction Reversed" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reversal Failed" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Payment Hub</h1>
          <p className="text-muted-foreground font-medium">Digital collection processing and institutional cash management.</p>
        </div>
        <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2 px-6 font-bold" onClick={() => setIsPayOpen(true)}>
          <ArrowDownLeft className="size-5" /> Receive Payment
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b py-6 px-6 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-headline font-bold text-primary">Transaction History</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search ref or student..." className="pl-10 h-11 bg-white border-none shadow-sm rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                        <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl w-40">
                          <DropdownMenuItem className="gap-2 text-xs font-bold text-destructive" onSelect={() => handleDeleteTransaction(t)}><RotateCcw className="size-4" /> Reverse</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <form onSubmit={handleProcessPayment}>
            <DialogHeader className="p-8 bg-primary text-primary-foreground">
              <DialogTitle className="text-2xl font-headline font-bold">Receive Payment</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Authorize fee collection and update registry ledger.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <Label>Student Invoice Lookup</Label>
                <Select value={paymentForm.invoiceId} onValueChange={v => {
                  const inv = pendingInvoices.find((i: any) => i.id === v)
                  setPaymentForm({...paymentForm, invoiceId: v, amount: inv?.amountDue.toString() || ""})
                }}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Unpaid Invoice" /></SelectTrigger>
                  <SelectContent>
                    {filteredInvoices.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>{inv.studentName} ({inv.invoiceNumber}) • Due: GH₵{inv.amountDue}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Amount (GH₵)</Label><Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Method</Label>
                  <Select value={paymentForm.method} onValueChange={v => setPaymentForm({...paymentForm, method: v})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="MTN MoMo">MTN MoMo</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Cash">Cash</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t">
              <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold bg-primary" disabled={loading || !paymentForm.invoiceId}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Authorize Collection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
