"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07111f] px-5 text-slate-100">
      <div className="max-w-lg rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">FreeOnSteam</p>
        <h1 className="mt-4 text-2xl font-semibold text-white">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">The page could not be loaded safely. No unverified offer data has been displayed.</p>
        <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-xl bg-cyan-300 px-5 text-sm font-semibold text-[#05121d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Try again</button>
      </div>
    </main>
  );
}
