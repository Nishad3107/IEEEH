import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCoordinatorTeamProgress } from "../../../progress-actions";
import { createClient } from "../../../../../utils/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function CoordinatorTeamProgressPage({ params }: Props) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: teamRows } = await supabase.rpc("get_coordinator_teams_for_allocation");
  const team = (teamRows || []).find((row: { team_id: string }) => row.team_id === teamId) as { team_id: string; team_name: string } | undefined;
  if (!team) notFound();

  const result = await getCoordinatorTeamProgress(teamId);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-5 py-10 sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/dashboard/coordinator" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600"><ArrowLeft size={16} />Back to allocations</Link><div className="mt-8 flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><FileText size={23} /></div><div><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Coordinator workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{team.team_name}</h1><p className="mt-2 text-sm text-slate-500">Complete progress history and uploaded project documents.</p></div></div>{result.error ? <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{result.error}</div> : result.logs.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No progress logs have been uploaded by this team yet.</div> : <section className="mt-8 space-y-4">{result.logs.map((log) => <article key={log.progress_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="font-semibold text-slate-900">{log.message}</p><p className="mt-2 text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p></div><a href={log.file_url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"><Download size={14} />Download {log.file_name}</a></div></article>)}</section>}</div></main>
  );
}
