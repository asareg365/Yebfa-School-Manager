"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { generateFinancialForecast, GenerateFinancialForecastOutput } from "@/ai/flows/generate-financial-forecast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Loader2, 
  TrendingUp, 
  Wallet, 
  ShieldAlert, 
  LineChart, 
  FileText, 
  BarChart3, 
  PieChart, 
  Info,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"

export default function ForecastPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forecast, setForecast] = useState<GenerateFinancialForecastOutput | null>(null)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  // Live Data Aggregation
  const txnsQuery = useMemo(() => institutionId ? query(collection(db, "transactions"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const expensesQuery = useMemo(() => institutionId ? query(collection(db, "expenditure_vouchers"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const invoicesQuery = useMemo(() => institutionId ? query(collection(db, "invoices"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: incomeTxns = [] } = useCollection(txnsQuery)
  const { data: expenseVouchers = [] } = useCollection(expensesQuery)
  const { data: invoices = [] } = useCollection(invoicesQuery)

  const runForecast = async () => {
    if (!institutionId) return

    setLoading(true)
    try {
      // Map live data to AI input
      const revHistory = incomeTxns.map((t: any) => ({
        date: t.date?.substring(0, 10) || new Date().toISOString().substring(0, 10),
        amount: t.amount || 0,
        source: t.paymentMethod || "Fee Collection"
      }))

      const expHistory = expenseVouchers.map((e: any) => ({
        date: e.date || new Date().toISOString().substring(0, 10),
        amount: e.amount || 0
      }))

      const outstanding = invoices.reduce((a, c: any) => a + (c.amountDue || 0), 0)

      const result = await generateFinancialForecast({
        revenueHistory: revHistory.length > 0 ? revHistory : [{ date: "2024-01-01", amount: 0 }],
        expenseHistory: expHistory.length > 0 ? expHistory : [{ date: "2024-01-01", amount: 0 }],
        outstandingBalances: outstanding,
        forecastPeriod: "next 6 months"
      })
      
      setForecast(result)
      toast({
        title: "Intelligence Sync Complete",
        description: "Fee predictions and cash flow models have been computed."
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "AI Analysis Failed",
        description: error.message || "Could not generate forecast. Verify institutional ledger."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">Predictive Financial Hub</h1>
          <p className="text-muted-foreground font-medium">Strategic fee collection forecasting and institutional cash flow modeling.</p>
        </div>
        <Button 
          onClick={runForecast} 
          disabled={loading}
          className="bg-primary hover:bg-primary/90 h-12 px-8 gap-3 shadow-xl shadow-primary/10 rounded-xl"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : <Zap className="size-5 text-accent" />}
          Execute Fee Prediction
        </Button>
      </div>

      {!forecast ? (
        <Card className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-muted/5 p-12 text-center space-y-6">
          <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center">
            <LineChart className="size-12 text-primary/20" />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-primary/60 font-headline uppercase tracking-tight">System Ready for Modeling</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Authorize the AI CFO to analyze live transaction logs, outstanding invoices, and expense vouchers to build a strategic 6-month solvency map.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-none shadow-md bg-white border-l-4 border-primary">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Expected Income</CardDescription>
                <CardTitle className="text-2xl font-headline text-primary">GH₵{forecast.treasurySummary.expectedIncome.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase">
                  <TrendingUp className="size-3" /> Predicted Revenue
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white border-l-4 border-destructive">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Outstanding Risk</CardDescription>
                <CardTitle className="text-2xl font-headline text-destructive">GH₵{forecast.treasurySummary.outstandingRisk.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-[10px] font-bold text-destructive uppercase">
                  <ShieldAlert className="size-3" /> Predicted Default
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white border-l-4 border-accent">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Net Cash Position</CardDescription>
                <CardTitle className="text-2xl font-headline text-accent">
                  GH₵{forecast.treasurySummary.netCashFlow.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[10px] text-muted-foreground font-bold uppercase">Estimated Term End</div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white border-l-4 border-blue-600">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Solvency Score</CardDescription>
                <CardTitle className="text-2xl font-headline">{forecast.treasurySummary.solvencyScore}/100</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={forecast.treasurySummary.solvencyScore} className="h-1.5" />
                <div className="text-[9px] text-muted-foreground font-bold uppercase">Institutional Health Index</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
             <div className="lg:col-span-2 space-y-8">
                <Tabs defaultValue="cashflow" className="w-full">
                  <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
                    <TabsTrigger value="cashflow" className="rounded-lg gap-2"><BarChart3 className="size-4" /> Monthly Cash Flow</TabsTrigger>
                    <TabsTrigger value="trends" className="rounded-lg gap-2"><TrendingUp className="size-4" /> Payment Trends</TabsTrigger>
                  </TabsList>

                  <TabsContent value="cashflow">
                    <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50 border-b p-6">
                        <CardTitle className="text-lg">Projected Monthly Liquidity</CardTitle>
                        <CardDescription>Anticipated revenue vs. expense cycles for {localStorage.getItem('selected_institution_name')}.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                         <div className="divide-y">
                            {forecast.projections.revenue.breakdown.map((rev, i) => {
                              const exp = forecast.projections.expenses.breakdown[i] || { amount: 0 };
                              const net = rev.amount - exp.amount;
                              return (
                                <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                   <div className="space-y-1">
                                      <p className="text-sm font-bold text-primary uppercase">{rev.month}</p>
                                      <Badge variant="secondary" className="text-[8px] h-4 bg-blue-50 text-blue-600 border-none">{Math.round(rev.confidence * 100)}% Confidence</Badge>
                                   </div>
                                   <div className="flex gap-12 items-center">
                                      <div className="text-right">
                                         <p className="text-[10px] font-bold text-muted-foreground uppercase">Revenue</p>
                                         <p className="text-sm font-bold text-green-600">GH₵{rev.amount.toLocaleString()}</p>
                                      </div>
                                      <div className="text-right">
                                         <p className="text-[10px] font-bold text-muted-foreground uppercase">Exp.</p>
                                         <p className="text-sm font-bold text-destructive">GH₵{exp.amount.toLocaleString()}</p>
                                      </div>
                                      <div className="text-right w-24">
                                         <p className="text-[10px] font-bold text-muted-foreground uppercase">Net</p>
                                         <p className={`text-sm font-bold ${net >= 0 ? 'text-primary' : 'text-orange-600'}`}>GH₵{net.toLocaleString()}</p>
                                      </div>
                                   </div>
                                </div>
                              )
                            })}
                         </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="trends">
                    <div className="grid gap-6">
                       {forecast.paymentTrends.map((trend, i) => (
                         <Card key={i} className={`border-none shadow-md rounded-2xl ${trend.impact === 'Positive' ? 'bg-green-50' : trend.impact === 'Negative' ? 'bg-red-50' : 'bg-slate-50'}`}>
                            <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                               <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                                  {trend.impact === 'Positive' ? <TrendingUp className="size-4 text-green-600" /> : <TrendingDown className="size-4 text-destructive" />}
                                  {trend.trend}
                               </CardTitle>
                               <Badge className={`${trend.impact === 'Positive' ? 'bg-green-600' : trend.impact === 'Negative' ? 'bg-destructive' : 'bg-slate-600'} text-white text-[8px] font-bold border-none`}>
                                 {trend.impact} IMPACT
                               </Badge>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                               <p className="text-xs text-slate-600 font-medium leading-relaxed">{trend.description}</p>
                            </CardContent>
                         </Card>
                       ))}
                    </div>
                  </TabsContent>
                </Tabs>
             </div>

             <div className="space-y-8">
                <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-primary text-primary-foreground">
                   <CardHeader className="p-8">
                      <CardTitle className="text-xl font-headline font-bold flex items-center gap-2"><Target className="size-5" /> Strategic Priorities</CardTitle>
                      <CardDescription className="text-primary-foreground/60">AI recommendations for fiscal optimization.</CardDescription>
                   </CardHeader>
                   <CardContent className="p-8 pt-0 space-y-6">
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent border-b border-white/10 pb-2">Budget Allocation</h4>
                         <ul className="space-y-3">
                            {forecast.strategicPlan.budgetPriorities.map((item, i) => (
                              <li key={i} className="text-xs flex gap-3 text-primary-foreground/80">
                                 <span className="text-accent font-bold">{i+1}.</span>
                                 {item}
                              </li>
                            ))}
                         </ul>
                      </div>
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent border-b border-white/10 pb-2">Collection Strategy</h4>
                         <ul className="space-y-3">
                            {forecast.strategicPlan.collectionStrategies.map((item, i) => (
                              <li key={i} className="text-xs flex gap-3 text-primary-foreground/80">
                                 <CheckCircle2 className="size-3.5 text-green-400 shrink-0" />
                                 {item}
                              </li>
                            ))}
                         </ul>
                      </div>
                   </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white rounded-2xl p-6">
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Cost Drivers Identified</h4>
                   <div className="flex flex-wrap gap-2">
                      {forecast.projections.expenses.primaryCostDrivers.map((driver, i) => (
                        <Badge key={i} variant="secondary" className="rounded-lg px-3 py-1 font-bold text-[10px]">{driver}</Badge>
                      ))}
                   </div>
                </Card>
             </div>
          </div>

          <div className="pt-8 border-t flex justify-center">
             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
                <ShieldCheck className="size-3 text-green-600" /> Authorized Institutional Solvency Map • Global Ecosystem 2026
             </p>
          </div>
        </div>
      )}
    </div>
  )
}
