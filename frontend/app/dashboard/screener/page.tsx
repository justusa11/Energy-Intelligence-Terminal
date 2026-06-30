export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Energy Market Screener</h1>
        <p className="mt-2 text-sm text-slate-400">
          Find expensive zones, cheap hours, spike-risk periods, and flexibility opportunities.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Module Status</h2>
        <p className="mt-2 text-sm text-slate-400">
          This module route is working. Detailed functionality will be added in later weeks.
        </p>
      </section>
    </div>
  );
}
