"use client"

import Navbar from "@/components/navbar"
import Hero from "@/components/hero"

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white relative z-0">
      <Navbar />
      <Hero />
    </div>
  )
}
