
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { School, Loader2, AlertCircle, Info, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { useAuth, useUser } from "@/firebase"
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
  const { user } = useUser()

  useEffect(() => {
    if (firebaseConfig.apiKey === "REPLACEME" || !firebaseConfig.apiKey) {
      setConfigError(true)
    }
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

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
        <span className="text-2xl font-headline font-bold tracking-tight text-primary">Yebfa School Manager</span>
      </Link>
      
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Access your school management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configError ? (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold">Configuration Required</AlertTitle>
              <AlertDescription className="text-xs">
                To enable login, please click the <strong>Firebase</strong> icon in the Studio sidebar and link a project.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold uppercase tracking-wider">Demo Access</AlertTitle>
              <AlertDescription className="text-xs">
                Use the credentials below to explore the 2026 enterprise features.
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
                disabled={configError}
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
                disabled={configError}
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
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading || configError}>
            Google Workspace
          </Button>

          <div className="p-4 bg-primary/5 rounded-lg text-xs space-y-2 border border-primary/10">
            <p className="font-bold text-primary flex items-center gap-2">
              <Info className="size-3" /> Demo Credentials (2026)
            </p>
            <div className="space-y-1">
              <p>Email: <span className="font-mono bg-white px-1 border rounded">admin@demo.com</span></p>
              <p>Pass: <span className="font-mono bg-white px-1 border rounded">demo1234</span></p>
            </div>
          </div>
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
        Need assistance? Contact <Link href="/contact" className="text-primary hover:underline font-medium">asareg365@gmail.com</Link>
      </p>
    </div>
  )
}
