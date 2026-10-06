// Mirrors the layout of page.tsx so the swap to real content doesn't shift.
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 sm:py-16"
    >
      <p className="sr-only" role="status">
        Loading…
      </p>
      <div className="flex flex-col gap-3" aria-hidden="true">
        <div className="h-5 w-32 animate-pulse rounded-sm bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:h-10" />
        <div className="h-5 w-4/5 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="rounded-xl border bg-card p-6" aria-hidden="true">
        <div className="h-6 w-32 animate-pulse rounded-sm bg-muted" />
        <div className="mt-4 flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-sm bg-muted" />
          ))}
        </div>
      </div>
    </main>
  );
}
