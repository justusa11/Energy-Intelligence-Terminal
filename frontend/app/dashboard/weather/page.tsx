"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { ZoneSelect } from "@/components/ZoneSelect";
import type { WeatherForecast } from "@/types/terminal";

export default function WeatherPage() {
  const [zone, setZone] = useState("DK1");
  const [country, setCountry] = useState("DK");

  const weather = useApi<WeatherForecast>(
    `/weather/forecast?country=${country}&zone=${zone}`
  );
  const points = weather.data?.forecasts ?? [];

  const temps = points
    .map((p) => p.temperature_2m_c)
    .filter((v): v is number => v !== null);
  const winds = points
    .map((p) => p.wind_speed_100m_ms)
    .filter((v): v is number => v !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Weather Intelligence
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Temperature, wind, and solar radiation driving renewable supply and demand.
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

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          title="Avg Temp"
          value={temps.length ? `${avg(temps).toFixed(1)} °C` : "—"}
        />
        <Stat
          title="Avg Wind (100m)"
          value={winds.length ? `${avg(winds).toFixed(1)} m/s` : "—"}
        />
        <Stat title="Forecast Points" value={`${points.length}`} />
        <Stat title="Source" value={weather.data?.source ?? "—"} />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Hourly Weather</h2>
        {points.length > 0 ? (
          <div className="mt-4 max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2">Time (UTC)</th>
                  <th className="pb-2 text-right">Temp (°C)</th>
                  <th className="pb-2 text-right">Wind 10m (m/s)</th>
                  <th className="pb-2 text-right">Wind 100m (m/s)</th>
                  <th className="pb-2 text-right">Solar (W/m²)</th>
                  <th className="pb-2 text-right">Precip (mm)</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.target_time_utc} className="border-t border-slate-800">
                    <td className="py-2 text-slate-300">
                      {p.target_time_utc.slice(5, 16).replace("T", " ")}
                    </td>
                    <td className="py-2 text-right text-slate-200">
                      {fmt(p.temperature_2m_c)}
                    </td>
                    <td className="py-2 text-right text-slate-200">
                      {fmt(p.wind_speed_10m_ms)}
                    </td>
                    <td className="py-2 text-right text-slate-200">
                      {fmt(p.wind_speed_100m_ms)}
                    </td>
                    <td className="py-2 text-right text-slate-200">
                      {fmt(p.shortwave_radiation_wm2)}
                    </td>
                    <td className="py-2 text-right text-slate-200">
                      {fmt(p.precipitation_mm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            {weather.error ??
              (weather.isLoading
                ? "Loading weather..."
                : "No stored weather for this zone yet — run the weather ingestion job.")}
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function avg(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function fmt(v: number | null) {
  return v === null ? "—" : v.toFixed(1);
}
