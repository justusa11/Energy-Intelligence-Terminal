"use client";

import { useMemo, useState } from "react";
import { DataTruthBadge } from "@/components/DataTruthBadge";
import { EnergyInfrastructureMap } from "@/components/maps/EnergyInfrastructureMap";
import { GridTelemetryStrip } from "@/components/GridTelemetryStrip";
import { useGisAssets } from "@/hooks/useGisAssets";
import { useMarketScope } from "@/hooks/useMarketScope";
import { getRequestTruth } from "@/lib/dataTruth";
import { assetStyles, sampleAssets, sampleLinks, type AssetType } from "@/lib/sampleGis";
import {
  corridorGridStates,
  getZoneGridState,
  utilization,
  zoneGridStates,
} from "@/lib/gridState";

const numberFormatter = new Intl.NumberFormat("en-US");
const COUNTRY_NAMES: Record<string, string> = {
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  CH: "Switzerland",
  CZ: "Czechia",
  DE: "Germany",
  DK: "Denmark",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "Great Britain",
  GR: "Greece",
  HU: "Hungary",
  IT: "Italy",
  JP: "Japan",
  NL: "Netherlands",
  NO: "Norway",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SE: "Sweden",
  SK: "Slovakia",
  US: "United States",
};

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatMw(value: number) {
  return `${formatNumber(value)} MW`;
}

