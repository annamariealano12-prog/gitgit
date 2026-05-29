"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNoteStore } from "../lib/noteStore";
import {
  BookOpen, Lock, ArrowLeft,
  Fingerprint, Eye, EyeOff, User, KeyRound
} from "lucide-react";

function LocalNavbar() {
  return (
    <nav className="flex items-center px-6 py-3 bg-green-600 shadow-sm w-full z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm">
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
    </nav>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginUser, registerUser, logoutUser, resetPassword, _hydrated } =
    useNoteStore();

  const urlRole = searchParams.get("role") as "student" | "teacher" | null;

  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"landing" | "auth" | "forgot">("landing");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");

  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPass, setShowForgotPass] = useState(false);

  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");

  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const resetForm = () => {
    setError("");
    setSuccessMsg("");
    setName("");
    setStudentId("");
    setPassword("");
    setShowPassword(false);
  };

  const handleSelectRole = (r: "student" | "teacher") => {
    if (urlRole && r !== urlRole) {
      setError(
        `This link is for the ${
          urlRole.charAt(0).toUpperCase() + urlRole.slice(1)
        } Portal only. Please use the correct option.`
      );
      return;
    }
    logoutUser();
    setRole(r);
    setView("auth");
    resetForm();
  };

  const validateName = (n: string): string | null => {
    if (!n.trim()) return "Name is required.";
    if (/\d/.test(n)) return "Name cannot contain numbers.";
    if (!/^[a-zA-Z\s]+$/.test(n))
      return "Name can only contain letters and spaces.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!_hydrated) {
      setError("Loading, please try again in a moment.");
      return;
    }

    // Name shown for: teacher (always) and student registration
    const nameIsShown = role === "teacher" || !isLogin;
    if (nameIsShown) {
      const nameError = validateName(name);
      if (nameError) { setError(nameError); return; }
    }

    if (!password) { setError("Password is required."); return; }
    if (password.length > 8) {
      setError("Password must not exceed 8 characters.");
      return;
    }

    if (role === "student" && !studentId.trim()) {
      setError("Student ID is required.");
      return;
    }

    // Identifier: teacher → name, student → student ID
    const identifier = role === "teacher" ? name.trim() : studentId.trim();

    if (isLogin) {
      const err = loginUser(identifier, password);
      if (err) { setError(err); }
      else {
        router.push(
          role === "teacher" ? "/dashboard/teacher" : "/dashboard/student"
        );
      }
    } else {
      if (!name.trim()) { setError("Please fill in all fields."); return; }
      const err = registerUser({
        name: name.trim(),
        userId: identifier,
        password,
        role,
      });
      if (err) { setError(err); }
      else {
        router.push(
          role === "teacher" ? "/dashboard/teacher" : "/dashboard/student"
        );
      }
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!_hydrated) {
      setError("Loading, please try again in a moment.");
      return;
    }

    if (!forgotIdentifier.trim()) {
      setError(
        role === "teacher"
          ? "Please enter your registered full name."
          : "Please enter your Student ID."
      );
      return;
    }
    if (!forgotNewPass) { setError("Please enter a new password."); return; }
    if (forgotNewPass.length > 8) {
      setError("New password must not exceed 8 characters.");
      return;
    }

    const err = resetPassword(forgotIdentifier.trim(), forgotNewPass);
    if (err) { setError(err); }
    else {
      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setForgotIdentifier("");
      setForgotNewPass("");
      setTimeout(() => {
        setView("auth");
        setSuccessMsg("");
        setError("");
      }, 2000);
    }
  };

  if (!mounted) return null;

  const inputCls =
    "w-full pl-12 pr-5 py-4 bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-green-600 text-zinc-900 dark:text-white rounded-2xl outline-none font-bold text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500";

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col transition-colors duration-300">
      <LocalNavbar />

      <div className="flex-grow flex flex-col justify-center items-center p-6">

        {/* ── LANDING ── */}
        {view === "landing" && (
          <div className="flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
            <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-[40px] mb-8 shadow-inner">
              <BookOpen className="w-20 h-20 text-green-600" />
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">
              Reviewer Hub
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm mb-10 uppercase tracking-[0.2em]">
              Quick Notes & Reviewer
            </p>

            {error && (
              <div className="mb-6 w-full p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-[11px] font-black uppercase tracking-wide text-center border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}

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
        )}

        {/* ── AUTH (Login / Register) ── */}
        {view === "auth" && (
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl border border-zinc-100 dark:border-zinc-800 p-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <button
              onClick={() => { setView("landing"); resetForm(); }}
              className="mb-6 flex items-center gap-2 text-zinc-400 dark:text-zinc-500 font-black text-[10px] uppercase tracking-widest hover:text-green-600 transition-colors"
            >
              <ArrowLeft size={14} strokeWidth={3} /> Back to Home
            </button>

            <div className="mb-8">
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white leading-tight">
                {role === "student" ? "Student" : "Teacher"}{" "}
                <span className="text-green-600">Portal</span>
              </h2>
              <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">
                {isLogin ? "Welcome back!" : "Create your account"}
              </p>
            </div>

            {/* Tab Toggle */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl mb-8">
              <button
                onClick={() => { setIsLogin(true); resetForm(); }}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  isLogin
                    ? "bg-white dark:bg-zinc-700 text-green-600 dark:text-white shadow-sm"
                    : "text-zinc-400"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setIsLogin(false); resetForm(); }}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  !isLogin
                    ? "bg-white dark:bg-zinc-700 text-green-600 dark:text-white shadow-sm"
                    : "text-zinc-400"
                }`}
              >
                Register
              </button>
            </div>

            {/* Student registration hint */}
            {role === "student" && !isLogin && (
              <div className="mb-5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl">
                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 leading-relaxed">
                  📋 Use the <strong>Student ID</strong> assigned by your teacher. It will automatically enroll you in the correct section.
                </p>
              </div>
            )}

            {!_hydrated && (
              <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 rounded-xl text-[10px] font-black uppercase text-center tracking-widest">
                Loading...
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5" autoComplete="off">

              {/* NAME — teacher always, student on register */}
              {(role === "teacher" || !isLogin) && (
                <div className="relative">
                  <User
                    className="absolute left-4 top-[1.1rem] text-zinc-300 dark:text-zinc-600"
                    size={18}
                  />
                  <input
                    key={`name-${role}-${isLogin}`}
                    type="text"
                    placeholder="FULL NAME"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                    className={inputCls}
                    required
                  />
                </div>
              )}

              {/* STUDENT ID — students only */}
              {role === "student" && (
                <div className="relative">
                  <Fingerprint
                    className="absolute left-4 top-[1.1rem] text-zinc-300 dark:text-zinc-600"
                    size={18}
                  />
                  <input
                    key={`sid-${role}-${isLogin}`}
                    type="text"
                    placeholder="STUDENT ID (e.g. 2021-00123)"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    autoComplete="off"
                    className={inputCls}
                    required
                  />
                </div>
              )}

              {/* PASSWORD */}
              <div className="relative">
                <Lock
                  className="absolute left-4 top-[1.1rem] text-zinc-300 dark:text-zinc-600"
                  size={18}
                />
                <input
                  key={`pw-${role}-${isLogin}`}
                  type={showPassword ? "text" : "password"}
                  placeholder="PASSWORD (MAX 8 CHARS)"
                  value={password}
                  maxLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`${inputCls} pr-12`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[1rem] text-zinc-400 hover:text-green-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Forgot Password */}
              {isLogin && (
                <div className="text-right -mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot");
                      setError("");
                      setForgotIdentifier("");
                      setForgotNewPass("");
                    }}
                    className="text-[11px] font-black text-green-600 hover:underline uppercase tracking-wide"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={!_hydrated}
                className="w-full bg-green-600 text-white font-black py-5 rounded-3xl mt-2 hover:bg-green-700 active:scale-[0.98] transition-all shadow-lg text-xs uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLogin ? "Sign In" : "Create Account"}
              </button>
            </form>
          </div>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {view === "forgot" && (
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl border border-zinc-100 dark:border-zinc-800 p-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <button
              onClick={() => { setView("auth"); setError(""); setSuccessMsg(""); }}
              className="mb-6 flex items-center gap-2 text-zinc-400 dark:text-zinc-500 font-black text-[10px] uppercase tracking-widest hover:text-green-600 transition-colors"
            >
              <ArrowLeft size={14} strokeWidth={3} /> Back to Login
            </button>

            <div className="mb-8">
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white leading-tight">
                Reset <span className="text-green-600">Password</span>
              </h2>
              <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">
                Enter your{" "}
                {role === "teacher" ? "registered full name" : "Student ID"} and
                a new password
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-green-100 dark:border-green-900/50">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="flex flex-col gap-5" autoComplete="off">
              <div className="relative">
                <User
                  className="absolute left-4 top-[1.1rem] text-zinc-300 dark:text-zinc-600"
                  size={18}
                />
                <input
                  type="text"
                  placeholder={
                    role === "teacher"
                      ? "REGISTERED FULL NAME"
                      : "YOUR STUDENT ID"
                  }
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  autoComplete="off"
                  className={inputCls}
                  required
                />
              </div>

              <div className="relative">
                <KeyRound
                  className="absolute left-4 top-[1.1rem] text-zinc-300 dark:text-zinc-600"
                  size={18}
                />
                <input
                  type={showForgotPass ? "text" : "password"}
                  placeholder="NEW PASSWORD (MAX 8 CHARS)"
                  value={forgotNewPass}
                  maxLength={8}
                  onChange={(e) => setForgotNewPass(e.target.value)}
                  autoComplete="new-password"
                  className={`${inputCls} pr-12`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowForgotPass(!showForgotPass)}
                  className="absolute right-4 top-[1rem] text-zinc-400 hover:text-green-600 transition-colors"
                >
                  {showForgotPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!_hydrated}
                className="w-full bg-green-600 text-white font-black py-5 rounded-3xl mt-2 hover:bg-green-700 active:scale-[0.98] transition-all shadow-lg text-xs uppercase tracking-[0.2em] disabled:opacity-50"
              >
                Reset Password
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}