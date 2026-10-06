export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-600" role="status" aria-live="polite">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" aria-hidden="true" />
        <span className="text-sm font-medium">Loading ProjectTrack…</span>
      </div>
    </main>
  );
}
