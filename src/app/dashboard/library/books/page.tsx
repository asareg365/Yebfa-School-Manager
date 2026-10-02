
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Book, 
  Plus, 
  Search, 
  Trash2, 
  Pencil, 
  Loader2, 
  Barcode, 
  BookOpen,
  Filter,
  Library
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, where, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function LibraryCatalogPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    barcode: "",
    category: "Academic",
    totalCopies: 1,
    availableCopies: 1,
    shelfLocation: ""
  })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const booksQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "library_books"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: books, loading: dataLoading } = useCollection(booksQuery)

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    
    const data = {
      ...bookForm,
      totalCopies: parseInt(bookForm.totalCopies.toString()),
      availableCopies: parseInt(bookForm.totalCopies.toString()),
      tenantId: institutionId,
      createdAt: serverTimestamp()
    }

    try {
      await addDoc(collection(db, "library_books"), data)
      toast({ title: "Book Cataloged", description: `${bookForm.title} added to collection.` })
      setIsAddOpen(false)
      setBookForm({ title: "", author: "", isbn: "", barcode: "", category: "Academic", totalCopies: 1, availableCopies: 1, shelfLocation: "" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const filteredBooks = books.filter(b => 
    b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary">Library Catalog</h1>
          <p className="text-muted-foreground">Managing {books.length} unique titles in the institutional collection.</p>
        </div>
        <Button className="gap-2 bg-primary rounded-xl h-11 shadow-lg" onClick={() => setIsAddOpen(true)}>
          <Plus className="size-4" /> Add New Book
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
         <Card className="border-none shadow-md">
            <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Total Volumes</CardDescription></CardHeader>
            <CardContent><div className="text-2xl font-bold font-headline">{books.reduce((a, c: any) => a + (c.totalCopies || 0), 0)}</div></CardContent>
         </Card>
         <Card className="border-none shadow-md">
            <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Available</CardDescription></CardHeader>
            <CardContent><div className="text-2xl font-bold font-headline text-green-600">{books.reduce((a, c: any) => a + (c.availableCopies || 0), 0)}</div></CardContent>
         </Card>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b py-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title, author or barcode..." 
              className="pl-10 h-12 bg-slate-50 border-none rounded-xl" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold">BOOK TITLE / AUTHOR</TableHead>
                <TableHead className="py-4 font-bold">BARCODE / ISBN</TableHead>
                <TableHead className="py-4 font-bold">CATEGORY</TableHead>
                <TableHead className="py-4 font-bold">COPIES</TableHead>
                <TableHead className="text-right py-4 font-bold">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBooks.map((b: any) => (
                <TableRow key={b.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{b.title}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{b.author}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <Barcode className="size-3 text-muted-foreground" />
                       <span className="text-[11px] font-mono font-bold text-accent">{b.barcode || b.isbn}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold">{b.category}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{b.availableCopies} / {b.totalCopies}</span>
                      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden mt-1">
                        <div className="bg-primary h-full" style={{ width: `${(b.availableCopies/b.totalCopies)*100}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(db!, "library_books", b.id))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <form onSubmit={handleAddBook}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold">Catalog New Title</DialogTitle>
              <DialogDescription>Register a new book into the institutional library.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2">
                <Label>Book Title</Label>
                <Input required value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Author</Label>
                  <Input required value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={bookForm.category} onChange={e => setBookForm({...bookForm, category: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Barcode / ISBN</Label>
                  <Input required value={bookForm.barcode} onChange={e => setBookForm({...bookForm, barcode: e.target.value})} className="h-11 rounded-xl font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Total Copies</Label>
                  <Input type="number" required value={bookForm.totalCopies} onChange={e => setBookForm({...bookForm, totalCopies: parseInt(e.target.value) || 1})} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Shelf Location</Label>
                <Input value={bookForm.shelfLocation} onChange={e => setBookForm({...bookForm, shelfLocation: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Rack A-12" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary font-bold shadow-lg">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Library className="mr-2" />} Catalog Title
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
