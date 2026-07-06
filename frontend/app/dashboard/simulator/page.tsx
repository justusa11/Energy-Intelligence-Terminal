"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { ZoneSelect } from "@/components/ZoneSelect";
import type { Simulation } from "@/types/terminal";

export default function SimulatorPage() {
  const [zone, setZone] = useState("DK1");
  const [country, setCountry] = useState("DK");
  const [strategy, setStrategy] = useState("battery_arbitrage");

  const sim = useApi<Simulation>(
    `/simulator/backtest?country=${country}&zone=${zone}&strategy=${strategy}&days=14`
  );
  const data = sim.data;

  const maxProfit = data
    ? Math.max(...data.daily_results.map((d) => Math.abs(d.profit_eur)), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Trading Simulator</h1>
          <p className="mt-2 text-sm text-slate-400">
            Backtest storage strategies against historical day-ahead prices.
          </p>
        </div>
        <div className="flex gap-3">
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
              setZone(z);
              setCountry(c);
            }}
          />
        </div>
      </div>

      {sim.error && (
        <p className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          {sim.error}
        </p>
      )}

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

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Daily P&amp;L</h2>
        <div className="mt-6 flex h-64 items-center gap-1 border-y border-slate-800 py-4">
          {(data?.daily_results ?? []).map((d) => {
            const height = (Math.abs(d.profit_eur) / maxProfit) * 45;
            const positive = d.profit_eur >= 0;
            return (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center justify-center"
                title={`${d.date}: ${d.profit_eur.toFixed(2)} €`}
              >
                <div className="flex h-full w-full flex-col justify-center">
                  <div className="flex flex-1 items-end justify-center">
                    {positive && (
                      <div
                        className="w-full rounded-t bg-green-500"
                        style={{ height: `${height}%` }}
                      />
                    )}
                  </div>
                  <div className="h-px w-full bg-slate-700" />
                  <div className="flex flex-1 items-start justify-center">
                    {!positive && (
                      <div
                        className="w-full rounded-b bg-red-500"
                        style={{ height: `${height}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!data && (
            <p className="w-full text-center text-sm text-slate-500">
              Running backtest...
            </p>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
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
        </div>
      </section>
    </div>
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
