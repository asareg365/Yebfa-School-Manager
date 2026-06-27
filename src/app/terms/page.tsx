
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { School, ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b border-border/40">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
            <School className="size-6" />
          </div>
          <span className="text-2xl font-headline font-bold tracking-tight text-primary">Yebfa School Manager</span>
        </Link>
        <Button variant="ghost" asChild>
          <Link href="/"><ArrowLeft className="mr-2 size-4" /> Back to Home</Link>
        </Button>
      </header>

      <main className="py-24 container max-w-3xl mx-auto space-y-12">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-headline font-bold text-primary">Terms of Service</h1>
          <p className="text-muted-foreground">Effective Date: January 1, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-headline text-primary">1. Service Usage</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing Yebfa School Manager, you agree to use the service in compliance with all applicable educational data laws in Ghana and the GDPR guidelines where applicable.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-headline text-primary">2. Subscription & Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              Subscriptions are billed per term. Failure to maintain a valid subscription may result in limited access to advanced features like AI Forecasting and Roster Exporting.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-headline text-primary">3. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All software, AI flows, and UI components remain the property of Yebfa School Manager. Your data remains your property, and we provide tools for you to export it at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-headline text-primary">4. Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Yebfa School Manager provides tools for strategic assistance. Final academic and financial decisions remain the responsibility of the school administration.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
