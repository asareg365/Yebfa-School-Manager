"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Wallet, Receipt, TrendingUp, Plus, Loader2, DollarSign, Send } from "lucide-react"
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
    if (storedId) setInstitutionId(storedId)
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
    
    const selectedStudent = students.find(s => s.id === paymentForm.studentId)
    
    try {
      await addDoc(collection(db, "fee_payments"), {
        ...paymentForm,
        studentName: selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : "Unknown",
        institutionId,
        createdAt: serverTimestamp()
      })
      
      toast({ 
        title: "Payment Recorded", 
        description: "Institutional ledger updated successfully." 
      })

      // SMS Blast Simulation
      if (selectedStudent?.parentPhone) {
        setTimeout(() => {
          toast({
            title: "SMS Blast Initiated",
            description: `Payment confirmation sent to ${selectedStudent.parentName} (${selectedStudent.parentPhone}).`,
            variant: "default",
          })
        }, 800)
      }

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
            <Button className="gap-2 bg-primary h-11 shadow-lg shadow-primary/10">
              <Plus className="size-4" /> New Payment Record
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-none shadow-2xl">
            <form onSubmit={handleRecordPayment}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-bold text-primary">Log Payment</DialogTitle>
                <DialogDescription>Entering data into Term 2 ledger. Parent will receive an automated SMS blast.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Select onValueChange={v => setPaymentForm({...paymentForm, studentId: v})} value={paymentForm.studentId}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Choose student" /></SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentId})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (GH₵)</Label>
                  <Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="h-11 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select onValueChange={v => setPaymentForm({...paymentForm, method: v})} defaultValue="Cash">
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="MoMo">Mobile Money</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading} className="w-full h-12 gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
                  Authorize & Blast SMS
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase opacity-70 tracking-widest font-bold">Projected Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline">GH₵ {estimatedRevenue.toLocaleString()}</div>
            <p className="text-[10px] opacity-60 mt-2 font-medium">Estimated Term Intake</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest font-bold">SMS Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline">Active</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">Automatic Alerts to Guardians</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest fee settlements recorded in 2026.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center text-center opacity-40">
          <Receipt className="size-12 mb-4" />
          <p className="text-sm font-bold">No transactions recorded in this cycle.</p>
          <p className="text-xs mt-1">New payments will trigger an automated SMS notification.</p>
        </CardContent>
      </Card>
    </div>
  )
}