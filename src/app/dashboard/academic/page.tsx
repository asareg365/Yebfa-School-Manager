"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, GraduationCap, ClipboardList } from "lucide-react"

export default function AcademicPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Academic Ledger</h1>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="cursor-pointer hover:border-primary/40 transition-colors">
          <CardHeader>
            <BookOpen className="size-8 text-primary mb-2" />
            <CardTitle>Curriculum Map</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Review and edit subject syllabi for Term 2, 2026.</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/40 transition-colors">
          <CardHeader>
            <GraduationCap className="size-8 text-primary mb-2" />
            <CardTitle>Exam Scheduler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coordinate mid-term and final examination dates.</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/40 transition-colors">
          <ClipboardList className="size-8 text-primary mb-2" />
          <CardTitle>Grading Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Standardize grading across all departments.</p>
        </CardContent>
      </Card>
    </div>
  )
}