"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Banknote, 
  Loader2, 
  ShieldCheck, 
  CheckCircle2, 
  Printer, 
  Search,
  ArrowUpRight,
  User,
  MoreVertical,
  Calendar,
  AlertCircle
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"

export default function PayrollProcessorPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [isCycleOpen, setIsCycleOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState("July")

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const staffQuery = useMemo(() => institutionId ? query(collection(db, "staff"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const payrollQuery = useMemo(() => institutionId ? query(collection(db, "payroll_records"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: staff = [] } = useCollection(staffQuery)
  const { data: payrollRecords = [] } = useCollection(payrollQuery)

  const handleRunPayroll = async () => {
    if (!db || !institutionId || staff.length === 0) return

    setLoading(true)
    try {
      const batch = writeBatch(db)
      const year = "2026"

      staff.forEach((member: any) => {
        const payrollRef = doc(collection(db, "payroll_records"))
        batch.set(payrollRef, {
          tenantId: institutionId,
          staffId: member.id,
          staffName: member.fullName,
          staffRole: member.role,
          baseSalary: member.salary || 0,
          allowances: 0,
          deductions: 0,
          netSalary: member.salary || 0,
          status: "Paid",
          month: selectedMonth,
          year,
          paidAt: serverTimestamp(),
          createdAt: serverTimestamp()
        })

        // Also record as institutional expense
        const expenseRef = doc(collection(db, "expenditure_vouchers"))
        batch.set(expenseRef, {
          tenantId: institutionId,
          category: "Payroll",
          description: `Salary disbursement for ${member.fullName} - ${selectedMonth} ${year}`,
          amount: member.salary || 0,
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp()
        })
      })

      await batch.commit()
      toast({ title: "Payroll Authorized", description: `Disbursements finalized for ${staff.length} staff members.` })
      setIsCycleOpen(false)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Payroll Error", description: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary">Payroll Processor</h1>
          <p className="text-muted-foreground">Automated salary management and HR financial auditing.</p>
        </div>
        <Dialog open={isCycleOpen} onOpenChange={setIsCycleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2"><Calendar className="size-4" /> Run Monthly Cycle</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={(e) => { e.preventDefault(); handleRunPayroll(); }}>
              <DialogHeader>
                <DialogTitle>Authorize Payroll Disbursement</DialogTitle>
                <DialogDescription>This will generate salary records and expenditure vouchers for all active faculty.</DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="space-y-2">
                  <Label>Select Disbursement Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["June", "July", "August", "September"].map(m => <SelectItem key={m} value={m}>{m} 2026</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 text-xs flex gap-3">
                  <ShieldCheck className="size-5 shrink-0" />
                  <p>By authorizing, you confirm that banking registry details are correct and salary amounts are pre-verified.</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full h-14 rounded-2xl font-bold bg-primary shadow-xl" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Banknote className="mr-2" />} Confirm Disbursement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Staff Enrolled</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold font-headline">{staff.length}</div></CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Total Liability</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold font-headline">GH₵ {staff.reduce((a, c: any) => a + (c.salary || 0), 0).toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-white flex flex-row items-center justify-between">
           <CardTitle className="text-lg">Disbursement History</CardTitle>
           <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search employee..." className="pl-9 h-9 bg-slate-50 border-none" />
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold">STAFF MEMBER</TableHead>
                <TableHead className="py-4 font-bold">ROLE</TableHead>
                <TableHead className="py-4 font-bold">PERIOD</TableHead>
                <TableHead className="py-4 font-bold">NET SALARY</TableHead>
                <TableHead className="py-4 font-bold">STATUS</TableHead>
                <TableHead className="text-right py-4 font-bold">SLIP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollRecords.map((rec: any) => (
                <TableRow key={rec.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary text-[10px]">
                        {rec.staffName.charAt(0)}
                      </div>
                      <span className="font-bold text-sm text-primary">{rec.staffName}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold text-primary border-primary/20">{rec.staffRole}</Badge></TableCell>
                  <TableCell><span className="text-xs font-medium">{rec.month} {rec.year}</span></TableCell>
                  <TableCell><span className="text-sm font-bold">GH₵ {rec.netSalary.toLocaleString()}</span></TableCell>
                  <TableCell><Badge className="bg-green-600 text-[9px] uppercase font-bold">{rec.status}</Badge></TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8"><Printer className="size-4" /></Button></TableCell>
                </TableRow>
              ))}
              {payrollRecords.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">Awaiting cycle authorization...</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
