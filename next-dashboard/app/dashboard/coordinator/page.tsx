import { redirect } from "next/navigation";
import { UserRound, Users } from "lucide-react";
import AllocationTable, { AllocationGuide, AllocationTeam } from "./AllocationTable";
import { createClient } from "../../../utils/supabase/server";

export default async function CoordinatorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: teamsData, error: teamsError }, { data: guidesData, error: guidesError }] = await Promise.all([
    supabase.rpc("get_coordinator_teams_for_allocation"),
    supabase.rpc("get_coordinator_guides_with_load"),
  ]);

  const teams = (teamsData || []) as AllocationTeam[];
  const guides = (guidesData || []) as AllocationGuide[];
  const loadError = teamsError || guidesError;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Coordinator workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Guide Allocation</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Review team preferences and allocate guides while respecting each guide&apos;s project load limit.</p>

        {loadError ? <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load allocation data. Make sure the coordinator allocation migration has been applied.</div> : <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Users size={20} /></span><div><p className="text-sm text-slate-500">Total teams</p><p className="text-2xl font-bold text-slate-900">{teams.length}</p></div></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><UserRound size={20} /></span><div><p className="text-sm text-slate-500">Available guides</p><p className="text-2xl font-bold text-slate-900">{guides.length}</p></div></div></div></div>
          <section id="teams" className="mt-8"><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Team Allocations</h2><p className="mt-1 text-sm text-slate-500">Guide load is shown as current assigned teams / maximum allowed teams.</p></div><AllocationTable teams={teams} guides={guides} /></section>
        </>}
      </div>
    </main>
  );
}
