"use client";

import { useDataQuality } from "@/hooks/useDataQuality";
import { DataQualityStatusCard } from "@/components/cards/DataQualityStatusCard";
import { useMarketOverview } from "@/hooks/useMarketOverview";
import { usePowerPrices } from "@/hooks/usePowerPrices";
import { useRiskStatus } from "@/hooks/useRiskStatus";
import type { HourlyPrice } from "@/types/prices";

export default function MarketCockpitPage() {
  const market = useMarketOverview();
  const prices = usePowerPrices();
  const risk = useRiskStatus();

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
  const dataQuality = useDataQuality("DK", "DK1");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Market Cockpit
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          AI-powered energy market overview, recommendations, and risk status.
        </p>
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
          change={peakPrice?.hour ?? "Loading..."}
        />
        <Metric 
          title="Cheapest Hour" 
          value={market.data?.cheapest_hour ?? "Loading..."} 
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            Hourly Price Forecast {prices.data ? `- ${prices.data.zone}` : ""}
          </h2>
          <div className="mt-6 flex h-80 items-end gap-2 border-b border-slate-800 pb-4">
            {priceSeries.length > 0 ? (
              priceSeries.map((price) => (
                <div
                  key={price.hour}
                  className={`flex-1 rounded-t ${getPriceBarColor(
                    price.price_eur_mwh,
                    chartScale
                  )}`}
                  style={{ height: `${getPriceBarHeight(price.price_eur_mwh, chartScale)}%` }}
                  title={`${price.hour} - ${formatPrice(price.price_eur_mwh)}`}
                />
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                {prices.error ?? "Loading price forecast..."}
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            {chartTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
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
                {risk.data.checks.map((check) => (
                  <RiskCheck
                    key={check.name}
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
  return selected?.hour ?? null;
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

  const first = prices[0]?.hour;
  const middle = prices[Math.floor(prices.length / 2)]?.hour;
  const last = prices[prices.length - 1]?.hour;

  return [first, middle, last].filter((tick): tick is string => Boolean(tick));
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
