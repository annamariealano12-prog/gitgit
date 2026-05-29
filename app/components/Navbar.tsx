"use client";
import { LogOut } from "lucide-react";
import { useNoteStore } from "../lib/noteStore";
import { useRouter } from "next/navigation";

export default function Navbar({ showLogout = false }: { showLogout?: boolean }) {
  const { logoutUser } = useNoteStore();
  const router = useRouter();

  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-green-600 dark:bg-green-700 shadow-sm w-full transition-colors duration-300 z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm border border-white/20">
          <img
            src="/dlsp-logo.jpg"
            alt="Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.parentElement)
                e.currentTarget.parentElement.innerHTML =
                  '<span class="text-green-700 font-black text-[9px]">PLSP</span>';
            }}
          />
        </div>
        <span className="text-white font-black text-sm uppercase tracking-tight">
          Pamantasan ng Lungsod ng San Pablo
        </span>
      </div>

      {showLogout && (
        <button
          onClick={() => { logoutUser(); router.push("/"); }}
          className="flex items-center gap-2 border border-white/70 text-white px-4 py-1.5 rounded-xl hover:bg-white hover:text-green-700 transition-all font-bold text-sm"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      )}
    </nav>
  );
}