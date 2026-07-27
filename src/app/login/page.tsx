
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { School, Loader2, KeyRound, Smartphone, ShieldCheck, Briefcase, Users, GraduationCap, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
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

  const handleRegistryLogin = async (type: 'STF' | 'PAR' | 'STU') => {
    if (!idNumber || !securityCredential) {
      toast({ variant: "destructive", title: "Credentials Required" })
      return
    }
    
    setLoading(true)
    try {
      const collectionName = type === 'STF' ? "staff" : type === 'PAR' ? "parents" : "students"
      const idField = type === 'STF' ? "staffNumber" : type === 'PAR' ? "parentNumber" : "admissionNumber"
      
      const q = query(collection(db, collectionName), where(idField, "==", idNumber.trim().toUpperCase()))
      const snap = await getDocs(q)
      
      if (snap.empty) throw new Error(`Invalid ID. Record ${idNumber} not found.`);
      
      const personData = snap.docs[0].data()
      const accountEmail = personData.email || `${idNumber.toLowerCase()}@system.yebfa.com`
      const cleanCredential = normalizeSecurityPhone(securityCredential)

      try {
        const credential = await signInWithEmailAndPassword(auth, accountEmail, cleanCredential)
        await redirectUser(credential.user)
      } catch (authErr) {
        throw new Error("Access Denied: Security credentials could not be verified. Ensure your phone/PIN matches the registry.");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Access Denied", description: error.message })
    } finally { setLoading(false) }
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg"><School className="size-6" /></div>
        <span className="text-2xl font-headline font-bold text-primary">Yebfa School Manager</span>
      </Link>
      
      <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
        <Tabs defaultValue="admin">
          <TabsList className="grid grid-cols-4 h-14 bg-muted/50 p-1 border-b">
            <TabsTrigger value="admin" className="text-[10px] font-bold uppercase"><ShieldCheck className="size-3.5 mr-1" /> Admin</TabsTrigger>
            <TabsTrigger value="staff" className="text-[10px] font-bold uppercase"><Briefcase className="size-3.5 mr-1" /> Staff</Trigger>
            <TabsTrigger value="parent" className="text-[10px] font-bold uppercase"><Users className="size-3.5 mr-1" /> Parent</TabsTrigger>
            <TabsTrigger value="student" className="text-[10px] font-bold uppercase"><GraduationCap className="size-3.5 mr-1" /> Student</TabsTrigger>
          </TabsList>

          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold">Secure Access</CardTitle>
            <CardDescription>Multi-tenant identity verification active.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <TabsContent value="admin" className="mt-0 space-y-4 animate-in fade-in">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2"><Label>Email Address</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl" /></div>
                <Button className="w-full h-12 font-bold rounded-xl" type="submit" disabled={loading}>Access Dashboard</Button>
              </form>
            </TabsContent>

            <TabsContent value="staff" className="mt-0 space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div className="space-y-2"><Label>Staff ID (STF)</Label><Input placeholder="ABC-STF-2026-0001" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Security Phone</Label><Input type="tel" value={securityCredential} onChange={e => setSecurityCredential(e.target.value)} className="h-12 rounded-xl" /></div>
                <Button className="w-full h-12 font-bold rounded-xl bg-primary" onClick={() => handleRegistryLogin('STF')} disabled={loading}>Verify Staff Identity</Button>
              </div>
            </TabsContent>

            <TabsContent value="parent" className="mt-0 space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div className="space-y-2"><Label>Parent ID (PAR)</Label><Input placeholder="ABC-PAR-2026-0001" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Security Phone</Label><Input type="tel" value={securityCredential} onChange={e => setSecurityCredential(e.target.value)} className="h-12 rounded-xl" /></div>
                <Button className="w-full h-12 font-bold rounded-xl bg-primary" onClick={() => handleRegistryLogin('PAR')} disabled={loading}>Verify Guardian Identity</Button>
              </div>
            </TabsContent>

            <TabsContent value="student" className="mt-0 space-y-4 animate-in fade-in">
              <div className="space-y-4">
                <div className="space-y-2"><Label>Student ID (STU)</Label><Input placeholder="ABC-STU-2026-0001" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Access PIN / Phone</Label><Input type="password" value={securityCredential} onChange={e => setSecurityCredential(e.target.value)} className="h-12 rounded-xl" /></div>
                <Button className="w-full h-12 font-bold rounded-xl bg-primary" onClick={() => handleRegistryLogin('STU')} disabled={loading}>Enter Student Portal</Button>
              </div>
            </TabsContent>
          </CardContent>

          <CardFooter className="bg-muted/30 p-6 flex flex-col gap-4 border-t">
            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold">Institutional Data Isolation Active • System 2026</p>
            <Button variant="link" className="w-full gap-2 text-primary font-bold text-xs" asChild><Link href="/register/institution">Register New Institution <ArrowRight className="size-3.5" /></Link></Button>
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  )
}
