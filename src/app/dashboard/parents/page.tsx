"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  Search, 
  Plus, 
  Loader2, 
  Phone, 
  Baby, 
  Trash2, 
  Pencil,
  User,
  Eye,
  Briefcase,
  Download,
  Filter,
  MoreVertical,
  ShieldCheck
} from "lucide-react"
import { useFirestore, useCollection } from "@/firebase"
import { collection, query, where, doc, deleteDoc, orderBy } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function ParentsRegistryPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  // Query all parents for the tenant
  const parentsQuery = useMemo(() => 
    institutionId ? query(collection(db, "parents"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  
  // Query all relationships to calculate children count
  const relsQuery = useMemo(() => 
    institutionId ? query(collection(db, "student_parents"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  
  const { data: parents, loading: pLoading } = useCollection(parentsQuery)
  const { data: rels, loading: rLoading } = useCollection(relsQuery)

  const filteredParents = useMemo(() => {
    return parents.filter(p => 
      `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.parentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (a.parentNumber || "").localeCompare(b.parentNumber || ""))
  }, [parents, searchQuery])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this parent from the registry? This will not remove linked students but will break the guardian link.")) return
    
    try {
      await deleteDoc(doc(db!, "parents", id))
      toast({ title: "Profile Removed", description: "The guardian record has been deleted from the registry." })
    } catch (e) { 
      toast({ variant: "destructive", title: "Action Failed", description: "You do not have permission to delete registry records." }) 
    }
  }

  const handleExport = () => {
    toast({ title: "Export Initiated", description: "Compiling parent registry into CSV format..." })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Parent Registry</h1>
          <p className="text-muted-foreground font-medium">Master database of guardians and family relationships.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-11 rounded-xl gap-2 text-xs font-bold uppercase hidden sm:flex" onClick={handleExport}>
            <Download className="size-4" /> Export CSV
          </Button>
          <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2" asChild>
            <Link href="/dashboard/parents/add">
              <Plus className="size-4" /> Register Parent
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-white border-b py-6 px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, PAR code or phone..." 
                className="pl-10 h-12 bg-slate-50 border-none rounded-xl text-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" className="text-xs font-bold gap-2 rounded-lg h-10 px-4">
                 <Filter className="size-3.5" /> Filter Status
               </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-6">PARENT NO.</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4">NAME</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4">PHONE</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4">OCCUPATION</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4 text-center">CHILDREN</TableHead>
                  <TableHead className="py-4 font-bold whitespace-nowrap px-4">STATUS</TableHead>
                  <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.map((p: any) => {
                  const childrenCount = rels.filter(r => r.parentId === p.id).length;
                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <TableCell className="px-6 font-mono text-[11px] font-bold text-accent">
                        {p.parentNumber}
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary text-xs shrink-0 border overflow-hidden">
                             {p.photoURL ? <img src={p.photoURL} className="w-full h-full object-cover" /> : <User className="size-4" />}
                          </div>
                          <span className="font-bold text-primary text-sm whitespace-nowrap">{p.firstName} {p.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <span className="text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
                          <Phone className="size-3 text-muted-foreground" /> {p.phone}
                        </span>
                      </TableCell>
                      <TableCell className="px-4">
                         <div className="flex items-center gap-2">
                            <Briefcase className="size-3 text-muted-foreground" />
                            <span className="text-xs font-medium truncate max-w-[120px]">{p.occupation || "Unspecified"}</span>
                         </div>
                      </TableCell>
                      <TableCell className="px-4 text-center">
                         <Badge variant="secondary" className="gap-1.5 bg-blue-50 text-blue-700 border-none px-3 font-bold">
                            <Baby className="size-3" /> {childrenCount}
                         </Badge>
                      </TableCell>
                      <TableCell className="px-4">
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold ${p.status === 'Active' ? 'text-green-600 bg-green-50 border-green-200' : 'text-slate-500'}`}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild title="View Profile">
                            <Link href={`/dashboard/parents/${p.id}`}>
                              <Eye className="size-4 text-primary" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild title="Edit Record">
                            <Link href={`/dashboard/parents/edit/${p.id}`}>
                              <Pencil className="size-4 text-primary" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-lg hover:bg-destructive/10" onClick={() => handleDelete(p.id)} title="Delete Profile">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredParents.length === 0 && !pLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-24 text-muted-foreground italic">No guardian records found matching your search.</TableCell></TableRow>
                )}
                {pLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-24">
                      <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-4">Syncing Registry...</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-center mt-6">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
           <ShieldCheck className="size-3 text-green-600" /> Authorized Institutional Audit • 2026 Registry Hub
        </p>
      </div>
    </div>
  )
}
