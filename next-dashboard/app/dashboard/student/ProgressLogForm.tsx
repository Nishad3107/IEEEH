"use client";

import { ChangeEvent, FormEvent, useRef, useState, useTransition } from "react";
import { FileText, Loader2, Send, UploadCloud, XCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "../../../utils/supabase/client";
import { saveProgressLog } from "./progress-actions";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

export default function ProgressLogForm({ teamId }: { teamId: string }) {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setNotice(null);
    if (selected && (!ACCEPTED_TYPES.has(selected.type) || selected.size > MAX_FILE_SIZE)) {
      setFile(null);
      event.target.value = "";
      setNotice({ ok: false, message: "Please choose a PDF or DOCX file smaller than 10 MB." });
      return;
    }
    setFile(selected);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!file) return setNotice({ ok: false, message: "Please select a PDF or DOCX file." });
    if (message.trim().length < 2) return setNotice({ ok: false, message: "Please enter a short progress message." });

    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setNotice({ ok: false, message: "Your session has expired. Please sign in again." });

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/${teamId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("project-documents").upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) return setNotice({ ok: false, message: `Upload failed: ${uploadError.message}` });

      const { data: publicUrlData } = supabase.storage.from("project-documents").getPublicUrl(storagePath);
      const result = await saveProgressLog({ teamId, message, fileUrl: publicUrlData.publicUrl, storagePath, fileName: file.name, mimeType: file.type, fileSize: file.size });
      if (!result.ok) {
        await supabase.storage.from("project-documents").remove([storagePath]);
        return setNotice({ ok: false, message: result.message });
      }

      setNotice({ ok: true, message: result.message });
      setMessage("");
      setFile(null);
      formRef.current?.reset();
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-600"><UploadCloud size={23} /></div><div><h2 className="text-xl font-bold text-slate-900">Progress Logs & Documents</h2><p className="mt-1 text-sm text-slate-500">Add a progress update and attach a PDF or DOCX document.</p></div></div>
      {notice && <div role="status" className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}<span>{notice.message}</span></div>}
      <form ref={formRef} onSubmit={handleSubmit} className="mt-8 space-y-5"><label className="block text-sm font-semibold text-slate-700" htmlFor="log-message">Log Message<textarea id="log-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} required rows={4} placeholder="e.g. Phase 1 completed" className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" /></label><label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-5 text-sm text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50/30" htmlFor="progress-file"><span className="flex items-center gap-3"><FileText className="text-indigo-600" size={21} /><span><span className="block font-semibold text-slate-800">Choose project document</span><span className="mt-1 block text-xs text-slate-500">PDF or DOCX, maximum 10 MB</span></span></span><input id="progress-file" type="file" accept="application/pdf,.docx" onChange={handleFileChange} className="sr-only" />{file && <span className="mt-3 block truncate text-xs font-medium text-indigo-700">Selected: {file.name}</span>}</label><button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}{isPending ? "Uploading…" : "Upload progress log"}</button></form>
    </section>
  );
}
