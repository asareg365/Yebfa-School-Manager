
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { School, ArrowRight, ShieldCheck, Zap, Users, TrendingUp } from "lucide-react"
import { useUser } from "@/firebase"

export default function LandingPage() {
  const { user } = useUser()
  const isSuperAdmin = user?.email === 'asareg365@gmail.com' || user?.email === 'frankyeb@gmail.com'

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
            <School className="size-6" />
          </div>
          <span className="text-2xl font-headline font-bold tracking-tight text-primary">Yebfa</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/about" className="text-sm font-medium hover:text-accent transition-colors">About</Link>
          <Link href="/pricing" className="text-sm font-medium hover:text-accent transition-colors">Pricing</Link>
          <Link href="/contact" className="text-sm font-medium hover:text-accent transition-colors">Contact</Link>
          {isSuperAdmin && (
            <Link href="/admin" className="text-sm font-bold text-accent animate-pulse">Admin Portal</Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button className="bg-primary hover:bg-primary/90" asChild>
            <Link href="/login">Access Demo</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-24 lg:py-32 overflow-hidden">
          <div className="container px-6 mx-auto relative z-10 text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-4 duration-500">
              <Zap className="size-3" />
              Modern Multi-Tenant SaaS
            </div>
            <h1 className="text-5xl lg:text-7xl font-headline font-bold text-primary leading-tight tracking-tighter animate-in fade-in slide-in-from-bottom-4 duration-700">
              The Operating System for <span className="text-accent italic">Modern Schools.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
              A premium, all-in-one ecosystem for student management, financial forecasting, and academic excellence powered by advanced AI in 2026.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <Button size="lg" className="h-14 px-8 text-lg font-medium bg-primary hover:bg-primary/90" asChild>
                <Link href="/dashboard">
                  Launch Dashboard <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-medium" asChild>
                <Link href="/about">Watch Demo Video</Link>
              </Button>
            </div>
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10 opacity-30">
            <div className="absolute top-[-10%] left-[-10%] size-[500px] bg-accent/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] size-[500px] bg-primary/10 blur-[120px] rounded-full" />
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-border/40 bg-muted/30">
        <div className="container px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <School className="size-5" />
            </div>
            <span className="text-xl font-headline font-bold text-primary">Yebfa</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Yebfa Enterprise. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
