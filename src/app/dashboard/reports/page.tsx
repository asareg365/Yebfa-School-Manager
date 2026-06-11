"use client"

import * as React from "react"
import { useState } from "react"
import { generateStudentReportComments, GenerateStudentReportCommentsOutput } from "@/ai/flows/generate-student-report-comments"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, User, GraduationCap, Copy, Check, Target, Lightbulb, ListChecks } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateStudentReportCommentsOutput | null>(null)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    studentName: "",
    subject: "",
    gradeLevel: "",
    examScores: [] as {name: string, score: number}[],
    attendancePercentage: 100,
    behaviorNotes: ""
  })

  const handleGenerate = async () => {
    if (!formData.studentName || !formData.subject) {
      toast({
        variant: "destructive",
        title: "Missing Info",
        description: "Please enter a student name and subject."
      })
      return
    }

    setLoading(true)
    try {
      const output = await generateStudentReportComments(formData)
      setResult(output)
      toast({
        title: "Report Detailed",
        description: "Comprehensive performance narrative generated."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate report narrative."
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (result) {
      const text = `Report for ${formData.studentName}\n\nSummary: ${result.executiveSummary}\n\nKey Strengths:\n${result.keyStrengths.join('\n')}`
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">AI Academic Narratives</h1>
        <p className="text-muted-foreground">Generate structured, high-detail student reports with behavioral and academic insights.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-none shadow-md h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              Student Data Entry
            </CardTitle>
            <CardDescription>Populate the fields below to create a comprehensive analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  placeholder="e.g. Ama Serwaa"
                  value={formData.studentName} 
                  onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input 
                  placeholder="e.g. Core Mathematics"
                  value={formData.subject} 
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Grade Level</Label>
                <Input 
                  placeholder="SHS 2"
                  value={formData.gradeLevel} 
                  onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Attendance (%)</Label>
                <Input 
                  type="number"
                  value={formData.attendancePercentage} 
                  onChange={(e) => setFormData({...formData, attendancePercentage: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Qualitative Observations</Label>
              <Textarea 
                placeholder="Mention class participation, projects, or attitude..."
                className="min-h-[100px]"
                value={formData.behaviorNotes}
                onChange={(e) => setFormData({...formData, behaviorNotes: e.target.value})}
              />
            </div>

            <Button 
              className="w-full gap-2 bg-primary hover:bg-primary/90 h-12"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing Academic Data...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Comprehensive Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {!result ? (
            <Card className="border-none shadow-md min-h-[500px] flex flex-col">
              <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="size-20 rounded-full bg-muted flex items-center justify-center">
                  <GraduationCap className="size-10 text-muted-foreground/30" />
                </div>
                <div className="max-w-xs">
                  <p className="font-semibold text-lg">Ready for Analysis</p>
                  <p className="text-sm text-muted-foreground">
                    Enter student metrics on the left to generate a professional, multi-section report draft.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-primary text-primary-foreground">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">Student Assessment: {formData.studentName}</CardTitle>
                      <CardDescription className="text-primary-foreground/70">{formData.subject} • {formData.gradeLevel}</CardDescription>
                    </div>
                    <Button variant="secondary" size="icon" onClick={handleCopy} className="bg-white/10 hover:bg-white/20 border-none text-white">
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8 bg-white">
                  <section>
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <ListChecks className="size-4" /> Executive Summary
                    </h3>
                    <p className="text-sm leading-relaxed">{result.executiveSummary}</p>
                  </section>

                  <div className="grid gap-6 md:grid-cols-2">
                    <section className="p-4 rounded-xl bg-green-50/50 border border-green-100">
                      <h3 className="font-bold text-sm text-green-700 mb-3 flex items-center gap-2">
                        <Target className="size-4" /> Key Strengths
                      </h3>
                      <ul className="space-y-2">
                        {result.keyStrengths.map((s, i) => (
                          <li key={i} className="text-xs flex gap-2">
                            <span className="text-green-500 font-bold">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section className="p-4 rounded-xl bg-orange-50/50 border border-orange-100">
                      <h3 className="font-bold text-sm text-orange-700 mb-3 flex items-center gap-2">
                        <Lightbulb className="size-4" /> Development Areas
                      </h3>
                      <ul className="space-y-2">
                        {result.areasToImprove.map((a, i) => (
                          <li key={i} className="text-xs flex gap-2">
                            <span className="text-orange-500 font-bold">•</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <section>
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Academic Analysis</h3>
                    <p className="text-sm leading-relaxed">{result.academicAnalysis}</p>
                  </section>

                  <section className="p-6 rounded-2xl bg-muted/30 border border-dashed">
                    <h3 className="font-bold text-sm mb-4">Official Report Comment</h3>
                    <p className="text-sm italic text-muted-foreground italic leading-relaxed">
                      "{result.finalGradeNarrative}"
                    </p>
                  </section>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
