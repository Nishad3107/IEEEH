"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FolderKanban, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { signInAction, signUpAction } from "./actions";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [authLoading, router, user]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = mode === "login" ? await signInAction(formData) : await signUpAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      if (!result.requiresEmailConfirmation) router.replace("/dashboard");
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
        <section className="hidden bg-gradient-to-br from-indigo-700 to-cyan-500 p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><div className="flex items-center gap-3"><FolderKanban size={28} /><span className="text-xl font-bold">ProjectTrack</span></div><h1 className="mt-24 text-5xl font-bold leading-tight">Every milestone in one clear workspace.</h1><p className="mt-6 text-indigo-100">Teams, guides, reviews, progress, and submissions for your final-year project.</p></div><p className="text-sm text-indigo-100">Final-Year Project Tracker</p></section>
        <section className="flex items-center px-6 py-12 sm:px-12"><div className="w-full"><div className="mb-8 lg:hidden"><p className="font-bold text-indigo-600">ProjectTrack</p></div><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">{mode === "login" ? "Welcome back" : "Get started"}</p><h2 className="mt-2 text-3xl font-bold">{mode === "login" ? "Sign in to your account" : "Create your account"}</h2><p className="mt-3 text-sm text-slate-500">{mode === "login" ? "Use your university email and password." : "Create a student or guide account to begin."}</p>
          <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => { setMode("login"); setError(""); setSuccess(""); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>Sign in</button><button type="button" onClick={() => { setMode("signup"); setError(""); setSuccess(""); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>Sign up</button></div>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">{mode === "signup" && <><label className="block text-sm font-semibold">Full name<input required name="fullName" autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" placeholder="Your full name" /></label><label className="block text-sm font-semibold">Role<select name="role" defaultValue="student" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"><option value="student">Student</option><option value="guide">Guide</option><option value="coordinator">Coordinator</option></select></label></>}<label className="block text-sm font-semibold">Email<input required name="email" type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" placeholder="you@university.edu" /></label><label className="block text-sm font-semibold">Password<input required name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" placeholder="At least 8 characters" /></label>{mode === "signup" && <p className="flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"><ShieldAlert size={16} className="mt-0.5 shrink-0" />Coordinator access is provisioned by an administrator.</p>}{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{success && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={17} />{success}</p>}<button disabled={isPending || authLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{isPending && <Loader2 size={18} className="animate-spin" />}{isPending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form>
        </div></section>
      </div>
    </main>
  );
}
