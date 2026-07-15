"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { School, ArrowLeft, Loader2, MapPin, Mail, User, ShieldCheck, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useUser } from "@/firebase"
import { 
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  Timestamp
} from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const GRADE_LEVEL_CATEGORIES = [
  { id: "basic", label: "Basic Education (KG - Primary)", grades: ["KG 1-2", "Primary 1-6", "KG - Primary 6"] },
  { id: "jhs", label: "Junior High School", grades: ["JHS 1-3"] },
  { id: "shs", label: "Senior High School", grades: ["SHS 1-3", "TVET"] },
  { id: "tertiary", label: "Higher Education", grades: ["University", "Polytechnic", "College of Ed"] },
  { id: "combined", label: "K-12 (Combined)", grades: ["KG - SHS 3", "Primary - JHS 3"] }
]

export default function InstitutionRegistrationPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    gradeLevel: "",
    specificGrades: "",
    location: "",
    ownerName: "",
    ownerEmail: ""
  })
  
  const router = useRouter()
  const db = useFirestore()
  const { user, loading: authLoading } = useUser()

  useEffect(() => {
    if (user && !formData.ownerEmail) {
      setFormData(prev => ({ ...prev, ownerEmail: user.email || "" }))
    }
  }, [user, formData.ownerEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in first."
      })
      router.push("/login")
      return
    }

    if (!db) {
      toast({
        variant: "destructive",
        title: "System Error",
        description: "Database connection could not be established."
      })
      return
    }

    setLoading(true)

    try {
      // Create unique school ID
      const institutionRef = doc(collection(db, "institutions"))
      const tenantId = institutionRef.id

      const batch = writeBatch(db)

      // Calculate trial end date (30 days from now)
      const trialDuration = 30 * 24 * 60 * 60 * 1000
      const trialEndsAt = Timestamp.fromDate(new Date(Date.now() + trialDuration))

      // 1. Create Institution
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
          ownerUid: user.uid,
          ownerName: formData.ownerName,
          ownerEmail: user.email,
          subscriptionPlan: "trial for 30days",
          trialEndsAt: trialEndsAt,
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      )

      // 2. Create User Profile
      batch.set(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: formData.ownerName,
          email: user.email,
          role: "school_owner",
          tenantId,
          institutionId: tenantId,
          institutionName: formData.name,
          status: "active",
          createdAt: serverTimestamp()
        }
      )

      // 3. Create School Settings
      batch.set(
        doc(db, "settings", tenantId),
        {
          tenantId,
          institutionId: tenantId,
          schoolName: formData.name,
          academicYear: "2026/2027",
          currentTerm: "Term 1",
          currency: "GHS",
          timezone: "Africa/Accra",
          createdAt: serverTimestamp()
        }
      )

      // 4. Default Departments
      batch.set(
        doc(db, "departments", tenantId),
        {
          tenantId,
          departments: [
            "Administration",
            "Academics",
            "Accounts",
            "Library"
          ],
          createdAt: serverTimestamp()
        }
      )

      await batch.commit()

      // Store selection in local storage for the dashboard to pick up immediately
      localStorage.setItem('selected_institution_id', tenantId)
      localStorage.setItem('selected_institution_name', formData.name)

      toast({
        title: "Institution Provisioned",
        description: "Your 30-day trial is now active. Welcome to Yebfa!"
      })

      router.replace("/dashboard")

    } catch (error: any) {
      console.error("Provisioning error:", error)
      
      const permissionError = new FirestorePermissionError({
        path: "institutions/registry",
        operation: "write",
        requestResourceData: { name: formData.name }
      })
      
      errorEmitter.emit("permission-error", permissionError)
      
      toast({
        variant: "destructive",
        title: "Provisioning Failed",
        description: error.message || "Failed to create institution records. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedCategory = GRADE_LEVEL_CATEGORIES.find(c => c.label === formData.gradeLevel)

  if (authLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted/30">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="font-headline font-bold text-primary animate-pulse text-lg">Verifying Global Session...</p>
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

      <Card className="w-full max-w-2xl border-none shadow-2xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center">
              <ShieldCheck className="size-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Institutional Provisioning 2026</span>
          </div>
          <CardTitle className="text-3xl font-headline font-bold">Register Your Institution</CardTitle>
          <CardDescription className="text-primary-foreground/70">
            Join the ecosystem of modern educational institutions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {!user && (
            <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold">Login Required</AlertTitle>
              <AlertDescription className="text-xs">
                You must be <Link href="/login" className="underline font-bold">signed in</Link> to submit a registration request.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Institution Details</h3>
              <div className="grid gap-6 md:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">Official School Name</Label>
                  <div className="relative">
                    <School className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input 
                      id="schoolName" 
                      placeholder="e.g. Greenwood Academy" 
                      className="pl-10 h-11" 
                      required 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gradeLevel">Grade Level Category</Label>
                  <Select 
                    required 
                    value={formData.gradeLevel}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, gradeLevel: val, specificGrades: "" }))}
                  >
                    <SelectTrigger className="h-11">
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
                  <Label htmlFor="specificGrade">Specific Grade Range</Label>
                  <Select 
                    required 
                    value={formData.specificGrades}
                    disabled={!formData.gradeLevel}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, specificGrades: val }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={formData.gradeLevel ? "Select specific range..." : "Select category first"} />
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
                <Label htmlFor="location">Location / Region</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input 
                    id="location" 
                    placeholder="e.g. Goaso, Ahafo Region" 
                    className="pl-10 h-11" 
                    required 
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Administrative Contact</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Owner/Principal Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input 
                      id="adminName" 
                      placeholder="Full Name" 
                      className="pl-10 h-11" 
                      required 
                      value={formData.ownerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Contact Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input 
                      id="adminEmail" 
                      type="email" 
                      placeholder="email@institution.com" 
                      className="pl-10 h-11 bg-slate-50" 
                      required 
                      readOnly={!!user}
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-14 text-lg font-bold shadow-lg bg-primary hover:bg-primary/90 transition-all active:scale-95" 
              type="submit" 
              disabled={loading || !user}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Authorize Provisioning...
                </>
              ) : (
                "Authorize Provisioning"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-muted/50 p-6 flex flex-col gap-4 border-t">
          <p className="text-xs text-center text-muted-foreground">
            By registering, you agree to our <Link href="/terms" className="text-primary hover:underline font-bold">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline font-bold">Privacy Policy</Link>.
          </p>
          <div className="flex justify-center gap-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login" className="gap-2">
                Already registered? <span className="font-bold text-primary underline">Sign In</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-2">
                <ArrowLeft className="size-4" /> Back to Home
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <div className="mt-8 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Need immediate assistance?</p>
        <p className="text-xs font-bold text-primary">support@yebfa.com</p>
      </div>
    </div>
  )
}
