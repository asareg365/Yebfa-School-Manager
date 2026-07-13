"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, Search, Plus, Loader2, User, Receipt, Banknote, Trash2, ArrowUpRight, CheckCircle2 } from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, deleteDoc, doc, getDocs } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

export default function PersonalFeeLedgerPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isEntryOpen, setIsFeeEntryOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [entryForm, setEntryForm] = useState({ type: "charge", item: "", amount: "" })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "students"), where("institutionId", "==", institutionId))
  }, [db, institutionId])

  const feesQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "approved_fees"), where("institutionId", "==", institutionId))
  }, [db, institutionId])

  const { data: students } = useCollection(studentsQuery)
  const { data: approvedFees } = useCollection(feesQuery)

  const ledgerQuery = useMemo(() => {
    if (!db || !selectedStudent) return null
    return query(collection(db, "student_ledger"), where("studentId", "==", selectedStudent.id))
  }, [db, selectedStudent])

  const { data: ledger, loading: ledgerLoading } = useCollection(ledgerQuery)

  const balance = useMemo(() => {
    return ledger.reduce((acc, curr: any) => {
      return curr.type === 'charge' ? acc + curr.amount : acc - curr.amount
    }, 0)
  }, [ledger])

  const handlePostEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !selectedStudent || !institutionId) return
    setLoading(true)
    const data = {
      ...entryForm,
      amount: parseFloat(entryForm.amount),
      studentId: selectedStudent.id,
      institutionId,
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    }
    try {
      await addDoc(collection(db, "student_ledger"), data)
      toast({ title: "Ledger Synchronized", description: `${entryForm.type === 'charge' ? 'Debt' : 'Payment'} recorded successfully.` })
      setIsFeeEntryOpen(false)
      setEntryForm({ type: "charge", item: "", amount: "" })
    } catch (e: any) { toast({ variant: "destructive", title: "Sync Error", description: e.message }) } finally { setLoading(false) }
  }

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db!, "student_ledger", id))
      toast({ title: "Entry Removed", description: "Audit trail updated." })
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }) }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Personal Fee Ledger</h1>
          <p className="text-muted-foreground">Managing individual student financial accounts.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1 border-none shadow-md overflow-hidden h-fit">
          <CardHeader className="bg-white border-b"><CardTitle className="text-sm">Student Selection</CardTitle></CardHeader>
          <CardContent className="p-0">
             <div className="p-4"><div className="relative"><Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" /><Input placeholder="Search name/ID..." className="pl-9 h-9" /></div></div>
             <div className="divide-y max-h-[400px] overflow-y-auto">
               {students.map((s: any) => (
                 <button key={s.id} onClick={() => setSelectedStudent(s)} className={`w-full text-left p-4 hover:bg-slate-50 flex items-center gap-3 transition-colors ${selectedStudent?.id === s.id ? 'bg-primary/5 border-l-4 border-primary' : ''}`}>
                    <div className="size-8 rounded-full bg-muted overflow-hidden flex items-center justify-center border shrink-0">
                      {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="size-4 opacity-20" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-primary uppercase">{s.firstName} {s.lastName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{s.studentId}</span>
                    </div>
                 </button>
               ))}
             </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle>Account Overview</CardTitle>
              <CardDescription>{selectedStudent ? `Ledger for ${selectedStudent.firstName} ${selectedStudent.lastName}` : "Select a student to view balance."}</CardDescription>
            </div>
            {selectedStudent && (
              <Button className="gap-2 bg-primary" onClick={() => setIsFeeEntryOpen(true)}><Plus className="size-4" /> Add Transaction</Button>
            )}
          </CardHeader>
          <CardContent className="p-0 min-h-[400px]">
            {!selectedStudent ? (
              <div className="h-96 flex flex-col items-center justify-center text-muted-foreground opacity-20"><Wallet className="size-20 mb-4" /><p>Awaiting Student Authentication...</p></div>
            ) : ledgerLoading ? (
              <div className="h-96 flex items-center justify-center"><Loader2 className="size-10 animate-spin text-primary" /></div>
            ) : (
              <div className="p-8 space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Outstanding Balance</p><h3 className={`text-3xl font-bold font-headline ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>GH₵ {balance.toLocaleString()}</h3></div>
                    <Banknote className="size-10 text-primary/10" />
                  </div>
                  <div className="p-6 rounded-2xl bg-primary text-primary-foreground flex items-center justify-between shadow-xl">
                    <div><p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">Total Payments</p><h3 className="text-3xl font-bold font-headline">GH₵ {ledger.filter((l:any) => l.type === 'payment').reduce((a,c:any)=>a+c.amount, 0).toLocaleString()}</h3></div>
                    <CheckCircle2 className="size-10 opacity-20" />
                  </div>
                </div>

                <Table>
                  <TableHeader className="bg-muted/30"><TableRow><TableHead>Date</TableHead><TableHead>Description / Item</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ledger.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-[10px] font-mono">{entry.date}</TableCell>
                        <TableCell className="font-bold">{entry.item}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[9px] uppercase ${entry.type === 'charge' ? 'text-destructive border-destructive/20 bg-destructive/5' : 'text-green-600 border-green-200 bg-green-50'}`}>{entry.type}</Badge></TableCell>
                        <TableCell className="text-right font-bold">GH₵ {entry.amount}</TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteEntry(entry.id)}><Trash2 className="size-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {ledger.length === 0 && <TableRow><TableCell colSpan={5} className="h-32 text-center italic text-muted-foreground">No financial activity recorded for this session.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEntryOpen} onOpenChange={setIsFeeEntryOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl">
          <form onSubmit={handlePostEntry}>
            <DialogHeader><DialogTitle>New Ledger Entry</DialogTitle><DialogDescription>Posting transaction to {selectedStudent?.firstName}'s account.</DialogDescription></DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2"><Label>Entry Type</Label>
                <Select onValueChange={v => setEntryForm({...entryForm, type: v})} value={entryForm.type}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="charge">Debit (Charge Fee/Item)</SelectItem><SelectItem value="payment">Credit (Record Payment)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{entryForm.type === 'charge' ? 'Select Approved Fee' : 'Payment For'}</Label>
                {entryForm.type === 'charge' ? (
                  <Select onValueChange={v => {
                    const fee = approvedFees.find(f => f.name === v);
                    setEntryForm({...entryForm, item: v, amount: fee?.defaultAmount.toString() || ""});
                  }}><SelectTrigger><SelectValue placeholder="Choose fee item" /></SelectTrigger>
                    <SelectContent>{approvedFees.map((f: any) => <SelectItem key={f.id} value={f.name}>{f.name} (GH₵{f.defaultAmount})</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Input required value={entryForm.item} onChange={e => setEntryForm({...entryForm, item: e.target.value})} placeholder="e.g. Cash Payment, MoMo Transfer" />}
              </div>
              <div className="space-y-2"><Label>Amount (GH₵)</Label><Input type="number" required value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} className="h-11 font-bold text-lg" /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={loading} className="w-full h-12">{loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Receipt className="size-4 mr-2" />} Authorize Posting</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
