
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Wallet, Users, ArrowUpRight, Banknote, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PayrollPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-headline font-bold text-primary">Payroll Processor</h1>
          <p className="text-muted-foreground">Automated salary management and tax compliance.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2">
          <Calendar className="size-4" /> Schedule Term Run
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">GH₵0.00</div>
            <p className="text-xs text-muted-foreground mt-1">Term 2, 2026 cycles</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Staff Enrolled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">0</div>
            <p className="text-xs text-muted-foreground mt-1">Verified bank accounts</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-accent">Next Payment Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">--/--/--</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting schedule</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>Payroll Configuration Required</CardTitle>
          <CardDescription>Link your institution's bank portal to begin automated disbursements.</CardDescription>
        </CardHeader>
        <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4 border-t">
          <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center">
            <Banknote className="size-8 text-primary/30" />
          </div>
          <div className="max-w-md">
            <p className="text-sm text-muted-foreground">
              To process payroll, please ensure all staff members in the <strong>Staff Roster</strong> have valid account details and salary grades assigned.
            </p>
            <Button variant="outline" className="mt-6">Configure Banking Node</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
