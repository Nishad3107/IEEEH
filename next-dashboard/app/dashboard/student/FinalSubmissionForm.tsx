"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { CheckCircle2, FileCheck2, Github, Loader2, Upload, XCircle } from "lucide-react";
import { submitFinalProject } from "./final-actions";

export default function FinalSubmissionForm({ teamId }: { teamId: string }) {
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    formData.set("teamId", teamId);
    startTransition(async () => {
      const result = await submitFinalProject(formData);
      setNotice({ ok: result.ok, message: result.message });
      if (result.ok) formRef.current?.reset();
    });
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><FileCheck2 size={23} /></div><div><h2 className="text-xl font-bold text-slate-900">Final Project Submission</h2><p className="mt-1 text-sm text-slate-500">Submit your repository link and final PDF report when your project is complete.</p></div></div>{notice && <div role="status" className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}{notice.message}</div>}<form ref={formRef} onSubmit={handleSubmit} className="mt-8 space-y-5"><label className="block text-sm font-semibold text-slate-700" htmlFor="repositoryUrl">GitHub Repository Link<div className="relative mt-2"><Github size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="repositoryUrl" name="repositoryUrl" type="url" required placeholder="https://github.com/username/project" className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" /></div></label><label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-5 text-sm text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50/30" htmlFor="finalReport"><span className="flex items-center gap-3"><Upload className="text-indigo-600" size={21} /><span><span className="block font-semibold text-slate-800">Final Report (PDF)</span><span className="mt-1 block text-xs text-slate-500">PDF only, maximum 10 MB</span></span></span><input id="finalReport" name="finalReport" type="file" accept="application/pdf,.pdf" required className="sr-only" onChange={(event) => { const label = event.currentTarget.parentElement?.querySelector(".selected-file"); if (label) label.textContent = event.target.files?.[0]?.name || ""; }} /><span className="selected-file mt-3 block truncate text-xs font-medium text-indigo-700" /></label><button type="submit" disabled={isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? <Loader2 size={18} className="animate-spin" /> : <FileCheck2 size={18} />}{isPending ? "Submitting…" : "Submit Final Project"}</button></form></section>
  );
}
