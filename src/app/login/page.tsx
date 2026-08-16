
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldCheck, Briefcase, Users, GraduationCap, Key } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  signInWithEmailAndPassword, 
  signInWithCustomToken,
  signOut, 
  User 
} from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp, limit } from "firebase/firestore"
import { auth, db, useUser } from "@/firebase"
import { firebaseConfig } from "@/firebase/config"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { normalizeSecurityPhone, getInstitutionEmailDomain } from "@/lib/identity-service"
import { Logo } from "@/components/logo"

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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selected_institution_id');
        localStorage.removeItem('selected_institution_name');
      }

      const userRef = doc(db, "users", firebaseUser.uid);
      
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (e: any) {
        console.error("Failed reading user document", e.code, e.message);
      }

      let userData = userSnap?.exists() ? userSnap.data() : null;

      if (!userData) {
        console.log(`[Gateway] Identity context resolution triggered...`);
        
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

        registryDoc = await findInCollection("students", "authUid");
        if (registryDoc) {
          role = "student";
          studentId = registryDoc.id;
        } else {
          registryDoc = await findInCollection("staff", "authUid");
          if (registryDoc) {
            role = resolveSystemRole(registryDoc.designation);
            staffId = registryDoc.id;
          } else {
            registryDoc = await findInCollection("parents", "authUid");
            if (registryDoc) role = "parent";
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
        }
      }

      if (!userData) {
        await signOut(auth!);
        toast({ variant: "destructive", title: "Identity Required", description: "This portal account is not linked to a registry record." });
        return;
      }

      if (userData.tenantId && userData.role !== 'super_admin') {
        localStorage.setItem('selected_institution_id', userData.tenantId);
        localStorage.setItem('selected_institution_name', userData.institutionName || 'Registry Hub');
      }

      if (userData.role === "super_admin") router.replace("/admin");
      else if (userData.role === "parent" || userData.role === "student") router.replace("/dashboard/parent");
      else router.replace("/dashboard");
      
    } catch (e: any) {
      console.error("Gateway Error", e.code, e.message);
      toast({ variant: "destructive", title: "Gateway Error", description: e.message });
    }
  }

  const resolveSystemRole = (designation: string) => {
    const d = designation?.toLowerCase() || ""
    if (d === 'head teacher' || d === 'administrator') return 'administrator'
    if (d === 'accountant') return 'accountant'
    if (d === 'librarian') return 'librarian'
    return 'teacher'
  }

  const getInstitutionByCode = async (code: string) => {
    const q = query(collection(db, "institutions"), where("schoolCode", "==", code.toUpperCase()), limit(1));
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].data();
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || configError) return
    setAdminLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword)
      await redirectUser(credential.user)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message })
    } finally { setAdminLoading(false) }
  }

  const handleStaffLogin = async () => {
    if (!staffIdInput || !staffPhoneInput) return
    setStaffLoading(true)
    const normID = staffIdInput.trim().toUpperCase()
    const schoolCode = normID.split('-')[0];
    
    try {
      const inst = await getInstitutionByCode(schoolCode);
      if (!inst) throw new Error("Invalid Institution Prefix.");

      const domain = getInstitutionEmailDomain(inst);
      const email = `${normID}@${domain}`;
      let inputPass = normalizeSecurityPhone(staffPhoneInput)
      if (inputPass.length < 6) inputPass = inputPass.padEnd(6, '0');

      const cred = await signInWithEmailAndPassword(auth!, email, inputPass)
      await redirectUser(cred.user, 'staff', normID)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Auth Error", description: error.message })
    } finally { setStaffLoading(false) }
  }

  const handleParentLogin = async () => {
    if (!parentStudentId || !parentPhoneInput) return;

    setParentLoading(true);

    const normST = parentStudentId.trim().toUpperCase();
    const phone = normalizeSecurityPhone(parentPhoneInput);

    try {
      const response = await fetch("/api/parent-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: normST,
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Parent login failed.");
      }

      const cred = await signInWithCustomToken(auth!, data.token);
      
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          uid: cred.user.uid,
          role: "parent",
          parentId: data.parentId,
          studentId: data.studentId,
          tenantId: data.tenantId,
          institutionId: data.tenantId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await redirectUser(cred.user, "parent", normST);
    } catch (error: any) {
      console.error(
        "[Parent Login Error]",
        error.code,
        error.message
      );

      toast({
        variant: "destructive",
        title: "Login Error",
        description: error.message,
      });
    } finally {
      setParentLoading(false);
    }
  };

  const handleStudentLogin = async () => {
    if (!studentIdInput || !studentPinInput) return
    setStudentLoading(true)
    const normID = studentIdInput.trim().toUpperCase()
    const schoolCode = normID.split('-')[0];

    try {
      const inst = await getInstitutionByCode(schoolCode);
      if (!inst) throw new Error("Invalid Institution Prefix.");

      const domain = getInstitutionEmailDomain(inst);
      const email = `${normID}@${domain}`;
      const cred = await signInWithEmailAndPassword(auth!, email, studentPinInput.trim())
      await redirectUser(cred.user, 'student', normID)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Error", description: error.message })
    } finally { setStudentLoading(false) }
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <Logo className="size-10 rounded-xl shadow-lg group-hover:scale-105 transition-transform" />
        <span className="text-2xl font-headline font-bold text-primary">Yebfa School Manager</span>
      </Link>
      
      <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
        <Tabs defaultValue="admin">
          <TabsList className="grid grid-cols-4 h-14 bg-muted/50 p-1 border-b">
            <TabsTrigger value="admin" className="text-[10px] font-bold uppercase"><ShieldCheck className="size-3.5 mr-1" /> Admin</TabsTrigger>
            <TabsTrigger value="staff" className="text-[10px] font-bold uppercase"><Briefcase className="size-3.5 mr-1" /> Staff</TabsTrigger>
            <TabsTrigger value="parent" className="text-[10px] font-bold uppercase"><Users className="size-3.5 mr-1" /> Parent</TabsTrigger>
            <TabsTrigger value="student" className="text-[10px] font-bold uppercase"><GraduationCap className="size-3.5 mr-1" /> Student</TabsTrigger>
          </TabsList>

          <CardHeader className="pb-4 pt-8">
            <CardTitle className="text-2xl font-bold font-headline text-primary">Gateway</CardTitle>
            <CardDescription className="text-xs font-medium">Strategic multi-tenant identity verification.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pb-8">
            <TabsContent value="admin" className="mt-0 space-y-4">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required className="h-12 rounded-xl" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl" type="submit" disabled={adminLoading}>Login Admin</Button>
              </form>
            </TabsContent>

            <TabsContent value="staff" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2"><Label>Staff ID</Label><Input placeholder="VOD-SF-XXXXXX" value={staffIdInput} onChange={e => setStaffIdInput(e.target.value)} className="h-12 rounded-xl font-mono" /></div>
                <div className="space-y-2"><Label>Registered Phone</Label><Input type="tel" value={staffPhoneInput} onChange={e => setStaffPhoneInput(e.target.value)} className="h-12 rounded-xl" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl" onClick={handleStaffLogin} disabled={staffLoading}>Verify Staff</Button>
              </div>
            </TabsContent>

            <TabsContent value="parent" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2"><Label>Student ID</Label><Input placeholder="VOD-ST-XXXXXX" value={parentStudentId} onChange={e => setParentStudentId(e.target.value)} className="h-12 rounded-xl font-mono" /></div>
                <div className="space-y-2"><Label>Parent Phone</Label><Input type="tel" value={parentPhoneInput} onChange={e => setParentPhoneInput(e.target.value)} className="h-12 rounded-xl" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl" onClick={handleParentLogin} disabled={parentLoading}>Enter Portal</Button>
              </div>
            </TabsContent>

            <TabsContent value="student" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2"><Label>Student ID</Label><Input placeholder="VOD-ST-XXXXXX" value={studentIdInput} onChange={e => setStudentIdInput(e.target.value)} className="h-12 rounded-xl font-mono" /></div>
                <div className="space-y-2"><Label>PIN</Label><Input type="password" maxLength={6} placeholder="XXXXXX" value={studentPinInput} onChange={e => setStudentPinInput(e.target.value)} className="h-12 rounded-xl text-center text-2xl tracking-[0.5em]" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl" onClick={handleStudentLogin} disabled={studentLoading}>Login Student</Button>
              </div>
            </TabsContent>
          </CardContent>
          <CardFooter className="bg-muted/30 p-6 flex flex-col gap-4 border-t">
            <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest">Multi-Tenant Isolation Active • System 2026</p>
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  )
}
