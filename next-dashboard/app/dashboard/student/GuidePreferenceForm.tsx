"use client";

import { FormEvent, useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, Loader2, Save, Users, XCircle } from "lucide-react";
import { saveGuidePreferences } from "./guide-actions";

type Guide = { id: string; full_name: string | null; email: string };

export default function GuidePreferenceForm({ guides, teamId }: { guides: Guide[]; teamId: string }) {
  const [values, setValues] = useState(["", "", ""]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    formData.set("teamId", teamId);

    startTransition(async () => {
      const result = await saveGuidePreferences(formData);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) event.currentTarget.reset();
    });
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><Users size={23} /></div>
        <div><h2 className="text-xl font-bold text-slate-900">Guide Preferences</h2><p className="mt-1 text-sm text-slate-500">Choose your top three guides in order of preference.</p></div>
      </div>

      {message && <div role="status" className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{message.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}<span>{message.text}</span></div>}

      {guides.length === 0 ? <p className="mt-8 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No guides are available yet. Please check again later.</p> : <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {values.map((value, index) => <label key={index} className="block text-sm font-semibold text-slate-700" htmlFor={`preference-${index + 1}`}>Preference {index + 1}<span className="ml-2 font-normal text-slate-400">{index === 0 ? "First choice" : index === 1 ? "Second choice" : "Third choice"}</span><div className="relative mt-2"><select id={`preference-${index + 1}`} name={`preference-${index + 1}`} required value={value} onChange={(event) => setValues((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"><option value="">Select a guide</option>{guides.map((guide) => <option key={guide.id} value={guide.id}>{guide.full_name || "Guide"} — {guide.email}</option>)}</select><ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" /></div></label>)}
        <button type="submit" disabled={isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{isPending ? "Submitting preferences…" : "Submit preferences"}</button>
      </form>}
    </section>
  );
}
