"use client";

import { useMarketScope } from "@/hooks/useMarketScope";
import { zones } from "@/lib/constants";

export function ZoneSelect({
  zone,
  onChange,
}: {
  zone?: string;
  onChange?: (zone: string, country: string) => void;
}) {
  const scope = useMarketScope();
  const selectedZone = zone ?? scope.zone;

  function handleChange(value: string) {
    const selected = zones.find((z) => z.value === value);
    if (!selected) return;

    if (onChange) {
      onChange(selected.value, selected.country);
    } else {
      scope.setZone(selected.value, selected.country);
    }
  }

  return (
    <select
      value={selectedZone}
      onChange={(event) => handleChange(event.target.value)}
      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
      aria-label="Bidding zone"
    >
      {zones.map((z) => (
        <option key={z.value} value={z.value}>
          {z.label}
          {z.live ? "" : " (sample)"}
        </option>
      ))}
    </select>
  );
}
