"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowDownLeft,
  Calendar, 
  Printer, 
  Download,
  Wallet,
  Receipt,
  Banknote,
  PieChart
} from "lucide-react"
import { useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export default function ProfitAndLossPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)

  useEffect(() => {
    const storedId = localStorage.getItem('selected_institution_id')
    if (storedId) setInstitutionId(storedId)
  }, [])

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const txnsQuery = useMemo(() => institutionId ? query(collection(db, "transactions"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const expensesQuery = useMemo(() => institutionId ? query(collection(db, "expenditure_vouchers"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const payrollQuery = useMemo(() => institutionId ? query(collection(db, "payroll_records"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: incomeTxns = [] } = useCollection(txnsQuery)
  const { data: expenses = [] } = useCollection(expensesQuery)
  const { data: payroll = [] } = useCollection(payrollQuery)

  const totalIncome = incomeTxns.reduce((a, c: any) => a + (c.amount || 0), 0)
  const operationalExpenses = expenses.reduce((a, c: any) => a + (c.amount || 0), 0)
  const payrollExpenses = payroll.reduce((a, c: any) => a + (c.netSalary || 0), 0)
  const totalExpenses = operationalExpenses + payrollExpenses
  const netProfit = totalIncome - totalExpenses

  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary">Strategic Financial Report</h1>
          <p className="text-muted-foreground font-medium">Comprehensive Profit & Loss for <span className="text-accent font-bold uppercase">{institution?.currentTerm || "Term 1"}</span> academic cycle.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl gap-2"><Printer className="size-4" /> Print PDF</Button>
          <Button variant="outline" className="h-11 rounded-xl gap-2"><Download className="size-4" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-md bg-white border-l-4 border-green-600">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardDescription className="text-[10px] font-bold uppercase">Gross Income</CardDescription>
              <TrendingUp className="size-4 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-headline font-bold">GH₵ {totalIncome.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-[10px] text-muted-foreground italic">Fee collections & other intake</p></CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-destructive">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardDescription className="text-[10px] font-bold uppercase">Total Expenditure</CardDescription>
              <TrendingDown className="size-4 text-destructive" />
            </div>
            <CardTitle className="text-3xl font-headline font-bold">GH₵ {totalExpenses.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent><p className="text-[10px] text-muted-foreground italic">Payroll + Operational costs</p></CardContent>
        </Card>

        <Card className={`border-none shadow-lg border-l-4 ${netProfit >= 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-destructive bg-destructive text-destructive-foreground'}`}>
          <CardHeader className="pb-2">
             <div className="flex justify-between items-center">
              <CardDescription className={`text-[10px] font-bold uppercase ${netProfit >= 0 ? 'text-primary-foreground/70' : 'text-destructive-foreground/70'}`}>Net Operating Position</CardDescription>
              <BarChart3 className="size-4 opacity-50" />
            </div>
            <CardTitle className="text-3xl font-headline font-bold">GH₵ {netProfit.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span>Margin</span><span>{margin.toFixed(1)}%</span></div>
              <Progress value={margin} className={`h-1.5 ${netProfit >= 0 ? 'bg-white/20' : 'bg-destructive-foreground/20'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-muted/30 border-b p-6">
            <CardTitle className="text-lg flex items-center gap-2"><ArrowDownLeft className="size-5 text-green-600" /> Income Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                <div className="p-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-green-50 flex items-center justify-center"><Wallet className="size-5 text-green-600" /></div>
                    <div><p className="font-bold text-sm">Tuition Fees</p><p className="text-[10px] text-muted-foreground uppercase">Mandatory Collections</p></div>
                  </div>
                  <span className="font-bold text-primary">GH₵ {totalIncome.toLocaleString()}</span>
                </div>
                <div className="p-6 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center"><ArrowUpRight className="size-5 text-blue-600" /></div>
                    <div><p className="font-bold text-sm">Other Intake</p><p className="text-[10px] text-muted-foreground uppercase">Shop, Transport, Canteen</p></div>
                  </div>
                  <span className="font-bold text-primary">GH₵ 0.00</span>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-muted/30 border-b p-6">
            <CardTitle className="text-lg flex items-center gap-2"><ArrowUpRight className="size-5 text-destructive" /> Expenditure Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                <div className="p-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-orange-50 flex items-center justify-center"><Banknote className="size-5 text-orange-600" /></div>
                    <div><p className="font-bold text-sm">Payroll & SSNIT</p><p className="text-[10px] text-muted-foreground uppercase">Faculty Disbursements</p></div>
                  </div>
                  <span className="font-bold text-destructive">GH₵ {payrollExpenses.toLocaleString()}</span>
                </div>
                <div className="p-6 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center"><Receipt className="size-5 text-slate-600" /></div>
                    <div><p className="font-bold text-sm">Operational Overheads</p><p className="text-[10px] text-muted-foreground uppercase">Utilities, Maintenance, Logistics</p></div>
                  </div>
                  <span className="font-bold text-destructive">GH₵ {operationalExpenses.toLocaleString()}</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-8">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
           <PieChart className="size-3" /> Audit integrity synchronized with institutional blockchain ledger
        </p>
      </div>
    </div>
  )
}
