export default function PowerPricesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Power Prices</h1>
        <p className="mt-2 text-sm text-slate-400">
          Day-ahead, intraday, heatmaps, and bidding-zone price comparisons.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Module Status</h2>
        <p className="mt-2 text-sm text-slate-400">
          Power Prices route is working. Real price charts will be connected later.
        </p>
      </section>
    </div>
  );
}
