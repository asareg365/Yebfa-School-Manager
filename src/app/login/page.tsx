
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { School, Loader2, KeyRound, Smartphone, ShieldCheck, Briefcase, Users, GraduationCap, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db, useUser } from "@/firebase"
import { firebaseConfig } from "@/firebase/config"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { normalizeSecurityPhone } from "@/lib/identity-service"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [securityCredential, setSecurityCredential] = useState("")
  const [loading, setLoading] = useState(false)
  const [configError, setConfigError] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useUser()

  useEffect(() => {
    if (firebaseConfig.apiKey === "REPLACEME" || !firebaseConfig.apiKey) {
      setConfigError(true)
    }
  }, [])

  const redirectUser = async (firebaseUser: any) => {
    try {
      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid))
      if (!userSnap.exists()) { router.push("/register/institution"); return; }

      const userData = userSnap.data()
      if (userData.tenantId) {
        localStorage.setItem('selected_institution_id', userData.tenantId)
        localStorage.setItem('selected_institution_name', userData.institutionName || 'Registry Hub')
      }

      if (userData.role === "super_admin") router.replace("/admin")
      else if (userData.role === "parent") router.replace("/dashboard/parent")
      else if (userData.role === "student") router.replace("/dashboard/parent") // Currently student portal routes to reports
      else router.replace("/dashboard")
    } catch (e) { router.replace("/register/institution") }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || configError) return
    setLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      await redirectUser(credential.user)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: "Invalid email or security password." })
    } finally { setLoading(false) }
  }

  const handleParentIdentityLogin = async () => {
    if (!idNumber || !securityCredential) {
      toast({ variant: "destructive", title: "Credentials Required", description: "Enter Student ID and your phone number." })
      return
    }

    setLoading(true)
    try {
      // 1. Find Student
      const studentQ = query(collection(db, "students"), where("admissionNumber", "==", idNumber.trim().toUpperCase()))
      const studentSnap = await getDocs(studentQ)
      
      if (studentSnap.empty) throw new Error("Student ID not found in registry.");
      const studentDoc = studentSnap.docs[0];

      // 2. Find Linked Parent(s)
      const relsQ = query(collection(db, "student_parents"), where("studentId", "==", studentDoc.id))
      const relsSnap = await getDocs(relsQ)
      
      if (relsSnap.empty) throw new Error("No guardians are linked to this student ID.");

      const inputPhone = normalizeSecurityPhone(securityCredential)
      let matchedParent = null;

      // 3. Verify Phone against linked parents
      for (const relDoc of relsSnap.docs) {
        const parentId = relDoc.data().parentId;
        const parentSnap = await getDoc(doc(db, "parents", parentId));
        if (parentSnap.exists()) {
          const parentData = parentSnap.data();
          if (normalizeSecurityPhone(parentData.phone) === inputPhone) {
            matchedParent = parentData;
            break;
          }
        }
      }

      if (!matchedParent) throw new Error("Security verification failed: Phone number not recognized for this student.");

      // 4. Perform Auth Login
      const parentEmail = matchedParent.email || `${matchedParent.parentNumber.toLowerCase()}@system.yebfa.com`;
      const credential = await signInWithEmailAndPassword(auth, parentEmail, inputPhone)
      await redirectUser(credential.user)

    } catch (error: any) {
      toast({ variant: "destructive", title: "Access Denied", description: error.message })
    } finally { setLoading(false) }
  }

  const handleStudentIdentityLogin = async () => {
    if (!idNumber || !securityCredential) {
      toast({ variant: "destructive", title: "Credentials Required", description: "Enter Student ID and PIN." })
      return
    }

    setLoading(true)
    try {
      const studentQ = query(collection(db, "students"), where("admissionNumber", "==", idNumber.trim().toUpperCase()))
      const studentSnap = await getDocs(studentQ)
      
      if (studentSnap.empty) throw new Error("Student ID not recognized.");
      const studentData = studentSnap.docs[0].data();

      // Student Auth uses ID-based email and PIN as password
      const studentEmail = `${idNumber.toLowerCase()}@system.yebfa.com`;
      try {
        const credential = await signInWithEmailAndPassword(auth, studentEmail, securityCredential)
        await redirectUser(credential.user)
      } catch (authErr) {
        throw new Error("Invalid Student PIN. Contact administration if forgotten.");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Access Denied", description: error.message })
    } finally { setLoading(false) }
  }

  const handleStaffIdentityLogin = async () => {
    if (!idNumber || !securityCredential) {
      toast({ variant: "destructive", title: "Credentials Required" })
      return
    }
    
    setLoading(true)
    try {
      const q = query(collection(db, "staff"), where("staffNumber", "==", idNumber.trim().toUpperCase()))
      const snap = await getDocs(q)
      
      if (snap.empty) throw new Error("Staff ID not found.");
      
      const personData = snap.docs[0].data()
      const accountEmail = personData.email || `${idNumber.toLowerCase()}@system.yebfa.com`
      const cleanCredential = normalizeSecurityPhone(securityCredential)

      try {
        const credential = await signInWithEmailAndPassword(auth, accountEmail, cleanCredential)
        await redirectUser(credential.user)
      } catch (authErr) {
        throw new Error("Invalid credentials: Verification failed.");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Access Denied", description: error.message })
    } finally { setLoading(false) }
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary size-10" /></div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg group-hover:scale-105 transition-transform"><School className="size-6" /></div>
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
            <CardTitle className="text-2xl font-bold font-headline">Institutional Gateway</CardTitle>
            <CardDescription className="text-xs font-medium">Strategic multi-tenant identity verification active.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pb-8">
            <TabsContent value="admin" className="mt-0 space-y-4 animate-in fade-in">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Master Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Security Key</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : "Access Command Center"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="staff" className="mt-0 space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Staff ID (STF)</Label><Input placeholder="ABC-STF-2026-XXXX" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="h-12 rounded-xl font-mono" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Registered Phone</Label><Input type="tel" value={securityCredential} onChange={e => setSecurityCredential(e.target.value)} className="h-12 rounded-xl" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl" onClick={handleStaffIdentityLogin} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : "Verify Staff Access"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="parent" className="mt-0 space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Child's Student ID (STU)</Label><Input placeholder="ABC-STU-2026-XXXX" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="h-12 rounded-xl font-mono" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Parent Phone Number</Label><Input type="tel" placeholder="024XXXXXXX" value={securityCredential} onChange={e => setSecurityCredential(e.target.value)} className="h-12 rounded-xl" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl" onClick={handleParentIdentityLogin} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : "Authorize Guardian Portal"}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground italic">Access all your children by entering any one of their Student IDs.</p>
              </div>
            </TabsContent>

            <TabsContent value="student" className="mt-0 space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Student ID (STU)</Label><Input placeholder="ABC-STU-2026-XXXX" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="h-12 rounded-xl font-mono" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Student PIN</Label><Input type="password" maxLength={4} placeholder="XXXX" value={securityCredential} onChange={e => setSecurityCredential(e.target.value)} className="h-12 rounded-xl text-center text-2xl tracking-[1em]" /></div>
                <Button className="w-full h-14 font-bold rounded-2xl bg-primary shadow-xl" onClick={handleStudentIdentityLogin} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : "Verify Student Identity"}
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
    </div>
  )
}
