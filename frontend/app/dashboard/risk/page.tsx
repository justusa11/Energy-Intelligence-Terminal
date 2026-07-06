"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { ZoneSelect } from "@/components/ZoneSelect";
import { DataQualityStatusCard } from "@/components/cards/DataQualityStatusCard";
import { useDataQuality } from "@/hooks/useDataQuality";
import type { RiskStatus } from "@/types/risk";

export default function RiskPage() {
  const [zone, setZone] = useState("DK1");
  const [country, setCountry] = useState("DK");

  const risk = useApi<RiskStatus>(`/risk/status?country=${country}&zone=${zone}`);
  const dataQuality = useDataQuality(country, zone);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Risk Monitor</h1>
          <p className="mt-2 text-sm text-slate-400">
            Data freshness, coverage, forecast confidence, and comfort constraints. The
            gate must be SAFE before recommendations are acted on.
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

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Overall Risk Gate</h2>
          <span
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${gateClass(
              risk.data?.status
            )}`}
          >
            {risk.data?.status ?? "Loading..."}
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {(risk.data?.checks ?? []).map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-4"
            >
              <div>
                <p className="text-slate-200">{check.name}</p>
                <p className="text-xs text-slate-500">severity: {check.severity}</p>
              </div>
              <span className={`rounded px-3 py-1 text-xs font-medium ${checkClass(check.status)}`}>
                {check.status}
              </span>
            </div>
          ))}
          {risk.error && <p className="text-sm text-red-300">{risk.error}</p>}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Data Quality</h2>
        <div className="mt-4">
          <DataQualityStatusCard
            data={dataQuality.data}
            isLoading={dataQuality.isLoading}
            error={dataQuality.error}
          />
        </div>
      </section>
    </div>
  );
}

function gateClass(status?: string) {
  if (status === "SAFE") return "bg-green-500/10 text-green-400";
  if (status === "WARN") return "bg-amber-500/10 text-amber-400";
  if (status === "CRITICAL") return "bg-red-500/10 text-red-400";
  return "bg-slate-700/40 text-slate-400";
}

function checkClass(status: string) {
  if (status === "OK") return "bg-green-500/10 text-green-400";
  if (status === "WARN") return "bg-amber-500/10 text-amber-400";
  return "bg-red-500/10 text-red-400";
}
