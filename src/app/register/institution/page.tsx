
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { School, ArrowLeft, Loader2, MapPin, Mail, User, ShieldCheck, Lock, Eye, EyeOff } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useUser, useAuth } from "@/firebase"
import { 
  doc,
  collection,
  serverTimestamp,
  writeBatch
} from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

const GRADE_LEVEL_CATEGORIES = [
  { id: "basic", label: "Basic Education (KG - Primary)", grades: ["KG 1-2", "Primary 1-6", "KG - Primary 6"] },
  { id: "jhs", label: "Junior High School", grades: ["JHS 1-3"] },
  { id: "shs", label: "Senior High School", grades: ["SHS 1-3", "TVET"] },
  { id: "tertiary", label: "Higher Education", grades: ["University", "Polytechnic", "College of Ed"] },
  { id: "combined", label: "K-12 (Combined)", grades: ["KG - SHS 3", "Primary - JHS 3"] }
]

export default function InstitutionRegistrationPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    gradeLevel: "",
    specificGrades: "",
    location: "",
    ownerName: "",
    ownerEmail: "",
    password: "",
    confirmPassword: ""
  })
  
  const router = useRouter()
  const db = useFirestore()
  const auth = useAuth()
  const { user, loading: authLoading } = useUser()

  useEffect(() => {
    if (user && !formData.ownerEmail) {
      setFormData(prev => ({ ...prev, ownerEmail: user.email || "" }))
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.gradeLevel || !formData.specificGrades) {
      toast({
        variant: "destructive",
        title: "Missing Selections",
        description: "Please select both a Grade Category and a Grade Range."
      })
      return
    }

    // Password validation for new users
    if (!user) {
      if (formData.password.length < 6) {
        toast({ variant: "destructive", title: "Weak Password", description: "Password must be at least 6 characters." })
        return
      }
      if (formData.password !== formData.confirmPassword) {
        toast({ variant: "destructive", title: "Mismatch", description: "Passwords do not match." })
        return
      }
    }

    setLoading(true)

    try {
      let activeUser = user;

      // 1. Create Auth User if not logged in
      if (!activeUser) {
        const credential = await createUserWithEmailAndPassword(auth, formData.ownerEmail, formData.password)
        activeUser = credential.user
      }

      const institutionRef = doc(collection(db, "institutions"))
      const tenantId = institutionRef.id

      const batch = writeBatch(db)

      // 2. Create Institution
      batch.set(
        institutionRef,
        {
          id: tenantId,
          tenantId,
          name: formData.name,
          type: formData.gradeLevel,
          gradeLevel: formData.gradeLevel,
          specificGrades: formData.specificGrades,
          location: formData.location,
          ownerUid: activeUser.uid,
          ownerName: formData.ownerName,
          ownerEmail: formData.ownerEmail,
          subscriptionPlan: "trial for 30days",
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      )

      // 3. Create User Profile
      batch.set(
        doc(db, "users", activeUser.uid),
        {
          uid: activeUser.uid,
          name: formData.ownerName,
          email: formData.ownerEmail,
          role: "school_owner",
          tenantId,
          institutionId: tenantId,
          institutionName: formData.name,
          status: "active",
          createdAt: serverTimestamp()
        }
      )

      // 4. Default Settings & Departments
      batch.set(doc(db, "settings", tenantId), {
        tenantId,
        institutionId: tenantId,
        schoolName: formData.name,
        academicYear: "2026/2027",
        currentTerm: "Term 1",
        createdAt: serverTimestamp()
      })

      batch.set(doc(db, "departments", tenantId), {
        tenantId,
        departments: ["Administration", "Academics", "Accounts"],
        createdAt: serverTimestamp()
      })

      await batch.commit()

      localStorage.setItem('selected_institution_id', tenantId)
      localStorage.setItem('selected_institution_name', formData.name)

      toast({
        title: "Workspace Provisioned",
        description: "Welcome to the ecosystem. Your registry is now live."
      })

      router.replace("/dashboard")

    } catch (error: any) {
      console.error("Provisioning Error:", error)
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An error occurred during account creation."
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedCategory = GRADE_LEVEL_CATEGORIES.find(c => c.label === formData.gradeLevel)

  if (authLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted/30">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="font-headline font-bold text-primary animate-pulse text-lg">Synchronizing Hub...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center py-12 px-6">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
          <School className="size-6" />
        </div>
        <span className="text-2xl font-headline font-bold tracking-tight text-primary">Yebfa School Manager</span>
      </Link>

      <Card className="w-full max-w-2xl border-none shadow-2xl overflow-hidden rounded-3xl">
        <CardHeader className="bg-primary text-primary-foreground p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center">
              <ShieldCheck className="size-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Institutional Provisioning</span>
          </div>
          <CardTitle className="text-3xl font-headline font-bold">Register Your Institution</CardTitle>
          <CardDescription className="text-primary-foreground/70">Create your administrative account and school workspace.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">School Profile</h3>
              <div className="space-y-2">
                <Label htmlFor="schoolName">Official School Name</Label>
                <div className="relative">
                  <School className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input 
                    id="schoolName" 
                    placeholder="e.g. Goaso International School" 
                    className="pl-10 h-12 rounded-xl" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={formData.gradeLevel}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, gradeLevel: val, specificGrades: "" }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVEL_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.label}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Range</Label>
                  <Select 
                    value={formData.specificGrades}
                    disabled={!formData.gradeLevel}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, specificGrades: val }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select range..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory?.grades.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location / City</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input 
                    placeholder="e.g. Goaso, Ahafo" 
                    className="pl-10 h-12 rounded-xl" 
                    required 
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Administrative Identity</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input 
                      placeholder="Principal / Owner Name" 
                      className="pl-10 h-12 rounded-xl" 
                      required 
                      value={formData.ownerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      className={`pl-10 h-12 rounded-xl ${user ? 'bg-slate-50' : ''}`} 
                      required 
                      readOnly={!!user}
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {!user && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Security Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 6 characters" 
                        className="pl-10 h-12 rounded-xl" 
                        required 
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      />
                      <button 
                        type="button" 
                        className="absolute right-3 top-3 text-muted-foreground hover:text-primary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Repeat password" 
                        className="pl-10 h-12 rounded-xl" 
                        required 
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button 
              className="w-full h-14 text-lg font-bold shadow-xl bg-primary hover:bg-primary/90 rounded-2xl transition-all active:scale-[0.98]" 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Finalizing Provisioning...
                </>
              ) : (
                "Authorize Provisioning"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-muted/50 p-6 flex flex-col gap-4 border-t">
          <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">
            Institutional Data Isolation Active • System 2026
          </p>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login" className="gap-2 text-xs">
              Already have an account? <span className="font-bold text-primary underline">Sign In</span>
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
