
"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { School, ArrowLeft, Target, Award, ShieldCheck, Play, Loader2, Sparkles, Video } from "lucide-react"
import { generateDemoVideo } from "@/ai/flows/generate-demo-video"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function AboutPage() {
  const [generating, setGenerating] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const handleWatchDemo = async () => {
    setGenerating(true)
    setVideoUrl(null)
    try {
      const result = await generateDemoVideo()
      setVideoUrl(result.videoUrl)
      toast({
        title: "AI Demo Synthesized",
        description: "Your custom cinematic walkthrough is ready.",
      })
    } catch (error: any) {
      console.error("Video Generation Error:", error)
      toast({
        variant: "destructive",
        title: "Synthesis Failed",
        description: error.message || "Could not generate AI video. Please check your AI configuration.",
      })
    } finally {
      setGenerating(false)
    }
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

      <main className="py-24 container px-6 mx-auto space-y-24">
        <section className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl lg:text-7xl font-headline font-bold text-primary tracking-tighter">
            We are building the <span className="text-accent italic">future</span> of education.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Founded in 2024 and reaching maturity in 2026, Yebfa Enterprise is dedicated to modernizing educational institutions across Ghana and West Africa through intelligent, secure, and accessible technology.
          </p>
          
          <div className="pt-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" className="h-16 px-10 text-lg gap-3 bg-primary hover:bg-primary/90 shadow-2xl">
                  <Play className="size-6 fill-current" /> Watch 2026 Vision Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none bg-black">
                <DialogHeader className="p-6 bg-primary text-primary-foreground">
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="size-5 text-accent" />
                    AI-Generated Platform Walkthrough
                  </DialogTitle>
                </DialogHeader>
                <div className="aspect-video relative flex items-center justify-center bg-zinc-900">
                  {videoUrl ? (
                    <video 
                      src={videoUrl} 
                      controls 
                      autoPlay 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-6 p-12">
                      <div className="size-20 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                        {generating ? (
                          <Loader2 className="size-10 text-accent animate-spin" />
                        ) : (
                          <Video className="size-10 text-white/20" />
                        )}
                      </div>
                      <div className="max-w-md mx-auto">
                        <h3 className="text-white font-bold text-xl">
                          {generating ? "Synthesizing AI Vision..." : "Ready to Visualize 2026?"}
                        </h3>
                        <p className="text-zinc-500 text-sm mt-2">
                          {generating 
                            ? "Please wait while our AI models generate a cinematic 4K walkthrough of the Yebfa Ecosystem. This usually takes 45-90 seconds." 
                            : "Our AI will generate a unique cinematic walkthrough of the Yebfa Ecosystem interface specifically for you."}
                        </p>
                      </div>
                      <Button 
                        onClick={handleWatchDemo} 
                        disabled={generating}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-8"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Processing frames...
                          </>
                        ) : (
                          "Generate Custom Demo"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        <section className="grid gap-12 md:grid-cols-3">
          <div className="space-y-4">
            <div className="size-12 rounded-lg bg-primary/5 flex items-center justify-center">
              <Target className="size-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-headline">Our Mission</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              To empower school administrators with AI-driven insights that drive student success and financial sustainability across the Ahafo region and beyond.
            </p>
          </div>
          <div className="size-12 rounded-lg bg-primary/5 flex items-center justify-center hidden"></div> {/* Spacer hack for alignment */}
          <div className="space-y-4">
            <div className="size-12 rounded-lg bg-primary/5 flex items-center justify-center">
              <ShieldCheck className="size-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-headline">Security First</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Absolute data isolation and multi-tenant partitioning to ensure every school's records remain private and protected under international standards.
            </p>
          </div>
          <div className="space-y-4">
            <div className="size-12 rounded-lg bg-primary/5 flex items-center justify-center">
              <Award className="size-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-headline">Commitment</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Providing premium, enterprise-grade tools that are intuitive enough for a primary school yet powerful enough for a university.
            </p>
          </div>
        </section>

        <section className="p-12 rounded-3xl bg-primary text-primary-foreground space-y-8 shadow-2xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-headline font-bold mb-4">Our Presence in 2026</h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              Headquartered in Goaso, Ahafo Region, Yebfa powers over 150 institutions across Ghana. Our strategic financial forecasts have helped schools save an average of 15% in operational costs while improving student outcomes.
            </p>
          </div>
          <Button variant="secondary" size="lg" asChild className="bg-white text-primary hover:bg-white/90">
            <Link href="/contact">Join the Ecosystem</Link>
          </Button>
        </section>
      </main>
    </div>
  )
}
