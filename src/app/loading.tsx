export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#07111f] text-slate-100" aria-busy="true" aria-label="Loading FreeOnSteam offers">
      <header className="border-b border-white/10 bg-[#081422]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <div className="h-7 w-36 rounded-md bg-white/10" />
          <div className="h-7 w-24 rounded-md bg-white/5" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="animate-pulse motion-reduce:animate-none">
          <div className="h-6 w-44 rounded bg-white/10" />
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="aspect-[4/3] rounded-xl border border-white/8 bg-white/[0.035]" />)}
          </div>
        </div>
      </main>
      <footer className="h-16 border-t border-white/10 bg-[#081422]" />
    </div>
  );
}
