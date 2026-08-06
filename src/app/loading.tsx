export default function Loading() {
  return (
    <main className="min-h-screen bg-[#07111f] px-5 py-20 text-slate-100" aria-busy="true" aria-label="Loading FreeOnSteam offers">
      <div className="mx-auto max-w-7xl animate-pulse motion-reduce:animate-none">
        <div className="h-5 w-36 rounded bg-white/10" />
        <div className="mt-12 h-14 max-w-2xl rounded-2xl bg-white/10" />
        <div className="mt-4 h-6 max-w-xl rounded bg-white/5" />
        <div className="mt-16 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="aspect-[4/3] rounded-3xl border border-white/8 bg-white/[0.035]" />)}
        </div>
      </div>
    </main>
  );
}
