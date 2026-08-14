"use client";

import { useEffect, useState } from "react";
import { ZoneSelect } from "@/components/ZoneSelect";
import { DecisionBrief } from "@/components/DecisionBrief";
import { useDataQuality } from "@/hooks/useDataQuality";
import { DataQualityStatusCard } from "@/components/cards/DataQualityStatusCard";
import { useIngestionStatus } from "@/hooks/useIngestionStatus";
import { useMarketOverview } from "@/hooks/useMarketOverview";
import { useMarketScope } from "@/hooks/useMarketScope";
import { usePowerPrices } from "@/hooks/usePowerPrices";
import { useRiskStatus } from "@/hooks/useRiskStatus";
import type { HourlyPrice } from "@/types/prices";

export default function MarketCockpitPage() {
  const { country, setZone, zone } = useMarketScope();
  const [selectedPriceIndex, setSelectedPriceIndex] = useState<number | null>(null);
  const market = useMarketOverview(country, zone);
  const prices = usePowerPrices(country, zone);
  const risk = useRiskStatus(country, zone);

  const priceSeries = prices.data?.prices ?? [];
  const peakPrice = getPeakPrice(priceSeries);
  const cheapestPrice = getCheapestPrice(priceSeries);
  const highPriceWindow = getPriceWindow(priceSeries, "high");
  const lowPriceWindow = getPriceWindow(priceSeries, "low");
  const priceSpread =
    peakPrice && cheapestPrice
      ? peakPrice.price_eur_mwh - cheapestPrice.price_eur_mwh
      : null;
  const chartScale = getChartScale(priceSeries);
  const chartTicks = getChartTicks(priceSeries);
  const chartRange = getPriceRangeLabel(priceSeries);
  const dataQuality = useDataQuality(country, zone);
  const ingestion = useIngestionStatus(country, zone);
  const selectedPrice =
    selectedPriceIndex === null ? null : priceSeries[selectedPriceIndex] ?? null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSelectedPriceIndex(null));
    return () => window.cancelAnimationFrame(frame);
  }, [country, zone]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Market Cockpit
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            AI-powered energy market overview, recommendations, and risk status.
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric 
          title="Average Price" 
          value={
            market.data
              ? formatPrice(market.data.average_price_eur_mwh)
              : "Loading..."
          } 
          change={formatZone(market.data?.country, market.data?.zone)}
        />
        <Metric 
          title="Peak Price" 
          value={
            peakPrice
              ? formatPrice(peakPrice.price_eur_mwh)
              : market.data
              ? formatPrice(market.data.peak_price_eur_mwh)
              : "Loading..."
          } 
          change={peakPrice ? formatPriceTimestamp(peakPrice, "short") : "Loading..."}
        />
        <Metric 
          title="Cheapest Hour" 
          value={cheapestPrice ? formatPriceTimestamp(cheapestPrice, "short") : market.data?.cheapest_hour ?? "Loading..."} 
          change={cheapestPrice ? formatPrice(cheapestPrice.price_eur_mwh) : "Loading..."}
        />
        <Metric 
          title="Market Regime" 
          value={market.data?.market_regime ?? "Loading..."} 
          change={
            market.data
              ? `Confidence ${Math.round(market.data.regime_confidence * 100)}%`
              : "Loading..."
          }
          warning 
        />
        <Metric 
          title="Risk Status" 
          value={risk.data?.status ?? "Loading..."} 
          change={
            risk.data
              ? `${risk.data.checks.length} checks loaded`
              : "Loading..."
          }
          safe={risk.data?.status === "SAFE"} 
        />
      </section>

      <DecisionBrief
        dataQuality={dataQuality.data}
        highPriceWindow={highPriceWindow}
        lowPriceWindow={lowPriceWindow}
        priceSpread={priceSpread}
        risk={risk.data}
      />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Hourly Price Forecast {prices.data ? `- ${prices.data.zone}` : ""}
            </h2>
            {chartRange && (
              <p className="mt-1 text-xs text-slate-500">
                {chartRange} · times shown in UTC
              </p>
            )}
            <button
              type="button"
              onClick={() => exportPriceCsv(priceSeries, zone)}
              disabled={priceSeries.length === 0}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>
          <div className="mt-6 flex h-80 items-end gap-2 border-b border-slate-800 pb-4">
            {priceSeries.length > 0 ? (
              priceSeries.map((price, index) => (
                <button
                  type="button"
                  key={`${price.hour}-${index}`}
                  onClick={() => setSelectedPriceIndex(index)}
                  className={`flex-1 rounded-t transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    selectedPriceIndex === index ? "ring-2 ring-white" : ""
                  } ${getPriceBarColor(
                    price.price_eur_mwh,
                    chartScale
                  )}`}
                  style={{ height: `${getPriceBarHeight(price.price_eur_mwh, chartScale)}%` }}
                  title={`${formatPriceTimestamp(price, "long")} - ${formatPrice(price.price_eur_mwh)}`}
                />
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                {prices.error ?? "Loading price forecast..."}
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            {chartTicks.map((tick, index) => (
              <span key={`${tick}-${index}`}>{tick}</span>
            ))}
          </div>
          {selectedPrice && (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
              Selected hour: <span className="text-white">{formatPriceTimestamp(selectedPrice, "long")}</span>{" "}
              at{" "}
              <span className="font-semibold text-blue-300">
                {formatPrice(selectedPrice.price_eur_mwh)}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">AI Recommendation</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {market.data?.recommendation ?? market.error ?? "Loading recommendation..."}
          </p>

          <div className="mt-5 space-y-3 text-sm">
            <Action label="Low-price window" value={lowPriceWindow ?? "Loading..."} />
            <Action label="High-price window" value={highPriceWindow ?? "Loading..."} />
            <Action label="Market regime" value={market.data?.market_regime ?? "Loading..."} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MiniMetric title="Confidence" value={formatPercent(market.data?.regime_confidence)} />
            <MiniMetric title="Risk Status" value={risk.data?.status ?? "Loading..."} />
            <MiniMetric title="Price Spread" value={priceSpread === null ? "Loading..." : formatPrice(priceSpread)} />
            <MiniMetric title="Price Points" value={prices.data ? String(prices.data.prices.length) : "Loading..."} />
          </div>
          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
            <p className="font-semibold text-slate-300">Ingestion status</p>
            <p className="mt-1">
              Prices: {ingestion.data?.jobs.price_ingestion.status ?? "checking"} · Weather:{" "}
              {ingestion.data?.jobs.weather_ingestion.status ?? "checking"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Price Signal Windows</h2>
          <div className="mt-4 space-y-3 text-sm">
            {priceSeries.length > 0 ? (
              <>
                <ScheduleRow
                  time={lowPriceWindow ?? "Unavailable"}
                  signal="Lowest prices"
                  value={cheapestPrice ? formatPrice(cheapestPrice.price_eur_mwh) : "Unavailable"}
                />
                <ScheduleRow
                  time={highPriceWindow ?? "Unavailable"}
                  signal="Highest prices"
                  value={peakPrice ? formatPrice(peakPrice.price_eur_mwh) : "Unavailable"}
                />
              </>
            ) : (
              <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-500">
                {prices.error ?? "Loading price signal windows..."}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Risk Monitor</h2>
          <div className="mt-4 space-y-3 text-sm">
            {risk.data ? (
              <>
                {risk.data.checks.map((check, index) => (
                  <RiskCheck
                    key={`${check.name}-${index}`}
                    text={check.name}
                    status={check.status}
                    severity={check.severity}
                  />
                ))}
                <DataQualityStatusCard
                  data={dataQuality.data}
                  isLoading={dataQuality.isLoading}
                  error={dataQuality.error}
                />
              </>
            ) : (
              <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-500">
                {risk.error ?? "Loading risk checks..."}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
  title,
  value,
  change,
  warning,
  safe,
}: {
  title: string;
  value: string;
  change: string;
  warning?: boolean;
  safe?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          warning ? "text-amber-400" : safe ? "text-green-400" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{change}</p>
    </div>
  );
}

function MiniMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Action({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-300">
      <span className="text-slate-500">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

function ScheduleRow({
  time,
  signal,
  value,
}: {
  time: string;
  signal: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
      <span className="text-slate-400">{time}</span>
      <span className="font-medium text-amber-400">{signal}</span>
      <span className="text-slate-300">{value}</span>
    </div>
  );
}

function RiskCheck({
  text,
  status,
  severity,
}: {
  text: string;
  status: string;
  severity: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
      <span>
        <span className="text-slate-300">{text}</span>
        <span className="ml-2 text-xs text-slate-500">{severity}</span>
      </span>
      <span className={`rounded px-2 py-1 text-xs font-medium ${getRiskStatusClass(status)}`}>
        {status}
      </span>
    </div>
  );
}

function formatPrice(value: number) {
  return `${value.toFixed(1)} EUR/MWh`;
}

function formatPercent(value?: number) {
  return value === undefined ? "Loading..." : `${Math.round(value * 100)}%`;
}

function formatZone(country?: string, zone?: string) {
  return country && zone ? `${country} / ${zone}` : "Loading...";
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
  anchor.download = `prices-${zone}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getPeakPrice(prices: HourlyPrice[]) {
  return prices.reduce<HourlyPrice | null>(
    (peak, price) => (!peak || price.price_eur_mwh > peak.price_eur_mwh ? price : peak),
    null
  );
}

function getCheapestPrice(prices: HourlyPrice[]) {
  return prices.reduce<HourlyPrice | null>(
    (cheapest, price) =>
      !cheapest || price.price_eur_mwh < cheapest.price_eur_mwh ? price : cheapest,
    null
  );
}

function getPriceWindow(prices: HourlyPrice[], kind: "high" | "low") {
  const selected = kind === "high" ? getPeakPrice(prices) : getCheapestPrice(prices);
  return selected ? formatPriceTimestamp(selected, "short") : null;
}

function getChartScale(prices: HourlyPrice[]) {
  if (prices.length === 0) {
    return { min: 0, max: 0, range: 1 };
  }

  const values = prices.map((price) => price.price_eur_mwh);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return { min, max, range };
}

function getChartTicks(prices: HourlyPrice[]) {
  if (prices.length === 0) {
    return [];
  }

  const firstPoint = prices[0];
  const middlePoint = prices[Math.floor(prices.length / 2)];
  const lastPoint = prices[prices.length - 1];
  const first = firstPoint ? formatPriceTimestamp(firstPoint, "tick") : undefined;
  const middle = middlePoint ? formatPriceTimestamp(middlePoint, "tick") : undefined;
  const last = lastPoint ? formatPriceTimestamp(lastPoint, "tick") : undefined;

  return [first, middle, last].filter((tick): tick is string => Boolean(tick));
}

function getPriceRangeLabel(prices: HourlyPrice[]) {
  const first = prices[0];
  const last = prices[prices.length - 1];
  if (!first || !last) return null;
  return `${formatPriceTimestamp(first, "date")} to ${formatPriceTimestamp(last, "date")}`;
}

function formatPriceTimestamp(point: HourlyPrice, mode: "date" | "long" | "short" | "tick") {
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

  if (mode === "tick") {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "UTC",
    }).format(date);
  }

  if (mode === "short") {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
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

function getPriceBarHeight(price: number, scale: { min: number; range: number }) {
  const relativeHeight = ((price - scale.min) / scale.range) * 100;
  return Math.max(relativeHeight, 8);
}

function getPriceBarColor(price: number, scale: { min: number; range: number }) {
  const position = (price - scale.min) / scale.range;

  if (position > 0.66) {
    return "bg-red-500";
  }

  if (position < 0.33) {
    return "bg-green-500";
  }

  return "bg-blue-500";
}

function getRiskStatusClass(status: string) {
  if (status === "OK") {
    return "bg-green-500/10 text-green-400";
  }

  if (status === "WARN") {
    return "bg-amber-500/10 text-amber-400";
  }

  return "bg-red-500/10 text-red-400";
}
