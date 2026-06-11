
"use client"

import * as React from "react"
import { useState } from "react"
import { generateFinancialForecast, GenerateFinancialForecastOutput } from "@/ai/flows/generate-financial-forecast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, TrendingUp, Wallet, ShieldAlert, LineChart, CheckCircle2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ForecastPage() {
  const [loading, setLoading] = useState(false)
  const [forecast, setForecast] = useState<GenerateFinancialForecastOutput | null>(null)

  const runForecast = async () => {
    // Note: In a real app, we'd fetch actual history from Firestore here
    const emptyHistory = {
      revenueHistory: [],
      expenseHistory: [],
      forecastPeriod: "next 6 months"
    }

    setLoading(true)
    try {
      const result = await generateFinancialForecast(emptyHistory)
      setForecast(result)
      toast({
        title: "Analysis Complete",
        description: "AI has generated a baseline forecast based on current ledger trends."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate financial forecast. Please ensure ledger data is populated."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">Predictive Financial Insights</h1>
          <p className="text-muted-foreground">AI-driven revenue and expense forecasting for smarter institutional budgeting.</p>
        </div>
        <Button 
          onClick={runForecast} 
          disabled={loading}
          className="bg-primary hover:bg-primary/90 h-11 px-8 gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <TrendingUp className="size-4" />}
          Run Forecast Analysis
        </Button>
      </div>

      {!forecast ? (
        <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-xl bg-muted/5 p-12 text-center space-y-4">
          <LineChart className="size-12 text-muted-foreground/20" />
          <div className="max-w-md">
            <h3 className="text-lg font-semibold">No active forecast</h3>
            <p className="text-sm text-muted-foreground">
              Click the button above to analyze your school's historical financial data and generate projections.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Projected Revenue</CardTitle>
              <TrendingUp className="size-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">${forecast.revenueProjection.projectedTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total for {forecast.revenueProjection.period}</p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Projected Expenses</CardTitle>
              <Wallet className="size-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline text-accent">${forecast.expenseProjection.projectedTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total for {forecast.expenseProjection.period}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Estimated Net Position</CardTitle>
              <LineChart className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">
                ${(forecast.revenueProjection.projectedTotal - forecast.expenseProjection.projectedTotal).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Projected Surplus/Deficit</p>
            </CardContent>
          </Card>
        </div>
      )}

      {forecast && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                Budget Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {forecast.budgetRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50 border border-green-100 text-sm leading-relaxed">
                    <span className="flex-shrink-0 size-5 flex items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-[10px]">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-accent" />
                Strategic Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {forecast.riskFactors.map((risk, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-orange-50/50 border border-orange-100 text-sm leading-relaxed">
                    <span className="flex-shrink-0 size-5 flex items-center justify-center rounded-full bg-orange-100 text-orange-700 font-bold text-[10px]">
                      !
                    </span>
                    {risk}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
