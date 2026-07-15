
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Loader2, 
  Calendar, 
  User, 
  Book, 
  History,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, where, doc, serverTimestamp, updateDoc, writeBatch, getDoc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function LibraryTransactionsPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isBorrowOpen, setIsBorrowOpen] = useState(false)

  const [borrowForm, setBorrowForm] = useState({
    bookId: "",
    borrowerId: "",
    borrowerName: "",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const booksQuery = useMemo(() => institutionId ? query(collection(db!, "library_books"), where("tenantId", "==", institutionId), where("availableCopies", ">", 0)) : null, [db, institutionId])
  const txnsQuery = useMemo(() => institutionId ? query(collection(db!, "library_transactions"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const studentsQuery = useMemo(() => institutionId ? query(collection(db!, "students"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: books } = useCollection(booksQuery)
  const { data: transactions } = useCollection(txnsQuery)
  const { data: students } = useCollection(studentsQuery)

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading || !borrowForm.bookId || !borrowForm.borrowerId) return
    setLoading(true)

    const selectedBook = books.find(b => b.id === borrowForm.bookId)
    const selectedStudent = students.find(s => s.id === borrowForm.borrowerId)

    try {
      const batch = writeBatch(db)
      
      // 1. Record Transaction
      const txnRef = doc(collection(db, "library_transactions"))
      batch.set(txnRef, {
        tenantId: institutionId,
        bookId: borrowForm.bookId,
        bookTitle: selectedBook.title,
        borrowerId: borrowForm.borrowerId,
        borrowerName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        borrowDate: new Date().toISOString().split('T')[0],
        dueDate: borrowForm.dueDate,
        status: "Borrowed",
        createdAt: serverTimestamp()
      })

      // 2. Decrement Book Copies
      batch.update(doc(db, "library_books", borrowForm.bookId), {
        availableCopies: (selectedBook.availableCopies || 1) - 1
      })

      await batch.commit()
      toast({ title: "Book Issued", description: `Issued to ${selectedStudent.firstName}.` })
      setIsBorrowOpen(false)
      setBorrowForm({ bookId: "", borrowerId: "", borrowerName: "", dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async (txn: any) => {
    if (!db || loading) return
    setLoading(true)
    try {
      const batch = writeBatch(db)
      
      // 1. Update Transaction
      batch.update(doc(db, "library_transactions", txn.id), {
        status: "Returned",
        returnDate: new Date().toISOString().split('T')[0]
      })

      // 2. Increment Book Copies
      const bookRef = doc(db, "library_books", txn.bookId)
      const bookSnap = await getDoc(bookRef)
      if (bookSnap.exists()) {
        batch.update(bookRef, {
          availableCopies: (bookSnap.data().availableCopies || 0) + 1
        })
      }

      await batch.commit()
      toast({ title: "Book Returned", description: "Ledger and inventory synchronized." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Return Failed" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary">Circulation Registry</h1>
          <p className="text-muted-foreground">Tracking book borrowing and returns in real-time.</p>
        </div>
        <Button className="gap-2 bg-primary rounded-xl h-11" onClick={() => setIsBorrowOpen(true)}>
          <ArrowUpRight className="size-4" /> Issue Book
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold">BOOK / BORROWER</TableHead>
                <TableHead className="py-4 font-bold">DATES</TableHead>
                <TableHead className="py-4 font-bold">STATUS</TableHead>
                <TableHead className="text-right py-4 font-bold">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t: any) => (
                <TableRow key={t.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{t.bookTitle}</span>
                      <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <User className="size-2.5" /> {t.borrowerName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-[10px] font-mono">
                      <span>Out: {t.borrowDate}</span>
                      <span className={t.status === 'Borrowed' ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                        Due: {t.dueDate}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'Returned' ? 'default' : 'outline'} className={`text-[9px] uppercase ${t.status === 'Returned' ? 'bg-green-600' : 'text-amber-600 border-amber-200'}`}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === 'Borrowed' && (
                      <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase rounded-lg border-primary text-primary hover:bg-primary/5" onClick={() => handleReturn(t)}>
                        Mark Returned
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">No active circulation records.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isBorrowOpen} onOpenChange={setIsBorrowOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <form onSubmit={handleBorrow}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold">Issue Book</DialogTitle>
              <DialogDescription>Authorize book checkout for a student or faculty member.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2">
                <Label>Select Book (Available)</Label>
                <Select required value={borrowForm.bookId} onValueChange={v => setBorrowForm({...borrowForm, bookId: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Search Catalog" /></SelectTrigger>
                  <SelectContent>
                    {books.map(b => <SelectItem key={b.id} value={b.id}>{b.title} ({b.availableCopies} left)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Borrower</Label>
                <Select required value={borrowForm.borrowerId} onValueChange={v => setBorrowForm({...borrowForm, borrowerId: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Search Students" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Return Deadline</Label>
                <Input type="date" required value={borrowForm.dueDate} onChange={e => setBorrowForm({...borrowForm, dueDate: e.target.value})} className="h-12 rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold bg-primary shadow-xl">
                {loading ? <Loader2 className="animate-spin" /> : "Authorize Checkout"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
