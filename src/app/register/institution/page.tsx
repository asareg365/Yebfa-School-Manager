"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { School, ArrowLeft, Loader2, MapPin, Mail, User, ShieldCheck } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function InstitutionRegistrationPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulating registration process
    setTimeout(() => {
      setLoading(false)
      toast({
        title: "Registration Request Received",
        description: "An administrator will review your application and contact you at the provided email.",
      })
      router.push("/login")
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center py-12 px-6">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
          <School className="size-6" />
        </div>
        <span className="text-2xl font-headline font-bold tracking-tight text-primary">Yebfa</span>
      </Link>

      <Card className="w-full max-w-2xl border-none shadow-2xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center">
              <ShieldCheck className="size-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Enterprise Provisioning 2026</span>
          </div>
          <CardTitle className="text-3xl font-headline font-bold">Register Your Institution</CardTitle>
          <CardDescription className="text-primary-foreground/70">
            Join the ecosystem of modern educational institutions across West Africa.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Institution Details</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">Official School Name</Label>
                  <div className="relative">
                    <School className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input id="schoolName" placeholder="e.g. Greenwood Academy" className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolType">Institution Type</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary School</SelectItem>
                      <SelectItem value="secondary">Secondary / High School</SelectItem>
                      <SelectItem value="tertiary">Tertiary / University</SelectItem>
                      <SelectItem value="vocational">Vocational / Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location / Region</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="location" placeholder="e.g. Goaso, Ahafo Region" className="pl-10" required />
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
                    <Input id="adminName" placeholder="Full Name" className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Contact Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input id="adminEmail" type="email" placeholder="email@institution.com" className="pl-10" required />
                  </div>
                </div>
              </div>
            </div>

            <Button className="w-full h-14 text-lg font-bold shadow-lg" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Provisioning Request...
                </>
              ) : (
                "Request Provisioning"
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
        <p className="text-xs font-bold text-primary">asareg365@gmail.com | frankyeb@gmail.com</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Ahafo Region Headquarters</p>
      </div>
    </div>
  )
}
