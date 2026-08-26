"use client";

import { useMemo, useState } from "react";
import { DataTruthBadge } from "@/components/DataTruthBadge";
import { EnergyInfrastructureMap } from "@/components/maps/EnergyInfrastructureMap";
import { GridTelemetryStrip } from "@/components/GridTelemetryStrip";
import { useApi } from "@/hooks/useApi";
import { useGisAssets } from "@/hooks/useGisAssets";
import { useMarketScope } from "@/hooks/useMarketScope";
import { getRequestTruth } from "@/lib/dataTruth";
import { assetStyles, sampleAssets, sampleLinks, type AssetType, type GisAsset, type GisLink } from "@/lib/sampleGis";
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
  EE: "Estonia",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "Great Britain",
  GR: "Greece",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  JP: "Japan",
  LT: "Lithuania",
  LV: "Latvia",
  NL: "Netherlands",
  NO: "Norway",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SE: "Sweden",
  SK: "Slovakia",
  US: "United States",
};
const REGION_COUNTRIES: Record<string, string[]> = {
  europe: [
    "AT",
    "BE",
    "BG",
    "CH",
    "CZ",
    "DE",
    "DK",
    "ES",
    "FI",
    "FR",
    "GB",
    "GR",
    "HU",
    "IT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "SE",
    "SK",
  ],
  nordics: ["DK", "FI", "NO", "SE"],
  baltics: ["EE", "LV", "LT"],
  continental: ["AT", "BE", "CH", "CZ", "DE", "FR", "NL", "PL", "SK"],
  iberia: ["ES", "PT"],
  "uk-ireland": ["GB", "IE"],
  italy: ["IT"],
  balkans: ["BG", "GR", "HU", "RO"],
  ercot: ["US"],
  tokyo: ["JP"],
};

const REGION_LABELS: Record<string, string> = {
  global: "Global operator overview",
  europe: "All Europe grid view",
  nordics: "Nordic power system",
  baltics: "Baltic power system",
  continental: "Continental Europe grid view",
  iberia: "Iberian power system",
  "uk-ireland": "UK/Ireland power system",
  italy: "Italy power system",
  balkans: "Balkan power system",
  ercot: "ERCOT regional view",
  tokyo: "Japan regional view",
};

type MarketContextDriver = {
  category: string;
  label: string;
  score: number;
  level: string;
  explanation: string;
  evidence: string[];
};

