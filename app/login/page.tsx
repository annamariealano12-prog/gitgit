"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNoteStore } from "../lib/noteStore";
import { 
  BookOpen, Lock, KeyRound, ArrowLeft, 
  Fingerprint, Eye, EyeOff 
} from "lucide-react";

// --- EMBEDDED NAVBAR ---
function LocalNavbar() {
  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-green-600 dark:bg-green-700 shadow-sm w-full transition-colors z-10">
      <div className="flex items-center gap-3">
        <img src="/dlsp-logo.jpg" alt="Logo" className="w-[40px] h-[40px] rounded-full bg-white object-contain" />
        <span className="text-white font-bold text-sm uppercase tracking-wide">
          Pamantasan ng Lungsod ng San Pablo
        </span>
      </div>
    </nav>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { loginUser, registerUser, logoutUser } = useNoteStore();
  
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"landing" | "auth">("landing");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  
  const [showPassword, setShowPassword] = useState(false);
  
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const handleSelectRole = (r: "student" | "teacher") => {
    logoutUser(); 
    setRole(r);
    setView("auth");
    resetForm();
  };

  const resetForm = () => {
    setError("");
    setUserId("");
    setPassword("");
    setName("");
    setShowPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLogin) {
      const err = loginUser(userId, password);
      if (err) {
        setError(err);
      } else {
        router.push(role === "teacher" ? "/dashboard/teacher" : "/dashboard/student");
      }
    } else {
      if (!name || !userId || !password) {
        setError("Please fill in all fields."); 
        return;
      }

      const err = registerUser({ 
        name, 
        userId, 
        password, 
        role
        // sectionId is removed as it's handled via the generated User ID
      });

      if (err) {
        setError(err);
      } else {
        router.push(role === "teacher" ? "/dashboard/teacher" : "/dashboard/student");
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col transition-colors duration-300">
      <LocalNavbar />
      
      <div className="flex-grow flex flex-col justify-center items-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />

        {view === "landing" ? (
          <div className="flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
            <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-[40px] mb-8 shadow-inner">
               <BookOpen className="w-20 h-20 text-green-600" />
            </div>
            
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Reviewer Hub</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm mb-12 uppercase tracking-[0.2em]">Quick Notes & Reviewer</p>
            
            <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={() => handleSelectRole("teacher")} 
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-black py-5 rounded-3xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-widest"
              >
                Teacher Portal
              </button>
              <button 
                onClick={() => handleSelectRole("student")} 
                className="w-full bg-green-600 text-white font-black py-5 rounded-3xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-widest"
              >
                Student Portal
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl border border-zinc-100 dark:border-zinc-800 p-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <button onClick={() => { setView("landing"); resetForm(); }} className="mb-6 flex items-center gap-2 text-zinc-400 dark:text-zinc-500 font-black text-[10px] uppercase tracking-widest hover:text-green-600 transition-colors">
              <ArrowLeft size={14} strokeWidth={3}/> Back to Home
            </button>
            
            <div className="mb-8">
                <h2 className="text-3xl font-black text-zinc-900 dark:text-white leading-tight">
                    {role === "student" ? "Student" : "Teacher"} <span className="text-green-600">Portal</span>
                </h2>
                <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">
                    {isLogin ? "Welcome back!" : "Create your account"}
                </p>
            </div>
            
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl mb-8">
              <button onClick={() => { setIsLogin(true); resetForm(); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isLogin ? "bg-white dark:bg-zinc-700 text-green-600 dark:text-white shadow-sm" : "text-zinc-400"}`}>Login</button>
              <button onClick={() => { setIsLogin(false); resetForm(); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? "bg-white dark:bg-zinc-700 text-green-600 dark:text-white shadow-sm" : "text-zinc-400"}`}>Register</button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-red-100 dark:border-red-900/50">{error}</div>}
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" autoComplete="on">
              {!isLogin && (
                <div className="relative">
                    <input 
                      type="text" 
                      placeholder="FULL NAME" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-green-600 dark:focus:border-green-500 text-zinc-900 dark:text-white rounded-2xl outline-none transition-all font-bold text-sm" 
                      required 
                    />
                </div>
              )}
              
              <div className="relative">
                <Fingerprint className="absolute left-4 top-4.5 text-zinc-300 dark:text-zinc-600" size={18}/>
                <input 
                  type="text" 
                  placeholder="USER ID" 
                  value={userId} 
                  onChange={(e) => setUserId(e.target.value)} 
                  className="w-full pl-12 pr-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-green-600 dark:focus:border-green-500 text-zinc-900 dark:text-white rounded-2xl outline-none transition-all font-bold text-sm" 
                  required 
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-4.5 text-zinc-300 dark:text-zinc-600" size={18}/>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="PASSWORD" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full pl-12 pr-12 py-4 bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-green-600 dark:focus:border-green-500 text-zinc-900 dark:text-white rounded-2xl outline-none transition-all font-bold text-sm" 
                  required 
                />
                <button 
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-4 top-4 text-zinc-400 hover:text-green-600 transition-colors"
                >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button 
                type="submit" 
                className="w-full bg-green-600 text-white font-black py-5 rounded-3xl mt-4 hover:bg-green-700 active:scale-[0.98] transition-all shadow-lg text-xs uppercase tracking-[0.2em]"
              >
                {isLogin ? "Sign In" : "Create Account"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}