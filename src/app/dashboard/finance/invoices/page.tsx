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
  MoreVertical
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export default function InvoicingPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isGenOpen, setIsGenOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("All")

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    let q = query(collection(db, "students"), where("tenantId", "==", institutionId))
    return q
  }, [db, institutionId])

  const feesQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "approved_fees"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const invoicesQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "invoices"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: students } = useCollection(studentsQuery)
  const { data: fees } = useCollection(feesQuery)
  const { data: invoices } = useCollection(invoicesQuery)

  const handleGenerateInvoices = async () => {
    if (!db || !institutionId || students.length === 0 || fees.length === 0) {
      toast({ variant: "destructive", title: "Setup Required", description: "Enroll students and setup fee items first." })
      return
    }

    setLoading(true)
    try {
      const batch = writeBatch(db)
      const term = "Term 2"
      const year = "2026/2027"

      students.forEach((student: any) => {
        const mandatoryFees = fees.filter((f: any) => f.category === "Mandatory")
        const total = mandatoryFees.reduce((acc, curr: any) => acc + curr.defaultAmount, 0)
        
        const invoiceRef = doc(collection(db, "invoices"))
        batch.set(invoiceRef, {
          tenantId: institutionId,
          invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
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

        // Also post to ledger
        const ledgerRef = doc(collection(db, "student_ledger"))
        batch.set(ledgerRef, {
          tenantId: institutionId,
          studentId: student.id,
          date: new Date().toISOString().split('T')[0],
          item: `Invoice for ${term} ${year}`,
          type: "charge",
          amount: total,
          createdAt: serverTimestamp()
        })
      })

      await batch.commit()
      toast({ title: "Invoices Generated", description: `Batch billing completed for ${students.length} students.` })
      setIsGenOpen(false)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setLoading(true)
    }
  }

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedGrade === "All" || inv.gradeLevel === selectedGrade)
    )
  }, [invoices, searchQuery, selectedGrade])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary">Invoicing & Billing</h1>
          <p className="text-muted-foreground">Automated term-based charges and student statements.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl">Statement Registry</Button>
          <Dialog open={isGenOpen} onOpenChange={setIsGenOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2"><Plus className="size-4" /> Run Term Billing</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Batch Invoices</DialogTitle>
                <DialogDescription>This will generate invoices for all enrolled students based on current mandatory fee items.</DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
                  <div className="flex justify-between text-sm"><span>Active Students</span><span className="font-bold">{students.length}</span></div>
                  <div className="flex justify-between text-sm"><span>Mandatory Fee Items</span><span className="font-bold">{fees.filter((f: any) => f.category === "Mandatory").length}</span></div>
                </div>
                <p className="text-xs text-muted-foreground italic">Note: Only students in the institutional registry will be billed.</p>
              </div>
              <DialogFooter>
                <Button className="w-full h-12" onClick={handleGenerateInvoices} disabled={loading}>
                   {loading ? <Loader2 className="animate-spin mr-2" /> : <FileText className="mr-2" />} Authorize Billing Cycle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { title: "Total Billed", value: `GH₵ ${invoices.reduce((a, c: any) => a + c.totalAmount, 0).toLocaleString()}`, icon: DollarSign, color: "text-primary" },
          { title: "Total Collected", value: `GH₵ ${invoices.reduce((a, c: any) => a + c.amountPaid, 0).toLocaleString()}`, icon: CheckCircle2, color: "text-green-600" },
          { title: "Total Outstanding", value: `GH₵ ${invoices.reduce((a, c: any) => a + c.amountDue, 0).toLocaleString()}`, icon: Clock, color: "text-destructive" },
          { title: "Invoices Count", value: invoices.length, icon: FileText, color: "text-accent" }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-md">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-[10px] font-bold uppercase">{stat.title}</CardDescription>
              <stat.icon className={`size-4 ${stat.color} opacity-50`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold font-headline">{stat.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-white">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input placeholder="Search invoice or student..." className="pl-10 h-11 bg-slate-50 border-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
             </div>
             <div className="flex items-center gap-3">
               <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                 <SelectTrigger className="w-40 h-11 rounded-xl"><SelectValue placeholder="Grade" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="All">All Grades</SelectItem>
                   <SelectItem value="Primary 1">Primary 1</SelectItem>
                   <SelectItem value="Primary 2">Primary 2</SelectItem>
                 </SelectContent>
               </Select>
               <Button variant="outline" className="h-11 rounded-xl"><Printer className="size-4" /></Button>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold">INV # / STUDENT</TableHead>
                <TableHead className="py-4 font-bold">GRADE</TableHead>
                <TableHead className="py-4 font-bold">TOTAL</TableHead>
                <TableHead className="py-4 font-bold">DUE</TableHead>
                <TableHead className="py-4 font-bold">STATUS</TableHead>
                <TableHead className="text-right py-4 font-bold">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv: any) => (
                <TableRow key={inv.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono font-bold text-accent">{inv.invoiceNumber}</span>
                      <span className="font-bold text-sm text-primary">{inv.studentName}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs font-medium">{inv.gradeLevel}</span></TableCell>
                  <TableCell><span className="text-sm font-bold">GH₵ {inv.totalAmount.toLocaleString()}</span></TableCell>
                  <TableCell><span className="text-sm font-bold text-destructive">GH₵ {inv.amountDue.toLocaleString()}</span></TableCell>
                  <TableCell>
                    <Badge variant={inv.status === "Paid" ? "default" : "outline"} className={`text-[9px] uppercase font-bold ${inv.status === "Paid" ? 'bg-green-600' : inv.status === "Partial" ? 'text-amber-600 border-amber-200' : 'text-destructive border-destructive/20'}`}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Printer className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="size-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">No invoices matching the search criteria.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}