type GisAssetContext = {
  asset: GisAsset;
  headline: string;
  what_is_happening: string;
  why_it_matters: string;
  operator_actions: string[];
  risk: {
    level: string;
    driver: string;
    confidence: number;
  };
  market_context: {
    context_level: string;
    dominant_driver: string;
    drivers: MarketContextDriver[];
    scenario_tags: string[];
    data_sources: Record<string, string>;
  };
  related_links: GisLink[];
  data_sources: Record<string, string>;
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
  const [mapRegion, setMapRegion] = useState("global");
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
  const focusedAssets = useMemo(
    () => filterAssetsByMapRegion(assets, mapRegion),
    [assets, mapRegion]
  );
  const largestVisible = useMemo(
    () =>
      [...focusedAssets]
        .filter((asset) => asset.type === "power_plant")
        .sort((a, b) => (b.capacity_mw ?? 0) - (a.capacity_mw ?? 0))
        .slice(0, 6),
    [focusedAssets]
  );
  const mapFocus = useMemo(() => getMapFocusSummary(focusedAssets, mapRegion), [focusedAssets, mapRegion]);

  const selected = assets.find((a) => a.id === active);
  const {
    data: selectedContext,
    error: selectedContextError,
    isLoading: selectedContextLoading,
  } = useApi<GisAssetContext>(
    selected ? `/gis/assets/${encodeURIComponent(selected.id)}/context` : null
  );
  const activeContext = selectedContext?.asset.id === selected?.id ? selectedContext : null;
  const selectedGridState = selected ? getZoneGridState(selected.id) : undefined;
  const selectedContextTruth = getRequestTruth({
    error: selectedContextError,
    isLoading: selectedContextLoading,
    source: activeContext?.data_sources.asset_registry,
  });
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
            onRegionChange={setMapRegion}
            onSelect={(asset) => setActive(asset.id)}
          />
        </div>

        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Grid Inspector</h2>
            {(activeContext?.risk.level || selectedGridState) && (
              <span className={`rounded px-2 py-1 text-xs font-semibold ${riskClass(activeContext?.risk.level ?? selectedGridState?.congestionRisk ?? "low")}`}>
                {(activeContext?.risk.level ?? selectedGridState?.congestionRisk ?? "low").toUpperCase()}
              </span>
            )}
          </div>
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Map focus</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{mapFocus.label}</p>
            <p className="mt-1 text-xs text-slate-500">
              {mapFocus.assets} assets · {formatMw(mapFocus.capacityMw)} mapped capacity
            </p>
          </div>
          {selected ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-medium text-white">{selected.name}</p>
                <DataTruthBadge truth={selectedContextTruth} />
              </div>
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

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">What is this?</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {activeContext?.headline ?? fallbackAssetHeadline(selected)}
                </p>
                <p className="mt-2 text-sm text-slate-400">{selected.detail}</p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">What is happening?</p>
                <p className="mt-2 text-sm text-slate-300">
                  {selectedContextLoading
                    ? "Loading backend market context..."
                    : activeContext?.what_is_happening ?? fallbackWhatIsHappening(selected)}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Why should the operator care?</p>
                <p className="mt-2 text-sm text-slate-300">
                  {activeContext?.why_it_matters ?? fallbackWhyItMatters(selected)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InspectorMetric label="Country" value={selected.country ?? selected.zone ?? "n/a"} />
                <InspectorMetric label="Capacity" value={selected.capacity_mw ? formatMw(selected.capacity_mw) : "n/a"} />
                <InspectorMetric label="Fuel" value={selected.fuel_type ?? "n/a"} />
                <InspectorMetric label="Operator" value={selected.operator ?? "n/a"} />
              </div>
              {activeContext && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <InspectorMetric label="Dominant driver" value={driverLabel(activeContext.risk.driver)} />
                    <InspectorMetric label="Confidence" value={`${Math.round(activeContext.risk.confidence * 100)}%`} />
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Operator actions</p>
                    <div className="mt-3 space-y-2">
                      {activeContext.operator_actions.map((action) => (
                        <p key={action} className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                          {action}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Related corridors</p>
                    <div className="mt-3 space-y-2">
                      {activeContext.related_links.length ? (
                        activeContext.related_links.map((link) => (
                          <div key={link.id} className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-slate-200">{link.name}</span>
                              <span className="text-slate-500">{link.capacity_mw ? formatMw(link.capacity_mw) : "n/a"}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{link.detail ?? "No corridor detail."}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No directly linked corridors are mapped for this asset.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
              {selectedContextError && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                  Backend context unavailable: {selectedContextError}
                </div>
              )}
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
            <p className="text-xs uppercase tracking-wide text-slate-500">Largest plants in focus</p>
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
  if (risk === "high" || risk === "severe") return "bg-red-500/10 text-red-400";
  if (risk === "medium" || risk === "elevated" || risk === "watch") return "bg-amber-500/10 text-amber-400";
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

function filterAssetsByMapRegion(assets: typeof sampleAssets, region: string) {
  const countries = REGION_COUNTRIES[region];
  if (!countries) return assets;
  return assets.filter((asset) => countries.includes(asset.country ?? "") || fallbackRegionMatch(asset, region));
}

function getMapFocusSummary(assets: typeof sampleAssets, region: string) {
  return {
    label: REGION_LABELS[region] ?? "Regional grid view",
    assets: assets.length,
    capacityMw: Math.round(
      assets.reduce((sum, asset) => sum + (asset.capacity_mw ?? 0), 0)
    ),
  };
}

function fallbackRegionMatch(asset: (typeof sampleAssets)[number], region: string) {
  if (region === "europe") return asset.lon > -15 && asset.lon < 45 && asset.lat > 35 && asset.lat < 72;
  if (region === "nordics") return asset.lon > 4 && asset.lon < 32 && asset.lat > 55 && asset.lat < 72;
  if (region === "baltics") return asset.lon > 19 && asset.lon < 30 && asset.lat > 53 && asset.lat < 60;
  if (region === "continental") return asset.lon > -6 && asset.lon < 25 && asset.lat > 43 && asset.lat < 56;
  if (region === "iberia") return asset.lon > -11 && asset.lon < 5 && asset.lat > 35 && asset.lat < 45;
  if (region === "uk-ireland") return asset.lon > -12 && asset.lon < 3 && asset.lat > 49 && asset.lat < 60;
  if (region === "italy") return asset.lon > 6 && asset.lon < 18 && asset.lat > 36 && asset.lat < 47;
  if (region === "balkans") return asset.lon > 13 && asset.lon < 30 && asset.lat > 36 && asset.lat < 47;
  return false;
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

function fallbackAssetHeadline(asset: GisAsset) {
  if (asset.type === "market_zone") return `${asset.name} is the selected market zone.`;
  if (asset.capacity_mw) return `${asset.name} contributes ${formatMw(asset.capacity_mw)} of mapped capacity.`;
  return `${asset.name} is mapped infrastructure.`;
}

function fallbackWhatIsHappening(asset: GisAsset) {
  return `${asset.zone ?? asset.country ?? "This area"} is using local grid-state context until the backend asset context responds.`;
}

function fallbackWhyItMatters(asset: GisAsset) {
  if (asset.fuel_type === "wind") return "Wind output changes residual load and can create export or storage opportunities.";
  if (asset.fuel_type === "gas") return "Gas-fired assets can shape marginal prices during low-renewable or high-demand periods.";
  if (asset.fuel_type === "nuclear") return "Large nuclear assets matter because outages remove substantial baseload capacity.";
  return "This asset can affect local price, reliability, congestion, or dispatch decisions.";
}

function driverLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
