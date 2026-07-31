
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { School, Loader2, KeyRound, Smartphone, ShieldCheck, Briefcase, Users, GraduationCap, ArrowRight, AlertCircle, Key } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, signOut, User } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db, useUser } from "@/firebase"
import { firebaseConfig } from "@/firebase/config"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { normalizeSecurityPhone } from "@/lib/identity-service"

export default function LoginPage() {
  // --- ADMIN PORTAL STATE ---
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminLoading, setAdminLoading] = useState(false)
  
  // --- STAFF PORTAL STATE ---
  const [staffIdInput, setStaffIdInput] = useState("")
  const [staffPhoneInput, setStaffPhoneInput] = useState("")
  const [staffLoading, setStaffLoading] = useState(false)
  
  // --- PARENT PORTAL STATE ---
  const [parentStudentId, setParentStudentId] = useState("")
  const [parentPhoneInput, setParentPhoneInput] = useState("")
  const [parentLoading, setParentLoading] = useState(false)
  
  // --- STUDENT PORTAL STATE ---
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
      const userRef = doc(db, "users", firebaseUser.uid);
      let userSnap = await getDoc(userRef);

      // --- SELF-HEALING IDENTITY LINK ---
      if (!userSnap.exists() && roleHint && identifier) {
        console.log(`[Gateway] Identity doc missing for ${roleHint} ${identifier}. Attempting link restoration...`);
        
        let registryDoc = null;
        let tenantId = null;
        let name = "";

        if (roleHint === 'student') {
          const q = query(collection(db, "students"), where("admissionNumber", "==", identifier.trim().toUpperCase()));
          const snap = await getDocs(q);
          if (!snap.empty) {
            registryDoc = snap.docs[0].data();
            tenantId = registryDoc.tenantId;
            name = `${registryDoc.firstName} ${registryDoc.lastName}`;
          }
        } else if (roleHint === 'staff') {
          const q = query(collection(db, "staff"), where("staffNumber", "==", identifier.trim().toUpperCase()));
          const snap = await getDocs(q);
          if (!snap.empty) {
            registryDoc = snap.docs[0].data();
            tenantId = registryDoc.tenantId;
            name = `${registryDoc.firstName} ${registryDoc.lastName}`;
          }
        }

        if (registryDoc && tenantId) {
          const instSnap = await getDoc(doc(db, "institutions", tenantId));
          const instData = instSnap.data();

          await setDoc(userRef, {
            uid: firebaseUser.uid,
            name: name || "Registry User",
            email: firebaseUser.email,
            role: roleHint === 'student' ? 'student' : (registryDoc.designation?.toLowerCase() === 'administrator' ? 'administrator' : 'teacher'),
            studentId: roleHint === 'student' ? registryDoc.id : null,
            staffId: roleHint === 'staff' ? registryDoc.id : null,
            tenantId,
            institutionId: tenantId,
            institutionName: instData?.name || "Academic Hub",
            status: "active",
            createdAt: serverTimestamp()
          });
          
          userSnap = await getDoc(userRef);
          toast({ title: "Portal Access Synchronized", description: "Your registry identity link has been restored." });
        }
      }

      if (!userSnap.exists()) {
        await signOut(auth);
        toast({ 
          variant: "destructive", 
          title: "Identity Link Required", 
          description: "Your portal account is not linked to any active registry record. Contact your administrator." 
        });
        return;
      }

      const userData = userSnap.data()!;
      
      // Verification for non-Super Admins
      if (userData.role !== 'super_admin' && userData.tenantId) {
        const instSnap = await getDoc(doc(db, "institutions", userData.tenantId));
        if (!instSnap.exists()) {
          await signOut(auth);
          toast({ 
            variant: "destructive", 
            title: "Access Revoked", 
            description: "Your institution node is no longer active in the global registry." 
          });
          return;
        }
      }

      if (userData.tenantId) {
        localStorage.setItem('selected_institution_id', userData.tenantId);
        localStorage.setItem('selected_institution_name', userData.institutionName || 'Registry Hub');
      }

      // Logic-driven redirection based on verified role
      if (userData.role === "super_admin") {
        router.replace("/admin");
      } else if (userData.role === "parent" || userData.role === "student") {
        router.replace("/dashboard/parent");
      } else {
        router.replace("/dashboard");
      }
    } catch (e) { 
      console.error("Gateway Auth Error:", e);
      toast({ variant: "destructive", title: "Gateway Error", description: "Failed to resolve identity context." });
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
      toast({ variant: "destructive", title: "Login Failed", description: "Invalid email or security password." })
    } finally { setAdminLoading(false) }
  }

  const handleParentLogin = async () => {
    if (!parentStudentId || !parentPhoneInput) {
      toast({ variant: "destructive", title: "Credentials Required", description: "Enter Student ID and your phone number." })
      return
    }

    setParentLoading(true)
    const normalizedStudentId = parentStudentId.trim().toUpperCase()
    try {
      const studentQ = query(collection(db, "students"), where("admissionNumber", "==", normalizedStudentId))
      const studentSnap = await getDocs(studentQ)
      
      if (studentSnap.empty) throw new Error("Student ID not found in registry.");
      const studentDocId = studentSnap.docs[0].id;

      const relsQ = query(collection(db, "student_parents"), where("studentId", "==", studentDocId))
      const relsSnap = await getDocs(relsQ)
      
      if (relsSnap.empty) throw new Error("No guardians are linked to this student ID.");

      let inputPhone = normalizeSecurityPhone(parentPhoneInput)
      if (inputPhone.length < 6) inputPhone = inputPhone.padEnd(6, '0');
      
      let matchedParent = null;

      for (const relDoc of relsSnap.docs) {
        const parentId = relDoc.data().parentId;
        const parentSnap = await getDoc(doc(db, "parents", parentId));
        if (parentSnap.exists()) {
          const parentData = parentSnap.data();
          if (normalizeSecurityPhone(parentData.phone) === normalizeSecurityPhone(parentPhoneInput)) {
            matchedParent = parentData;
            break;
          }
        }
      }

      if (!matchedParent) throw new Error("Verification failed: Phone number not recognized for this student.");

      const parentEmail = matchedParent.email || `${matchedParent.parentNumber.toUpperCase().trim()}@system.yebfa.com`;
      const credential = await signInWithEmailAndPassword(auth, parentEmail, inputPhone)
      await redirectUser(credential.user, 'parent', matchedParent.parentNumber)

    } catch (error: any) {
      toast({ variant: "destructive", title: "Access Denied", description: error.message })
    } finally { setParentLoading(false) }
  }

  const handleStudentLogin = async () => {
    if (!studentIdInput || !studentPinInput) {
      toast({ variant: "destructive", title: "Credentials Required", description: "Enter Student ID and PIN." })
      return
    }

    setStudentLoading(true)
    const normalizedId = studentIdInput.trim().toUpperCase()
    try {
      const studentEmail = `${normalizedId}@system.yebfa.com`;
      const credential = await signInWithEmailAndPassword(auth, studentEmail, studentPinInput.trim())
      await redirectUser(credential.user, 'student', normalizedId)
    } catch (error: any) {
      const msg = error.code === 'auth/invalid-credential' ? "Invalid ID or PIN." : (error.message || "Access Denied.");
      toast({ variant: "destructive", title: "Access Denied", description: msg })
    } finally { setStudentLoading(false) }
  }

  const handleStaffLogin = async () => {
    if (!staffIdInput || !staffPhoneInput) {
      toast({ variant: "destructive", title: "Credentials Required" })
      return
    }
    
    setStaffLoading(true)
    const normalizedId = staffIdInput.trim().toUpperCase()
    try {
      const accountEmail = `${normalizedId}@system.yebfa.com`
      let cleanCredential = normalizeSecurityPhone(staffPhoneInput)
      if (cleanCredential.length < 6) cleanCredential = cleanCredential.padEnd(6, '0');

      const credential = await signInWithEmailAndPassword(auth, accountEmail, cleanCredential)
      await redirectUser(credential.user, 'staff', normalizedId)
    } catch (error: any) {
      const msg = error.code === 'auth/invalid-credential' ? "Invalid ID or registered phone number." : (error.message || "Access Denied.");
      toast({ variant: "destructive", title: "Access Denied", description: msg })
    } finally { setStaffLoading(false) }
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-primary size-10" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Resolving Session Context...</p>
      </div>
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
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Security Key</Label><Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required className="h-12 rounded-xl" /></div>
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
                <div className="p-4 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex gap-3">
                   <Users className="size-4 shrink-0 mt-0.5" />
                   <p className="text-[10px] leading-relaxed font-medium italic">Access all your children by entering any one of their Student IDs.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="student" className="mt-0 space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Student ID (STU)</Label><Input placeholder="ABC-STU-2026-XXXX" value={studentIdInput} onChange={e => setStudentIdInput(e.target.value)} className="h-12 rounded-xl font-mono" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Student PIN (6 Digits)</Label><Input type="password" maxLength={6} placeholder="XXXXXX" value={studentPinInput} onChange={e => setStudentPinInput(e.target.value)} className="h-12 rounded-xl text-center text-2xl tracking-[0.5em]" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl shadow-primary/20" onClick={handleStudentLogin} disabled={studentLoading}>
                  {studentLoading ? <Loader2 className="animate-spin mr-2" /> : "Verify Student Identity"}
                </Button>
                <div className="p-4 rounded-xl bg-slate-50 border flex gap-3">
                   <KeyRound className="size-4 text-primary shrink-0 mt-0.5" />
                   <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">Use the 6-digit PIN generated during your enrollment.</p>
                </div>
              </div>
            </TabsContent>
          </CardContent>

          <CardFooter className="bg-muted/30 p-6 flex flex-col gap-4 border-t">
            <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest">Institutional Data Isolation Active • System 2026</p>
            <Button variant="link" className="w-full gap-2 text-primary font-bold text-xs" asChild><Link href="/register/institution">Register New Institution <ArrowRight className="size-3.5" /></Link></Button>
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  )
}
