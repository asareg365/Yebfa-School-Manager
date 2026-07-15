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
  Printer
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function PaymentsProcessorPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: "",
    amount: "",
    method: "MTN MoMo",
    reference: ""
  })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const invoicesQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "invoices"), where("tenantId", "==", institutionId), where("status", "!=", "Paid"))
  }, [db, institutionId])

  const txnsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "transactions"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: pendingInvoices } = useCollection(invoicesQuery)
  const { data: transactions } = useCollection(txnsQuery)

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || !paymentForm.invoiceId || !paymentForm.amount) return

    setLoading(true)
    const amount = parseFloat(paymentForm.amount)
    const selectedInvoice = pendingInvoices.find(i => i.id === paymentForm.invoiceId)
    
    if (!selectedInvoice) return

    try {
      const batch = writeBatch(db)
      
      // 1. Record Transaction
      const txnRef = doc(collection(db, "transactions"))
      batch.set(txnRef, {
        tenantId: institutionId,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        studentId: selectedInvoice.studentId,
        studentName: selectedInvoice.studentName,
        amount,
        paymentMethod: paymentForm.method,
        reference: paymentForm.reference || `REF-${Date.now()}`,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      })

      // 2. Update Invoice
      const newPaid = (selectedInvoice.amountPaid || 0) + amount
      const newDue = selectedInvoice.totalAmount - newPaid
      const newStatus = newDue <= 0 ? "Paid" : "Partial"

      batch.update(doc(db, "invoices", selectedInvoice.id), {
        amountPaid: newPaid,
        amountDue: newDue,
        status: newStatus,
        updatedAt: serverTimestamp()
      })

      // 3. Post to Student Ledger (Credit)
      const ledgerRef = doc(collection(db, "student_ledger"))
      batch.set(ledgerRef, {
        tenantId: institutionId,
        studentId: selectedInvoice.studentId,
        date: new Date().toISOString().split('T')[0],
        item: `Payment via ${paymentForm.method} - Ref: ${paymentForm.reference}`,
        type: "payment",
        amount,
        createdAt: serverTimestamp()
      })

      await batch.commit()
      toast({ title: "Payment Successful", description: "Ledger updated and receipt issued." })
      setIsPayOpen(false)
      setPaymentForm({ invoiceId: "", amount: "", method: "MTN MoMo", reference: "" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Processing Error", description: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary">Payment Hub</h1>
          <p className="text-muted-foreground">Digital payment processing and cash management.</p>
        </div>
        <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2" onClick={() => setIsPayOpen(true)}>
          <ArrowDownLeft className="size-4" /> Receive Payment
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-md bg-green-50/50 border-green-100">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-green-700 font-bold">Collections (Term)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline text-green-700">GH₵ {transactions.reduce((a, c: any) => a + c.amount, 0).toLocaleString()}</div></CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground font-bold">Daily Intake</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline">GH₵ ---</div></CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search ref or student..." className="pl-9 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold py-4">REFERENCE / DATE</TableHead>
                <TableHead className="font-bold py-4">STUDENT</TableHead>
                <TableHead className="font-bold py-4">METHOD</TableHead>
                <TableHead className="font-bold py-4">AMOUNT</TableHead>
                <TableHead className="text-right py-4 font-bold">RECEIPT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t: any) => (
                <TableRow key={t.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-[10px] font-bold text-accent">{t.reference}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{new Date(t.date).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs font-bold text-primary">{t.studentName}</span></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       {t.paymentMethod.includes('MoMo') ? <Smartphone className="size-3 text-blue-600" /> : <CreditCard className="size-3 text-slate-600" />}
                       <span className="text-xs font-medium">{t.paymentMethod}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm font-bold text-green-600">GH₵ {t.amount.toLocaleString()}</span></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary"><Receipt className="size-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No transaction records detected.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <form onSubmit={handleProcessPayment}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold">Authorize Payment</DialogTitle>
              <DialogDescription>Process institutional fee collection and update the ledger.</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-6">
              <div className="space-y-2">
                <Label>Select Active Invoice</Label>
                <Select value={paymentForm.invoiceId} onValueChange={v => {
                  const inv = pendingInvoices.find(i => i.id === v)
                  setPaymentForm({...paymentForm, invoiceId: v, amount: inv?.amountDue.toString() || ""})
                }}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Invoice" /></SelectTrigger>
                  <SelectContent>
                    {pendingInvoices.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.studentName} (Due: GH₵{inv.amountDue})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (GH₵)</Label>
                  <Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentForm.method} onValueChange={v => setPaymentForm({...paymentForm, method: v})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN MoMo">MTN MoMo</SelectItem>
                      <SelectItem value="Telecel Cash">Telecel Cash</SelectItem>
                      <SelectItem value="AirtelTigo">AirtelTigo Money</SelectItem>
                      <SelectItem value="Card">Visa/Mastercard</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Network Reference / Receipt #</Label>
                <Input placeholder="Enter Txn ID" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} className="h-12 rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold bg-primary shadow-xl" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />} Confirm Collection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}