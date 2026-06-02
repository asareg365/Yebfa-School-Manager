"use client"

import * as React from "react"
import { useState } from "react"
import { generateFinancialForecast, GenerateFinancialForecastOutput } from "@/ai/flows/generate-financial-forecast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, TrendingUp, Wallet, ShieldAlert, LineChart, CheckCircle2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

const mockHistory = {
  revenueHistory: [
    { date: "2024-01-01", amount: 45000 },
    { date: "2024-02-01", amount: 42000 },
    { date: "2024-03-01", amount: 48000 },
    { date: "2024-04-01", amount: 51000 },
    { date: "2024-05-01", amount: 49000 },
    { date: "2024-06-01", amount: 55000 },
  ],
  expenseHistory: [
    { date: "2024-01-01", amount: 32000 },
    { date: "2024-02-01", amount: 31000 },
    { date: "2024-03-01", amount: 33500 },
    { date: "2024-04-01", amount: 34000 },
    { date: "2024-05-01", amount: 35000 },
    { date: "2024-06-01", amount: 36000 },
  ],
  forecastPeriod: "next 6 months"
}

export default function ForecastPage() {
  const [loading, setLoading] = useState(false)
  const [forecast, setForecast] = useState<GenerateFinancialForecastOutput | null>(null)

  const runForecast = async () => {
    setLoading(true)
    try {
      const result = await generateFinancialForecast(mockHistory)
      setForecast(result)
      toast({
        title: "Forecast Ready",
        description: "Financial projections have been generated successfully."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate financial forecast."
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
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-none shadow-sm bg-muted/10 h-40 flex items-center justify-center">
              <p className="text-sm text-muted-foreground italic">Waiting for analysis...</p>
            </Card>
          ))}
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

          <Card className="col-span-full border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle>Overall Financial Analysis</CardTitle>
              <CardDescription>Comprehensive institutional summary based on historical data.</CardDescription>
            </CardHeader>
            <CardContent className="border-t border-border/40 pt-6">
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
                {forecast.overallAnalysis}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}