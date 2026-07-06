"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { ZoneSelect } from "@/components/ZoneSelect";
import type { Screener } from "@/types/terminal";

export default function ScreenerPage() {
  const [zone, setZone] = useState("DK1");
  const [country, setCountry] = useState("DK");

  const screener = useApi<Screener>(
    `/screener/opportunities?country=${country}&zone=${zone}`
  );
  const data = screener.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Energy Market Screener
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Cheapest and most expensive hours, spike risk, negative-price risk, and
            flexibility opportunities.
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

      {screener.error && (
        <p className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          {screener.error}
        </p>
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          title="Average Price"
          value={data ? `${data.average_price_eur_mwh.toFixed(1)} €/MWh` : "—"}
        />
        <Stat
          title="Intraday Spread"
          value={data ? `${data.price_spread_eur_mwh.toFixed(1)} €/MWh` : "—"}
        />
        <Stat
          title="Spike Risk"
          value={data ? data.spike_risk.toUpperCase() : "—"}
          tone={riskTone(data?.spike_risk)}
        />
        <Stat
          title="Negative Price Risk"
          value={data ? data.negative_price_risk.toUpperCase() : "—"}
          tone={riskTone(data?.negative_price_risk)}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <HourList
          title="Cheapest Hours"
          hours={data?.cheapest_hours ?? []}
          tone="text-green-400"
        />
        <HourList
          title="Most Expensive Hours"
          hours={data?.most_expensive_hours ?? []}
          tone="text-red-400"
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Opportunities & Signals</h2>
        <div className="mt-4 space-y-3">
          {(data?.opportunities ?? []).map((op) => (
            <div
              key={op.kind}
              className="rounded-lg border border-slate-800 bg-slate-950 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-200">{op.title}</p>
                <span className={`rounded px-2 py-1 text-xs ${severityClass(op.severity)}`}>
                  {op.severity}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{op.detail}</p>
            </div>
          ))}
          {data && data.opportunities.length === 0 && (
            <p className="text-sm text-slate-500">No signals for this zone today.</p>
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

function HourList({
  title,
  hours,
  tone,
}: {
  title: string;
  hours: { hour: string; price_eur_mwh: number }[];
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-2">
        {hours.map((h) => (
          <div
            key={h.hour}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm"
          >
            <span className="text-slate-300">{h.hour} UTC</span>
            <span className={`font-medium ${tone}`}>
              {h.price_eur_mwh.toFixed(1)} €/MWh
            </span>
          </div>
        ))}
        {hours.length === 0 && (
          <p className="text-sm text-slate-500">Loading...</p>
        )}
      </div>
    </div>
  );
}

function riskTone(risk?: string) {
  if (risk === "high") return "text-red-400";
  if (risk === "medium") return "text-amber-400";
  return "text-green-400";
}

function severityClass(severity: string) {
  if (severity === "warning") return "bg-amber-500/10 text-amber-400";
  if (severity === "opportunity") return "bg-green-500/10 text-green-400";
  return "bg-blue-500/10 text-blue-400";
}
