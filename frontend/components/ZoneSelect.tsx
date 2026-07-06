"use client";

import { zones } from "@/lib/constants";

export function ZoneSelect({
  zone,
  onChange,
}: {
  zone: string;
  onChange: (zone: string, country: string) => void;
}) {
  return (
    <select
      value={zone}
      onChange={(event) => {
        const selected = zones.find((z) => z.value === event.target.value);
        if (selected) {
          onChange(selected.value, selected.country);
        }
      }}
      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
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
