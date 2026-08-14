"use client";

import { useState } from "react";
import { useSparkSpread } from "@/hooks/useSparkSpread";
import { useMarketScope } from "@/hooks/useMarketScope";
import { DataTruthBadge } from "@/components/DataTruthBadge";
import { ZoneSelect } from "@/components/ZoneSelect";
import { GridTelemetryStrip } from "@/components/GridTelemetryStrip";
import { getRequestTruth } from "@/lib/dataTruth";

type MarketPoint = {
  label: string;
  gasEurMwh: number;
  carbonEurT: number;
  powerEurMwh: number;
};

const BASE_SERIES: MarketPoint[] = [
  { label: "Mon", gasEurMwh: 31.4, carbonEurT: 68.2, powerEurMwh: 86.5 },
  { label: "Tue", gasEurMwh: 32.1, carbonEurT: 69.1, powerEurMwh: 91.2 },
  { label: "Wed", gasEurMwh: 30.8, carbonEurT: 67.5, powerEurMwh: 78.4 },
  { label: "Thu", gasEurMwh: 33.6, carbonEurT: 70.4, powerEurMwh: 99.8 },
  { label: "Fri", gasEurMwh: 34.2, carbonEurT: 71.2, powerEurMwh: 104.1 },
  { label: "Sat", gasEurMwh: 29.9, carbonEurT: 66.8, powerEurMwh: 69.6 },
  { label: "Sun", gasEurMwh: 30.5, carbonEurT: 67.9, powerEurMwh: 73.3 },
];

