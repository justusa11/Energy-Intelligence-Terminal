"use client";

import { Activity, Clock, Database, RadioTower, Zap } from "lucide-react";
import { useEffect, useState } from "react";

type TelemetryItem = {
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
};

export function GridTelemetryStrip({
  items,
  zone,
}: {
  items?: TelemetryItem[];
  zone: string;
}) {
  const [now, setNow] = useState<string>("--:--:--");

  useEffect(() => {
    const update = () =>
      setNow(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const defaults: TelemetryItem[] = [
    { label: "Now", value: now, tone: "blue" },
    { label: "Zone", value: zone, tone: "slate" },
    { label: "Frequency", value: "50.00 Hz", tone: "green" },
    { label: "Source", value: "sample + live API", tone: "amber" },
  ];
  const telemetry = items ?? defaults;
  const icons = [Clock, RadioTower, Activity, Database, Zap];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-5">
      {telemetry.map((item, index) => {
        const Icon = icons[index % icons.length];
        return (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
          >
            <span className={`rounded-md p-1.5 ${toneBg(item.tone)}`}>
              <Icon className={`h-4 w-4 ${toneText(item.tone)}`} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="truncate text-sm font-semibold text-slate-100">
                {item.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function toneBg(tone: TelemetryItem["tone"]) {
  if (tone === "green") return "bg-green-500/10";
  if (tone === "amber") return "bg-amber-500/10";
  if (tone === "red") return "bg-red-500/10";
  if (tone === "blue") return "bg-blue-500/10";
  return "bg-slate-800";
}

function toneText(tone: TelemetryItem["tone"]) {
  if (tone === "green") return "text-green-400";
  if (tone === "amber") return "text-amber-400";
  if (tone === "red") return "text-red-400";
  if (tone === "blue") return "text-blue-400";
  return "text-slate-300";
}
