
import { School } from "lucide-react"
import Link from "next/link"

export default function FeaturesPage() {
  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">Our Features</h1>
      <p className="text-muted-foreground mb-8">Comprehensive tools for modern education management.</p>
      <Link href="/" className="text-primary hover:underline">Back to Home</Link>
    </div>
  )
}
