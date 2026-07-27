
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { School, Loader2, AlertCircle, Info, ArrowRight, ShieldCheck, User, Users, Briefcase, KeyRound, Smartphone } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db, useUser } from "@/firebase"
import { firebaseConfig } from "@/firebase/config"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [configError, setConfigError] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useUser()

  const redirectUser = async (firebaseUser: any) => {
    try {
      const userRef = doc(db, "users", firebaseUser.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        router.push("/register/institution")
        return
      }

      const userData = userSnap.data()

      if (userData.tenantId) {
        localStorage.setItem('selected_institution_id', userData.tenantId)
        localStorage.setItem('selected_institution_name', userData.institutionName || 'My School')
      }

      if (userData.role === "super_admin") {
        router.replace("/admin")
        return
      }

      if (userData.role === "parent") {
        router.replace("/dashboard/parent")
        return
      }

      router.replace("/dashboard")
    } catch (error) {
      console.error("Redirection error:", error)
      router.replace("/register/institution")
    }
  }

  useEffect(() => {
    if (firebaseConfig.apiKey === "REPLACEME" || !firebaseConfig.apiKey) {
      setConfigError(true)
    }
    if (!authLoading && user) {
      redirectUser(user)
    }
  }, [user, authLoading])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || configError) return
    setLoading(true)
    
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      await redirectUser(credential.user)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or security password.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleIdLogin = async (type: 'staff' | 'parent') => {
    if (!idNumber || !phoneNumber) {
      toast({ variant: "destructive", title: "Missing Credentials", description: "Please enter both your ID and Phone number." })
      return
    }
    
    setLoading(true)
    try {
      const collectionName = type === 'staff' ? "staff" : "parents"
      const idField = type === 'staff' ? "staffNumber" : "parentNumber"
      
      const q = query(
        collection(db, collectionName), 
        where(idField, "==", idNumber),
        where("phone", "==", phoneNumber)
      )
      const snap = await getDocs(q)
      
      if (snap.empty) {
        throw new Error("Invalid ID or phone number mismatch. Please verify with administration.")
      }
      
      const personData = snap.docs[0].data()
      const accountEmail = personData.email
      
      if (!accountEmail) {
        throw new Error("Registry record found, but no system email is associated. Contact Admin for account activation.")
      }
      
      // Use phone number as the initial password for registry-based login
      const credential = await signInWithEmailAndPassword(auth, accountEmail, phoneNumber)
      await redirectUser(credential.user)
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: error.message || "Credential verification failed.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address to receive a reset link.",
      })
      return
    }
    setResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      toast({
        title: "Reset Link Sent",
        description: "Check your inbox for password recovery instructions.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message,
      })
    } finally {
      setResetLoading(false)
    }
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Global Identity...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
          <School className="size-6" />
        </div>
        <span className="text-2xl font-headline font-bold tracking-tight text-primary">Yebfa School Manager</span>
      </Link>
      
      <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid grid-cols-3 h-14 bg-muted/50 p-1 rounded-none border-b">
            <TabsTrigger value="admin" className="rounded-none gap-2 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="size-3.5" /> Admin
            </TabsTrigger>
            <TabsTrigger value="staff" className="rounded-none gap-2 text-[10px] font-bold uppercase tracking-wider">
              <Briefcase className="size-3.5" /> Staff
            </TabsTrigger>
            <TabsTrigger value="parent" className="rounded-none gap-2 text-[10px] font-bold uppercase tracking-wider">
              <Users className="size-3.5" /> Parents
            </TabsTrigger>
          </TabsList>

          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Secure Access</CardTitle>
              <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                <KeyRound className="size-4" />
              </div>
            </div>
            <CardDescription>
              Identify yourself to enter the institutional hub.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <TabsContent value="admin" className="mt-0 space-y-4 animate-in fade-in duration-300">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="admin@yebfa.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={configError}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Security Password</Label>
                    <button 
                      type="button" 
                      onClick={handleForgotPassword}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter"
                    >
                      Forgot?
                    </button>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={configError}
                    className="h-12 rounded-xl"
                  />
                </div>
                <Button className="w-full h-12 font-bold rounded-xl" type="submit" disabled={loading || configError}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Access Dashboard"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="staff" className="mt-0 space-y-4 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Staff Number (EMP ID)</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <Input 
                      placeholder="e.g. EMP-001" 
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <Input 
                      type="tel"
                      placeholder="e.g. 024XXXXXXX" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>
                <Button className="w-full h-12 font-bold rounded-xl bg-primary" onClick={() => handleIdLogin('staff')} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Faculty Identity"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="parent" className="mt-0 space-y-4 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Parent Number (PAR ID)</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <Input 
                      placeholder="e.g. PAR-000001" 
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <Input 
                      type="tel"
                      placeholder="e.g. 024XXXXXXX" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>
                <Button className="w-full h-12 font-bold rounded-xl bg-primary" onClick={() => handleIdLogin('parent')} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Guardian Identity"}
                </Button>
              </div>
            </TabsContent>
          </CardContent>

          <CardFooter className="bg-muted/30 p-6 flex flex-col gap-4 border-t">
            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">
              Institutional Data Isolation Active • System 2026
            </p>
            <Button variant="link" className="w-full gap-2 text-primary font-bold text-xs" asChild>
              <Link href="/register/institution">
                Register New Institution <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Tabs>
      </Card>
      
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Ahafo Region Technical Support: <Link href="/contact" className="text-primary hover:underline font-medium">support@yebfa.com</Link>
      </p>
    </div>
  )
}
