"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Wallet, Receipt, TrendingUp, Plus, Loader2, DollarSign, Send, Settings, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FeeConfigurationPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isFeeOpen, setIsFeeOpen] = useState(false)
  const [feeForm, setFeeForm] = useState({ name: "", defaultAmount: "", category: "Mandatory" })

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const approvedFeesQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "approved_fees"), where("institutionId", "==", institutionId))
  }, [db, institutionId])

  const { data: fees, loading: feesLoading } = useCollection(approvedFeesQuery)

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId) return
    setLoading(true)
    try {
      await addDoc(collection(db, "approved_fees"), {
        ...feeForm,
        defaultAmount: parseFloat(feeForm.defaultAmount),
        institutionId,
        createdAt: serverTimestamp()
      })
      toast({ title: "Fee Authorized", description: `${feeForm.name} is now available in personal ledgers.` })
      setIsFeeOpen(false)
      setFeeForm({ name: "", defaultAmount: "", category: "Mandatory" })
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }) } finally { setLoading(false) }
  }

  const handleDeleteFee = async (id: string) => {
    try {
      await deleteDoc(doc(db!, "approved_fees", id))
      toast({ title: "Fee Removed", description: "This item is no longer an approved institutional charge." })
    } catch (e: any) { toast({ variant: "destructive", title: "Action Failed", description: e.message }) }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Fee Configuration</h1>
          <p className="text-muted-foreground">Standardizing institutional charges and approved items.</p>
        </div>
        <Dialog open={isFeeOpen} onOpenChange={setIsFeeOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary"><Plus className="size-4" /> Approve New Fee Item</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddFee}>
              <DialogHeader>
                <DialogTitle>Standard Fee Module</DialogTitle>
                <DialogDescription>Define a standard charge that can be applied to student accounts.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="space-y-2"><Label>Fee Name</Label><Input required value={feeForm.name} onChange={e => setFeeForm({...feeForm, name: e.target.value})} placeholder="e.g. Term Tuition, Library Books" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Amount (GH₵)</Label><Input type="number" required value={feeForm.defaultAmount} onChange={e => setFeeForm({...feeForm, defaultAmount: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Category</Label>
                    <Select onValueChange={v => setFeeForm({...feeForm, category: v})} defaultValue="Mandatory">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Mandatory">Mandatory</SelectItem><SelectItem value="Optional">Optional / Books</SelectItem><SelectItem value="Services">Services / PTA</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter><Button type="submit" disabled={loading} className="w-full">{loading ? <Loader2 className="animate-spin" /> : "Register Standard Fee"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {fees.map((fee: any) => (
          <Card key={fee.id} className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="pb-2 bg-slate-50/50">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="text-[9px] uppercase font-bold text-primary border-primary/20">{fee.category}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteFee(fee.id)}><Trash2 className="size-3" /></Button>
              </div>
              <CardTitle className="text-lg font-bold text-primary mt-2">{fee.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold font-headline">GH₵ {fee.defaultAmount.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase font-medium">Approved Standard Charge</p>
            </CardContent>
          </Card>
        ))}
        {fees.length === 0 && !feesLoading && (
          <div className="col-span-3 h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-muted-foreground opacity-30"><Settings className="size-12 mb-2" /><p>No approved fee modules defined yet.</p></div>
        )}
      </div>
    </div>
  )
}
