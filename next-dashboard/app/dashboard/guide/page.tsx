import { redirect } from "next/navigation";
import { CalendarDays, Users } from "lucide-react";
import ReviewScheduleCard, { GuideTeam } from "./ReviewScheduleCard";
import { createClient } from "../../../utils/supabase/server";
import { getGuideTeamProgress } from "../progress-actions";

type AssignedTeamMemberRow = {
  team_id: string;
  team_name: string;
  member_id: string;
  member_name: string;
  member_email: string;
  member_roll_number: string | null;
  review_date: string | null;
};

export default async function GuideDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("get_guide_assigned_teams");
  const rows = (data || []) as AssignedTeamMemberRow[];
  const teams = Array.from(rows.reduce((grouped, row) => {
    const existing = grouped.get(row.team_id);
    if (existing) existing.members.push({ member_id: row.member_id, member_name: row.member_name, member_email: row.member_email, member_roll_number: row.member_roll_number });
    else grouped.set(row.team_id, { team_id: row.team_id, team_name: row.team_name, review_date: row.review_date, members: [{ member_id: row.member_id, member_name: row.member_name, member_email: row.member_email, member_roll_number: row.member_roll_number }], progressLogs: [], progressError: null });
    return grouped;
  }, new Map<string, GuideTeam>()).values());

  const teamsWithProgress = await Promise.all(teams.map(async (team) => {
    const result = await getGuideTeamProgress(team.team_id);
    return { ...team, progressLogs: result.logs, progressError: result.error };
  }));

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Guide workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Assigned Teams</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Review your allocated project teams and schedule their next project review.</p>

        {error ? <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load assigned teams. Make sure the guide review scheduling migration has been applied.</div> : teams.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><Users className="mx-auto text-slate-300" size={34} /><h2 className="mt-4 text-lg font-bold text-slate-900">No teams assigned yet</h2><p className="mt-2 text-sm text-slate-500">Teams allocated to you will appear here.</p></div> : <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Users size={20} /></span><div><p className="text-sm text-slate-500">Assigned teams</p><p className="text-2xl font-bold text-slate-900">{teams.length}</p></div></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><CalendarDays size={20} /></span><div><p className="text-sm text-slate-500">Scheduled reviews</p><p className="text-2xl font-bold text-slate-900">{teams.filter((team) => team.review_date).length}</p></div></div></div></div>
          <section id="teams" className="mt-8 space-y-5">{teamsWithProgress.map((team) => <ReviewScheduleCard key={team.team_id} team={team} />)}</section>
        </>}
      </div>
    </main>
  );
}
