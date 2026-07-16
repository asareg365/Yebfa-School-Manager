"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Receipt, Plus, Search, Filter, PieChart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function ExpensesPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isVoucherOpen, setIsVoucherOpen] = useState(false)
  const [voucherForm, setVoucherForm] = useState({ category: "Utilities", amount: "", description: "" })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const expensesQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "expenditure_vouchers"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: expenses } = useCollection(expensesQuery)

  const handleRecordExpenditure = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    
    setLoading(true)
    const data = {
      ...voucherForm,
      amount: parseFloat(voucherForm.amount) || 0,
      tenantId: institutionId,
      institutionId: institutionId,
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, "expenditure_vouchers"), data)
      .then(() => {
        toast({ title: "Expenditure Recorded", description: "Ledger updated successfully." })
        setIsVoucherOpen(false)
        setVoucherForm({ category: "Utilities", amount: "", description: "" })
      })
      .catch(async (error: any) => {
        const permissionError = new FirestorePermissionError({
          path: 'expenditure_vouchers',
          operation: 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const totalSpend = expenses?.reduce((acc, curr: any) => acc + (parseFloat(curr.amount) || 0), 0) || 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-headline font-bold text-primary">Expense Tracking</h1>
          <p className="text-muted-foreground">Monitor institutional spending and operational costs.</p>
        </div>
        <Dialog open={isVoucherOpen} onOpenChange={setIsVoucherOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="size-4" /> Record Expenditure
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleRecordExpenditure}>
              <DialogHeader>
                <DialogTitle>New Voucher Entry</DialogTitle>
                <DialogDescription>Recording cash outflow from institutional treasury.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select onValueChange={v => setVoucherForm({...voucherForm, category: v})} defaultValue="Utilities">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Academics">Academics</SelectItem>
                      <SelectItem value="Logistics">Logistics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (GH₵)</Label>
                  <Input type="number" required value={voucherForm.amount} onChange={e => setVoucherForm({...voucherForm, amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input required value={voucherForm.description} onChange={e => setVoucherForm({...voucherForm, description: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Receipt className="mr-2" />}
                  Authorize Voucher
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-md bg-accent text-accent-foreground">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase opacity-70">Total Spend (Term)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline">GH₵ {totalSpend.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Vouchers Logged</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline">{expenses?.length || 0}</div></CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4">Category</TableHead>
                <TableHead className="py-4">Description</TableHead>
                <TableHead className="text-right py-4">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map((exp: any) => (
                <TableRow key={exp.id}>
                  <TableCell><Badge variant="outline" className="text-[10px] uppercase font-bold">{exp.category}</Badge></TableCell>
                  <TableCell className="text-sm">{exp.description}</TableCell>
                  <TableCell className="text-right font-bold">GH₵ {exp.amount}</TableCell>
                </TableRow>
              ))}
              {(!expenses || expenses.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">
                    No expenditure vouchers recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