export default function InfrastructureMapPage() {
  const { zone } = useMarketScope();
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState<AssetType | "all">("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const { data: gisData, error: gisError, isLoading: gisLoading } = useGisAssets(filter);
  const rawAssets = gisData?.assets.length ? gisData.assets : sampleAssets;
  const assets = useMemo(
    () =>
      rawAssets.filter((asset) => {
        const fuelMatches = fuelFilter === "all" || asset.fuel_type === fuelFilter;
        const countryMatches = countryFilter === "all" || asset.country === countryFilter;
        return fuelMatches && countryMatches;
      }),
    [countryFilter, fuelFilter, rawAssets]
  );
  const links = gisData?.links.length ? gisData.links : sampleLinks;
  const countries = useMemo(() => getCountries(rawAssets), [rawAssets]);
  const fuelMix = useMemo(() => getFuelMix(assets), [assets]);
  const fuelOptions = useMemo(() => getFuelOptions(rawAssets), [rawAssets]);
  const largestVisible = useMemo(
    () =>
      [...assets]
        .filter((asset) => asset.type === "power_plant")
        .sort((a, b) => (b.capacity_mw ?? 0) - (a.capacity_mw ?? 0))
        .slice(0, 6),
    [assets]
  );

  const selected = assets.find((a) => a.id === active);
  const selectedGridState = selected ? getZoneGridState(selected.id) : undefined;
  const system = getSystemSummary(assets);
  const gisTruth = getRequestTruth({
    error: gisError,
    isLoading: gisLoading,
    source: gisData?.data_source ?? (!gisLoading ? "frontend_fallback" : undefined),
  });
  const topCorridors = Object.values(corridorGridStates)
    .sort((a, b) => utilization(b) - utilization(a))
    .slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <h1 className="text-3xl font-semibold tracking-tight">Global Grid Cockpit</h1>
        <p className="mt-2 text-sm text-slate-400">
          Power-system view for prices, flows, balance, congestion, and trading signals.
        </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DataTruthBadge truth={gisTruth} />
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">System balance</p>
            <p className={`text-lg font-semibold ${system.netBalanceMw >= 0 ? "text-green-400" : "text-blue-300"}`}>
              {system.netBalanceMw >= 0 ? "+" : ""}
              {formatMw(system.netBalanceMw)}
            </p>
          </div>
        </div>
      </div>

      <GridTelemetryStrip
        zone={zone}
        items={[
          { label: "Avg price", value: `${system.averagePriceEurMwh} €/MWh`, tone: "blue" },
          { label: "Load", value: formatMw(system.totalLoadMw), tone: "slate" },
          { label: "Generation", value: formatMw(system.totalGenerationMw), tone: "green" },
          { label: "Constrained", value: `${system.constrainedCorridors} corridors`, tone: system.constrainedCorridors > 0 ? "amber" : "green" },
          { label: "Frequency", value: `${system.averageFrequencyHz.toFixed(3)} Hz`, tone: "green" },
        ]}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SystemMetric label="Renewables" value={`${system.renewableShare}%`} />
        <SystemMetric label="Flow capacity used" value={`${system.averageUtilization}%`} />
        <SystemMetric label="Arbitrage score" value={`${system.averageArbitrageScore}/100`} />
        <SystemMetric label="Visible assets" value={`${assets.length}`} />
        <SystemMetric label="Data age" value={`${system.maxDataAgeMinutes} min`} />
      </section>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
        <span className="font-medium text-slate-200">
          {gisLoading ? "Loading global fleet..." : `${assets.length} mapped assets`}
        </span>
        <span>{gisTruth.label}</span>
        {gisError && <span className="text-amber-300">{gisError}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterButton label="All" active={filter === "all"} onClick={() => setFilter("all")} />
        {(Object.keys(assetStyles) as AssetType[]).map((t) => (
          <FilterButton
            key={t}
            label={assetStyles[t].label}
            color={assetStyles[t].color}
            active={filter === t}
            onClick={() => setFilter(t)}
          />
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Fleet controls</h2>
              <p className="mt-1 text-xs text-slate-500">Filter the visible global fleet by country and fuel.</p>
            </div>
            <label className="text-xs uppercase tracking-wide text-slate-500">
              Country
              <select
                aria-label="Country filter"
                value={countryFilter}
                onChange={(event) => {
                  setCountryFilter(event.target.value);
                  setFuelFilter("all");
                  setActive(null);
                }}
                className="mt-1 block min-w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100"
              >
                <option value="all">All countries</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <FilterButton label="All fuels" active={fuelFilter === "all"} onClick={() => setFuelFilter("all")} />
            {fuelOptions.map((fuel) => (
              <FilterButton
                key={fuel}
                label={fuelLabel(fuel)}
                color={fuelColor(fuel)}
                active={fuelFilter === fuel}
                onClick={() => {
                  setFuelFilter(fuel);
                  setActive(null);
                }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Fuel mix</h2>
          <div className="mt-3 space-y-2">
            {fuelMix.slice(0, 5).map((item) => (
              <div key={item.fuel} className="flex items-center justify-between rounded-md bg-slate-950 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fuelColor(item.fuel) }} />
                  {formatMw(item.capacityMw)} {item.fuel}
                </span>
                <span className="text-slate-500">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div>
          <EnergyInfrastructureMap
            active={active}
            assets={assets}
            filter={filter}
            links={links}
            onSelect={(asset) => setActive(asset.id)}
          />
        </div>

        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Grid Inspector</h2>
            {selectedGridState && (
              <span className={`rounded px-2 py-1 text-xs font-semibold ${riskClass(selectedGridState.congestionRisk)}`}>
                {selectedGridState.congestionRisk.toUpperCase()}
              </span>
            )}
          </div>
          {selected ? (
            <div className="mt-4 space-y-4">
              <p className="text-lg font-medium text-white">{selected.name}</p>
              <span
                className="inline-block rounded px-2 py-1 text-xs"
                style={{
                  backgroundColor: `${assetStyles[selected.type].color}22`,
                  color: assetStyles[selected.type].color,
                }}
              >
                {assetStyles[selected.type].label}
              </span>
              <p className="text-sm text-slate-400">{selected.detail}</p>
              <p className="text-xs text-slate-500">
                {selected.lat.toFixed(2)}°N, {selected.lon.toFixed(2)}°E
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InspectorMetric label="Country" value={selected.country ?? selected.zone ?? "n/a"} />
                <InspectorMetric label="Capacity" value={selected.capacity_mw ? formatMw(selected.capacity_mw) : "n/a"} />
                <InspectorMetric label="Fuel" value={selected.fuel_type ?? "n/a"} />
                <InspectorMetric label="Operator" value={selected.operator ?? "n/a"} />
              </div>
              {selectedGridState && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <InspectorMetric label="Price" value={`${selectedGridState.priceEurMwh} €/MWh`} />
                    <InspectorMetric label="Frequency" value={`${selectedGridState.frequencyHz.toFixed(3)} Hz`} />
                    <InspectorMetric label="Load" value={formatMw(selectedGridState.loadMw)} />
                    <InspectorMetric label="Generation" value={formatMw(selectedGridState.generationMw)} />
                    <InspectorMetric label="Net position" value={`${selectedGridState.netPositionMw > 0 ? "+" : ""}${selectedGridState.netPositionMw} MW`} />
                    <InspectorMetric label="Renewables" value={`${Math.round(selectedGridState.renewableShare * 100)}%`} />
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Trading signal
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Battery arbitrage score{" "}
                      <span className="font-semibold text-blue-300">
                        {selectedGridState.batteryArbitrageScore}/100
                      </span>
                      . {signalCopy(selectedGridState.batteryArbitrageScore, selectedGridState.congestionRisk)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Data freshness
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Latest grid sample is {selectedGridState.dataAgeMinutes} minutes old.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-slate-400">
                Select a market zone to inspect asset-level economics. System-level grid stress is shown below.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InspectorMetric label="Avg price" value={`${system.averagePriceEurMwh} €/MWh`} />
                <InspectorMetric label="Net balance" value={`${system.netBalanceMw >= 0 ? "+" : ""}${system.netBalanceMw} MW`} />
                <InspectorMetric label="Load" value={formatMw(system.totalLoadMw)} />
                <InspectorMetric label="Generation" value={formatMw(system.totalGenerationMw)} />
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Operator summary
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {system.constrainedCorridors} corridors are above 85% utilization. Average arbitrage score is{" "}
                  <span className="font-semibold text-blue-300">{system.averageArbitrageScore}/100</span>.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Largest plants visible</p>
            <div className="mt-3 space-y-2">
              {largestVisible.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  aria-label={`Select plant ${asset.name}`}
                  onClick={() => setActive(asset.id)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-left text-sm transition hover:border-blue-500"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-200">{asset.name}</span>
                    <span className="text-slate-500">{asset.capacity_mw ? formatMw(asset.capacity_mw) : "n/a"}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {asset.country ?? "n/a"} · {asset.fuel_type ?? "unknown"} · {asset.operator ?? "operator n/a"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Most constrained paths</p>
            <div className="mt-3 space-y-2">
              {topCorridors.map((corridor) => (
                <div key={corridor.linkId} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-200">{corridor.linkId}</span>
                    <span className={utilization(corridor) >= 0.85 ? "text-red-400" : "text-amber-400"}>
                      {Math.round(utilization(corridor) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={utilization(corridor) >= 0.85 ? "h-full bg-red-400" : "h-full bg-amber-400"}
                      style={{ width: `${Math.min(100, Math.round(utilization(corridor) * 100))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatNumber(corridor.flowMw)} / {formatMw(corridor.capacityMw)} · rent {formatNumber(corridor.congestionRentEurH)} €/h
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Legend</p>
            <div className="mt-3 space-y-2">
              {(Object.keys(assetStyles) as AssetType[]).map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-slate-400">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: assetStyles[t].color }}
                  />
                  {assetStyles[t].label}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function getSystemSummary(assets = sampleAssets) {
  const zones = Object.values(zoneGridStates);
  const corridors = Object.values(corridorGridStates);
  const mappedCapacityMw = Math.round(
    assets.reduce((sum, item) => sum + (item.capacity_mw ?? 0), 0)
  );
  const totalLoadMw = zones.reduce((sum, item) => sum + item.loadMw, 0);
  const totalGenerationMw =
    mappedCapacityMw > 0
      ? mappedCapacityMw
      : zones.reduce((sum, item) => sum + item.generationMw, 0);
  const totalRenewableMw = zones.reduce(
    (sum, item) => sum + item.generationMw * item.renewableShare,
    0
  );
  const averagePriceEurMwh = Math.round(
    zones.reduce((sum, item) => sum + item.priceEurMwh, 0) / zones.length
  );
  const averageFrequencyHz =
    zones.reduce((sum, item) => sum + item.frequencyHz, 0) / zones.length;
  const averageArbitrageScore = Math.round(
    zones.reduce((sum, item) => sum + item.batteryArbitrageScore, 0) / zones.length
  );
  const averageUtilization = Math.round(
    (corridors.reduce((sum, item) => sum + utilization(item), 0) / corridors.length) * 100
  );

  return {
    averageArbitrageScore,
    averageFrequencyHz,
    averagePriceEurMwh,
    averageUtilization,
    constrainedCorridors: corridors.filter((item) => utilization(item) >= 0.85).length,
    maxDataAgeMinutes: Math.max(...zones.map((item) => item.dataAgeMinutes)),
    netBalanceMw: totalGenerationMw - totalLoadMw,
    renewableShare: Math.round((totalRenewableMw / totalGenerationMw) * 100),
    totalGenerationMw,
    totalLoadMw,
  };
}

function SystemMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function riskClass(risk: string) {
  if (risk === "high") return "bg-red-500/10 text-red-400";
  if (risk === "medium") return "bg-amber-500/10 text-amber-400";
  return "bg-green-500/10 text-green-400";
}

function getCountries(assets: typeof sampleAssets) {
  return Array.from(new Set(assets.map((asset) => asset.country).filter(Boolean)))
    .map((code) => ({ code: code as string, name: COUNTRY_NAMES[code as string] ?? (code as string) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getFuelOptions(assets: typeof sampleAssets) {
  return Array.from(new Set(assets.map((asset) => asset.fuel_type).filter(Boolean)))
    .map((fuel) => fuel as string)
    .sort((a, b) => a.localeCompare(b));
}

function getFuelMix(assets: typeof sampleAssets) {
  const totals = new Map<string, { capacityMw: number; count: number; fuel: string }>();
  for (const asset of assets) {
    const fuel = asset.fuel_type ?? "unknown";
    const existing = totals.get(fuel) ?? { capacityMw: 0, count: 0, fuel };
    existing.capacityMw += asset.capacity_mw ?? 0;
    existing.count += 1;
    totals.set(fuel, existing);
  }
  return Array.from(totals.values()).sort((a, b) => b.capacityMw - a.capacityMw);
}

function fuelLabel(fuel: string) {
  return fuel.charAt(0).toUpperCase() + fuel.slice(1);
}

function fuelColor(fuel: string) {
  const colors: Record<string, string> = {
    biomass: "#84cc16",
    coal: "#64748b",
    gas: "#fb923c",
    hydro: "#38bdf8",
    lignite: "#ef4444",
    nuclear: "#818cf8",
    solar: "#fbbf24",
    wind: "#22d3ee",
  };
  return colors[fuel] ?? "#cbd5e1";
}

function signalCopy(score: number, risk: string) {
  if (score >= 85) return "High spread value: prioritize storage and congestion-aware dispatch.";
  if (risk === "high") return "Congestion is elevated: validate interconnector exposure before dispatch.";
  return "Moderate opportunity: keep flexible assets available for next price window.";
}

function FilterButton({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
        active
          ? "border-blue-500 bg-blue-600/20 text-white"
          : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"
      }`}
    >
      {color && (
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      )}
      {label}
    </button>
  );
}
