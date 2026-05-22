"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">

      {/* ── Green Header ───────────────────────────────────────────────── */}
      <nav className="flex justify-between items-center px-6 py-3 bg-green-700">

        {/* Left: Logo + School Name */}
      {/* Left: Logo + School Name */}
<div className="flex items-center gap-3">
  <img
    src="/dlsp-logo.jpg"
    alt="DLSP Logo"
    width={56}
    height={56}
    style={{ 
      width: "56px", 
      height: "56px",
      borderRadius: "50%",
      backgroundColor: "white",
      objectFit: "contain"
    }}
    onError={(e) => {
      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 24 24' fill='none' stroke='%23166534' stroke-width='2'%3E%3Cpath d='M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'%3E%3C/path%3E%3Cpath d='M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'%3E%3C/path%3E%3C/svg%3E";
    }}
  />
  <span className="text-white font-bold text-sm sm:text-base uppercase tracking-wide">
    Pamantasan ng Lungsod ng San Pablo
  </span>
</div>
        
      </nav>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex flex-col items-center justify-center flex-grow px-4 py-16">

        {/* Book Icon */}
        <div className="mb-6">
          <BookOpen className="w-24 h-24 text-green-700 stroke-[1.5]" />
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 mb-2 text-center">
          Reviewer Hub
        </h1>
        <p className="text-base sm:text-lg font-semibold text-zinc-700 mb-12 text-center">
          Quick Notes & Reviewer
        </p>

        {/* Teacher / Student Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
          <button
            onClick={() => router.push("/login?role=teacher")}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xl py-6 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Teacher
          </button>
          <button
            onClick={() => router.push("/login?role=student")}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xl py-6 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Student
          </button>
        </div>

      </main>
    </div>
  );
}