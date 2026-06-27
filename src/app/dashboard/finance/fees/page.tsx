
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Wallet, CreditCard, Receipt, TrendingUp, History, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { useEffect, useState, useMemo } from "react"

export default function FeesPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    setInstitutionId(storedId || "demo-institution-2026")
  }, [])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "students"), where("institutionId", "==", institutionId))
  }, [db, institutionId])

  const { data: students, loading } = useCollection(studentsQuery)

  const handleNewPayment = () => {
    toast({
      title: "Merchant Gateway",
      description: "Initializing new payment record in the Term 2 ledger...",
    })
  }

  const handleViewHistory = () => {
    toast({
      title: "Audit History",
      description: "Fetching full financial intake history from regional nodes...",
    })
  }

  const studentCount = students?.length || 0
  const estimatedRevenue = studentCount * 1200 // GH₵ 1,200 per student estimate

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Fee Management</h1>
          <p className="text-muted-foreground">Monitor collection cycles and outstanding balances for {studentCount} students.</p>
        </div>
        <Button className="gap-2 bg-primary" onClick={handleNewPayment}>
          <Plus className="size-4" /> New Payment Record
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground shadow-lg border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-70">Projected Term Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline">GH₵ {estimatedRevenue.toLocaleString()}</div>
            <p className="text-[10px] opacity-60 mt-2 italic">Based on {studentCount} Enrolled Students</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Outstanding Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline text-accent">GH₵ {estimatedRevenue.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">{studentCount} Accounts Unpaid</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline">0%</div>
            <div className="flex items-center gap-1 mt-2 text-muted-foreground">
              <TrendingUp className="size-3" />
              <span className="text-[10px] uppercase font-bold tracking-tight">Term Cycle Initialized</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Ledger Activity</CardTitle>
              <CardDescription>Real-time audit of financial intake for Term 2.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-primary underline" onClick={handleViewHistory}>View Full History</Button>
          </div>
        </CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center text-center space-y-4 border-t pt-8">
          {loading ? (
            <Loader2 className="size-10 animate-spin text-primary opacity-20" />
          ) : (
            <>
              <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center">
                <Receipt className="size-8 text-primary/30" />
              </div>
              <div className="max-w-sm">
                <p className="text-sm font-bold text-primary">Ledger Empty</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2 italic">
                  No transactions have been recorded for this institution yet. Record the first payment to populate the Term 2 ledger.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
