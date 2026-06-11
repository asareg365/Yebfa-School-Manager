
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, School, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const plans = [
  {
    name: "Basic",
    price: "499",
    description: "Perfect for small private schools and learning centers.",
    features: [
      "Up to 200 Students",
      "Standard Academic Ledger",
      "Attendance Tracking",
      "Basic Fee Management",
      "Email Support",
    ],
    buttonText: "Start Basic",
    highlight: false,
  },
  {
    name: "Premium",
    price: "1,299",
    description: "Ideal for growing institutions needing AI insights.",
    features: [
      "Up to 1,000 Students",
      "AI Student Reports",
      "Financial Forecasting",
      "Staff Payroll Processor",
      "Priority WhatsApp Support",
      "Custom School Branding",
    ],
    buttonText: "Get Premium",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For school groups and large university colleges.",
    features: [
      "Unlimited Students",
      "Multi-Campus Management",
      "Custom AI Models",
      "Advanced API Access",
      "Dedicated Account Manager",
      "On-site Training",
    ],
    buttonText: "Contact Sales",
    highlight: false,
  },
]

export default function PricingPage() {
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

      <main className="py-24 container px-6 mx-auto">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <h1 className="text-4xl lg:text-6xl font-headline font-bold text-primary tracking-tight">
            Plans for Every <span className="text-accent italic">Institution.</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Simple, transparent pricing to help you scale your school operations in 2026.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative flex flex-col border-none shadow-xl ${plan.highlight ? 'ring-2 ring-accent' : ''}`}>
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full uppercase tracking-widest">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-headline">
                    {plan.price !== "Custom" ? `GH₵${plan.price}` : "Custom"}
                  </span>
                  {plan.price !== "Custom" && <span className="text-muted-foreground">/term</span>}
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check className="size-4 text-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className={`w-full h-12 ${plan.highlight ? 'bg-accent hover:bg-accent/90' : 'bg-primary'}`} asChild>
                  <Link href="/login">{plan.buttonText}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
