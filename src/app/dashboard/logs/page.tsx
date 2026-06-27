
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { History, Search, Filter, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LogsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold text-primary">Activity Logs</h1>
        <p className="text-muted-foreground">Audit trail for all institutional operations in 2026.</p>
      </div>
      
      <Card className="border-none shadow-md">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search logs..." className="pl-9" />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="size-4" /> Filter
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-xs font-bold text-primary underline">Export CSV</Button>
        </CardHeader>
        <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center">
            <Terminal className="size-8 text-muted-foreground/30" />
          </div>
          <div className="max-w-xs">
            <h3 className="text-lg font-bold">Syncing Ledger...</h3>
            <p className="text-sm text-muted-foreground">
              Connecting to institutional audit node. Real-time logs will appear here once operations commence.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
