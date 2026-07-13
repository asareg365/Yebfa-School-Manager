"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Wallet, Users, ArrowUpRight, Banknote, Calendar, Plus, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PayrollPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ term: "Term 2", month: "June", totalAmount: "" })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId)
  }, [])

  const staffQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "staff"), where("institutionId", "==", institutionId))
  }, [db, institutionId])

  const { data: staff } = useCollection(staffQuery)

  const handleScheduleRun = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId) return
    setLoading(true)
    try {
      await addDoc(collection(db, "payroll_cycles"), {
        ...scheduleForm,
        institutionId,
        status: "scheduled",
        createdAt: serverTimestamp()
      })
      toast({ title: "Term Run Scheduled", description: "Automated disbursement cycle has been initialized." })
      setIsScheduleOpen(false)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-headline font-bold text-primary">Payroll Processor</h1>
          <p className="text-muted-foreground">Automated salary management and tax compliance.</p>
        </div>
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <Calendar className="size-4" /> Schedule Term Run
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleScheduleRun}>
              <DialogHeader>
                <DialogTitle>Schedule Payroll Cycle</DialogTitle>
                <DialogDescription>Initialize institutional salary disbursement hub.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select onValueChange={v => setScheduleForm({...scheduleForm, term: v})} defaultValue="Term 2">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Budget Allocation (GH₵)</Label>
                  <Input type="number" required value={scheduleForm.totalAmount} onChange={e => setScheduleForm({...scheduleForm, totalAmount: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin" /> : "Authorize Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Current Liabilities</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-headline">GH₵0.00</div></CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Faculty Enrollment</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-headline">{staff?.length || 0}</div></CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader><CardTitle>Institutional Banking Status</CardTitle></CardHeader>
        <CardContent className="p-12 text-center opacity-40">
          <Banknote className="size-16 mx-auto mb-4" />
          <p className="text-sm">Link your merchant node to see active disbursements.</p>
        </CardContent>
      </Card>
    </div>
  )
}
