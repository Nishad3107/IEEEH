"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, ChevronDown, Download, Loader2, Save, XCircle } from "lucide-react";
import { scheduleReview } from "./actions";

export type GuideTeam = {
  team_id: string;
  team_name: string;
  review_date: string | null;
  team_status: "in_progress" | "completed";
  github_link: string | null;
  final_report_url: string | null;
  members: { member_id: string; member_name: string; member_email: string; member_roll_number: string | null }[];
  progressLogs: { progress_id: string; message: string; created_at: string; file_name: string; file_url: string; mime_type: string }[];
  progressError: string | null;
};

function formatReviewDate(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function ReviewScheduleCard({ team }: { team: GuideTeam }) {
  const router = useRouter();
  const [reviewDate, setReviewDate] = useState(team.review_date ? team.review_date.replace(" ", "T").slice(0, 16) : "");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await scheduleReview(team.team_id, reviewDate);
      setNotice({ ok: result.ok, message: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Assigned team</p><h2 className="mt-1 text-xl font-bold text-slate-900">{team.team_name}</h2><p className="mt-2 text-sm text-slate-500">Current review: <span className="font-medium text-slate-700">{formatReviewDate(team.review_date)}</span></p></div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"><CalendarClock size={14} />Review schedule</span>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">{team.members.map((member) => <div key={member.member_id} className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-sm font-semibold text-slate-800">{member.member_name}</p><p className="mt-1 text-xs text-slate-500">{member.member_roll_number || member.member_email}</p></div>)}</div>

      {team.team_status === "completed" && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Final Project Completed</span><div className="flex flex-wrap gap-3 text-xs font-semibold"><a href={team.github_link || "#"} target="_blank" rel="noreferrer" className="text-indigo-700 hover:underline">GitHub Repository</a><a href={team.final_report_url || "#"} target="_blank" rel="noreferrer" className="text-indigo-700 hover:underline">Final Report PDF</a></div></div></div>}

      <details className="mt-6 rounded-xl border border-slate-200" open={team.progressLogs.length > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800"><span>Progress Logs ({team.progressLogs.length})</span><ChevronDown size={17} className="text-slate-400" /></summary>
        <div className="border-t border-slate-100 px-4 py-3">{team.progressError ? <p className="text-sm text-red-600">{team.progressError}</p> : team.progressLogs.length === 0 ? <p className="text-sm text-slate-500">No progress logs uploaded yet.</p> : <div className="space-y-3">{team.progressLogs.map((log) => <div key={log.progress_id} className="flex flex-col justify-between gap-3 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center"><div><p className="text-sm font-medium text-slate-800">{log.message}</p><p className="mt-1 text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p></div><a href={log.file_url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-slate-200 hover:bg-indigo-50"><Download size={14} />Download {log.file_name}</a></div>)}</div>}</div>
      </details>

      {notice && <div role="status" className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.ok ? <CheckCircle2 size={17} /> : <XCircle size={17} />}{notice.message}</div>}
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-semibold text-slate-700">Schedule date and time<input type="datetime-local" required value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" /></label><button type="submit" disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{isPending ? "Saving…" : team.review_date ? "Reschedule review" : "Schedule review"}</button></form>
    </article>
  );
}
