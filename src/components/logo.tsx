"use client"

import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: number
}

export function Logo({ className, size = 40 }: LogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Midnight Blue Outer U-Frame / Base */}
        <path
          d="M20 35C20 60 35 85 50 85C65 85 80 60 80 35H70C70 55 60 75 50 75C40 75 30 55 30 35H20Z"
          fill="#1a1f2c"
        />
        {/* Shield Shape in the center */}
        <path
          d="M35 15C35 15 35 25 50 25C65 25 65 15 65 15V45C65 55 50 65 50 65C50 65 35 55 35 45V15Z"
          fill="#1a1f2c"
        />
        {/* Stylized Figures - Central Figure */}
        <circle cx="50" cy="35" r="5" fill="#38bdf8" />
        <path
          d="M42 48C42 44 45 42 50 42C55 42 58 44 58 48V52H42V48Z"
          fill="#38bdf8"
        />
        {/* Stylized Figures - Side Figures */}
        <circle cx="42" cy="38" r="4" fill="#7dd3fc" />
        <path
          d="M36 48C36 45 38 44 42 44C46 44 48 45 48 48V51H36V48Z"
          fill="#7dd3fc"
        />
        <circle cx="58" cy="38" r="4" fill="#7dd3fc" />
        <path
          d="M52 48C52 45 54 44 58 44C62 44 64 45 64 48V51H52V48Z"
          fill="#7dd3fc"
        />
      </svg>
    </div>
  )
}
