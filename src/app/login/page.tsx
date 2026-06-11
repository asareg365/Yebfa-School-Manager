
'use client';

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { School, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { useAuth } from "@/firebase"
import { firebaseConfig } from "@/firebase/config"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [configError, setConfigError] = useState(false)
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (firebaseConfig.apiKey === "REPLACEME") {
      setConfigError(true)
    }
  }, [])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || configError) return
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid credentials.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!auth || configError) return
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google Login Failed",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
          <School className="size-6" />
        </div>
        <span className="text-2xl font-headline font-bold tracking-tight text-primary">Yebfa</span>
      </Link>
      
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Access your school management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                Firebase is not configured. Please link your Firebase project in the Studio settings.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@demo.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading || configError}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading || configError}>
            Google Workspace
          </Button>

          <div className="p-4 bg-muted/50 rounded-lg text-xs space-y-1 border border-border">
            <p className="font-bold text-primary">Demo Credentials (2026):</p>
            <p>Email: <span className="font-mono">admin@demo.com</span></p>
            <p>Pass: <span className="font-mono">demo1234</span></p>
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Need assistance? Contact <Link href="/contact" className="text-primary hover:underline">asareg365@gmail.com</Link>
      </p>
    </div>
  )
}
