
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { School, Loader2, KeyRound, Smartphone, ShieldCheck, Briefcase, Users, GraduationCap, ArrowRight, AlertCircle, Key, Mail, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, signOut, User, sendPasswordResetEmail } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp, limit } from "firebase/firestore"
import { auth, db, useUser } from "@/firebase"
import { firebaseConfig } from "@/firebase/config"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { normalizeSecurityPhone } from "@/lib/identity-service"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function LoginPage() {
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminLoading, setAdminLoading] = useState(false)
  
  const [staffIdInput, setStaffIdInput] = useState("")
  const [staffPhoneInput, setStaffPhoneInput] = useState("")
  const [staffLoading, setStaffLoading] = useState(false)
  
  const [parentStudentId, setParentStudentId] = useState("")
  const [parentPhoneInput, setParentPhoneInput] = useState("")
  const [parentLoading, setParentLoading] = useState(false)
  
  const [studentIdInput, setStudentIdInput] = useState("")
  const [studentPinInput, setStudentPinInput] = useState("")
  const [studentLoading, setStudentLoading] = useState(false)

  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)

  const [configError, setConfigError] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useUser()

  useEffect(() => {
    if (firebaseConfig.apiKey === "REPLACEME" || !firebaseConfig.apiKey) {
      setConfigError(true)
    }
  }, [])

  const redirectUser = async (firebaseUser: User, roleHint?: string, identifier?: string) => {
    try {
      // Strategic Context Purge: Clear stale institution IDs before starting a new session
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selected_institution_id');
        localStorage.removeItem('selected_institution_name');
      }

      const userRef = doc(db, "users", firebaseUser.uid);
      console.log("Firebase UID:", firebaseUser.uid);
      console.log("Firebase Email:", firebaseUser.email);
      console.log("Reading:", userRef.path);

      let userSnap;
      try {
        userSnap = await getDoc(userRef);
        console.log("Exists:", userSnap.exists());
        if (userSnap.exists()) {
          console.log("User data:", userSnap.data());
        }
      } catch (e: any) {
        console.error("Failed reading user document");
        console.error(e.code);
        console.error(e.message);
      }

      let userData = userSnap?.exists() ? userSnap.data() : null;

      if (!userData) {
        console.log(`[Gateway] Identity doc missing for ${firebaseUser.uid}. Resolving from Registry...`);
        
        let registryDoc: any = null;
        let tenantId = null;
        let name = "";
        let role = roleHint || "guest";
        let studentId = null;
        let staffId = null;

        const findInCollection = async (coll: string, uidField: string) => {
          const q = query(collection(db, coll), where(uidField, "==", firebaseUser.uid), limit(1));
          const snap = await getDocs(q);
          return snap.empty ? null : snap.docs[0].data();
        };

        // Proper Fix: Search by authUid first
        registryDoc = await findInCollection("students", "authUid");
        if (registryDoc) {
          role = "student";
          studentId = registryDoc.id;
        } else {
          registryDoc = await findInCollection("staff", "authUid");
          if (registryDoc) {
            role = registryDoc.designation?.toLowerCase() === 'administrator' ? 'administrator' : 'teacher';
            staffId = registryDoc.id;
          } else {
            registryDoc = await findInCollection("parents", "authUid");
            if (registryDoc) role = "parent";
          }
        }

        // Legacy Fallback: Search by Identifier if authUid lookup failed
        if (!registryDoc && identifier) {
          const normId = identifier.trim().toUpperCase();
          const qS = query(collection(db, "students"), where("admissionNumber", "==", normId), limit(1));
          const snapS = await getDocs(qS);
          if (!snapS.empty) {
            registryDoc = snapS.docs[0].data();
            role = "student";
            studentId = registryDoc.id;
          } else {
            const qSt = query(collection(db, "staff"), where("staffNumber", "==", normId), limit(1));
            const snapSt = await getDocs(qSt);
            if (!snapSt.empty) {
              registryDoc = snapSt.docs[0].data();
              role = registryDoc.designation?.toLowerCase() === 'administrator' ? 'administrator' : 'teacher';
              staffId = registryDoc.id;
            }
          }
        }

        if (registryDoc) {
          tenantId = registryDoc.tenantId;
          name = `${registryDoc.firstName} ${registryDoc.lastName}`;
          const instSnap = await getDoc(doc(db, "institutions", tenantId));
          const instName = instSnap.data()?.name || "Registry Hub";

          userData = {
            uid: firebaseUser.uid,
            name,
            email: firebaseUser.email,
            role,
            studentId,
            staffId,
            tenantId,
            institutionId: tenantId,
            institutionName: instName,
            status: "active",
            createdAt: serverTimestamp()
          };

          await setDoc(userRef, userData);
          toast({ title: "Profile Restored", description: "Identity link synchronized via Registry Hub." });
        }
      }

      if (!userData) {
        await signOut(auth!);
        toast({ variant: "destructive", title: "Identity Link Required", description: "Your portal account is not linked to any registry record." });
        return;
      }

      if (userData.role !== 'super_admin' && userData.tenantId) {
        console.log("Reading institution:", userData.tenantId);
        const instSnap = await getDoc(doc(db, "institutions", userData.tenantId));
        if (!instSnap.exists()) {
          await signOut(auth!);
          toast({ variant: "destructive", title: "Access Revoked", description: "Institutional node deactivated." });
          return;
        }
      }

      // Map the institutional context to the local session
      if (userData.tenantId && userData.role !== 'super_admin') {
        localStorage.setItem('selected_institution_id', userData.tenantId);
        localStorage.setItem('selected_institution_name', userData.institutionName || 'Registry Hub');
      }

      if (userData.role === "super_admin") router.replace("/admin");
      else if (userData.role === "parent" || userData.role === "student") router.replace("/dashboard/parent");
      else router.replace("/dashboard");
      
    } catch (e: any) {
      console.error("Gateway Error", e);
      console.error("Error code:", e.code);
      console.error("Error message:", e.message);

      toast({
        variant: "destructive",
        title: "Gateway Error",
        description: e.message
      });
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || configError) return
    setAdminLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword)
      await redirectUser(credential.user)
    } catch (error: any) {
      console.log(error);
      console.log(error.code);
      console.log(error.message);
      toast({ variant: "destructive", title: error.code, description: error.message })
    } finally { setAdminLoading(false) }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || !resetEmail) return
    setResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim())
      toast({ title: "Recovery Dispatched", description: "Check your email." })
      setIsResetOpen(false)
      setResetEmail("")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Recovery Failed" })
    } finally { setResetLoading(false) }
  }

  const handleParentLogin = async () => {
    if (!parentStudentId || !parentPhoneInput) return
    setParentLoading(true)
    const normST = parentStudentId.trim().toUpperCase()
    try {
      const studentQ = query(collection(db, "students"), where("admissionNumber", "==", normST), limit(1))
      const studentSnap = await getDocs(studentQ)
      if (studentSnap.empty) throw new Error("Student ID not found.");
      const studentDocId = studentSnap.docs[0].id;

      const relsQ = query(collection(db, "student_parents"), where("studentId", "==", studentDocId), limit(5))
      const relsSnap = await getDocs(relsQ)
      if (relsSnap.empty) throw new Error("No guardians linked.");

      let inputPhone = normalizeSecurityPhone(parentPhoneInput)
      if (inputPhone.length < 6) inputPhone = inputPhone.padEnd(6, '0');
      
      let matchedParent = null;
      for (const relDoc of relsSnap.docs) {
        const pSnap = await getDoc(doc(db, "parents", relDoc.data().parentId));
        if (pSnap.exists() && normalizeSecurityPhone(pSnap.data().phone) === normalizeSecurityPhone(parentPhoneInput)) {
          matchedParent = pSnap.data();
          break;
        }
      }

      if (!matchedParent) throw new Error("Phone number mismatch.");
      const pEmail = matchedParent.email || `${matchedParent.parentNumber.toUpperCase().trim()}@system.yebfa.com`;
      const cred = await signInWithEmailAndPassword(auth!, pEmail, inputPhone)
      await redirectUser(cred.user, 'parent', matchedParent.parentNumber)
    } catch (error: any) {
      console.log(error);
      console.log(error.code);
      console.log(error.message);
      toast({ variant: "destructive", title: error.code, description: error.message })
    } finally { setParentLoading(false) }
  }

  const handleStudentLogin = async () => {
    if (!studentIdInput || !studentPinInput) return
    setStudentLoading(true)
    const normID = studentIdInput.trim().toUpperCase()
    try {
      const email = `${normID}@system.yebfa.com`;
      const cred = await signInWithEmailAndPassword(auth!, email, studentPinInput.trim())
      await redirectUser(cred.user, 'student', normID)
    } catch (error: any) {
      console.log(error);
      console.log(error.code);
      console.log(error.message);
      toast({ variant: "destructive", title: error.code, description: error.message })
    } finally { setStudentLoading(false) }
  }

  const handleStaffLogin = async () => {
    if (!staffIdInput || !staffPhoneInput) return
    setStaffLoading(true)
    const normID = staffIdInput.trim().toUpperCase()
    try {
      const q = query(collection(db, "staff"), where("staffNumber", "==", normID), limit(1))
      const snap = await getDocs(q)
      if (snap.empty) throw new Error("Staff ID not found.");
      const sData = snap.docs[0].data();

      let inputPhone = normalizeSecurityPhone(staffPhoneInput)
      if (inputPhone.length < 6) inputPhone = inputPhone.padEnd(6, '0');

      if (normalizeSecurityPhone(sData.phone) !== normalizeSecurityPhone(staffPhoneInput)) throw new Error("Phone mismatch.");

      const email = sData.email || `${normID}@system.yebfa.com`;
      const cred = await signInWithEmailAndPassword(auth!, email, inputPhone)
      await redirectUser(cred.user, 'staff', normID)
    } catch (error: any) {
      console.log(error);
      console.log(error.code);
      console.log(error.message);
      toast({ variant: "destructive", title: error.code, description: error.message })
    } finally { setStaffLoading(false) }
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-primary size-10" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg group-hover:scale-105 transition-transform"><School className="size-6" /></div>
        <span className="text-2xl font-headline font-bold text-primary">Yebfa School Manager</span>
      </Link>
      
      <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
        <Tabs defaultValue="admin">
          <TabsList className="grid grid-cols-4 h-14 bg-muted/50 p-1 border-b">
            <TabsTrigger value="admin" className="text-[10px] font-bold uppercase data-[state=active]:text-primary"><ShieldCheck className="size-3.5 mr-1" /> Admin</TabsTrigger>
            <TabsTrigger value="staff" className="text-[10px] font-bold uppercase data-[state=active]:text-primary"><Briefcase className="size-3.5 mr-1" /> Staff</TabsTrigger>
            <TabsTrigger value="parent" className="text-[10px] font-bold uppercase data-[state=active]:text-primary"><Users className="size-3.5 mr-1" /> Parent</TabsTrigger>
            <TabsTrigger value="student" className="text-[10px] font-bold uppercase data-[state=active]:text-primary"><GraduationCap className="size-3.5 mr-1" /> Student</TabsTrigger>
          </TabsList>

          <CardHeader className="pb-4 pt-8">
            <CardTitle className="text-2xl font-bold font-headline text-primary">Institutional Gateway</CardTitle>
            <CardDescription className="text-xs font-medium">Strategic multi-tenant identity verification active.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pb-8">
            <TabsContent value="admin" className="mt-0 space-y-4 animate-in fade-in">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Master Email</Label><Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required className="h-12 rounded-xl" /></div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Security Key</Label>
                    <button type="button" onClick={() => setIsResetOpen(true)} className="text-[10px] font-bold text-primary hover:underline hover:text-accent transition-colors">Forgot Key?</button>
                  </div>
                  <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required className="h-12 rounded-xl" />
                </div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20" type="submit" disabled={adminLoading}>
                  {adminLoading ? <Loader2 className="animate-spin mr-2" /> : "Access Command Center"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="staff" className="mt-0 space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Staff ID (STF)</Label><Input placeholder="ABC-STF-2026-XXXX" value={staffIdInput} onChange={e => setStaffIdInput(e.target.value)} className="h-12 rounded-xl font-mono" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Registered Phone</Label><Input type="tel" value={staffPhoneInput} onChange={e => setStaffPhoneInput(e.target.value)} className="h-12 rounded-xl" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20" onClick={handleStaffLogin} disabled={staffLoading}>
                  {staffLoading ? <Loader2 className="animate-spin mr-2" /> : "Verify Staff Access"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="parent" className="mt-0 space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Child's Student ID (STU)</Label><Input placeholder="ABC-STU-2026-XXXX" value={parentStudentId} onChange={e => setParentStudentId(e.target.value)} className="h-12 rounded-xl font-mono" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Parent Phone Number</Label><Input type="tel" placeholder="024XXXXXXX" value={parentPhoneInput} onChange={e => setParentPhoneInput(e.target.value)} className="h-12 rounded-xl" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20" onClick={handleParentLogin} disabled={parentLoading}>
                  {parentLoading ? <Loader2 className="animate-spin mr-2" /> : "Authorize Guardian Portal"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="student" className="mt-0 space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Student ID (STU)</Label><Input placeholder="ABC-STU-2026-XXXX" value={studentIdInput} onChange={e => setStudentIdInput(e.target.value)} className="h-12 rounded-xl font-mono" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Student PIN (6 Digits)</Label><Input type="password" maxLength={6} placeholder="XXXXXX" value={studentPinInput} onChange={e => setStudentPinInput(e.target.value)} className="h-12 rounded-xl text-center text-2xl tracking-[0.5em]" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20" onClick={handleStudentLogin} disabled={studentLoading}>
                  {studentLoading ? <Loader2 className="animate-spin mr-2" /> : "Verify Student Identity"}
                </Button>
              </div>
            </TabsContent>
          </CardContent>

          <CardFooter className="bg-muted/30 p-6 flex flex-col gap-4 border-t">
            <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest">Institutional Data Isolation Active • System 2026</p>
            <Button variant="link" className="w-full gap-2 text-primary font-bold text-xs" asChild><Link href="/register/institution">Register New Institution <ArrowRight className="size-3.5" /></Link></Button>
          </CardFooter>
        </Tabs>
      </Card>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <form onSubmit={handleResetPassword}>
            <DialogHeader className="p-8 bg-primary text-primary-foreground">
              <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4"><RefreshCw className="size-6 text-accent" /></div>
              <DialogTitle className="text-2xl font-headline font-bold">Security Recovery</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Enter your master email to receive a recovery link.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Registered Email Address</Label>
                <Input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="admin@institution.com" className="h-12 rounded-xl" />
              </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t">
              <Button type="submit" disabled={resetLoading || !resetEmail} className="w-full h-14 bg-primary font-bold rounded-2xl shadow-xl text-lg">
                {resetLoading ? <Loader2 className="animate-spin mr-2" /> : "Dispatch Reset Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
