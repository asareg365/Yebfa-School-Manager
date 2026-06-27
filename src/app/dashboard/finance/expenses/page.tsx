
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Receipt, Plus, Search, Filter, PieChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"

export default function ExpensesPage() {
  const handleRecordExpenditure = () => {
    toast({
      title: "Expenditure Recorded",
      description: "Allocating funds and updating the institutional expense node...",
    })
  }

  const handleDownloadReport = () => {
    toast({
      title: "Report Processing",
      description: "Generating comprehensive expenditure analysis for download...",
    })
  }

  const handleFilter = () => {
    toast({
      title: "Ledger Filtered",
      description: "Sorting vouchers by selected department and category.",
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-headline font-bold text-primary">Expense Tracking</h1>
          <p className="text-muted-foreground">Monitor institutional spending and operational costs.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={handleRecordExpenditure}>
          <Plus className="size-4" /> Record Expenditure
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Total Monthly Spend", value: "GH₵0.00" },
          { label: "Pending Approvals", value: "0" },
          { label: "Utilities", value: "GH₵0.00" },
          { label: "Maintenance", value: "GH₵0.00" }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-headline">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search vouchers..." className="pl-9" />
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleFilter}>
              <Filter className="size-4" /> Filter
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-xs font-bold text-primary underline" onClick={handleDownloadReport}>Download Report</Button>
        </CardHeader>
        <CardContent className="p-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-20 rounded-full bg-muted flex items-center justify-center">
            <Receipt className="size-10 text-muted-foreground/20" />
          </div>
          <div className="max-w-sm">
            <h3 className="text-lg font-bold">Clean Ledger</h3>
            <p className="text-sm text-muted-foreground">
              No expenses have been recorded for the current term yet. Start tracking by adding a new voucher.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
