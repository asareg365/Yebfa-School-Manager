
"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import placeholderData from "@/app/lib/placeholder-images.json"

interface LogoProps {
  className?: string
  size?: number
}

export function Logo({ className, size = 40 }: LogoProps) {
  const logoData = placeholderData.placeholderImages.find(img => img.id === "app-logo")
  
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
      <Image 
        src={logoData?.imageUrl || "https://picsum.photos/seed/ysm-logo/200/200"} 
        alt="Yebfa Logo" 
        width={size} 
        height={size} 
        className="object-contain"
        data-ai-hint={logoData?.imageHint || "school logo blue shield"}
      />
    </div>
  )
}
