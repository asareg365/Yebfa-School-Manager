"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, ArrowUpRight, ArrowDownRight, CreditCard } from "lucide-react"

export default function FeesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Fee Management</h1>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-70">Total Fees Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">GH₵ 425,000</div>
            <p className="text-xs text-green-400 mt-1">↑ 12% vs last term</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline text-accent">GH₵ 82,400</div>
            <p className="text-xs text-muted-foreground mt-1">15 students overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Predicted Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">GH₵ 510,000</div>
            <p className="text-xs text-muted-foreground mt-1">End of term target</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "Ama Serwaa", amount: 1500, type: "Full Payment", date: "2 mins ago" },
              { name: "Kofi Mensah", amount: 500, type: "Installment", date: "1 hour ago" },
              { name: "Abena Boateng", amount: 2100, type: "Full Payment", date: "Yesterday" }
            ].map((tx, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/5 flex items-center justify-center">
                    <CreditCard className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold">{tx.name}</p>
                    <p className="text-xs text-muted-foreground">{tx.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">GH₵ {tx.amount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{tx.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}