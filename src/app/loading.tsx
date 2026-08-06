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
          <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
            {[0, 1, 2].map((item) => (
              <div key={item} className="grid gap-4 py-5 sm:grid-cols-[minmax(260px,38%)_minmax(0,1fr)] sm:items-center sm:gap-5 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)_11rem] lg:gap-6">
                <div className="aspect-[460/215] rounded-lg bg-white/[0.055] sm:row-span-2 lg:row-span-1" />
                <div className="sm:col-start-2">
                  <div className="h-6 w-3/5 rounded bg-white/10" />
                  <div className="mt-4 h-4 w-2/5 rounded bg-white/[0.065]" />
                  <div className="mt-3 h-3 w-4/5 rounded bg-white/[0.045]" />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:col-start-2 lg:col-start-3 lg:row-start-1 lg:grid-cols-1">
                  <div className="h-10 rounded-lg bg-cyan-300/15" />
                  <div className="h-10 rounded-lg bg-white/[0.055]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <footer className="h-16 border-t border-white/10 bg-[#081422]" />
    </div>
  );
}
