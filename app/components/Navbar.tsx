"use client";
import { LogOut } from "lucide-react";
import { useNoteStore } from "../lib/noteStore";
import { useRouter } from "next/navigation";

export default function Navbar({ showLogout = false }) {
  const { logoutUser } = useNoteStore();
  const router = useRouter();

  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-green-600 dark:bg-green-700 shadow-sm w-full transition-colors duration-300">
      <div className="flex items-center gap-3">
        <img src="/dlsp-logo.jpg" alt="Logo" className="w-10 h-10 rounded-full bg-white object-contain shadow-sm" />
        <span className="text-white font-black text-sm uppercase tracking-tight">
          Pamantasan ng Lungsod ng San Pablo
        </span>
      </div>
      {showLogout && (
        <button 
          onClick={() => { logoutUser(); router.push("/"); }} 
          className="flex items-center gap-2 border border-white text-white px-4 py-1.5 rounded-xl hover:bg-white hover:text-green-700 transition-all font-bold text-sm"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      )}
    </nav>
  );
}