"use client";

import { useApi } from "@/hooks/useApi";
import { useMarketScope } from "@/hooks/useMarketScope";
import { ZoneSelect } from "@/components/ZoneSelect";
import { DataQualityStatusCard } from "@/components/cards/DataQualityStatusCard";
import { useDataQuality } from "@/hooks/useDataQuality";
import { GridTelemetryStrip } from "@/components/GridTelemetryStrip";
import { useIngestionStatus, type IngestionJobStatus } from "@/hooks/useIngestionStatus";
import type { RiskStatus } from "@/types/risk";

const REQUIRED_PRACTICE_JOBS = new Set(["price_ingestion", "weather_ingestion", "system_heartbeat"]);
const OPTIONAL_ENRICHMENT_JOBS = new Set(["plant_registry", "external_market_ingestion"]);

export default function RiskPage() {
  const { country, setZone, zone } = useMarketScope();

  const risk = useApi<RiskStatus>(`/risk/status?country=${country}&zone=${zone}`);
  const dataQuality = useDataQuality(country, zone);
  const ingestion = useIngestionStatus(country, zone);

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
          onChange={(z, c) => setZone(z, c)}
        />
      </div>

      <GridTelemetryStrip
        zone={zone}
        items={[
          {
            label: "Risk gate",
            value: risk.data?.status ?? "Loading",
            tone: risk.data?.status === "SAFE" ? "green" : risk.data?.status === "WARN" ? "amber" : "red",
          },
          {
            label: "Checks",
            value: risk.data ? `${risk.data.checks.length} active` : "Loading",
            tone: "blue",
          },
          {
            label: "Data quality",
            value: dataQuality.data ? qualityLabel(dataQuality.data.status) : "Loading",
            tone: dataQuality.data?.status === "OK" ? "green" : "amber",
          },
          { label: "Frequency", value: "50.00 Hz", tone: "green" },
          { label: "Zone", value: zone, tone: "slate" },
        ]}
      />

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

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(risk.data?.checks ?? []).map((check, index) => (
            <div
              key={`${check.name}-${index}`}
              className="rounded-lg border border-slate-800 bg-slate-950 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                <p className="text-slate-200">{check.name}</p>
                <p className="text-xs text-slate-500">severity: {check.severity}</p>
                </div>
                <span className={`rounded px-3 py-1 text-xs font-medium ${checkClass(check.status)}`}>
                  {check.status}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full ${riskBarClass(check.status)}`} style={{ width: check.status === "OK" ? "100%" : check.status === "WARN" ? "62%" : "32%" }} />
              </div>
            </div>
          ))}
          {risk.error && <p className="text-sm text-red-300">{risk.error}</p>}
        </div>
      </section>

      <section>
          <DataQualityStatusCard
            data={dataQuality.data}
            isLoading={dataQuality.isLoading}
            error={dataQuality.error}
          />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Ingestion Operations</h2>
            <p className="mt-1 text-sm text-slate-400">
              Provider readiness, latest job runs, row counts, and repair commands for the selected market.
            </p>
          </div>
          <span className={`rounded-lg px-3 py-2 text-xs font-semibold ${ingestionHealthClass(ingestion.data)}`}>
            {ingestion.isLoading ? "Checking" : ingestion.error ? "Failed" : ingestionSummary(ingestion.data)}
          </span>
        </div>

        {ingestion.error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {ingestion.error}
          </p>
        )}

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Providers</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {Object.entries(ingestion.data?.providers ?? {}).map(([key, provider]) => (
                <div key={key} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{formatProviderName(key)}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{provider.purpose}</p>
                    </div>
                    <span className={`rounded px-2 py-1 text-[11px] font-semibold ${provider.configured ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {provider.configured ? "Configured" : "Needs setup"}
                    </span>
                  </div>
                </div>
              ))}
              {ingestion.isLoading && <SkeletonCard label="Loading providers..." />}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Jobs</h3>
            <div className="mt-3 grid gap-3">
              {Object.entries(ingestion.data?.jobs ?? {}).map(([key, job]) => (
                <JobCard
                  key={key}
                  name={formatJobName(key)}
                  job={job}
                  optional={OPTIONAL_ENRICHMENT_JOBS.has(key)}
                />
              ))}
              {ingestion.isLoading && <SkeletonCard label="Loading jobs..." />}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function JobCard({ job, name, optional = false }: { job: IngestionJobStatus; name: string; optional?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-100">{name}</p>
            {optional && (
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Optional
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">{job.message ?? "No message reported."}</p>
        </div>
        <span className={`rounded px-2 py-1 text-[11px] font-semibold ${jobStatusClass(job.status)}`}>
          {job.status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <JobMeta label="Latest" value={job.latest_run_utc ? formatTimestamp(job.latest_run_utc) : "Never"} />
        <JobMeta label="Rows" value={String(job.rows_inserted ?? 0)} />
      </div>
      {job.repair_command && (
        <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-xs font-medium text-amber-300">Repair command</p>
          <code className="mt-1 block break-words text-xs text-slate-300">{job.repair_command}</code>
        </div>
      )}
    </div>
  );
}

function JobMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-900 px-2 py-1.5">
      <p>{label}</p>
      <p className="mt-1 text-slate-300">{value}</p>
    </div>
  );
}

function SkeletonCard({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
      {label}
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

function riskBarClass(status: string) {
  if (status === "OK") return "bg-green-400";
  if (status === "WARN") return "bg-amber-400";
  return "bg-red-400";
}

function qualityLabel(status: string) {
  if (status === "OK") return "Operational";
  if (status === "WARNING") return "Watch";
  return "Live pending";
}

function formatProviderName(key: string) {
  const names: Record<string, string> = {
    energi_data_service: "Energi Data Service",
    open_meteo: "Open-Meteo",
    entsoe: "ENTSO-E",
    ercot: "ERCOT",
    jepx: "JEPX",
  };
  return names[key] ?? key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatJobName(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function jobStatusClass(status: string) {
  if (status === "success") return "bg-green-500/10 text-green-400";
  if (status === "running") return "bg-blue-500/10 text-blue-400";
  if (status === "failed" || status === "error") return "bg-red-500/10 text-red-400";
  return "bg-amber-500/10 text-amber-400";
}

function ingestionHealthClass(data: ReturnType<typeof useIngestionStatus>["data"]) {
  if (!data) return "bg-slate-700/40 text-slate-400";
  const jobs = requiredJobs(data.jobs);
  if (jobs.some((job) => job.status === "failed" || job.status === "error")) {
    return "bg-red-500/10 text-red-400";
  }
  if (jobs.some((job) => job.status === "pending")) {
    return "bg-amber-500/10 text-amber-400";
  }
  return "bg-green-500/10 text-green-400";
}

function ingestionSummary(data: ReturnType<typeof useIngestionStatus>["data"]) {
  if (!data) return "Unavailable";
  const jobs = requiredJobs(data.jobs);
  const success = jobs.filter((job) => job.status === "success").length;
  return `${success}/${jobs.length} required jobs healthy`;
}

function requiredJobs(jobs: Record<string, IngestionJobStatus>) {
  const required = Object.entries(jobs)
    .filter(([key]) => REQUIRED_PRACTICE_JOBS.has(key))
    .map(([, job]) => job);
  return required.length > 0 ? required : Object.values(jobs);
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace(".000Z", "Z");
}
