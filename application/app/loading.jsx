export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8" aria-live="polite" aria-busy="true">
      <div className="border-l-4 border-action pl-4">
        <div className="h-3 w-32 animate-pulse rounded bg-cyan-100" />
        <div className="mt-3 h-8 max-w-md animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 max-w-2xl animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-lg border border-line bg-white" />
        ))}
      </div>
      <p className="sr-only">Loading page content</p>
    </main>
  );
}
