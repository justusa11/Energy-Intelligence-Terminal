import type { DataQualityStatus, RiskStatus } from "@/types/risk";

type DecisionBriefProps = {
  dataQuality: DataQualityStatus | null;
  highPriceWindow: string | null;
  lowPriceWindow: string | null;
  priceSpread: number | null;
  risk: RiskStatus | null;
};

export function DecisionBrief({
  dataQuality,
  highPriceWindow,
  lowPriceWindow,
  priceSpread,
  risk,
}: DecisionBriefProps) {
  const trust = dataQuality?.status === "OK" ? "Trusted" : dataQuality ? "Use with caution" : "Checking";
  const expectedValue =
    priceSpread === null
      ? "Calculating"
      : priceSpread >= 50
      ? "High flexibility value"
      : priceSpread >= 25
      ? "Moderate flexibility value"
      : "Low flexibility value";
  const driver =
    priceSpread === null
      ? "Waiting for price curve"
      : priceSpread >= 50
      ? "Large intraday spread"
      : "Normal spread conditions";
  const action =
    risk?.status === "CRITICAL"
      ? "Hold dispatch until risk clears."
      : priceSpread !== null && priceSpread >= 50
      ? "Prioritize flexible assets around the spread."
      : "Monitor and keep flexibility available.";

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold">Decision Workflow</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
      <BriefItem label="1. Data status" value={trust} tone={trust === "Trusted" ? "green" : "amber"} />
      <BriefItem label="2. Market driver" value={driver} tone="blue" />
      <BriefItem label="3. Operator action" value={action} tone="slate" />
      <BriefItem label="4. Risk gate" value={risk?.status ?? "Loading"} tone={risk?.status === "SAFE" ? "green" : "amber"} />
      <BriefItem
        label="5. Expected value"
        value={`${expectedValue}${lowPriceWindow && highPriceWindow ? ` (${lowPriceWindow} to ${highPriceWindow})` : ""}`}
        tone={priceSpread !== null && priceSpread >= 50 ? "green" : "blue"}
      />
      </div>
    </section>
  );
}

function BriefItem({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "amber" | "blue" | "green" | "slate";
  value: string;
}) {
  const tones = {
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-200",
    green: "border-green-500/20 bg-green-500/10 text-green-200",
    slate: "border-slate-700 bg-slate-900 text-slate-200",
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-5">{value}</p>
    </div>
  );
}
