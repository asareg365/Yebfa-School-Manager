"use client"

import * as React from "react"
import { useState } from "react"
import { generateFinancialForecast, GenerateFinancialForecastOutput } from "@/ai/flows/generate-financial-forecast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, TrendingUp, Wallet, ShieldAlert, LineChart, FileText, BarChart3, PieChart, Info } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ForecastPage() {
  const [loading, setLoading] = useState(false)
  const [forecast, setForecast] = useState<GenerateFinancialForecastOutput | null>(null)

  const runForecast = async () => {
    const data = {
      revenueHistory: [
        { date: "2024-01-01", amount: 120000 },
        { date: "2024-02-01", amount: 135000 },
        { date: "2024-03-01", amount: 110000 }
      ],
      expenseHistory: [
        { date: "2024-01-01", amount: 80000 },
        { date: "2024-02-01", amount: 95000 },
        { date: "2024-03-01", amount: 105000 }
      ],
      forecastPeriod: "next 6 months"
    }

    setLoading(true)
    try {
      const result = await generateFinancialForecast(data)
      setForecast(result)
      toast({
        title: "Forecasting Successful",
        description: "Strategic financial projections have been calculated."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not generate forecast. Please verify historical data."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">Predictive Financial Hub</h1>
          <p className="text-muted-foreground">Detailed AI projections for sustainable institutional growth.</p>
        </div>
        <Button 
          onClick={runForecast} 
          disabled={loading}
          className="bg-primary hover:bg-primary/90 h-12 px-8 gap-2 shadow-lg"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <TrendingUp className="size-4" />}
          Execute Strategic Forecast
        </Button>
      </div>

      {!forecast ? (
        <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-2xl bg-muted/5 p-12 text-center space-y-6">
          <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center">
            <BarChart3 className="size-12 text-primary/20" />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-bold text-primary">Ready for Financial Modeling</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Run the forecast to transform your historical revenue and expense records into actionable strategic reports.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">Projected Revenue</CardDescription>
                <CardTitle className="text-2xl font-headline">GH₵{forecast.projections.revenue.total.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                  {forecast.projections.revenue.confidenceInterval} Confidence
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">Projected Expenses</CardDescription>
                <CardTitle className="text-2xl font-headline text-accent">GH₵{forecast.projections.expenses.total.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">Primary: {forecast.projections.expenses.primaryCostDrivers[0]}</div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">Net Surplus</CardDescription>
                <CardTitle className="text-2xl font-headline text-primary">
                  GH₵{(forecast.projections.revenue.total - forecast.projections.expenses.total).toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">Estimated Term Position</div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">Liquidity Health</CardDescription>
                <CardTitle className="text-2xl font-headline">{forecast.analysis.liquidityScore}/100</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={forecast.analysis.liquidityScore} className="h-1.5" />
                <div className="text-[10px] text-muted-foreground">Calculated solvency score</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="analysis" className="rounded-lg gap-2">
                <FileText className="size-4" /> Strategic Analysis
              </TabsTrigger>
              <TabsTrigger value="projections" className="rounded-lg gap-2">
                <PieChart className="size-4" /> Monthly Breakdown
              </TabsTrigger>
              <TabsTrigger value="mitigation" className="rounded-lg gap-2">
                <ShieldAlert className="size-4" /> Risk & Mitigation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="mt-6">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Institutional Financial Analysis</CardTitle>
                  <CardDescription>Qualitative overview of fiscal health and trends.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 rounded-2xl bg-muted/30 border">
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                      <Info className="size-4 text-primary" /> Historical Context
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{forecast.analysis.historicalSummary}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-4">Core Growth Indicators</h4>
                    <div className="grid gap-3">
                      {forecast.analysis.growthTrends.map((trend, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-green-50/50 text-sm">
                          <CheckCircle2 className="size-4 text-green-600" />
                          {trend}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projections" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Revenue Projections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {forecast.projections.revenue.breakdown.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-white">
                          <span className="text-sm font-medium">{item.month}</span>
                          <span className="text-sm font-bold">GH₵{item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Expense Projections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {forecast.projections.expenses.breakdown.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-white">
                          <span className="text-sm font-medium">{item.month}</span>
                          <span className="text-sm font-bold text-accent">GH₵{item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="mitigation" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="size-5 text-primary" /> Budget Priorities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {forecast.strategicPlan.budgetPriorities.map((item, i) => (
                        <li key={i} className="text-sm flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                          <span className="font-bold text-primary">{i+1}.</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-accent">
                      <ShieldAlert className="size-5" /> Risk Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {forecast.strategicPlan.riskMitigation.map((item, i) => (
                        <li key={i} className="text-sm flex gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                          <span className="font-bold text-orange-600">!</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
