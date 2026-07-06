"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { ZoneSelect } from "@/components/ZoneSelect";
import type { FlexibilityPlan } from "@/types/terminal";

export default function FlexibilityPage() {
  const [zone, setZone] = useState("DK1");
  const [country, setCountry] = useState("DK");

  const plan = useApi<FlexibilityPlan>(
    `/flexibility/schedule?country=${country}&zone=${zone}`
  );
  const data = plan.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Flexibility Optimizer
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Battery, EV, and shiftable-load schedule that minimizes cost against the
            day-ahead price curve.
          </p>
        </div>
        <ZoneSelect
          zone={zone}
          onChange={(z, c) => {
            setZone(z);
            setCountry(c);
          }}
        />
      </div>

      {plan.error && (
        <p className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          {plan.error}
        </p>
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          title="Estimated Savings"
          value={data ? `${data.estimated_savings_eur.toFixed(2)} €/day` : "—"}
          tone="text-green-400"
        />
        <Stat
          title="Baseline Cost"
          value={data ? `${data.baseline_cost_eur.toFixed(2)} €` : "—"}
        />
        <Stat
          title="Optimized Cost"
          value={data ? `${data.optimized_cost_eur.toFixed(2)} €` : "—"}
        />
        <Stat
          title="Battery"
          value={data ? `${data.battery_capacity_kwh} kWh` : "—"}
        />
      </section>

      {data && (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          {data.summary}
        </p>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">24h Schedule</h2>
        <div className="mt-4 max-h-[28rem] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2">Hour</th>
                <th className="pb-2 text-right">Price (€/MWh)</th>
                <th className="pb-2 text-center">Battery</th>
                <th className="pb-2 text-center">EV</th>
                <th className="pb-2 text-center">Shiftable Load</th>
              </tr>
            </thead>
            <tbody>
              {(data?.schedule ?? []).map((slot) => (
                <tr key={slot.hour} className="border-t border-slate-800">
                  <td className="py-2 text-slate-300">{slot.hour}</td>
                  <td className="py-2 text-right text-slate-200">
                    {slot.price_eur_mwh.toFixed(1)}
                  </td>
                  <td className="py-2 text-center">
                    <span className={`rounded px-2 py-1 text-xs ${batteryClass(slot.battery_action)}`}>
                      {slot.battery_action}
                    </span>
                  </td>
                  <td className="py-2 text-center">{slot.ev_charging ? "⚡" : "—"}</td>
                  <td className="py-2 text-center">{slot.shiftable_load ? "●" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data && (
            <p className="mt-4 text-sm text-slate-500">Loading schedule...</p>
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

function batteryClass(action: string) {
  if (action === "charge") return "bg-green-500/10 text-green-400";
  if (action === "discharge") return "bg-red-500/10 text-red-400";
  return "bg-slate-700/40 text-slate-400";
}
