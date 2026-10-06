import { redirect } from "next/navigation";
import { Mail, Users } from "lucide-react";
import TeamCreationForm from "./TeamCreationForm";
import { createClient } from "../../../utils/supabase/server";

type TeamMember = {
  team_id: string;
  team_name: string;
  member_id: string;
  member_email: string;
  member_roll_number: string | null;
  member_full_name: string | null;
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
            </section>
          ) : (
            <TeamCreationForm />
          )}
        </div>
      </div>
    </main>
  );
}
