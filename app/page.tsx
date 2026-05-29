"use client";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <header className="bg-green-600 p-4 flex items-center gap-3">
        <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center overflow-hidden shadow-sm">
          <img src="/dlsp-logo.jpg" alt="Logo" className="w-full h-full object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
        <h1 className="text-white font-black text-sm uppercase tracking-tight">
          Pamantasan ng Lungsod ng San Pablo
        </h1>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center mb-10">
          <div className="p-5 bg-green-50 rounded-[32px] mb-6 shadow-inner">
            <BookOpen size={72} className="text-green-600" />
          </div>
          <h2 className="text-4xl font-black text-zinc-900 dark:text-white mb-1 tracking-tight">Reviewer Hub</h2>
          <p className="text-zinc-500 font-bold text-sm uppercase tracking-[0.2em]">Quick Notes & Reviewer</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full max-w-sm">
          <button
            onClick={() => router.push("/login?role=teacher")}
            className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black py-6 rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Teacher
          </button>
          <button
            onClick={() => router.push("/login?role=student")}
            className="flex-1 bg-green-600 text-white py-6 rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Student
          </button>
        </div>
      </main>
    </div>
  );
}