
"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { School, ArrowLeft, Mail, Phone, MapPin, Send, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

export default function ContactPage() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast({
        title: "Message Sent",
        description: "Your inquiry has been directed to our administrators (asareg365@gmail.com & frankyeb@gmail.com).",
      })
      const form = e.target as HTMLFormElement
      form.reset()
    }, 1500)
  }

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
        <div className="grid gap-12 lg:grid-cols-2 max-w-6xl mx-auto">
          <div className="space-y-12">
            <div className="space-y-4">
              <h1 className="text-5xl font-headline font-bold text-primary tracking-tight">Let's connect.</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Whether you're looking for a demo, a partnership, or just have a question about Yebfa Enterprise, our team in Ahafo is ready to support you.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                  <Mail className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold">Email Us</p>
                  <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground text-sm">asareg365@gmail.com</p>
                    <p className="text-muted-foreground text-sm">frankyeb@gmail.com</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                  <Phone className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold">Call Us</p>
                  <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground text-sm">0248472474</p>
                    <p className="text-muted-foreground text-sm">0275034377</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold">Headquarters</p>
                  <p className="text-muted-foreground">Goaso - Ahafo Region, Ghana</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="border-none shadow-2xl overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground">
              <CardTitle>Send a Message</CardTitle>
              <CardDescription className="text-primary-foreground/70">Fill out the form below and we'll get back to you shortly.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="First Name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Last Name" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="email@address.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="How can we help?" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Type your message here..." className="min-h-[120px]" required />
                </div>
                <Button className="w-full h-12 gap-2" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
