"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Bot, 
  Sparkles, 
  Loader2, 
  Send, 
  Search, 
  TrendingUp, 
  ShieldAlert, 
  BarChart, 
  Target, 
  Lightbulb, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Wallet,
  GraduationCap
} from "lucide-react"
import { administratorChat, AdminQueryOutput } from "@/ai/flows/administrator-chat-flow"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function AiAdministratorPage() {
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<AdminQueryOutput | null>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || !institutionId) return

    setLoading(true)
    try {
      const res = await administratorChat({
        institutionId,
        question: query,
        context: `Current Date: ${new Date().toLocaleDateString()}, Term: 2026 Academic Cycle`
      })
      setResult(res)
      setQuery("")
      toast({ title: "Intelligence Sync Complete", description: "Strategic data has been computed." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Query Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "Student": return <GraduationCap className="size-4" />
      case "Staff": return <Users className="size-4" />
      case "Finance": return <Wallet className="size-4" />
      default: return <Search className="size-4" />
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2 text-center">
        <div className="inline-flex items-center justify-center gap-2 mb-2">
           <div className="size-10 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <Bot className="size-6" />
           </div>
        </div>
        <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">AI School Administrator</h1>
        <p className="text-muted-foreground font-medium max-w-lg mx-auto">Analyze BECE fail rates, staff attendance, and financial defaults using natural language.</p>
      </div>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-8">
           <form onSubmit={handleQuery} className="flex gap-4">
              <div className="relative flex-1">
                 <Sparkles className="absolute left-4 top-4 size-5 text-accent animate-pulse" />
                 <Input 
                   placeholder="e.g. Which parents have unpaid fees above GH₵1,000?" 
                   className="h-14 pl-12 rounded-2xl border-2 border-slate-100 focus:border-primary/20 text-lg shadow-sm"
                   value={query}
                   onChange={e => setQuery(e.target.value)}
                   disabled={loading}
                 />
              </div>
              <Button type="submit" disabled={loading || !query.trim()} className="h-14 w-14 rounded-2xl bg-primary shadow-xl shrink-0">
                 {loading ? <Loader2 className="animate-spin size-6" /> : <Send className="size-6" />}
              </Button>
           </form>
           <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {["Failing students?", "Teacher attendance?", "High balances?", "Math average < 50%"].map(t => (
                <button 
                  key={t}
                  onClick={() => setQuery(t)}
                  className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-50 border hover:bg-slate-100 transition-colors text-muted-foreground"
                >
                  {t}
                </button>
              ))}
           </div>
        </CardContent>
      </Card>

      {!result && !loading ? (
        <div className="p-24 text-center space-y-4 opacity-30 italic flex flex-col items-center">
           <Search className="size-16 mb-2" />
           <p>Awaiting institutional inquiry...</p>
        </div>
      ) : result ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white border-l-4 border-primary">
              <CardHeader className="p-8 pb-0">
                 <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary text-white border-none text-[8px] font-bold uppercase tracking-widest px-2">Decision Intelligence</Badge>
                 </div>
                 <CardTitle className="text-2xl font-headline font-bold">Strategic Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                 <div className="prose prose-slate max-w-none">
                    <p className="text-lg leading-relaxed text-slate-700 font-medium">
                       {result.answer}
                    </p>
                 </div>

                 {result.dataHighlights && result.dataHighlights.length > 0 && (
                   <section className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Identified Registry Entities</h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                         {result.dataHighlights.map((item, i) => (
                           <div key={i} className="p-4 rounded-xl border bg-slate-50/50 flex items-center gap-3 group hover:bg-white hover:shadow-md transition-all">
                              <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                 {getIcon(item.type)}
                              </div>
                              <div className="min-w-0">
                                 <p className="text-xs font-bold text-primary truncate">{item.label}</p>
                                 <p className="text-[10px] text-muted-foreground font-mono truncate">{item.value}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </section>
                 )}

                 <div className="grid gap-8 md:grid-cols-2">
                    <section className="space-y-4">
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Target className="size-3.5 text-primary" /> Recommended Interventions</h4>
                       <div className="space-y-3">
                          {result.recommendations.map((rec, i) => (
                            <div key={i} className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs font-bold text-primary">
                               <span className="text-accent">{i+1}.</span>
                               {rec}
                            </div>
                          ))}
                       </div>
                    </section>
                    <section className="space-y-4">
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Lightbulb className="size-3.5 text-accent" /> System Visualization Hint</h4>
                       <div className="p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-4">
                          <div className="size-12 rounded-full bg-accent/5 flex items-center justify-center text-accent"><BarChart className="size-6" /></div>
                          <p className="text-xs text-muted-foreground italic px-6 leading-relaxed">
                             "The system suggests viewing a <span className="font-bold text-primary">{result.visualHint || "standard summary chart"}</span> to better understand this data vector."
                          </p>
                       </div>
                    </section>
                 </div>
              </CardContent>
           </Card>
           
           <div className="flex justify-center pt-4">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-2">
                 <CheckCircle2 className="size-3 text-green-600" /> Authorized Global Audit • 2026 Institutional Node
              </p>
           </div>
        </div>
      ) : null}

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
           <div className="flex flex-col items-center gap-6 p-12 rounded-3xl bg-white shadow-2xl border">
              <div className="relative">
                 <Loader2 className="size-16 animate-spin text-primary" />
                 <Sparkles className="absolute -top-2 -right-2 size-6 text-accent animate-bounce" />
              </div>
              <div className="text-center space-y-2">
                 <p className="font-headline font-bold text-xl text-primary animate-pulse">Analyzing Registry Data...</p>
                 <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Cross-referencing Academic & Financial Vectors</p>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
