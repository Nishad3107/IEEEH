"use client";

import { FormEvent, useState, useTransition } from "react";
import { CheckCircle2, Info, Loader2, Plus, Users, XCircle } from "lucide-react";
import { createStudentTeam } from "./actions";

type Toast = { type: "success" | "error"; message: string };

export default function TeamCreationForm() {
  const [toast, setToast] = useState<Toast | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createStudentTeam(formData);
      setToast({ type: result.ok ? "success" : "error", message: result.message });
      if (result.ok) form.reset();
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Users size={23} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create a Team</h2>
          <p className="mt-1 text-sm text-slate-500">You will automatically be included as the team creator.</p>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="teamName">
          Team Name
          <input
            id="teamName"
            name="teamName"
            required
            maxLength={120}
            placeholder="e.g. CodeCrafters"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
          />
        </label>

        <div className="flex gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-800">
          <Info size={17} className="mt-0.5 shrink-0" />
          <p>Add up to three classmates. Each value can be their university email or roll number.</p>
        </div>

        {[1, 2, 3].map((index) => (
          <label key={index} className="block text-sm font-semibold text-slate-700" htmlFor={`teammate-${index}`}>
            Teammate {index} <span className="font-normal text-slate-400">(optional)</span>
            <input
              id={`teammate-${index}`}
              name={`teammate-${index}`}
              type="text"
              autoComplete="off"
              placeholder="student@university.edu or roll number"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
            />
          </label>
        ))}

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {isPending ? "Creating team…" : "Create team"}
        </button>
      </form>
    </section>
  );
}
