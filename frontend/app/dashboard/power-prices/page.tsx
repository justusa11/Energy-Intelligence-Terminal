"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useDataQuality } from "@/hooks/useDataQuality";
import { useMarketScope } from "@/hooks/useMarketScope";
import { useRiskStatus } from "@/hooks/useRiskStatus";
import { DataTruthBadge } from "@/components/DataTruthBadge";
import { ZoneSelect } from "@/components/ZoneSelect";
import { getRequestTruth } from "@/lib/dataTruth";
import type { DayAheadPrices, HourlyPrice } from "@/types/prices";
import type { Forecast, Screener } from "@/types/terminal";

export default function PowerPricesPage() {
  const { country, setZone, zone } = useMarketScope();
  const [selectedPriceIndex, setSelectedPriceIndex] = useState<number | null>(null);

  const prices = useApi<DayAheadPrices>(
    `/prices/day-ahead?country=${country}&zone=${zone}`
  );
  const forecast = useApi<Forecast>(
    `/forecast/day-ahead?country=${country}&zone=${zone}`
  );
  const screener = useApi<Screener>(
    `/screener/opportunities?country=${country}&zone=${zone}`
  );
  const dataQuality = useDataQuality(country, zone);
  const risk = useRiskStatus(country, zone);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSelectedPriceIndex(null));
    return () => window.cancelAnimationFrame(frame);
  }, [country, zone]);

  const series = prices.data?.prices ?? [];
  const priceRange = getPriceRangeLabel(series);
  const selectedPrice =
    selectedPriceIndex === null ? null : series[selectedPriceIndex] ?? null;
  const values = series.map((p) => p.price_eur_mwh);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const range = max - min || 1;
  const average = values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
  const cheapest = getCheapest(series);
  const mostExpensive = getMostExpensive(series);
  const cheapWindow = cheapest
    ? formatPriceTimestamp(cheapest, "table")
    : screener.data?.cheapest_hours[0]?.hour;
  const expensiveWindow =
    mostExpensive
      ? formatPriceTimestamp(mostExpensive, "table")
      : screener.data?.most_expensive_hours[0]?.hour;
  const recommendation = getRecommendation(zone, cheapWindow, expensiveWindow, screener.data);
  const trustStatus = getTrustStatus(dataQuality.data?.status, risk.data?.status);
  const spread =
    mostExpensive && cheapest
      ? mostExpensive.price_eur_mwh - cheapest.price_eur_mwh
      : null;
  const priceTruth = getRequestTruth({
    error: prices.error,
    isLoading: prices.isLoading,
    source: prices.data?.data_source,
  });
  const forecastTruth = getRequestTruth({
    error: forecast.error,
    isLoading: forecast.isLoading,
    source: forecast.data?.data_source,
  });

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
            setZone(z, c);
            setSelectedPriceIndex(null);
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Operator Recommendation</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              {recommendation}
            </p>
          </div>
          <span className={`rounded px-2 py-1 text-xs font-semibold ${trustClass(trustStatus)}`}>
            {trustStatus}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <ActionCard
            title="Cheap window"
            value={cheapWindow ?? "Loading..."}
            detail={cheapest ? `${cheapest.price_eur_mwh.toFixed(1)} €/MWh` : "Waiting for prices"}
          />
          <ActionCard
            title="Expensive window"
            value={expensiveWindow ?? "Loading..."}
            detail={mostExpensive ? `${mostExpensive.price_eur_mwh.toFixed(1)} €/MWh` : "Waiting for prices"}
          />
          <ActionCard
            title="Trust gate"
            value={trustStatus}
            detail={getTrustDetail(dataQuality.data?.status, risk.data?.status)}
          />
          <ActionCard
            title="Forecast confidence"
            value={forecast.data ? `${Math.round(forecast.data.confidence * 100)}%` : "Loading..."}
            detail={forecast.data?.drivers[0] ?? "Waiting for model confidence"}
          />
          <ActionCard
            title="Data source"
            value={priceTruth.label}
            detail={priceTruth.detail}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <DataTruthBadge truth={priceTruth} />
          <DataTruthBadge truth={forecastTruth} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Hourly Prices {prices.data ? `— ${prices.data.zone}` : ""}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {priceRange
                ? `${priceRange} · times shown in UTC`
                : "Click an hour to inspect price, position versus average, and dispatch signal."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => exportPriceCsv(series, zone)}
            disabled={series.length === 0}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export price CSV
          </button>
        </div>
        <div className="mt-6 flex h-72 items-end gap-1 border-b border-slate-800 pb-4">
          {series.length > 0 ? (
            series.map((p, index) => (
              <button
                type="button"
                key={`${p.hour}-${index}`}
                aria-label={`Select ${formatPriceTimestamp(p, "long")} price ${p.price_eur_mwh.toFixed(1)} €/MWh`}
                onClick={() => setSelectedPriceIndex(index)}
                className={`flex-1 rounded-t transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  selectedPriceIndex === index
                    ? "ring-2 ring-white"
                    : ""
                } ${barColor(p.price_eur_mwh, min, range)}`}
                style={{
                  height: `${Math.max(((p.price_eur_mwh - min) / range) * 100, 6)}%`,
                }}
                title={`${formatPriceTimestamp(p, "long")} — ${p.price_eur_mwh.toFixed(1)} €/MWh`}
              />
            ))
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
              {prices.error ??
                (prices.isLoading
                  ? "Loading prices..."
                  : "No prices available for this zone yet.")}
            </div>
          )}
        </div>
        {selectedPrice && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
            Selected hour: <span className="text-white">{formatPriceTimestamp(selectedPrice, "long")}</span>{" "}
            at{" "}
            <span className="font-semibold text-blue-300">
              {selectedPrice.price_eur_mwh.toFixed(1)} €/MWh
            </span>
            <span className="ml-2 text-slate-500">
              ({selectedPrice.price_eur_mwh >= average ? "+" : ""}
              {(selectedPrice.price_eur_mwh - average).toFixed(1)} vs average)
            </span>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Price Table</h2>
          <p className="mt-2 text-xs text-slate-500">
            Spread {spread === null ? "loading" : `${spread.toFixed(1)} €/MWh`} · cheap hours are green, expensive hours are red.
          </p>
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
                {series.map((p, index) => (
                  <tr key={`${p.hour}-${index}`} className="border-t border-slate-800">
                    <td className="py-2 text-slate-300">{formatPriceTimestamp(p, "table")}</td>
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
                {forecast.data.metrics.mae.toFixed(1)} €/MWh · {forecastTruth.label}
              </p>
              <div className="mt-4 grid gap-2">
                {forecast.data.drivers.slice(0, 3).map((driver) => (
                  <p key={driver} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
                    {driver}
                  </p>
                ))}
              </div>
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

function ActionCard({
  detail,
  title,
  value,
}: {
  detail: string;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
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

function getCheapest(prices: HourlyPrice[]) {
  return prices.reduce<HourlyPrice | null>(
    (selected, price) =>
      !selected || price.price_eur_mwh < selected.price_eur_mwh ? price : selected,
    null
  );
}

function getMostExpensive(prices: HourlyPrice[]) {
  return prices.reduce<HourlyPrice | null>(
    (selected, price) =>
      !selected || price.price_eur_mwh > selected.price_eur_mwh ? price : selected,
    null
  );
}

function getRecommendation(
  zone: string,
  cheapWindow?: string,
  expensiveWindow?: string,
  screener?: Screener | null
) {
  const opportunity = screener?.opportunities[0]?.detail;
  if (opportunity) {
    return opportunity;
  }

  if (cheapWindow && expensiveWindow) {
    return `${zone} price risk is elevated around ${expensiveWindow}. Shift flexible demand toward ${cheapWindow} where operationally safe.`;
  }

  return "Loading price recommendation...";
}

function getTrustStatus(dataQuality?: string, risk?: string) {
  if (dataQuality === "FAILED" || risk === "CRITICAL") return "BLOCKED";
  if (dataQuality === "WARNING" || risk === "WARN") return "WARNING";
  if (dataQuality === "OK" || risk === "SAFE") return "SAFE";
  return "CHECKING";
}

function getTrustDetail(dataQuality?: string, risk?: string) {
  return `Data ${dataQuality ?? "checking"} · Risk ${risk ?? "checking"}`;
}

function trustClass(status: string) {
  if (status === "SAFE") return "bg-green-500/10 text-green-300";
  if (status === "WARNING") return "bg-amber-500/10 text-amber-300";
  if (status === "BLOCKED") return "bg-red-500/10 text-red-300";
  return "bg-slate-800 text-slate-300";
}

function exportPriceCsv(series: HourlyPrice[], zone: string) {
  if (series.length === 0) return;
  const rows = [
    "timestamp_utc,hour,price_eur_mwh",
    ...series.map((point) => `${point.timestamp_utc},${point.hour},${point.price_eur_mwh}`),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `power-prices-${zone}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function barColor(price: number, min: number, range: number) {
  const position = (price - min) / range;
  if (position > 0.66) return "bg-red-500";
  if (position < 0.33) return "bg-green-500";
  return "bg-blue-500";
}

function getPriceRangeLabel(prices: HourlyPrice[]) {
  const first = prices[0];
  const last = prices[prices.length - 1];
  if (!first || !last) return null;
  return `${formatPriceTimestamp(first, "date")} to ${formatPriceTimestamp(last, "date")}`;
}

function formatPriceTimestamp(point: HourlyPrice, mode: "date" | "long" | "table") {
  const date = new Date(point.timestamp_utc);
  if (Number.isNaN(date.getTime())) return point.hour;

  if (mode === "date") {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  if (mode === "table") {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "UTC",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
