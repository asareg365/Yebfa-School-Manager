
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wallet, Search, Plus, Loader2, User, Receipt, Banknote, Trash2, CheckCircle2, Filter, X } from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function PersonalFeeLedgerPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isEntryOpen, setIsFeeEntryOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [entryForm, setEntryForm] = useState({ type: "charge", item: "", amount: "" })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "students"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: students = [], loading: studentsLoading } = useCollection(studentsQuery)

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase())
    ).sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [students, studentSearch])

  const ledgerQuery = useMemo(() => {
    if (!db || !selectedStudent) return null
    return query(collection(db, "student_ledger"), where("studentId", "==", selectedStudent.id), where("tenantId", "==", institutionId))
  }, [db, selectedStudent, institutionId])

  const { data: ledger, loading: ledgerLoading } = useCollection(ledgerQuery)

  const balance = useMemo(() => {
    return ledger.reduce((acc, curr: any) => curr.type === 'charge' ? acc - curr.amount : acc + curr.amount, 0)
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Personal Fee Ledger</h1>
          <p className="text-muted-foreground font-medium">Strategic financial oversight for individual student accounts.</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-4">
        <Card className="md:col-span-1 border-none shadow-xl overflow-hidden rounded-3xl bg-white h-fit">
          <CardHeader className="bg-slate-50 border-b p-6 space-y-4">
             <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Users className="size-4" /> Student Registry
             </CardTitle>
             <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search name or ID..." 
                  className="pl-10 h-11 rounded-xl bg-white border-none shadow-sm text-sm" 
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                {studentSearch && (
                  <button onClick={() => setStudentSearch("")} className="absolute right-3 top-3 text-muted-foreground hover:text-primary">
                     <X className="size-4" />
                  </button>
                )}
             </div>
          </CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {filteredStudents.map((s: any) => (
                    <button 
                      key={s.id} 
                      onClick={() => setSelectedStudent(s)} 
                      className={`w-full text-left p-5 hover:bg-slate-50 flex items-center gap-4 transition-all ${selectedStudent?.id === s.id ? 'bg-primary/5 border-l-4 border-primary' : ''}`}
                    >
                        <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border overflow-hidden">
                          {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="size-5 opacity-20" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-primary truncate leading-tight">{s.firstName} {s.lastName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono font-bold mt-0.5">{s.admissionNumber}</span>
                        </div>
                    </button>
                  ))}
                  {filteredStudents.length === 0 && (
                    <div className="p-12 text-center text-xs text-muted-foreground italic">No students match your search.</div>
                  )}
                </div>
             </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-2xl overflow-hidden bg-white rounded-3xl min-h-[600px]">
          <CardHeader className="border-b bg-slate-50/50 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <CardTitle className="text-xl font-headline font-bold text-primary">Financial Statement</CardTitle>
              <CardDescription className="font-medium">{selectedStudent ? `Personal ledger audit for ${selectedStudent.firstName} ${selectedStudent.lastName}` : "Awaiting student selection from registry."}</CardDescription>
            </div>
            {selectedStudent && (
              <Button className="gap-2 bg-primary h-11 rounded-xl shadow-lg px-6 font-bold" onClick={() => setIsFeeEntryOpen(true)}>
                <Plus className="size-4" /> Authorize Entry
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-8">
            {!selectedStudent ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground opacity-20 space-y-4">
                <div className="size-24 rounded-full bg-muted flex items-center justify-center">
                  <Wallet className="size-12" />
                </div>
                <p className="font-bold uppercase tracking-widest text-xs">Registry Node Unselected</p>
              </div>
            ) : ledgerLoading ? (
              <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="size-10 animate-spin text-primary opacity-20" />
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in duration-300">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="p-8 rounded-3xl bg-slate-50 border flex items-center justify-between shadow-sm group">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Net Position</p>
                      <h3 className={`text-3xl font-bold font-headline ${balance < 0 ? 'text-destructive' : balance > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                        GH₵ {balance.toLocaleString()}
                      </h3>
                      <div className="mt-3">
                        <Badge className={`border-none text-[8px] font-bold uppercase px-3 ${balance < 0 ? 'bg-destructive/10 text-destructive' : balance > 0 ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                          {balance < 0 ? "Outstanding Debt" : balance > 0 ? "Institutional Credit" : "Account Balanced"}
                        </Badge>
                      </div>
                    </div>
                    <Banknote className="size-12 text-primary opacity-10 group-hover:scale-110 transition-transform" />
                  </div>
                </div>

                <div className="border rounded-2xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="py-4 font-bold px-6">DATE</TableHead>
                        <TableHead className="py-4 font-bold">DESCRIPTION</TableHead>
                        <TableHead className="py-4 font-bold">ENTRY TYPE</TableHead>
                        <TableHead className="text-right py-4 font-bold px-6">AMOUNT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.sort((a:any, b:any) => b.date.localeCompare(a.date)).map((entry: any) => (
                        <TableRow key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="px-6 text-[10px] font-mono font-bold text-accent">{entry.date}</TableCell>
                          <TableCell><span className="font-bold text-primary text-xs">{entry.item}</span></TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[9px] uppercase font-bold border-none px-3 ${entry.type === 'charge' ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-600'}`}>
                              {entry.type === 'charge' ? 'Debit (Charge)' : 'Credit (Payment)'}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right px-6 font-bold text-sm ${entry.type === 'charge' ? 'text-destructive' : 'text-green-600'}`}>
                            {entry.type === 'charge' ? '-' : '+'} GH₵ {entry.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {ledger.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-32 text-muted-foreground italic">
                            No transactional records detected for this student in the 2026 cycle.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex justify-center pt-8 border-t">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
                    <CheckCircle2 className="size-3 text-green-600" /> Authorized Ledger Audit • Institutional Hub 2026
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEntryOpen} onOpenChange={setIsFeeEntryOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <form onSubmit={handlePostEntry}>
            <DialogHeader className="p-8 bg-primary text-primary-foreground">
              <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <Receipt className="size-6 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-headline font-bold">Manual Ledger Posting</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Authorize a direct debit or credit entry for {selectedStudent?.firstName}.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Transaction Type</Label>
                <Select onValueChange={v => setEntryForm({...entryForm, type: v})} value={entryForm.type}>
                  <SelectTrigger className="h-11 rounded-xl shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="charge">Debit (Record Charge)</SelectItem>
                    <SelectItem value="payment">Credit (Record Payment)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Description</Label>
                <Input required value={entryForm.item} onChange={e => setEntryForm({...entryForm, item: e.target.value})} placeholder="e.g. Field Trip Fee" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Amount (GH₵)</Label>
                <Input type="number" required value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} className="h-11 rounded-xl font-bold text-lg" />
              </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t">
              <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-primary font-bold shadow-xl">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Authorize Posting"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
