import Link from "next/link";
import { ArrowLeft, Bell, Database, ShieldCheck, SlidersHorizontal } from "lucide-react";

const settingsGroups = [
  {
    title: "Market Defaults",
    icon: SlidersHorizontal,
    rows: ["Default country: Denmark", "Default zone: DK1", "Refresh cadence: 60 seconds"],
  },
  {
    title: "Notifications",
    icon: Bell,
    rows: ["Price spike alerts enabled", "Congestion alerts enabled", "Daily report reminders enabled"],
  },
  {
    title: "Data Operations",
    icon: Database,
    rows: ["API base URL from environment", "Cache mode: no-store", "Sample GIS fallback enabled"],
  },
  {
    title: "Security",
    icon: ShieldCheck,
    rows: ["Secrets are read from environment variables", "Exports contain scope metadata only"],
  },
];

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/dashboard/market-cockpit"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to terminal
        </Link>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-slate-400">
            Operator defaults and production readiness switches for the energy terminal.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {settingsGroups.map((group) => {
            const Icon = group.icon;
            return (
              <article
                key={group.title}
                className="rounded-lg border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">{group.title}</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {group.rows.map((row) => (
                    <div
                      key={row}
                      className="flex items-center justify-between gap-4 border-t border-slate-800 pt-3 text-sm text-slate-300"
                    >
                      <span>{row}</span>
                      <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
