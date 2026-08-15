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
  Activity,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, deleteDoc, writeBatch, serverTimestamp, setDoc } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import Papa from "papaparse"
import { initializeApp, deleteApp, FirebaseApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"
import { normalizeSecurityPhone, getInstitutionEmailDomain } from "@/lib/identity-service"
import { generateId } from "@/lib/id-generator"

export default function ParentsRegistryPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const bulkFileRef = useRef<HTMLInputElement>(null)
  
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

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const parentsQuery = useMemoFirebase(() => 
    institutionId ? query(collection(db, "parents"), where("tenantId", "==", institutionId)) : null, 
    [db, institutionId]
  )
  
  const relsQuery = useMemoFirebase(() => 
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

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !institutionId || !institution) return;
  
    setBulkLoading(true);
    let provisionApp: FirebaseApp | null = null;
  
    try {
      const provisionAppName = `bulk-parent-intake-${Date.now()}`;
      provisionApp = initializeApp(firebaseConfig, provisionAppName);
      const provisionAuth = getAuth(provisionApp);
  
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
        complete: async (results) => {
          try {
            const rawRows = results.data as any[];
            if (!rawRows.length) {
              toast({ variant: "destructive", title: "Empty CSV", description: "No guardian records were found." });
              return;
            }
  
            let successCount = 0;
            let failCount = 0;
            let skippedCount = 0;
  
            for (const row of rawRows) {
              const getValue = (...keys: string[]) => {
                for (const key of keys) {
                  const val = row[key];
                  if (val !== undefined && val !== null) {
                    const cleaned = String(val).trim();
                    if (cleaned) return cleaned;
                  }
                }
                return "";
              };

              let first = getValue("firstname", "first", "givenname", "guardianfirstname");
              let last = getValue("lastname", "last", "surname", "familyname", "guardianlastname");
              const phone = getValue("phone", "phonenumber", "contact", "mobile");
              const email = getValue("email", "emailaddress");

              if (!first || !last || !phone) {
                skippedCount++;
                continue;
              }

              try {
                const finalParentNumber = await generateId('parents', institution.schoolCode, 'PR');
                let cleanPass = normalizeSecurityPhone(phone);
                if (cleanPass.length < 6) cleanPass = cleanPass.padEnd(6, '0');
                
                const domain = getInstitutionEmailDomain(institution);
                const authEmail = `${finalParentNumber.trim()}@${domain}`.toLowerCase();
                const contactEmail = email.toLowerCase() || authEmail;
                
                let authUid = null;
                try {
                  const credential = await createUserWithEmailAndPassword(provisionAuth, authEmail, cleanPass);
                  authUid = credential.user.uid;
                  await signOut(provisionAuth);
                } catch (authErr) {
                  console.log("Bulk Auth Catch");
                }

                const batch = writeBatch(db);
                const parentRef = doc(collection(db, "parents"));
                const parentId = parentRef.id;

                batch.set(parentRef, {
                  id: parentId,
                  parentNumber: finalParentNumber,
                  firstName: first,
                  lastName: last,
                  phone: normalizeSecurityPhone(phone),
                  email: contactEmail,
                  authEmail: authEmail,
                  authUid,
                  occupation: getValue("occupation", "job", "profession"),
                  address: getValue("address", "residence", "residentialaddress"),
                  status: "Active",
                  tenantId: institutionId,
                  institutionId: institutionId,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });

                const userUid = authUid || parentId;
                batch.set(doc(db, "users", userUid), {
                  uid: userUid,
                  name: `${first} ${last}`,
                  email: contactEmail,
                  authEmail: authEmail,
                  role: "parent",
                  tenantId: institutionId,
                  institutionId: institutionId,
                  status: "active",
                  createdAt: serverTimestamp()
                }, { merge: true });

                await batch.commit();
                successCount++;
              } catch (rowError) {
                failCount++;
              }
            }
  
            toast({ title: "Intake Complete", description: `${successCount} guardians enrolled. ${failCount} failed. ${skippedCount} skipped.` });
            setIsBulkOpen(false);
          } catch (error: any) {
            toast({ variant: "destructive", title: "Intake Halted", description: error?.message });
          } finally {
            setBulkLoading(false);
            if (bulkFileRef.current) bulkFileRef.current.value = "";
            if (provisionApp) try { await deleteApp(provisionApp); } catch (e) {}
          }
        }
      });
    } catch (error: any) {
      setBulkLoading(false);
      toast({ variant: "destructive", title: "Bulk Intake Failed" });
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
          <p className="text-muted-foreground font-medium">Master database of guardians and automated portal access.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => setIsBulkOpen(true)}>
             <FileSpreadsheet className="size-4 mr-2" /> Bulk Intake
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
            <div className="relative flex-1 max-md">
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

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="w-[95vw] sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl h-[80vh] flex flex-col">
          <div className="flex flex-col h-full overflow-hidden">
             <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0 relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center"><FileSpreadsheet className="size-5" /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Bulk Data Entry</span>
                </div>
                <DialogTitle className="text-2xl font-headline font-bold">Guardian Bulk Intake</DialogTitle>
                <DialogDescription className="text-primary-foreground/70">Mass enrollment of parents with automated portal provisioning.</DialogDescription>
             </DialogHeader>

             <ScrollArea className="flex-1">
                <div className="p-8 space-y-10">
                   <section className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                         <div className="size-10 rounded-xl bg-white border flex items-center justify-center shadow-sm">
                            <Download className="size-5 text-primary" />
                         </div>
                         <div className="flex-1">
                            <p className="text-sm font-bold text-primary">Intake Schema</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Standard CSV Format Required</p>
                         </div>
                         <Button variant="outline" size="sm" className="h-9 rounded-xl text-[10px] font-bold uppercase" onClick={() => {
                           const csv = "First Name,Last Name,Phone,Email,Occupation,Address\nJohn,Doe,0240000000,john@example.com,Trader,Goaso Central";
                           const blob = new Blob([csv], { type: 'text/csv' });
                           const url = window.URL.createObjectURL(blob);
                           const a = document.createElement('a');
                           a.href = url;
                           a.download = 'guardian_intake_template.csv';
                           a.click();
                         }}>
                            Template
                         </Button>
                      </div>
                   </section>

                   <section className="space-y-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2">
                        <Upload className="size-4" /> Finalize Intake
                      </h3>
                      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-slate-50/50 group hover:bg-white hover:border-primary/20 transition-all cursor-pointer" onClick={() => bulkFileRef.current?.click()}>
                         {bulkLoading ? (
                           <div className="flex flex-col items-center gap-4">
                              <Loader2 className="size-10 animate-spin text-primary" />
                              <p className="text-xs font-bold text-primary uppercase animate-pulse">Synchronizing Multi-Tenant Node...</p>
                           </div>
                         ) : (
                           <>
                              <div className="size-16 rounded-2xl bg-white border flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                 <FileSpreadsheet className="size-8 text-primary/40" />
                              </div>
                              <p className="text-sm font-bold text-primary">Select Guardian Data File</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Accepts .CSV format only</p>
                           </>
                         )}
                         <input type="file" ref={bulkFileRef} onChange={handleBulkUpload} accept=".csv" className="hidden" />
                      </div>
                      
                      <div className="p-6 rounded-2xl bg-orange-50 border border-orange-100 flex gap-4">
                         <AlertCircle className="size-6 text-orange-600 shrink-0" />
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest">Airtight Provisioning</p>
                            <p className="text-[11px] text-orange-700 leading-relaxed font-medium">The system will automatically generate unique IDs and portal pins for every record. Ensure the "Phone" column is accurate as it acts as the primary identity key.</p>
                         </div>
                      </div>
                   </section>
                </div>
             </ScrollArea>

             <DialogFooter className="bg-slate-50 p-6 md:p-8 border-t shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2 mx-auto">
                   <ShieldCheck className="size-3 text-green-600" /> Authorized Registry Synchronization • 2026 Node
                </p>
             </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
