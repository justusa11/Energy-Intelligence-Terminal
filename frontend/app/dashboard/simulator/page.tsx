"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useMarketScope } from "@/hooks/useMarketScope";
import { DataTruthBadge } from "@/components/DataTruthBadge";
import { ZoneSelect } from "@/components/ZoneSelect";
import { GridTelemetryStrip } from "@/components/GridTelemetryStrip";
import { getRequestTruth } from "@/lib/dataTruth";
import type { Simulation } from "@/types/terminal";

export default function SimulatorPage() {
  const { country, setZone, zone } = useMarketScope();
  const [strategy, setStrategy] = useState("battery_arbitrage");
  const [days, setDays] = useState(14);
  const [batteryCapacity, setBatteryCapacity] = useState(100);
  const [batteryPower, setBatteryPower] = useState(50);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const sim = useApi<Simulation>(
    `/simulator/backtest?country=${country}&zone=${zone}&strategy=${strategy}&days=${days}&battery_capacity_kwh=${batteryCapacity}&battery_power_kw=${batteryPower}`
  );
  const data = sim.data;

  const maxProfit = data
    ? Math.max(...data.daily_results.map((d) => Math.abs(d.profit_eur)), 1)
    : 1;
  const selectedDay =
    data && selectedDayIndex !== null ? data.daily_results[selectedDayIndex] ?? null : null;
  const simTruth = getRequestTruth({
    error: sim.error,
    isLoading: sim.isLoading,
    source: data?.data_source,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSelectedDayIndex(null));
    return () => window.cancelAnimationFrame(frame);
  }, [batteryCapacity, batteryPower, country, days, strategy, zone]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Trading Simulator</h1>
          <p className="mt-2 text-sm text-slate-400">
            Backtest storage strategies against historical day-ahead prices.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DataTruthBadge truth={simTruth} />
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
          >
            <option value="battery_arbitrage">Battery Arbitrage</option>
            <option value="peak_offpeak">Peak / Off-Peak</option>
          </select>
          <ZoneSelect
            zone={zone}
            onChange={(z, c) => {
              setZone(z, c);
              setSelectedDayIndex(null);
            }}
          />
        </div>
      </div>

      {sim.error && (
        <p className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          {sim.error}
        </p>
      )}

      <GridTelemetryStrip
        zone={zone}
        items={[
          {
            label: "Latest run",
            value: data ? formatTime(data.generated_at_utc) : "Running",
            tone: data ? "green" : "amber",
          },
          { label: "Strategy", value: strategyLabel(strategy), tone: "blue" },
          { label: "Data status", value: simTruth.label, tone: simTruth.state === "live" ? "green" : simTruth.state === "failed" ? "red" : "amber" },
          { label: "Frequency", value: "50.00 Hz", tone: "green" },
          { label: "Zone", value: zone, tone: "slate" },
        ]}
      />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          title="Total Profit"
          value={data ? `${data.total_profit_eur.toFixed(2)} €` : "—"}
          tone={data && data.total_profit_eur >= 0 ? "text-green-400" : "text-red-400"}
        />
        <Stat
          title="Avg Daily Profit"
          value={data ? `${data.average_daily_profit_eur.toFixed(2)} €` : "—"}
        />
        <Stat title="Days Simulated" value={data ? `${data.days_simulated}` : "—"} />
        <Stat
          title="Round-trip Eff."
          value={data ? `${(data.round_trip_efficiency * 100).toFixed(0)}%` : "—"}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6 md:grid-cols-3">
        <RangeControl
          label="Backtest days"
          max={60}
          min={7}
          step={1}
          unit="days"
          value={days}
          onChange={setDays}
        />
        <RangeControl
          label="Battery capacity"
          max={500}
          min={25}
          step={25}
          unit="kWh"
          value={batteryCapacity}
          onChange={setBatteryCapacity}
        />
        <RangeControl
          label="Battery power"
          max={250}
          min={10}
          step={10}
          unit="kW"
          value={batteryPower}
          onChange={setBatteryPower}
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Daily P&amp;L</h2>
            <p className="mt-1 text-sm text-slate-500">
              Click a bar to inspect cycles and daily arbitrage value.
            </p>
          </div>
          <span className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300">
            Scale ±{maxProfit.toFixed(2)} €
          </span>
        </div>
        <div className="relative mt-6 h-72 rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-5">
          <div className="absolute inset-x-4 top-5 border-t border-slate-800/80" />
          <div className="absolute inset-x-4 top-1/4 border-t border-slate-800/60" />
          <div className="absolute inset-x-4 top-1/2 border-t border-slate-500/60" />
          <div className="absolute inset-x-4 top-3/4 border-t border-slate-800/60" />
          <div className="absolute left-4 top-[calc(50%-10px)] rounded bg-slate-900 px-2 py-0.5 text-[10px] uppercase text-slate-500">
            zero P&amp;L
          </div>
          <div
            className="relative z-10 grid h-full gap-1"
            style={{ gridTemplateColumns: `repeat(${Math.max(data?.daily_results.length ?? 1, 1)}, minmax(0, 1fr))` }}
          >
            {(data?.daily_results ?? []).map((d, index) => {
              const height = Math.max((Math.abs(d.profit_eur) / maxProfit) * 44, 5);
              const positive = d.profit_eur >= 0;
              return (
                <button
                  type="button"
                  key={`${d.date}-${index}`}
                  onClick={() => setSelectedDayIndex(index)}
                  className="group flex h-full flex-col items-center justify-center focus:outline-none"
                  title={`${d.date}: ${d.profit_eur.toFixed(2)} €`}
                >
                  <div className="flex h-[calc(100%-22px)] w-full flex-col">
                    <div className="flex flex-1 items-end">
                      {positive && (
                        <div
                          className={`w-full rounded-t-sm bg-green-400/85 transition group-hover:bg-green-300 ${
                            selectedDayIndex === index ? "ring-2 ring-white" : ""
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      )}
                    </div>
                    <div className="h-px w-full bg-slate-500/70" />
                    <div className="flex flex-1 items-start">
                      {!positive && (
                        <div
                          className={`w-full rounded-b-sm bg-red-400/85 transition group-hover:bg-red-300 ${
                            selectedDayIndex === index ? "ring-2 ring-white" : ""
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="mt-2 hidden text-[10px] text-slate-500 md:inline">
                    {shortDate(d.date)}
                  </span>
                </button>
              );
            })}
          </div>
          {!data && (
            <p className="w-full text-center text-sm text-slate-500">
              Running backtest...
            </p>
          )}
        </div>
        {selectedDay && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
            Selected day: <span className="text-white">{selectedDay.date}</span>{" "}
            P&amp;L{" "}
            <span className={selectedDay.profit_eur >= 0 ? "text-green-400" : "text-red-400"}>
              {selectedDay.profit_eur.toFixed(2)} €
            </span>{" "}
            across {selectedDay.cycles} cycles.
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          {data?.best_day && (
            <p className="text-slate-400">
              Best day: <span className="text-green-400">{data.best_day.date}</span> (
              {data.best_day.profit_eur.toFixed(2)} €)
            </p>
          )}
          {data?.worst_day && (
            <p className="text-slate-400">
              Worst day: <span className="text-red-400">{data.worst_day.date}</span> (
              {data.worst_day.profit_eur.toFixed(2)} €)
            </p>
          )}
          {data && (
            <p className="text-slate-400">
              Data status: <span className="text-slate-200">{simTruth.label}</span>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function RangeControl({
  label,
  max,
  min,
  onChange,
  step,
  unit,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  unit: string;
  value: number;
}) {
  return (
    <label className="block text-sm text-slate-400">
      {label}: <span className="text-white">{value}</span> {unit}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
      />
    </label>
  );
}

function Stat({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className={`mt-2 text-xl font-semibold ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function shortDate(date: string) {
  const parts = date.split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function strategyLabel(strategy: string) {
  if (strategy === "peak_offpeak") return "Peak / off-peak";
  return "Battery arbitrage";
}
