
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Wallet, Receipt, TrendingUp, Plus, Loader2, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function FeesPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ studentId: "", amount: "", method: "Cash" })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "students"), where("institutionId", "==", institutionId))
  }, [db, institutionId])

  const { data: students, loading: studentsLoading } = useCollection(studentsQuery)

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId) return
    setLoading(true)
    try {
      await addDoc(collection(db, "fee_payments"), {
        ...paymentForm,
        institutionId,
        createdAt: serverTimestamp()
      })
      toast({ title: "Payment Recorded", description: "Ledger updated successfully." })
      setIsPaymentOpen(false)
      setPaymentForm({ studentId: "", amount: "", method: "Cash" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setLoading(false)
    }
  }

  const studentCount = students?.length || 0
  const estimatedRevenue = studentCount * 1200

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Fee Management</h1>
          <p className="text-muted-foreground">Monitoring collection cycles for {studentCount} students.</p>
        </div>
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary">
              <Plus className="size-4" /> New Payment Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleRecordPayment}>
              <DialogHeader>
                <DialogTitle>Log Payment</DialogTitle>
                <DialogDescription>Entering data into Term 2 ledger.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Select onValueChange={v => setPaymentForm({...paymentForm, studentId: v})}>
                    <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (GH₵)</Label>
                  <Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select onValueChange={v => setPaymentForm({...paymentForm, method: v})} defaultValue="Cash">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="MoMo">Mobile Money</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin" /> : "Authorize Payment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase opacity-70">Projected Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline">GH₵ {estimatedRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Collection Rate</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold font-headline">0%</div></CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center text-center opacity-40">
          <Receipt className="size-12 mb-4" />
          <p>No transactions recorded in this cycle.</p>
        </CardContent>
      </Card>
    </div>
  )
}
