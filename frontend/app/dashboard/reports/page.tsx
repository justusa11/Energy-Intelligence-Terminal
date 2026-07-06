"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { ZoneSelect } from "@/components/ZoneSelect";
import type { Report } from "@/types/terminal";

export default function ReportsPage() {
  const [zone, setZone] = useState("DK1");
  const [country, setCountry] = useState("DK");
  const [type, setType] = useState<"daily" | "weekly-savings">("daily");

  const path =
    type === "daily"
      ? `/reports/daily?country=${country}&zone=${zone}`
      : `/reports/weekly-savings?country=${country}&zone=${zone}`;
  const report = useApi<Report>(path);
  const data = report.data;

  function download() {
    if (!data) return;
    const blob = new Blob([data.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.report_type}_${data.zone}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-2 text-sm text-slate-400">
            Daily market briefs and weekly savings reports, generated from live data.
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "daily" | "weekly-savings")}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
          >
            <option value="daily">Daily Market Report</option>
            <option value="weekly-savings">Weekly Savings Report</option>
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

      {report.error && (
        <p className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          {report.error}
        </p>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">
            {data?.title ?? "Loading report..."}
          </h2>
          {data && (
            <button
              onClick={download}
              className="shrink-0 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-blue-500 hover:text-white"
            >
              Download .md
            </button>
          )}
        </div>

        <div className="mt-6 space-y-5">
          {(data?.sections ?? []).map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-400">
                {section.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-300">{section.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
