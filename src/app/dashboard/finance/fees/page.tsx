
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Wallet, CreditCard, Receipt, TrendingUp, History, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

export default function FeesPage() {
  const handlePayment = () => {
    toast({
      title: "Merchant Gateway",
      description: "Redirecting to secure payment processor...",
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Fee Management</h1>
          <p className="text-muted-foreground">Monitor collection cycles and outstanding balances.</p>
        </div>
        <Button className="gap-2" onClick={handlePayment}>
          <Plus className="size-4" /> New Payment Record
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground shadow-lg border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-70">Total Fees Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline">GH₵ 0.00</div>
            <p className="text-[10px] opacity-60 mt-2 italic">Term 2, 2026 Fiscal Year</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Outstanding Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline text-accent">GH₵ 0.00</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">0 Accounts Delinquent</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-headline">0%</div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="size-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Awaiting initial intake</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Ledger Activity</CardTitle>
              <CardDescription>Audit of latest financial intake.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">View Full History</Button>
          </div>
        </CardHeader>
        <CardContent className="h-64 flex flex-col items-center justify-center text-center space-y-4 border-t">
          <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center">
            <Receipt className="size-8 text-primary/30" />
          </div>
          <div className="max-w-sm">
            <p className="text-sm font-bold text-primary">Ledger Initialized</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No transactions have been recorded in this fiscal node yet. Use the action button above to record the first payment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
