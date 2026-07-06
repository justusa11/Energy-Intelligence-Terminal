"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { ZoneSelect } from "@/components/ZoneSelect";
import type { DayAheadPrices } from "@/types/prices";
import type { Forecast } from "@/types/terminal";

export default function PowerPricesPage() {
  const [zone, setZone] = useState("DK1");
  const [country, setCountry] = useState("DK");

  const prices = useApi<DayAheadPrices>(
    `/prices/day-ahead?country=${country}&zone=${zone}`
  );
  const forecast = useApi<Forecast>(
    `/forecast/day-ahead?country=${country}&zone=${zone}`
  );

  const series = prices.data?.prices ?? [];
  const values = series.map((p) => p.price_eur_mwh);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const range = max - min || 1;
  const average = values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Power Prices</h1>
          <p className="mt-2 text-sm text-slate-400">
            Day-ahead hourly prices, statistics, and model forecast per bidding zone.
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
        <Stat title="Average" value={values.length ? `${average.toFixed(1)} €/MWh` : "—"} />
        <Stat title="Minimum" value={values.length ? `${min.toFixed(1)} €/MWh` : "—"} />
        <Stat title="Maximum" value={values.length ? `${max.toFixed(1)} €/MWh` : "—"} />
        <Stat
          title="Regime"
          value={forecast.data ? capitalize(forecast.data.regime.name) : "—"}
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">
          Hourly Prices {prices.data ? `— ${prices.data.zone}` : ""}
        </h2>
        <div className="mt-6 flex h-72 items-end gap-1 border-b border-slate-800 pb-4">
          {series.length > 0 ? (
            series.map((p) => (
              <div
                key={p.hour}
                className={`flex-1 rounded-t ${barColor(p.price_eur_mwh, min, range)}`}
                style={{
                  height: `${Math.max(((p.price_eur_mwh - min) / range) * 100, 6)}%`,
                }}
                title={`${p.hour} — ${p.price_eur_mwh.toFixed(1)} €/MWh`}
              />
            ))
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
              {prices.error ??
                (prices.isLoading
                  ? "Loading prices..."
                  : "No stored prices for this zone yet — run the ingestion job or seed sample data.")}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Price Table</h2>
          <div className="mt-4 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2">Hour</th>
                  <th className="pb-2 text-right">Price (€/MWh)</th>
                  <th className="pb-2 text-right">vs Average</th>
                </tr>
              </thead>
              <tbody>
                {series.map((p) => (
                  <tr key={p.hour} className="border-t border-slate-800">
                    <td className="py-2 text-slate-300">{p.hour}</td>
                    <td className="py-2 text-right text-slate-200">
                      {p.price_eur_mwh.toFixed(1)}
                    </td>
                    <td
                      className={`py-2 text-right ${
                        p.price_eur_mwh > average ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {(p.price_eur_mwh - average >= 0 ? "+" : "") +
                        (p.price_eur_mwh - average).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Next 24h Forecast</h2>
          {forecast.data ? (
            <>
              <p className="mt-2 text-xs text-slate-500">
                Model {forecast.data.model} · backtest MAE{" "}
                {forecast.data.metrics.mae.toFixed(1)} €/MWh · data source:{" "}
                {forecast.data.data_source}
              </p>
              <div className="mt-4 max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="pb-2">Target hour (UTC)</th>
                      <th className="pb-2 text-right">Predicted (€/MWh)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.data.points.map((p) => (
                      <tr key={p.target_time_utc} className="border-t border-slate-800">
                        <td className="py-2 text-slate-300">
                          {p.target_time_utc.slice(11, 16)}
                        </td>
                        <td className="py-2 text-right text-slate-200">
                          {p.predicted_price_eur_mwh.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              {forecast.error ?? "Loading forecast..."}
            </p>
          )}
        </div>
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

function barColor(price: number, min: number, range: number) {
  const position = (price - min) / range;
  if (position > 0.66) return "bg-red-500";
  if (position < 0.33) return "bg-green-500";
  return "bg-blue-500";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
