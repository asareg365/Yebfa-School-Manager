
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { School } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
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
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@school.edu" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" />
          </div>
          <Button className="w-full" asChild>
            <Link href="/dashboard">Sign In</Link>
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            Google Workspace
          </Button>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don't have an account? <Link href="/contact" className="text-primary hover:underline">Contact sales</Link>
      </p>
    </div>
  )
}
