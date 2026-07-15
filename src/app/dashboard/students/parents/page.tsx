
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Search, Plus, Loader2, Phone, Mail, Baby, ShieldCheck, ExternalLink } from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, serverTimestamp } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function ParentsRegistryPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  // In this enterprise model, "Parents" are users with role 'parent' within the tenant
  const parentsQuery = useMemo(() => institutionId ? query(collection(db, "users"), where("tenantId", "==", institutionId), where("role", "==", "parent")) : null, [db, institutionId])
  const { data: parents, loading: pLoading } = useCollection(parentsQuery)

  const filteredParents = useMemo(() => {
    return parents.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [parents, searchQuery])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Guardian Registry</h1>
          <p className="text-muted-foreground">Managing {parents.length} registered parent and guardian accounts.</p>
        </div>
        <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2">
          <Plus className="size-4" /> Invite Guardian
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b py-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-10 h-12 bg-slate-50 border-none rounded-xl" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold">GUARDIAN NAME</TableHead>
                <TableHead className="py-4 font-bold">CONTACT CHANNEL</TableHead>
                <TableHead className="py-4 font-bold">RELATIONSHIP</TableHead>
                <TableHead className="py-4 font-bold">LINKED CHILDREN</TableHead>
                <TableHead className="text-right py-4 font-bold">PORTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParents.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary text-xs uppercase">
                        {p.name?.charAt(0)}
                      </div>
                      <span className="font-bold text-primary">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium flex items-center gap-1.5"><Mail className="size-3 text-muted-foreground" /> {p.email}</span>
                      <span className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Verified Account</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-[9px] uppercase font-bold">Parent</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <Baby className="size-3.5 text-blue-600" />
                       <span className="text-xs font-bold">Registry Synced</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100">
                      <ExternalLink className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredParents.length === 0 && !pLoading && (
                <TableRow><TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic">No guardian records found in current institutional partition.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
