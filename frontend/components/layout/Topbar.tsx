"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTruthBadge } from "@/components/DataTruthBadge";
import { useMarketScope } from "@/hooks/useMarketScope";
import { countries, zones } from "@/lib/constants";
import { getZoneTruth } from "@/lib/dataTruth";
import { Bell, CalendarDays, Download, RefreshCw } from "lucide-react";

export function Topbar() {
  const marketScope = useMarketScope();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dateOffset, setDateOffset] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const visibleZones = useMemo(
    () => zones.filter((candidate) => candidate.country === marketScope.country),
    [marketScope.country]
  );
  const zoneTruth = getZoneTruth(marketScope.country, marketScope.zone);
  const selectedDate = new Date();
  selectedDate.setDate(selectedDate.getDate() + dateOffset);
  const dateLabel =
    dateOffset === 0
      ? "Today"
      : selectedDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

  function exportContext() {
    const payload = {
      exportedAt: new Date().toISOString(),
      country: marketScope.country,
      zone: marketScope.zone,
      autoRefresh,
      date: selectedDate.toISOString().slice(0, 10),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `flextrade-context-${marketScope.zone}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-8 backdrop-blur">
      <div>
        <p className="text-sm text-slate-400">Market Scope</p>
        <div className="mt-1 flex items-center gap-3">
          <select
            value={marketScope.country}
            onChange={(event) => marketScope.setCountry(event.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
            aria-label="Country"
          >
            {countries.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>

          <select
            value={marketScope.zone}
            onChange={(event) => marketScope.setZone(event.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
            aria-label="Bidding zone"
          >
            {visibleZones.map((candidate) => (
              <option key={candidate.value} value={candidate.value}>
                {candidate.label}
              </option>
            ))}
          </select>

          <DataTruthBadge truth={zoneTruth} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setDateOffset((value) => (value + 1) % 7)}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:text-white"
          title="Cycle market date"
          aria-label="Cycle market date"
        >
          <CalendarDays className="h-4 w-4" />
          {dateLabel}
        </button>

        <button
          type="button"
          onClick={() => setAutoRefresh((value) => !value)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            autoRefresh
              ? "border-green-500/40 bg-green-500/10 text-green-300"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
          }`}
          aria-pressed={autoRefresh}
          aria-label="Toggle live refresh"
        >
          <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
          {autoRefresh ? "Live" : "Paused"}
        </button>

        <button
          type="button"
          onClick={exportContext}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:text-white"
        >
          <Download className="h-4 w-4" />
          Export
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((value) => !value)}
            className="relative rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white"
            aria-expanded={notificationsOpen}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white">
              4
            </span>
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-72 rounded-lg border border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-black/40">
              {[
                `${marketScope.zone} evening price spike risk`,
                "COBRAcable flow near limit",
                "Wind forecast revised down",
                "Daily report ready",
              ].map((item) => (
                <p
                  key={item}
                  className="border-b border-slate-800 px-2 py-2 text-sm text-slate-300 last:border-0"
                >
                  {item}
                </p>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700"
          aria-label="Open settings"
        >
          JA
        </Link>
      </div>
    </header>
  );
}
