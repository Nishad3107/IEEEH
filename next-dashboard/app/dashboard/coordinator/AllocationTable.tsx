"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, UserRound, XCircle } from "lucide-react";
import { allocateGuide } from "./actions";

export type AllocationTeam = {
  team_id: string;
  team_name: string;
  preference_1_name: string | null;
  preference_2_name: string | null;
  preference_3_name: string | null;
  allocated_guide_id: string | null;
  allocated_guide_name: string | null;
};

export type AllocationGuide = {
  guide_id: string;
  guide_name: string;
  guide_email: string;
  current_load: number;
  max_project_load: number;
};

export default function AllocationTable({ teams, guides }: { teams: AllocationTeam[]; guides: AllocationGuide[] }) {
  const router = useRouter();
  const [selectedGuides, setSelectedGuides] = useState<Record<string, string>>({});
  const [pendingTeam, setPendingTeam] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [, startTransition] = useTransition();

  function handleAllocate(teamId: string) {
    const guideId = selectedGuides[teamId];
    setNotice(null);
    setPendingTeam(teamId);

    startTransition(async () => {
      const result = await allocateGuide(teamId, guideId || "");
      setNotice({ ok: result.ok, message: result.message });
      setPendingTeam(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {notice && <div role="status" className={`flex items-center gap-3 border-b px-5 py-4 text-sm ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}<span>{notice.message}</span></div>}
      {teams.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No teams have been created yet.</div> : <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4 font-semibold">Team Name</th><th className="px-5 py-4 font-semibold">Preferences (1, 2, 3)</th><th className="px-5 py-4 font-semibold">Current Guide</th><th className="px-5 py-4 font-semibold">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{teams.map((team) => { const isAllocated = Boolean(team.allocated_guide_id); const isPending = pendingTeam === team.team_id; return <tr key={team.team_id} className="align-top hover:bg-slate-50/70"><td className="px-5 py-5"><p className="font-semibold text-slate-900">{team.team_name}</p><p className="mt-1 text-xs text-slate-400">{team.team_id.slice(0, 8)}…</p></td><td className="px-5 py-5"><div className="space-y-2">{[team.preference_1_name, team.preference_2_name, team.preference_3_name].map((preference, index) => <div key={index} className="flex items-center gap-2 text-slate-600"><span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{index + 1}</span><span>{preference || <span className="italic text-slate-400">Not submitted</span>}</span></div>)}</div></td><td className="px-5 py-5">{isAllocated ? <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><UserRound size={14} />{team.allocated_guide_name}</span> : <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500"><AlertCircle size={14} />Not allocated</span>}</td><td className="px-5 py-5">{isAllocated ? <span className="text-xs font-semibold text-emerald-700">Allocation complete</span> : <div className="flex min-w-[280px] items-center gap-2"><select aria-label={`Select guide for ${team.team_name}`} value={selectedGuides[team.team_id] || ""} onChange={(event) => setSelectedGuides((current) => ({ ...current, [team.team_id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"><option value="">Select a guide</option>{guides.map((guide) => <option key={guide.guide_id} value={guide.guide_id}>{guide.guide_name} ({guide.current_load}/{guide.max_project_load})</option>)}</select><button type="button" disabled={isPending} onClick={() => handleAllocate(team.team_id)} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{isPending && <Loader2 size={14} className="animate-spin" />}{isPending ? "Allocating" : "Allocate"}</button></div>}</td></tr>; })}</tbody></table></div>}
    </div>
  );
}
