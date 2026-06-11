
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { School, ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b border-border/40">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
            <School className="size-6" />
          </div>
          <span className="text-2xl font-headline font-bold tracking-tight text-primary">Yebfa</span>
        </Link>
        <Button variant="ghost" asChild>
          <Link href="/"><ArrowLeft className="mr-2 size-4" /> Back to Home</Link>
        </Button>
      </header>

      <main className="py-24 container max-w-3xl mx-auto space-y-12">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-headline font-bold text-primary">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: October 12, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-headline text-primary">1. Data Collection</h2>
            <p className="text-muted-foreground leading-relaxed">
              Yebfa Enterprise ("we", "us", or "our") collects information necessary to provide the school management services. This includes institution details, student records, staff information, and financial transaction history. We do not sell this data to third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-headline text-primary">2. Data Security & Multi-Tenancy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our architecture ensures absolute data isolation. Every institution operates within its own partitioned security context. We use industry-standard encryption and Firebase Security Rules to prevent unauthorized cross-tenant access.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-headline text-primary">3. AI Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              When using our AI features (Reporting, Forecasting, Video Generation), data is processed securely via Genkit and Google Vertex AI. Your institutional data is used solely to generate reports or media for your account and is not used to train global public models.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold font-headline text-primary">4. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any privacy-related inquiries or data requests, please contact our administrative team directly at <strong>asareg365@gmail.com</strong> or <strong>frankyeb@gmail.com</strong>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
