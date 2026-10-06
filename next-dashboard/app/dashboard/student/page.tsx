import { redirect } from "next/navigation";
import { ExternalLink, Mail, Users } from "lucide-react";
import TeamCreationForm from "./TeamCreationForm";
import GuidePreferenceForm from "./GuidePreferenceForm";
import ProgressLogForm from "./ProgressLogForm";
import { createClient } from "../../../utils/supabase/server";

type TeamMember = {
  team_id: string;
  team_name: string;
  member_id: string;
  member_email: string;
  member_roll_number: string | null;
  member_full_name: string | null;
};

type Guide = { id: string; full_name: string | null; email: string };

type GuideStatus = {
  team_id: string;
  team_name: string;
  preferences_submitted: boolean;
  allocated_guide_id: string | null;
  allocated_guide_name: string | null;
};

type ProgressLog = {
  progress_id: string;
  message: string;
  created_at: string;
  file_name: string;
  file_url: string;
  mime_type: string;
};

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("get_my_team");
  const teamMembers = (data || []) as TeamMember[];

  if (error) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          We could not load your team information. Please refresh the page or contact your coordinator.
        </div>
      </main>
    );
  }

  const team = teamMembers[0];
  const { data: guideStatusData, error: guideStatusError } = team ? await supabase.rpc("get_my_guide_status") : { data: [], error: null };
  const guideStatus = (guideStatusData?.[0] || null) as GuideStatus | null;
  const { data: guidesData } = team && !guideStatus?.preferences_submitted && !guideStatus?.allocated_guide_id ? await supabase.rpc("list_guides_for_students") : { data: [] };
  const guides = (guidesData || []) as Guide[];
  const { data: progressLogsData, error: progressLogsError } = team ? await supabase.rpc("get_my_progress_logs", { p_team_id: team.team_id }) : { data: [], error: null };
  const progressLogs = (progressLogsData || []) as ProgressLog[];

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Student workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Student Dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Form your project team and keep your final-year project milestones organized.
        </p>

        <div className="mt-8">
          {team ? (
            <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Users size={23} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-600">Team formed</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">{team.team_name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{teamMembers.length} team member{teamMembers.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {teamMembers.map((member) => (
                  <div key={member.member_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{member.member_full_name || "Student"}</p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <Mail size={15} /> {member.member_email}
                    </p>
                    {member.member_roll_number && <p className="mt-1 text-xs text-slate-500">Roll number: {member.member_roll_number}</p>}
                  </div>
                ))}
              </div>

              {guideStatusError ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Guide preference status could not be loaded. Please refresh the page.</div> : guideStatus?.allocated_guide_id ? <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-sm font-semibold text-emerald-700">Guide allocated</p><p className="mt-1 text-lg font-bold text-emerald-950">Your Guide is: {guideStatus.allocated_guide_name || "Assigned guide"}</p></div> : guideStatus?.preferences_submitted ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5"><p className="font-semibold text-amber-800">Preferences Submitted, waiting for allocation</p><p className="mt-1 text-sm text-amber-700">The coordinator will allocate a guide after reviewing team preferences.</p></div> : <GuidePreferenceForm guides={guides} teamId={team.team_id} />}
            </section>
            <div className="mt-6 space-y-6"><ProgressLogForm teamId={team.team_id} /><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">Previous Progress Logs</h2><p className="mt-1 text-sm text-slate-500">Your team&apos;s uploaded updates and documents.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{progressLogs.length} update{progressLogs.length === 1 ? "" : "s"}</span></div>{progressLogsError ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Progress logs could not be loaded. Please refresh the page.</p> : progressLogs.length === 0 ? <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No progress logs have been uploaded yet.</p> : <div className="mt-6 space-y-3">{progressLogs.map((log) => <article key={log.progress_id} className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-900">{log.message}</p><p className="mt-1 text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p></div><a href={log.file_url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"><ExternalLink size={14} />Download {log.file_name}</a></article>)}</div>}</section></div>
            </>
          ) : (
            <>
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                <p className="font-semibold">Please form a team first.</p>
                <p className="mt-1">After your team is created, you can submit your top three guide preferences here.</p>
              </div>
              <TeamCreationForm />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
