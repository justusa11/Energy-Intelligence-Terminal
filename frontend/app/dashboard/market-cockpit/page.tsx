export default function MarketCockpitPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Market Cockpit
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          AI-powered energy market overview, recommendations, and risk status.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric title="Average Price" value="82.4 €/MWh" change="+8.7%" />
        <Metric title="Peak Price" value="176.2 €/MWh" change="18:00–19:00" />
        <Metric title="Cheapest Hour" value="03:00–04:00" change="24.8 €/MWh" />
        <Metric title="Market Regime" value="Scarcity" change="Confidence 78%" warning />
        <Metric title="Risk Status" value="SAFE" change="All checks passed" safe />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            Hourly Price Forecast — DK1
          </h2>
          <div className="mt-6 flex h-80 items-end gap-2 border-b border-slate-800 pb-4">
            {[42, 38, 31, 25, 29, 45, 72, 118, 134, 96, 76, 62, 55, 49, 58, 83, 122, 158, 176, 149, 101, 75, 58, 46].map((price, index) => (
              <div
                key={index}
                className={`flex-1 rounded-t ${
                  price > 140
                    ? "bg-red-500"
                    : price < 50
                    ? "bg-green-500"
                    : "bg-blue-500"
                }`}
                style={{ height: `${Math.max(price, 20)}px` }}
                title={`${index}:00 — ${price} €/MWh`}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">AI Recommendation</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Tomorrow is expected to have high prices between{" "}
            <span className="font-semibold text-amber-400">17:00 and 20:00</span>.
          </p>

          <div className="mt-5 space-y-3 text-sm">
            <Action text="Preheat buildings between 04:00 and 06:00" />
            <Action text="Reduce flexible load between 17:00 and 20:00" />
            <Action text="Shift EV charging to 01:00–04:00" />
            <Action text="Avoid battery discharge before 17:00" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MiniMetric title="Est. Savings" value="1,850 DKK" />
            <MiniMetric title="Confidence" value="74%" />
            <MiniMetric title="Comfort Risk" value="Low" />
            <MiniMetric title="CO₂ Impact" value="-6.2%" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Flexibility Schedule</h2>
          <div className="mt-4 space-y-3 text-sm">
            <ScheduleRow time="01:00–04:00" signal="Very Low" action="Charge batteries, shift EV charging" />
            <ScheduleRow time="04:00–06:00" signal="Low" action="Preheat buildings" />
            <ScheduleRow time="17:00–20:00" signal="Very High" action="Reduce load, discharge batteries" />
            <ScheduleRow time="20:00–22:00" signal="High" action="Reduce flexible load" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Risk Monitor</h2>
          <div className="mt-4 space-y-3 text-sm">
            <RiskCheck text="Price data freshness" />
            <RiskCheck text="Weather data freshness" />
            <RiskCheck text="Forecast confidence" />
            <RiskCheck text="Comfort constraints" />
            <RiskCheck text="Savings threshold" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
  title,
  value,
  change,
  warning,
  safe,
}: {
  title: string;
  value: string;
  change: string;
  warning?: boolean;
  safe?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          warning ? "text-amber-400" : safe ? "text-green-400" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{change}</p>
    </div>
  );
}

function MiniMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Action({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-300">
      {text}
    </div>
  );
}

function ScheduleRow({
  time,
  signal,
  action,
}: {
  time: string;
  signal: string;
  action: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
      <span className="text-slate-400">{time}</span>
      <span className="font-medium text-amber-400">{signal}</span>
      <span className="text-slate-300">{action}</span>
    </div>
  );
}

function RiskCheck({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
      <span className="text-slate-300">{text}</span>
      <span className="rounded bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400">
        OK
      </span>
    </div>
  );
}