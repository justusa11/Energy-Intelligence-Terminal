import { countries, zones } from "@/lib/constants";
import { Bell, CalendarDays, Download, RefreshCw } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-8 backdrop-blur">
      <div>
        <p className="text-sm text-slate-400">Market Scope</p>
        <div className="mt-1 flex items-center gap-3">
          <select className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none">
            {countries.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>

          <select className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none">
            {zones.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>

          <span className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400">
            Production
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:text-white">
          <CalendarDays className="h-4 w-4" />
          Today
        </button>

        <button className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:text-white">
          <RefreshCw className="h-4 w-4" />
          Auto-refresh
        </button>

        <button className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:text-white">
          <Download className="h-4 w-4" />
          Export
        </button>

        <button className="relative rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white">
            4
          </span>
        </button>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
          JA
        </div>
      </div>
    </header>
  );
}