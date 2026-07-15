"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { History, Search, Filter, Terminal, Download, ShieldCheck, User, Wallet, Users, LayoutDashboard, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

const MOCK_LOGS = [
  { id: 1, event: "New Enrollment Protocol", user: "Admin (Goaso Hub)", time: "10 mins ago", type: "Registry", severity: "Audit", icon: Users },
  { id: 2, event: "Term 2 Invoicing Finalized", user: "Accountant", time: "1 hour ago", type: "Finance", severity: "Success", icon: Wallet },
  { id: 3, event: "System Profile Updated", user: "School Owner", time: "3 hours ago", type: "Settings", severity: "Audit", icon: LayoutDashboard },
  { id: 4, event: "Login Attempt (Verified)", user: "Teacher ID: 102", time: "5 hours ago", type: "Auth", severity: "Info", icon: ShieldCheck },
  { id: 5, event: "Daily Attendance Batch Sync", user: "System Automator", time: "Yesterday", type: "Registry", severity: "Success", icon: Clock },
  { id: 6, event: "Budget Forecast Generated", user: "AI Engine", time: "Yesterday", type: "Finance", severity: "Audit", icon: Terminal },
]

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const handleExportCSV = () => {
    toast({
      title: "Export Initiated",
      description: "Compiling audit trail into CSV format for local download...",
    })
  }

  const handleFilter = () => {
    toast({
      title: "Logs Filtered",
      description: "Sorting activity audit by selected severity and system identifier.",
    })
  }

  const filteredLogs = MOCK_LOGS.filter(log => 
    log.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
            <Button variant="outline" className="gap-2 h-11 rounded-xl bg-white border-slate-200" onClick={handleFilter}>
              <Filter className="size-4" /> Filter
            </Button>
          </div>
          <Button variant="ghost" className="text-xs font-bold text-primary gap-2 h-11" onClick={handleExportCSV}>
            <Download className="size-4" /> Export Ledger
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                    <log.icon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-primary">{log.event}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="font-bold uppercase tracking-widest text-[9px] text-accent">{log.type}</span>
                      <span className="opacity-20">•</span>
                      <span>By {log.user}</span>
                      <span className="opacity-20">•</span>
                      <span>{log.time}</span>
                    </p>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-[9px] uppercase font-bold px-3 py-1 rounded-full ${
                    log.severity === 'Success' ? 'bg-green-50 text-green-600 border-green-200' :
                    log.severity === 'Audit' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    'bg-slate-50 text-slate-600'
                  }`}
                >
                  {log.severity}
                </Badge>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="p-24 text-center space-y-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Terminal className="size-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground italic">No activities match your current search.</p>
              </div>
            )}
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
          <h3 className="text-2xl font-headline font-bold">142 Events</h3>
        </div>
        <div className="p-6 rounded-2xl bg-white shadow-md space-y-2 border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Critical Errors</p>
          <h3 className="text-2xl font-headline font-bold text-green-600">0 Reported</h3>
        </div>
      </div>
    </div>
  )
}
