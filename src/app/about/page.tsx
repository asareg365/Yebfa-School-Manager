
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">About Yebfa</h1>
      <p className="text-muted-foreground mb-8">Empowering schools through intelligent technology.</p>
      <Link href="/" className="text-primary hover:underline">Back to Home</Link>
    </div>
  )
}
