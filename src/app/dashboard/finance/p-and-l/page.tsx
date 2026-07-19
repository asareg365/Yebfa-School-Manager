
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-primary">Strategic Financial Report</h1>
          <p className="text-muted-foreground text-sm md:text-base font-medium">Comprehensive Profit & Loss for <span className="text-accent font-bold uppercase">{institution?.currentTerm || "Term 1"}</span> cycle.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="flex-1 sm:flex-none h-11 rounded-xl gap-2 text-xs font-bold uppercase"><Printer className="size-4" /> Print PDF</Button>
          <Button variant="outline" className="flex-1 sm:flex-none h-11 rounded-xl gap-2 text-xs font-bold uppercase"><Download className="size-4" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-none shadow-md bg-white border-l-4 border-green-600">
          <CardHeader className="pb-2 p-4 md:p-6">
            <div className="flex justify-between items-center">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Gross Income</CardDescription>
              <TrendingUp className="size-4 text-green-600" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-headline font-bold truncate">GH₵ {totalIncome.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4"><p className="text-[10px] text-muted-foreground italic truncate">Fee collections & intake</p></CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-destructive">
          <CardHeader className="pb-2 p-4 md:p-6">
            <div className="flex justify-between items-center">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Expenditure</CardDescription>
              <TrendingDown className="size-4 text-destructive" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-headline font-bold truncate">GH₵ {totalExpenses.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4"><p className="text-[10px] text-muted-foreground italic truncate">Payroll + Overheads</p></CardContent>
        </Card>

        <Card className={`sm:col-span-2 lg:col-span-1 border-none shadow-lg border-l-4 ${netProfit >= 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-destructive bg-destructive text-destructive-foreground'}`}>
          <CardHeader className="pb-2 p-4 md:p-6">
             <div className="flex justify-between items-center">
              <CardDescription className={`text-[10px] font-bold uppercase tracking-wider ${netProfit >= 0 ? 'text-primary-foreground/70' : 'text-destructive-foreground/70'}`}>Net Position</CardDescription>
              <BarChart3 className="size-4 opacity-50" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-headline font-bold truncate">GH₵ {netProfit.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span>Margin</span><span>{margin.toFixed(1)}%</span></div>
              <Progress value={margin} className={`h-1.5 ${netProfit >= 0 ? 'bg-white/20' : 'bg-destructive-foreground/20'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-muted/30 border-b p-4 md:p-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2"><ArrowDownLeft className="size-5 text-green-600 shrink-0" /> Income Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                <div className="p-4 md:p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0"><Wallet className="size-5 text-green-600" /></div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">Tuition Fees</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">Mandatory Collections</p>
                    </div>
                  </div>
                  <span className="font-bold text-primary text-sm md:text-base whitespace-nowrap ml-2">GH₵ {totalIncome.toLocaleString()}</span>
                </div>
                <div className="p-4 md:p-6 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><ArrowUpRight className="size-5 text-blue-600" /></div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">Other Intake</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">Canteen, Transport, Etc.</p>
                    </div>
                  </div>
                  <span className="font-bold text-primary text-sm md:text-base whitespace-nowrap ml-2">GH₵ 0.00</span>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-muted/30 border-b p-4 md:p-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2"><ArrowUpRight className="size-5 text-destructive shrink-0" /> Expenditure Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                <div className="p-4 md:p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0"><Banknote className="size-5 text-orange-600" /></div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">Payroll & SSNIT</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">Faculty Disbursements</p>
                    </div>
                  </div>
                  <span className="font-bold text-destructive text-sm md:text-base whitespace-nowrap ml-2">GH₵ {payrollExpenses.toLocaleString()}</span>
                </div>
                <div className="p-4 md:p-6 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><Receipt className="size-5 text-slate-600" /></div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">Overheads</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">Utilities, Maintenance</p>
                    </div>
                  </div>
                  <span className="font-bold text-destructive text-sm md:text-base whitespace-nowrap ml-2">GH₵ {operationalExpenses.toLocaleString()}</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-8 px-4 text-center">
        <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex flex-col md:flex-row items-center gap-2">
           <PieChart className="size-3 hidden md:block" /> 
           Audit integrity synchronized with institutional ledger • System 2026
        </p>
      </div>
    </div>
  )
}
