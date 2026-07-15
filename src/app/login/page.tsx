"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { School, Loader2, AlertCircle, Info, ArrowRight, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db, useUser } from "@/firebase"
import { firebaseConfig } from "@/firebase/config"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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

      if (userData.role === "super_admin") {
        router.replace("/admin")
        return
      }

      if (userData.tenantId) {
        localStorage.setItem('selected_institution_id', userData.tenantId)
        localStorage.setItem('selected_institution_name', userData.institutionName || 'My School')
        router.replace("/dashboard")
        return
      }

      router.replace("/register/institution")
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

  const handleGoogleLogin = async () => {
    if (!auth || configError) return
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const credential = await signInWithPopup(auth, provider)
      await redirectUser(credential.user)
    } catch (error: any) {
      console.error("Google Auth Error:", error)
      
      // Graceful handling for user cancellation or common domain errors
      if (error.code === 'auth/popup-closed-by-user') {
        // No toast needed, user manually closed the popup
        return
      } else if (error.code === 'auth/unauthorized-domain') {
        toast({
          variant: "destructive",
          title: "Domain Not Authorized",
          description: "Please add this domain to the 'Authorized domains' list in your Firebase Console.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Google Login Failed",
          description: error.message || "An unexpected authentication error occurred.",
        })
      }
    } finally {
      setLoading(false)
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
      
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <CardDescription>
            Secure access to your institutional ecosystem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configError ? (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold">Configuration Required</AlertTitle>
              <AlertDescription className="text-xs">
                Firebase is not configured. Please link a project to activate login.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold uppercase tracking-wider">Secure Access</AlertTitle>
              <AlertDescription className="text-xs">
                Enter your credentials to access the 2026 academic management tools.
              </AlertDescription>
            </Alert>
          )}

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
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Security Password</Label>
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Processing..." : "Forgot Password?"}
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
                className="h-11"
              />
            </div>
            <Button className="w-full h-11 font-bold" type="submit" disabled={loading || configError}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Access Dashboard"}
            </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground text-[10px] font-bold">Network Provider</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full h-11 transition-all active:scale-95" onClick={handleGoogleLogin} disabled={loading || configError}>
            Continue with Google
          </Button>
        </CardContent>
        <CardFooter className="bg-muted/30 p-4">
          <Button variant="link" className="w-full gap-2 text-primary font-bold" asChild>
            <Link href="/register/institution">
              Register New Institution <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
      
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Ahafo Region Technical Support: <Link href="/contact" className="text-primary hover:underline font-medium">support@yebfa.com</Link>
      </p>
    </div>
  )
}
