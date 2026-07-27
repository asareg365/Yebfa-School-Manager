
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
  ShieldCheck,
  RefreshCw,
  Activity
} from "lucide-react"
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase"
import { collection, query, where, doc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { initializeApp, deleteApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"
import { normalizeSecurityPhone } from "@/lib/identity-service"

export default function ParentsRegistryPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [syncing, setSyncing] = useState(false)
  
  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile, loading: profileLoading } = useDoc(userProfileRef)

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role === 'super_admin') {
      setInstitutionId(localStorage.getItem('selected_institution_id'))
    } else {
      setInstitutionId(profile?.tenantId || null)
    }
  }, [profile, profileLoading])

  const parentsQuery = useMemo(() => 
    institutionId ? query(collection(db, "parents"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  
  const relsQuery = useMemo(() => 
    institutionId ? query(collection(db, "student_parents"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  
  const { data: parents = [], loading: pLoading } = useCollection(parentsQuery)
  const { data: rels = [] } = useCollection(relsQuery)

  const filteredParents = useMemo(() => {
    return parents.filter(p => 
      `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.parentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (a.parentNumber || "").localeCompare(b.parentNumber || ""))
  }, [parents, searchQuery])

  const handleSyncCredentials = async () => {
    if (!db || !institutionId || parents.length === 0) return;
    if (!confirm("This will authorize Portal Access for all guardians. Proceed?")) return;

    setSyncing(true);
    const provisionAppName = `parent-sync-${Date.now()}`;
    const provisionApp = initializeApp(firebaseConfig, provisionAppName);
    const provisionAuth = getAuth(provisionApp);

    try {
      let syncCount = 0;
      let skippedCount = 0;
      const batch = writeBatch(db);

      toast({ title: "Authorization Cycle Started", description: "Processing guardian registry..." });

      for (const p of parents) {
        if (!p.parentNumber || p.parentNumber.includes("PENDING")) {
          skippedCount++;
          continue;
        }

        const safeId = p.parentNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const parentEmail = p.email || `${safeId}@system.yebfa.com`;
        let cleanPass = normalizeSecurityPhone(p.phone);
        
        if (cleanPass.length < 6) {
          cleanPass = cleanPass.padEnd(6, '0');
        }
        
        try {
          const credential = await createUserWithEmailAndPassword(provisionAuth, parentEmail, cleanPass);
          const authUser = credential.user;

          batch.set(doc(db, "users", authUser.uid), {
            uid: authUser.uid,
            name: `${p.firstName} ${p.lastName}`,
            email: parentEmail,
            role: "parent",
            tenantId: institutionId,
            institutionId: institutionId,
            status: "active",
            createdAt: serverTimestamp()
          });
          
          await signOut(provisionAuth);
          syncCount++;
        } catch (e: any) {
          if (e.code === 'auth/email-already-in-use') {
             syncCount++;
          } else {
             skippedCount++;
          }
        }
      }
      
      await batch.commit();
      toast({ title: "Guardian Access Synced", description: `Authorized ${syncCount} parents. ${skippedCount > 0 ? `${skippedCount} skipped.` : ''}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setSyncing(false);
      try { await deleteApp(provisionApp); } catch (e) {}
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this parent?")) return
    try {
      await deleteDoc(doc(db!, "parents", id))
      toast({ title: "Profile Removed" })
    } catch (e) { 
      toast({ variant: "destructive", title: "Action Failed" }) 
    }
  }

  if (profileLoading || pLoading) return (
    <div className="p-20 text-center space-y-4">
      <Loader2 className="size-12 text-primary animate-spin mx-auto" />
      <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Syncing Registry...</p>
    </div>
  )

  if (!institutionId) return (
    <div className="p-20 text-center space-y-4">
      <Activity className="size-12 text-primary animate-spin mx-auto" />
      <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Awaiting Institutional Context...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Parent Registry</h1>
          <p className="text-muted-foreground font-medium">Master database of guardians and family relationships.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            className="h-11 rounded-xl gap-2 text-xs font-bold uppercase" 
            onClick={handleSyncCredentials}
            disabled={syncing || parents.length === 0}
          >
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Sync Access
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
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, PAR code or phone..." 
                className="pl-10 h-12 bg-slate-50 border-none rounded-xl text-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Badge className="bg-primary/5 text-primary border-none text-[10px] font-bold uppercase tracking-widest px-4 h-10 flex items-center">
              {parents.length} Records Active
            </Badge>
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
                        {p.parentNumber || "UNASSIGNED"}
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
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold ${p.status === 'Active' ? 'text-green-600 bg-green-50' : 'text-slate-500'}`}>
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
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
