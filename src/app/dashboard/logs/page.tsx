"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { History, Search, Filter, Terminal, Download, ShieldCheck, User, Wallet, Users, LayoutDashboard, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const handleExportCSV = () => {
    toast({
      title: "Export Initiated",
      description: "Compiling audit trail into CSV format for local download...",
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Institutional Activity Hub</h1>
        <p className="text-muted-foreground">Comprehensive audit trail for the 2026 academic cycle.</p>
      </div>
      
      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 bg-slate-50/50">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search events, users or types..." 
                className="pl-10 h-11 bg-white border-none rounded-xl shadow-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Button variant="ghost" className="text-xs font-bold text-primary gap-2 h-11" onClick={handleExportCSV}>
            <Download className="size-4" /> Export Ledger
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-24 text-center space-y-4">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Terminal className="size-8 text-muted-foreground/30" />
            </div>
            <div className="max-w-xs mx-auto">
              <h3 className="font-bold text-lg">Empty Audit Trail</h3>
              <p className="text-sm text-muted-foreground mt-2 italic">Awaiting first significant institutional event for the 2026 cycle.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="p-6 rounded-2xl bg-primary text-primary-foreground space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Ledger Integrity</p>
          <h3 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="size-5" /> Authorized</h3>
        </div>
        <div className="p-6 rounded-2xl bg-white shadow-md space-y-2 border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Log Volume (24h)</p>
          <h3 className="text-2xl font-headline font-bold">0 Events</h3>
        </div>
        <div className="p-6 rounded-2xl bg-white shadow-md space-y-2 border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Critical Errors</p>
          <h3 className="text-2xl font-headline font-bold text-green-600">0 Reported</h3>
        </div>
      </div>
    </div>
  )
}
