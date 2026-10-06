"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { createClient } from "../utils/supabase/client";
import type { UserRole } from "../context/AuthContext";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const navigation: Record<UserRole, NavigationItem[]> = {
  student: [
    { label: "Dashboard", href: "/dashboard/student", icon: LayoutDashboard },
    { label: "My Team", href: "/dashboard/student/team-formation", icon: Users },
    { label: "Guide Selection", href: "/dashboard/student#guides", icon: BookOpen },
    { label: "Final Submission", href: "/dashboard/student#submission", icon: FileCheck2 },
  ],
  guide: [
    { label: "Dashboard", href: "/dashboard/guide", icon: LayoutDashboard },
    { label: "Assigned Teams", href: "/dashboard/guide#teams", icon: Users },
    { label: "Review Schedule", href: "/dashboard/guide#reviews", icon: CalendarDays },
  ],
  coordinator: [
    { label: "Dashboard", href: "/dashboard/coordinator", icon: LayoutDashboard },
    { label: "All Teams", href: "/dashboard/coordinator#teams", icon: Users },
    { label: "Allocations", href: "/dashboard/coordinator#allocations", icon: Network },
    { label: "Reviews", href: "/reviews", icon: ClipboardList },
  ],
};

export default function DashboardShell({
  children,
  role,
  fullName,
  email,
}: {
  children: React.ReactNode;
  role: UserRole;
  fullName: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const links = navigation[role];

  return (
    <div className="min-h-screen bg-slate-50">
      {mobileOpen && <button type="button" aria-label="Close sidebar overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6"><Link href={navigation[role][0].href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white"><ShieldCheck size={21} /></span><span><span className="block font-bold tracking-tight">ProjectTrack</span><span className="block text-xs capitalize text-slate-500">{role} workspace</span></span></Link><button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Close sidebar"><X size={20} /></button></div>
        <nav className="flex-1 px-4 py-8" aria-label="Dashboard navigation"><p className="px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Workspace</p><div className="mt-4 space-y-1">{links.map((item) => { const Icon = item.icon; const active = pathname === item.href.split("#")[0]; return <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={19} />{item.label}</Link>; })}</div><p className="mt-10 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Resources</p><div className="mt-4 space-y-1"><Link href="/documents" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><CheckSquare size={19} /> Documents</Link></div></nav>
        <div className="border-t border-slate-100 p-4"><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 font-semibold uppercase text-indigo-700">{fullName.slice(0, 2)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{fullName}</p><p className="truncate text-xs text-slate-500">{email}</p></div></div></div>
      </aside>

      <div className="lg:pl-72"><header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8"><div className="flex items-center gap-4"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden" aria-label="Open sidebar"><Menu size={21} /></button><div><p className="text-sm text-slate-500">Final-Year Project Tracker</p><p className="text-lg font-bold capitalize">{role} Dashboard</p></div></div><button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><LogOut size={16} /> <span className="hidden sm:inline">Sign out</span></button></header><main>{children}</main></div>
    </div>
  );
}
