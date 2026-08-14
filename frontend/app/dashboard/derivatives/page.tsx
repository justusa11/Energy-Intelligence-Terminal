"use client";

import { useState } from "react";
import { useDerivativesCurve } from "@/hooks/useDerivativesCurve";
import { useMarketScope } from "@/hooks/useMarketScope";
import { DataTruthBadge } from "@/components/DataTruthBadge";
import { ZoneSelect } from "@/components/ZoneSelect";
import { getRequestTruth } from "@/lib/dataTruth";

type Contract = {
  tenor: string;
  forwardEurMwh: number;
  previousEurMwh: number;
  volatility: number;
  openInterestMw: number;
};

const FALLBACK_CURVE: Contract[] = [
  { tenor: "M+1", forwardEurMwh: 82.4, previousEurMwh: 80.9, volatility: 0.31, openInterestMw: 420 },
  { tenor: "M+2", forwardEurMwh: 84.1, previousEurMwh: 83.5, volatility: 0.29, openInterestMw: 380 },
  { tenor: "Q+1", forwardEurMwh: 88.7, previousEurMwh: 86.8, volatility: 0.26, openInterestMw: 520 },
  { tenor: "Q+2", forwardEurMwh: 91.3, previousEurMwh: 90.1, volatility: 0.24, openInterestMw: 490 },
  { tenor: "Cal+1", forwardEurMwh: 94.8, previousEurMwh: 93.6, volatility: 0.21, openInterestMw: 710 },
  { tenor: "Cal+2", forwardEurMwh: 89.5, previousEurMwh: 90.4, volatility: 0.19, openInterestMw: 560 },
];

export default function DerivativesPage() {
  const { country, setZone, zone } = useMarketScope();
  const [selectedIndex, setSelectedIndex] = useState(2);
  const [hedgeMw, setHedgeMw] = useState(25);
  const [side, setSide] = useState<"long" | "short">("short");
  const [scenario, setScenario] = useState("base");
  const { data, error, isLoading } = useDerivativesCurve(country, zone, scenario);

  const curve = (data?.contracts ?? FALLBACK_CURVE).map((contract) => ({
    tenor: "tenor" in contract ? contract.tenor : "",
    forwardEurMwh:
      "forward_eur_mwh" in contract ? contract.forward_eur_mwh : contract.forwardEurMwh,
    previousEurMwh:
      "previous_eur_mwh" in contract ? contract.previous_eur_mwh : contract.previousEurMwh,
    volatility: contract.volatility,
    openInterestMw:
      "open_interest_mw" in contract ? contract.open_interest_mw : contract.openInterestMw,
  }));

  const selected = curve[selectedIndex] ?? curve[0];
  const markMove = selected.forwardEurMwh - selected.previousEurMwh;
  const pnl = markMove * hedgeMw * 24 * (side === "long" ? 1 : -1);
  const maxForward = Math.max(...curve.map((point) => point.forwardEurMwh));
  const curveTruth = getRequestTruth({
    error,
    isLoading,
    source: data?.data_source,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Derivatives Analytics</h1>
          <p className="mt-2 text-sm text-slate-400">
            Forward curve, volatility, open interest, and hedge mark-to-market.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {curveTruth.detail}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DataTruthBadge truth={curveTruth} />
          <ZoneSelect zone={zone} onChange={(z, c) => setZone(z, c)} />
        </div>
      </div>
      <ScenarioSelect value={scenario} onChange={setScenario} />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat title="Selected Tenor" value={selected.tenor} />
        <Stat title="Forward" value={`${selected.forwardEurMwh.toFixed(1)} EUR/MWh`} />
        <Stat title="Volatility" value={`${(selected.volatility * 100).toFixed(0)}%`} />
        <Stat
          title="Hedge MTM"
          value={`${pnl.toFixed(0)} EUR/day`}
          tone={pnl >= 0 ? "text-green-400" : "text-red-400"}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Forward Curve</h2>
            <span className="text-xs text-slate-500">Click a contract to inspect</span>
          </div>
          <div className="mt-6 flex h-72 items-end gap-3 border-b border-slate-800 pb-4">
            {curve.map((contract, index) => {
              const height = Math.max((contract.forwardEurMwh / maxForward) * 100, 10);
              const up = contract.forwardEurMwh >= contract.previousEurMwh;
              return (
                <button
                  type="button"
                  key={contract.tenor}
                  onClick={() => setSelectedIndex(index)}
                  className="flex flex-1 flex-col items-center justify-end gap-2 focus:outline-none"
                  title={`${contract.tenor}: ${contract.forwardEurMwh.toFixed(1)} EUR/MWh`}
                >
                  <div
                    className={`w-full rounded-t transition hover:opacity-80 ${
                      up ? "bg-blue-500" : "bg-amber-500"
                    } ${selectedIndex === index ? "ring-2 ring-white" : ""}`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-slate-500">{contract.tenor}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
            {selected.tenor}: move {markMove >= 0 ? "+" : ""}
            {markMove.toFixed(1)} EUR/MWh, open interest {selected.openInterestMw} MW.
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Hedge Position</h2>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {(["short", "long"] as const).map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setSide(option)}
                className={`rounded-lg border px-3 py-2 text-sm capitalize ${
                  side === option
                    ? "border-blue-500 bg-blue-500/10 text-white"
                    : "border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <label className="mt-5 block text-sm text-slate-400">
            Hedge size {hedgeMw} MW
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={hedgeMw}
              onChange={(event) => setHedgeMw(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
          <div className="mt-6 space-y-2 text-sm">
            {curve.map((contract) => (
              <div
                key={contract.tenor}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3"
              >
                <span className="text-slate-300">{contract.tenor}</span>
                <span className="text-slate-500">
                  {(contract.volatility * 100).toFixed(0)}% vol
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ScenarioSelect({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <label className="block max-w-xs text-sm text-slate-400">
      Scenario
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
      >
        <option value="base">Base</option>
        <option value="high_wind">High wind</option>
        <option value="gas_spike">Gas spike</option>
        <option value="cold_snap">Cold snap</option>
        <option value="outage">Interconnector outage</option>
      </select>
    </label>
  );
}

function Stat({ title, value, tone }: { title: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className={`mt-2 text-xl font-semibold ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}
