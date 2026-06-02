"use client"

import * as React from "react"
import { useState } from "react"
import { generateStudentReportComments, GenerateStudentReportCommentsInput } from "@/ai/flows/generate-student-report-comments"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Sparkles, User, GraduationCap, Copy, Check } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState<GenerateStudentReportCommentsInput>({
    studentName: "Emmanuel Okafor",
    subject: "Mathematics",
    gradeLevel: "Year 11",
    examScores: [
      { name: "Mid-Term", score: 78 },
      { name: "Final", score: 85 }
    ],
    attendancePercentage: 92,
    behaviorNotes: "Very active in class discussions but needs to focus more on home assignments."
  })

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const output = await generateStudentReportComments(formData)
      setResult(output.comment)
      toast({
        title: "Comment Generated",
        description: "AI has successfully drafted the student report narrative."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate narrative. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-primary">AI Academic Narratives</h1>
        <p className="text-muted-foreground">Generate personalized, professional performance reports using advanced reasoning.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              Student Profile
            </CardTitle>
            <CardDescription>Enter academic data to contextualize the report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={formData.studentName} 
                  onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input 
                  id="subject" 
                  value={formData.subject} 
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grade">Grade Level</Label>
                <Input 
                  id="grade" 
                  value={formData.gradeLevel} 
                  onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance">Attendance (%)</Label>
                <Input 
                  id="attendance" 
                  type="number"
                  value={formData.attendancePercentage} 
                  onChange={(e) => setFormData({...formData, attendancePercentage: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Behavioral Notes (Optional)</Label>
              <Textarea 
                placeholder="Include qualitative feedback..."
                className="min-h-[100px]"
                value={formData.behaviorNotes}
                onChange={(e) => setFormData({...formData, behaviorNotes: e.target.value})}
              />
            </div>

            <Button 
              className="w-full gap-2 bg-primary hover:bg-primary/90"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Reasoning...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Insightful Narrative
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-md min-h-[400px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="size-5 text-accent" />
                  Suggested Narrative
                </CardTitle>
                <CardDescription>AI-generated report draft.</CardDescription>
              </div>
              {result && (
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1">
              {result ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {result}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                  <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                    <Sparkles className="size-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Draft student results above and click generate to see a personalized performance narrative here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}