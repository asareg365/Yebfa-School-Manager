
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, Search, Plus, Loader2, User, Receipt, Banknote, Trash2, CheckCircle2 } from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

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
    return query(collection(db, "students"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: students } = useCollection(studentsQuery)

  const ledgerQuery = useMemo(() => {
    if (!db || !selectedStudent) return null
    return query(collection(db, "student_ledger"), where("studentId", "==", selectedStudent.id), where("tenantId", "==", institutionId))
  }, [db, selectedStudent, institutionId])

  const { data: ledger, loading: ledgerLoading } = useCollection(ledgerQuery)

  const balance = useMemo(() => {
    return ledger.reduce((acc, curr: any) => curr.type === 'charge' ? acc + curr.amount : acc - curr.amount, 0)
  }, [ledger])

  const handlePostEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !selectedStudent || !institutionId) return
    setLoading(true)
    try {
      await addDoc(collection(db, "student_ledger"), {
        ...entryForm,
        tenantId: institutionId,
        amount: parseFloat(entryForm.amount),
        studentId: selectedStudent.id,
        institutionId,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      })
      toast({ title: "Ledger Synchronized", description: "Transaction recorded." })
      setIsFeeEntryOpen(false)
      setEntryForm({ type: "charge", item: "", amount: "" })
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }) } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-headline font-bold text-primary">Personal Fee Ledger</h1><p className="text-muted-foreground">Managing individual student financial accounts.</p></div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1 border-none shadow-md overflow-hidden h-fit">
          <CardHeader className="bg-white border-b"><CardTitle className="text-sm">Students</CardTitle></CardHeader>
          <CardContent className="p-0">
             <div className="divide-y max-h-[400px] overflow-y-auto">
               {students.map((s: any) => (
                 <button key={s.id} onClick={() => setSelectedStudent(s)} className={`w-full text-left p-4 hover:bg-slate-50 flex items-center gap-3 ${selectedStudent?.id === s.id ? 'bg-primary/5 border-l-4 border-primary' : ''}`}>
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover rounded-full" /> : <User className="size-4 opacity-20" />}</div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-primary uppercase">{s.firstName} {s.lastName}</span><span className="text-[10px] text-muted-foreground font-mono">{s.studentId}</span></div>
                 </button>
               ))}
             </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-md overflow-hidden bg-white min-h-[400px]">
          <CardHeader className="border-b flex flex-row items-center justify-between">
            <div><CardTitle>Account Overview</CardTitle><CardDescription>{selectedStudent ? `Ledger for ${selectedStudent.firstName}` : "Select a student."}</CardDescription></div>
            {selectedStudent && <Button className="gap-2 bg-primary" onClick={() => setIsFeeEntryOpen(true)}><Plus className="size-4" /> Add Transaction</Button>}
          </CardHeader>
          <CardContent className="p-8">
            {!selectedStudent ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-20"><Wallet className="size-16 mb-2" /><p>Awaiting Student Selection...</p></div>
            ) : ledgerLoading ? (
              <div className="h-64 flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="p-6 rounded-2xl bg-slate-50 border flex items-center justify-between">
                    <div><p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Balance</p><h3 className={`text-3xl font-bold font-headline ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>GH₵ {balance.toLocaleString()}</h3></div>
                    <Banknote className="size-10 text-primary/10" />
                  </div>
                </div>
                <Table>
                  <TableHeader className="bg-muted/30"><TableRow><TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ledger.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-[10px] font-mono">{entry.date}</TableCell>
                        <TableCell className="font-bold">{entry.item}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[9px] uppercase ${entry.type === 'charge' ? 'text-destructive' : 'text-green-600'}`}>{entry.type}</Badge></TableCell>
                        <TableCell className="text-right font-bold">GH₵ {entry.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEntryOpen} onOpenChange={setIsFeeEntryOpen}>
        <DialogContent><form onSubmit={handlePostEntry}>
          <DialogHeader><DialogTitle>New Entry</DialogTitle></DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2"><Label>Type</Label><Select onValueChange={v => setEntryForm({...entryForm, type: v})} value={entryForm.type}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="charge">Debit (Charge)</SelectItem><SelectItem value="payment">Credit (Payment)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Description</Label><Input required value={entryForm.item} onChange={e => setEntryForm({...entryForm, item: e.target.value})} placeholder="e.g. Term Tuition" /></div>
            <div className="space-y-2"><Label>Amount (GH₵)</Label><Input type="number" required value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={loading} className="w-full">Authorize Posting</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>
    </div>
  )
}