export default function GasCarbonPage() {
  const { country, setZone, zone } = useMarketScope();
  const [efficiency, setEfficiency] = useState(0.52);
  const [emissions, setEmissions] = useState(0.37);
  const [selectedIndex, setSelectedIndex] = useState(3);
  const [scenario, setScenario] = useState("base");
  const { data: spreadData, error, isLoading } = useSparkSpread(
    country,
    zone,
    efficiency,
    emissions,
    scenario
  );

  const data = (spreadData?.points ?? BASE_SERIES).map((point) => ({
    label: point.label,
    gasEurMwh: "gas_eur_mwh" in point ? point.gas_eur_mwh : point.gasEurMwh,
    carbonEurT: "carbon_eur_t" in point ? point.carbon_eur_t : point.carbonEurT,
    powerEurMwh: "power_eur_mwh" in point ? point.power_eur_mwh : point.powerEurMwh,
  }));

  const selected = data[selectedIndex] ?? data[0];
  const cleanCost = cleanGasCost(selected.gasEurMwh, selected.carbonEurT, efficiency, emissions);
  const cleanSpread = selected.powerEurMwh - cleanCost;
  const avgSpread = average(
    data.map((point) =>
      point.powerEurMwh - cleanGasCost(point.gasEurMwh, point.carbonEurT, efficiency, emissions)
    )
  );
  const spreads = data.map((point) =>
    point.powerEurMwh - cleanGasCost(point.gasEurMwh, point.carbonEurT, efficiency, emissions)
  );
  const maxSpread = Math.max(...spreads.map((spread) => Math.abs(spread)), 1);
  const marketTruth = getRequestTruth({
    error,
    isLoading,
    source: spreadData?.data_source,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gas & Carbon</h1>
          <p className="mt-2 text-sm text-slate-400">
            TTF gas, EUA carbon, clean generation cost, and spark spread signals.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {marketTruth.detail}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DataTruthBadge truth={marketTruth} />
          <ZoneSelect zone={zone} onChange={(z, c) => setZone(z, c)} />
        </div>
      </div>
      <ScenarioSelect value={scenario} onChange={setScenario} />

      <GridTelemetryStrip
        zone={zone}
        items={[
          { label: "Latest gas", value: `${selected.gasEurMwh.toFixed(1)} EUR/MWh`, tone: "blue" },
          { label: "EUA", value: `${selected.carbonEurT.toFixed(1)} EUR/t`, tone: "amber" },
          {
            label: "Clean spark",
            value: `${cleanSpread.toFixed(1)} EUR/MWh`,
            tone: cleanSpread >= 0 ? "green" : "red",
          },
          { label: "Frequency", value: "50.00 Hz", tone: "green" },
          { label: "Zone", value: zone, tone: "slate" },
        ]}
      />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat title="TTF Gas" value={`${selected.gasEurMwh.toFixed(1)} EUR/MWh`} />
        <Stat title="EUA Carbon" value={`${selected.carbonEurT.toFixed(1)} EUR/t`} />
        <Stat title="Clean Cost" value={`${cleanCost.toFixed(1)} EUR/MWh`} />
        <Stat
          title="Clean Spark"
          value={`${cleanSpread.toFixed(1)} EUR/MWh`}
          tone={cleanSpread >= 0 ? "text-green-400" : "text-red-400"}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Clean Spark Spread</h2>
              <p className="mt-1 text-sm text-slate-500">
                Click a day to inspect gas, carbon, and power economics.
              </p>
            </div>
            <span className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300">
              Avg {avgSpread.toFixed(1)} EUR/MWh
            </span>
          </div>

          <div className="relative mt-6 h-80 rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-5">
            <div className="absolute inset-x-4 top-5 border-t border-slate-800/80" />
            <div className="absolute inset-x-4 top-1/4 border-t border-slate-800/60" />
            <div className="absolute inset-x-4 top-1/2 border-t border-slate-500/60" />
            <div className="absolute inset-x-4 top-3/4 border-t border-slate-800/60" />
            <div className="absolute left-4 top-[calc(50%-10px)] rounded bg-slate-900 px-2 py-0.5 text-[10px] uppercase text-slate-500">
              zero spread
            </div>
            <div className="relative z-10 grid h-full grid-cols-7 gap-2">
            {data.map((point, index) => {
              const spread =
                point.powerEurMwh - cleanGasCost(point.gasEurMwh, point.carbonEurT, efficiency, emissions);
              const height = Math.max((Math.abs(spread) / maxSpread) * 44, 6);
              const positive = spread >= 0;
              return (
                <button
                  type="button"
                  key={point.label}
                  onClick={() => setSelectedIndex(index)}
                  className="group flex h-full flex-col items-center justify-center focus:outline-none"
                  title={`${point.label}: ${spread.toFixed(1)} EUR/MWh`}
                >
                  <div className="flex h-[calc(100%-28px)] w-full flex-col">
                    <div className="flex flex-1 items-end">
                      {positive && (
                        <div
                          className={`w-full rounded-t-sm bg-green-400/85 shadow-[0_0_18px_rgba(74,222,128,0.22)] transition group-hover:bg-green-300 ${
                            selectedIndex === index ? "ring-2 ring-white" : ""
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      )}
                    </div>
                    <div className="h-px w-full bg-slate-500/70" />
                    <div className="flex flex-1 items-start">
                      {!positive && (
                        <div
                          className={`w-full rounded-b-sm bg-red-400/85 shadow-[0_0_18px_rgba(248,113,113,0.22)] transition group-hover:bg-red-300 ${
                            selectedIndex === index ? "ring-2 ring-white" : ""
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="mt-2 text-xs text-slate-500">{point.label}</span>
                </button>
              );
            })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <Detail label="Selected" value={selected.label} />
            <Detail label="Power price" value={`${selected.powerEurMwh.toFixed(1)} EUR/MWh`} />
            <Detail label="Clean cost" value={`${cleanCost.toFixed(1)} EUR/MWh`} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Plant Assumptions</h2>
          <label className="mt-5 block text-sm text-slate-400">
            Efficiency {(efficiency * 100).toFixed(0)}%
            <input
              type="range"
              min="0.42"
              max="0.62"
              step="0.01"
              value={efficiency}
              onChange={(event) => setEfficiency(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
          <label className="mt-5 block text-sm text-slate-400">
            Emissions {emissions.toFixed(2)} t/MWh
            <input
              type="range"
              min="0.28"
              max="0.48"
              step="0.01"
              value={emissions}
              onChange={(event) => setEmissions(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
            {cleanSpread >= 0
              ? "Gas-fired generation is in the money under these assumptions."
              : "Clean spark spread is negative; avoid dispatch unless system constraints require it."}
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

function cleanGasCost(gas: number, carbon: number, efficiency: number, emissions: number) {
  return gas / efficiency + carbon * emissions;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function Stat({ title, value, tone }: { title: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className={`mt-2 text-xl font-semibold ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-100">{value}</p>
    </div>
  );
}
