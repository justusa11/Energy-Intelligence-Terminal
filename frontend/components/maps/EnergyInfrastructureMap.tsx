"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Globe2, Layers, LocateFixed, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { useMarketScope } from "@/hooks/useMarketScope";
import {
  assetStyles,
  sampleAssets,
  sampleLinks,
  type AssetType,
  type GisAsset,
  type GisLink,
} from "@/lib/sampleGis";
import {
  corridorTone,
  getCorridorGridState,
  getZoneGridState,
  utilization,
} from "@/lib/gridState";

const WIDTH = 920;
const HEIGHT = 620;
const TILE_SIZE = 256;
const ZOOM_STEPS = [2, 3, 4, 5, 6, 7, 8, 9];
type GeoCenter = { lon: number; lat: number };
type LandRing = Array<[number, number]>;
type TopologyArc = Array<[number, number]>;
type TopologyObject = {
  geometries: Array<{
    arcs: number[][] | number[][][];
    type: "MultiPolygon" | "Polygon";
    properties?: { name?: string };
  }>;
};
type LandTopology = {
  arcs: TopologyArc[];
  objects: {
    land: TopologyObject;
    countries?: TopologyObject;
  };
  transform: {
    scale: [number, number];
    translate: [number, number];
  };
};
type MapFeature = {
  type: "Feature";
  properties: Record<string, string | number | boolean | null>;
  geometry:
    | { type: "Point"; coordinates: [number, number] }
    | { type: "LineString"; coordinates: Array<[number, number]> }
    | { type: "Polygon"; coordinates: Array<Array<[number, number]>> };
};
type MapFeatureCollection = {
  type: "FeatureCollection";
  features: MapFeature[];
};
type ProjectedPoint = { x: number; y: number };
type ProjectedAsset = { asset: GisAsset; point: ProjectedPoint };
type ProjectedLabel = MapLabel & { point: ProjectedPoint };
type ProjectedLink = {
  link: GisLink & { from: [number, number]; to: [number, number] };
  from: ProjectedPoint;
  to: ProjectedPoint;
};
type CountryHover = {
  name: string;
  point: ProjectedPoint;
};
type MapFrame = {
  topLeft: ProjectedPoint;
  width: number;
  height: number;
};
const WORLD_CENTER: GeoCenter = { lon: 18, lat: 34 };
const ZONE_CENTERS: Record<string, { lon: number; lat: number }> = {
  DK1: { lon: 9.95, lat: 55.05 },
  DK2: { lon: 11.95, lat: 55.35 },
  "DE-LU": { lon: 10.4, lat: 52.9 },
  ERCOT: { lon: -98.7, lat: 31.3 },
  "JP-TK": { lon: 139.86, lat: 35.65 },
};
const REGIONS = [
  { id: "global", label: "Global", center: WORLD_CENTER, zoomIndex: 0 },
  { id: "europe", label: "All Europe", center: { lon: 12.8, lat: 52.5 }, zoomIndex: 2 },
  { id: "nordics", label: "Nordics", center: { lon: 17.5, lat: 62.3 }, zoomIndex: 3 },
  { id: "baltics", label: "Baltics", center: { lon: 24.9, lat: 57.2 }, zoomIndex: 3 },
  { id: "continental", label: "Continental", center: { lon: 9.5, lat: 50.2 }, zoomIndex: 3 },
  { id: "iberia", label: "Iberia", center: { lon: -3.8, lat: 40.2 }, zoomIndex: 3 },
  { id: "uk-ireland", label: "UK/Ireland", center: { lon: -4.2, lat: 54.0 }, zoomIndex: 3 },
  { id: "italy", label: "Italy", center: { lon: 12.3, lat: 42.8 }, zoomIndex: 3 },
  { id: "balkans", label: "Balkans", center: { lon: 21.2, lat: 44.0 }, zoomIndex: 3 },
  { id: "ercot", label: "ERCOT", center: ZONE_CENTERS.ERCOT, zoomIndex: 3 },
  { id: "tokyo", label: "Tokyo", center: ZONE_CENTERS["JP-TK"], zoomIndex: 3 },
] as const;
const DEFAULT_CENTER: GeoCenter = WORLD_CENTER;
type MapRegionId = (typeof REGIONS)[number]["id"];

const REGION_COUNTRIES: Record<MapRegionId, string[]> = {
  global: [],
  europe: [
    "AT",
    "BE",
    "BG",
    "CH",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GR",
    "HU",
    "IE",
    "IT",
    "LT",
    "LV",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "SE",
    "SK",
  ],
  nordics: ["DK", "FI", "NO", "SE"],
  baltics: ["EE", "LT", "LV"],
  continental: ["AT", "BE", "CH", "CZ", "DE", "FR", "NL", "PL", "SK"],
  iberia: ["ES", "PT"],
  "uk-ireland": ["GB", "IE"],
  italy: ["IT"],
  balkans: ["BG", "GR", "HU", "RO"],
  ercot: ["US"],
  tokyo: ["JP"],
};

const REGION_BOUNDS: Partial<
  Record<MapRegionId, { lonMin: number; lonMax: number; latMin: number; latMax: number }>
> = {
  europe: { lonMin: -12, lonMax: 33, latMin: 35, latMax: 72 },
  nordics: { lonMin: 4, lonMax: 32, latMin: 54, latMax: 72 },
  baltics: { lonMin: 20, lonMax: 29.5, latMin: 53.5, latMax: 60 },
  continental: { lonMin: -5, lonMax: 24, latMin: 44, latMax: 55 },
  iberia: { lonMin: -10, lonMax: 4, latMin: 35, latMax: 44 },
  "uk-ireland": { lonMin: -11, lonMax: 3, latMin: 49, latMax: 59 },
  italy: { lonMin: 6, lonMax: 19, latMin: 36, latMax: 47 },
  balkans: { lonMin: 14, lonMax: 30, latMin: 37, latMax: 47 },
  ercot: { lonMin: -107, lonMax: -91, latMin: 25, latMax: 37 },
  tokyo: { lonMin: 128, lonMax: 147, latMin: 30, latMax: 46 },
};

type DensityField = {
  id: string;
  color: string;
  count: number;
  bounds: { lonMin: number; lonMax: number; latMin: number; latMax: number };
  intensity: number;
};

type MapLabelKind = "region" | "country" | "city";
type MapLabel = {
  id: string;
  label: string;
  lon: number;
  lat: number;
  kind: MapLabelKind;
  minZoom: number;
  regions?: MapRegionId[];
};

const BASEMAPS = {
  dark: {
    label: "Dark",
    attribution: "Map tiles: CARTO, OpenStreetMap",
    water: "#0a1018",
    land: "#2b3035",
    landStroke: "#5e6670",
    coast: "#737b86",
    grid: "#26313d",
    text: "#94a3b8",
    veil: 0.02,
  },
  light: {
    label: "Light",
    attribution: "Map tiles: CARTO, OpenStreetMap",
    water: "#7fa5b3",
    land: "#b7c5ac",
    landStroke: "#6f8b76",
    coast: "#e2e8f0",
    grid: "#475569",
    text: "#334155",
    veil: 0.16,
  },
} as const;

type BasemapKey = keyof typeof BASEMAPS;
type GridLayer = "flows" | "prices" | "balance" | "risk";
type TimeHorizon = "now" | "1da" | "3da" | "ida";
type RegionCluster = {
  id: string;
  label: string;
  center: GeoCenter;
  assets: GisAsset[];
  capacityMw: number;
  riskCount: number;
};

const CLUSTER_DEFS: Array<{
  id: string;
  label: string;
  center: GeoCenter;
  countries: string[];
  fallback: (asset: GisAsset) => boolean;
}> = [
  {
    id: "europe",
    label: "Europe",
    center: { lon: 10.8, lat: 52.8 },
    countries: [
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
    fallback: (asset) => asset.lon > -15 && asset.lon < 45 && asset.lat > 35 && asset.lat < 72,
  },
  {
    id: "ercot",
    label: "ERCOT",
    center: ZONE_CENTERS.ERCOT,
    countries: ["US"],
    fallback: (asset) => asset.zone === "ERCOT" || (asset.lon > -107 && asset.lon < -91 && asset.lat > 25 && asset.lat < 37),
  },
  {
    id: "tokyo",
    label: "Japan",
    center: ZONE_CENTERS["JP-TK"],
    countries: ["JP"],
    fallback: (asset) => asset.zone === "JP-TK" || (asset.lon > 128 && asset.lon < 147 && asset.lat > 30 && asset.lat < 46),
  },
];

const EUROPE_DENSITY_FIELDS: Array<DensityField & { region: MapRegionId; mix: "wind" | "solar" | "thermal" | "nuclear" | "hydro" }> = [
  { id: "nordic-wind", region: "nordics", mix: "wind", color: "#60a5fa", count: 160, bounds: { lonMin: 5, lonMax: 30, latMin: 56, latMax: 69 }, intensity: 0.86 },
  { id: "nordic-hydro", region: "nordics", mix: "hydro", color: "#38bdf8", count: 80, bounds: { lonMin: 6, lonMax: 21, latMin: 59, latMax: 68 }, intensity: 0.72 },
  { id: "baltic-wind", region: "baltics", mix: "wind", color: "#7dd3fc", count: 78, bounds: { lonMin: 20, lonMax: 29, latMin: 54, latMax: 59 }, intensity: 0.76 },
  { id: "continental-load", region: "continental", mix: "thermal", color: "#e5e7eb", count: 260, bounds: { lonMin: -3, lonMax: 22, latMin: 45, latMax: 54 }, intensity: 0.92 },
  { id: "continental-solar", region: "continental", mix: "solar", color: "#facc15", count: 190, bounds: { lonMin: 2, lonMax: 22, latMin: 44, latMax: 51 }, intensity: 0.86 },
  { id: "iberia-solar", region: "iberia", mix: "solar", color: "#fbbf24", count: 150, bounds: { lonMin: -9, lonMax: 3, latMin: 36, latMax: 43 }, intensity: 0.88 },
  { id: "uk-wind", region: "uk-ireland", mix: "wind", color: "#7dd3fc", count: 120, bounds: { lonMin: -9, lonMax: 2, latMin: 50, latMax: 58 }, intensity: 0.86 },
  { id: "italy-solar-gas", region: "italy", mix: "solar", color: "#fbbf24", count: 108, bounds: { lonMin: 7, lonMax: 17, latMin: 37, latMax: 45 }, intensity: 0.78 },
  { id: "balkans-hydro", region: "balkans", mix: "hydro", color: "#22c55e", count: 92, bounds: { lonMin: 15, lonMax: 28, latMin: 38, latMax: 46 }, intensity: 0.72 },
  { id: "fr-nuclear", region: "continental", mix: "nuclear", color: "#c084fc", count: 70, bounds: { lonMin: -2, lonMax: 7, latMin: 44, latMax: 50 }, intensity: 0.8 },
];

const ENERGY_DENSITY_FIELDS: DensityField[] = [
  { id: "north-america-east", color: "#e5e7eb", count: 150, bounds: { lonMin: -96, lonMax: -70, latMin: 28, latMax: 47 }, intensity: 0.82 },
  { id: "north-america-west", color: "#60a5fa", count: 62, bounds: { lonMin: -124, lonMax: -112, latMin: 32, latMax: 49 }, intensity: 0.58 },
  { id: "texas", color: "#fbbf24", count: 48, bounds: { lonMin: -103, lonMax: -94, latMin: 27, latMax: 34 }, intensity: 0.76 },
  { id: "europe", color: "#f8fafc", count: 220, bounds: { lonMin: -8, lonMax: 31, latMin: 42, latMax: 61 }, intensity: 0.94 },
  { id: "nordics", color: "#93c5fd", count: 76, bounds: { lonMin: 6, lonMax: 31, latMin: 56, latMax: 69 }, intensity: 0.7 },
  { id: "india", color: "#fbbf24", count: 130, bounds: { lonMin: 70, lonMax: 89, latMin: 8, latMax: 28 }, intensity: 0.78 },
  { id: "china-coast", color: "#7dd3fc", count: 170, bounds: { lonMin: 104, lonMax: 123, latMin: 22, latMax: 42 }, intensity: 0.82 },
  { id: "japan-korea", color: "#fbbf24", count: 82, bounds: { lonMin: 126, lonMax: 145, latMin: 32, latMax: 43 }, intensity: 0.86 },
  { id: "south-america", color: "#7dd3fc", count: 54, bounds: { lonMin: -74, lonMax: -44, latMin: -35, latMax: -8 }, intensity: 0.46 },
  { id: "australia", color: "#93c5fd", count: 42, bounds: { lonMin: 113, lonMax: 153, latMin: -38, latMax: -21 }, intensity: 0.44 },
];

const MAP_LABELS: MapLabel[] = [
  { id: "lbl-north-america", label: "North America", lon: -99, lat: 47, kind: "region", minZoom: 2, regions: ["global"] },
  { id: "lbl-europe", label: "Europe", lon: 12, lat: 53, kind: "region", minZoom: 2, regions: ["global"] },
  { id: "lbl-japan", label: "Japan", lon: 138.5, lat: 38, kind: "region", minZoom: 2, regions: ["global", "tokyo"] },
  { id: "lbl-india", label: "India", lon: 78, lat: 22, kind: "region", minZoom: 2, regions: ["global"] },
  { id: "lbl-australia", label: "Australia", lon: 135, lat: -25, kind: "region", minZoom: 2, regions: ["global"] },
  { id: "lbl-denmark", label: "Denmark", lon: 10.2, lat: 56.1, kind: "country", minZoom: 4, regions: ["europe", "nordics"] },
  { id: "lbl-norway", label: "Norway", lon: 8.3, lat: 62.1, kind: "country", minZoom: 4, regions: ["europe", "nordics"] },
  { id: "lbl-sweden", label: "Sweden", lon: 15.2, lat: 62.0, kind: "country", minZoom: 4, regions: ["europe", "nordics"] },
  { id: "lbl-finland", label: "Finland", lon: 26.0, lat: 63.7, kind: "country", minZoom: 4, regions: ["europe", "nordics"] },
  { id: "lbl-estonia", label: "Estonia", lon: 25.2, lat: 58.7, kind: "country", minZoom: 5, regions: ["europe", "baltics"] },
  { id: "lbl-latvia", label: "Latvia", lon: 24.7, lat: 56.9, kind: "country", minZoom: 5, regions: ["europe", "baltics"] },
  { id: "lbl-lithuania", label: "Lithuania", lon: 23.9, lat: 55.2, kind: "country", minZoom: 5, regions: ["europe", "baltics"] },
  { id: "lbl-germany", label: "Germany", lon: 10.4, lat: 51.2, kind: "country", minZoom: 4, regions: ["europe", "continental"] },
  { id: "lbl-france", label: "France", lon: 2.0, lat: 46.4, kind: "country", minZoom: 4, regions: ["europe", "continental"] },
  { id: "lbl-poland", label: "Poland", lon: 19.2, lat: 52.0, kind: "country", minZoom: 4, regions: ["europe", "continental"] },
  { id: "lbl-netherlands", label: "Netherlands", lon: 5.3, lat: 52.2, kind: "country", minZoom: 5, regions: ["europe", "continental"] },
  { id: "lbl-spain", label: "Spain", lon: -3.7, lat: 40.2, kind: "country", minZoom: 4, regions: ["europe", "iberia"] },
  { id: "lbl-portugal", label: "Portugal", lon: -8.0, lat: 39.7, kind: "country", minZoom: 5, regions: ["europe", "iberia"] },
  { id: "lbl-uk", label: "United Kingdom", lon: -2.5, lat: 54.6, kind: "country", minZoom: 4, regions: ["europe", "uk-ireland"] },
  { id: "lbl-ireland", label: "Ireland", lon: -8.1, lat: 53.4, kind: "country", minZoom: 5, regions: ["europe", "uk-ireland"] },
  { id: "lbl-italy", label: "Italy", lon: 12.3, lat: 42.8, kind: "country", minZoom: 4, regions: ["europe", "italy"] },
  { id: "lbl-romania", label: "Romania", lon: 24.8, lat: 45.8, kind: "country", minZoom: 5, regions: ["europe", "balkans"] },
  { id: "lbl-greece", label: "Greece", lon: 22.2, lat: 39.0, kind: "country", minZoom: 5, regions: ["europe", "balkans"] },
  { id: "city-copenhagen", label: "Copenhagen", lon: 12.57, lat: 55.68, kind: "city", minZoom: 6, regions: ["europe", "nordics"] },
  { id: "city-aarhus", label: "Aarhus", lon: 10.2, lat: 56.16, kind: "city", minZoom: 7, regions: ["europe", "nordics"] },
  { id: "city-oslo", label: "Oslo", lon: 10.75, lat: 59.91, kind: "city", minZoom: 6, regions: ["europe", "nordics"] },
  { id: "city-stockholm", label: "Stockholm", lon: 18.07, lat: 59.33, kind: "city", minZoom: 6, regions: ["europe", "nordics"] },
  { id: "city-helsinki", label: "Helsinki", lon: 24.94, lat: 60.17, kind: "city", minZoom: 6, regions: ["europe", "nordics", "baltics"] },
  { id: "city-tallinn", label: "Tallinn", lon: 24.75, lat: 59.44, kind: "city", minZoom: 6, regions: ["europe", "baltics"] },
  { id: "city-riga", label: "Riga", lon: 24.1, lat: 56.95, kind: "city", minZoom: 6, regions: ["europe", "baltics"] },
  { id: "city-vilnius", label: "Vilnius", lon: 25.28, lat: 54.69, kind: "city", minZoom: 6, regions: ["europe", "baltics"] },
  { id: "city-hamburg", label: "Hamburg", lon: 9.99, lat: 53.55, kind: "city", minZoom: 6, regions: ["europe", "continental"] },
  { id: "city-berlin", label: "Berlin", lon: 13.4, lat: 52.52, kind: "city", minZoom: 6, regions: ["europe", "continental"] },
  { id: "city-paris", label: "Paris", lon: 2.35, lat: 48.86, kind: "city", minZoom: 6, regions: ["europe", "continental"] },
  { id: "city-london", label: "London", lon: -0.13, lat: 51.51, kind: "city", minZoom: 6, regions: ["europe", "uk-ireland"] },
  { id: "city-madrid", label: "Madrid", lon: -3.7, lat: 40.42, kind: "city", minZoom: 6, regions: ["europe", "iberia"] },
  { id: "city-milan", label: "Milan", lon: 9.19, lat: 45.46, kind: "city", minZoom: 6, regions: ["europe", "italy"] },
  { id: "city-warsaw", label: "Warsaw", lon: 21.01, lat: 52.23, kind: "city", minZoom: 6, regions: ["europe", "continental"] },
  { id: "city-bucharest", label: "Bucharest", lon: 26.1, lat: 44.43, kind: "city", minZoom: 6, regions: ["europe", "balkans"] },
  { id: "city-athens", label: "Athens", lon: 23.73, lat: 37.98, kind: "city", minZoom: 6, regions: ["europe", "balkans"] },
  { id: "city-houston", label: "Houston", lon: -95.37, lat: 29.76, kind: "city", minZoom: 6, regions: ["ercot"] },
  { id: "city-dallas", label: "Dallas", lon: -96.8, lat: 32.78, kind: "city", minZoom: 6, regions: ["ercot"] },
  { id: "city-tokyo", label: "Tokyo", lon: 139.76, lat: 35.68, kind: "city", minZoom: 5, regions: ["tokyo"] },
];

const HOVERABLE_COUNTRY_NAMES = new Set([
  "Austria",
  "Belgium",
  "Bulgaria",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Japan",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Moldova",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Serbia",
  "Slovakia",
  "Spain",
  "Sweden",
  "Switzerland",
  "United Kingdom",
  "United States of America",
]);

export function EnergyInfrastructureMap({
  active,
  assets = sampleAssets,
  filter,
  links = sampleLinks,
  onRegionChange,
  onSelect,
}: {
  active: string | null;
  assets?: GisAsset[];
  filter: AssetType | "all";
  links?: GisLink[];
  onRegionChange?: (regionId: string) => void;
  onSelect: (asset: GisAsset) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [basemap, setBasemap] = useState<BasemapKey>("dark");
  const [layer, setLayer] = useState<GridLayer>("flows");
  const [labelsVisible, setLabelsVisible] = useState(true);
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("now");
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState("global");
  const [landRings, setLandRings] = useState<LandRing[]>([]);
  const [countryBorderRings, setCountryBorderRings] = useState<LandRing[]>([]);
  const [countryData, setCountryData] = useState<MapFeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const { zone } = useMarketScope();
  const previousZone = useRef(zone);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const zoom = ZOOM_STEPS[zoomIndex];
  const visible = assets.filter(
    (asset) => filter === "all" || asset.type === filter
  );
  const regionVisible = useMemo(
    () => filterAssetsForMapRegion(visible, activeRegion as MapRegionId),
    [activeRegion, visible]
  );
  const map = useMemo(() => getMapFrame(center.lon, center.lat, zoom), [
    center.lat,
    center.lon,
    zoom,
  ]);
  const viewportAssetCount = useMemo(
    () =>
      regionVisible.filter((asset) =>
        isInsideFrame(projectToFrame(asset.lon, asset.lat, zoom, map), 90)
      ).length,
    [map, regionVisible, zoom]
  );
  const regionClusters = useMemo(() => getRegionClusters(assets), [assets]);
  const isGlobalOverview = activeRegion === "global" && zoom <= 3;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/countries-110m.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("land topology unavailable"))))
      .then((topology: LandTopology) => {
        if (!cancelled) {
          setLandRings(decodeLandTopology(topology, "land"));
          setCountryBorderRings(decodeLandTopology(topology, "countries"));
          setCountryData(decodeCountryTopologyFeatures(topology));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLandRings([]);
          setCountryBorderRings([]);
          setCountryData({ type: "FeatureCollection", features: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (previousZone.current === zone) return;
    previousZone.current = zone;
    const frame = window.requestAnimationFrame(() => {
      const zoneCenter = ZONE_CENTERS[zone];
      if (!zoneCenter) return;
      setCenter(zoneCenter);
      setZoomIndex(zone === "DK1" || zone === "DK2" || zone === "DE-LU" ? 4 : 5);
      setActiveRegion(zone === "ERCOT" ? "ercot" : zone === "JP-TK" ? "tokyo" : "europe");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [zone]);

  function jumpToRegion(regionId: string) {
    const region = REGIONS.find((item) => item.id === regionId);
    if (!region) return;
    setCenter(region.center);
    setZoomIndex(region.zoomIndex);
    setActiveRegion(region.id);
    onRegionChange?.(region.id);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Global grid map
          </p>
          <p className="text-sm text-slate-300">
            {isGlobalOverview
              ? `${regionClusters.length} operator regions, ${visible.length} mapped assets, zoom ${zoom}`
              : `${viewportAssetCount} assets in view, ${links.length} live corridors, zoom ${zoom}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MapControlButton
            label="Zoom in"
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            onClick={() =>
              setZoomIndex((value) => Math.min(value + 1, ZOOM_STEPS.length - 1))
            }
          >
            <Plus className="h-4 w-4" />
          </MapControlButton>
          <MapControlButton
            label="Zoom out"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((value) => Math.max(value - 1, 0))}
          >
            <Minus className="h-4 w-4" />
          </MapControlButton>
          <button
            type="button"
            onClick={() => jumpToRegion(activeRegion)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-blue-500 hover:text-white"
            title="Reset zoom"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={mapViewportRef}
        className="relative h-[min(74vh,780px)] min-h-[620px] w-full overflow-hidden bg-slate-900"
        role="img"
        aria-label="Global vector basemap with animated energy infrastructure assets"
      >
        {mounted ? (
          <MapCanvas
            active={active}
            basemap={basemap}
            center={center}
            hoveredAsset={hoveredAsset}
            map={map}
            onCenterChange={setCenter}
            onSelect={onSelect}
            onZoomIndexChange={setZoomIndex}
            setHoveredAsset={setHoveredAsset}
            visible={regionVisible}
            links={links}
            assets={assets}
            zoom={zoom}
            layer={layer}
            landRings={landRings}
            countryBorderRings={countryBorderRings}
            countryData={countryData}
            labelsVisible={labelsVisible}
            timeHorizon={timeHorizon}
            activeRegion={activeRegion as MapRegionId}
            onJumpRegion={jumpToRegion}
          />
        ) : (
          <div className="absolute inset-0 bg-slate-900">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(30,64,175,0.18),transparent_55%)]" />
          </div>
        )}

        <LiveGridPulse />

        <GridTimeline value={timeHorizon} onChange={setTimeHorizon} />

        <div className="absolute left-3 top-3 z-30 flex flex-col gap-2">
          <div className="rounded-lg border border-slate-700/80 bg-slate-950/90 p-2 shadow-xl shadow-black/30">
            <MapControlButton
              label="Pan north"
              onClick={() => setCenter((value) => panCenter(value, zoom, "north"))}
            >
              <ArrowUp className="h-4 w-4" />
            </MapControlButton>
            <div className="mt-1 grid grid-cols-3 gap-1">
              <MapControlButton
                label="Pan west"
                onClick={() => setCenter((value) => panCenter(value, zoom, "west"))}
              >
                <ArrowLeft className="h-4 w-4" />
              </MapControlButton>
              <MapControlButton
                label="Reset map center"
                onClick={() => jumpToRegion(activeRegion)}
              >
                <LocateFixed className="h-4 w-4" />
              </MapControlButton>
              <MapControlButton
                label="Pan east"
                onClick={() => setCenter((value) => panCenter(value, zoom, "east"))}
              >
                <ArrowRight className="h-4 w-4" />
              </MapControlButton>
            </div>
            <div className="mt-1 flex justify-center">
              <MapControlButton
                label="Pan south"
                onClick={() => setCenter((value) => panCenter(value, zoom, "south"))}
              >
                <ArrowDown className="h-4 w-4" />
              </MapControlButton>
            </div>
          </div>
        </div>

        <div className="absolute left-3 top-32 z-30 rounded-lg border border-slate-700/80 bg-slate-950/90 p-2 shadow-xl shadow-black/30">
          <div className="mb-2 flex items-center gap-2 px-1 text-xs uppercase tracking-wide text-slate-500">
            <Globe2 className="h-3.5 w-3.5" />
            Region
          </div>
          <div className="grid gap-1">
            {REGIONS.map((region) => (
              <button
                key={region.id}
                type="button"
                onClick={() => jumpToRegion(region.id)}
                aria-label={`Jump map to ${region.label}`}
                className={`rounded-md border px-3 py-1.5 text-left text-xs transition ${
                  activeRegion === region.id
                    ? "border-blue-400 bg-blue-500/20 text-white"
                    : "border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {region.label}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute right-3 top-3 z-30 rounded-lg border border-slate-700/80 bg-slate-950/90 p-2 shadow-xl shadow-black/30">
          <div className="mb-2 flex items-center gap-2 px-1 text-xs uppercase tracking-wide text-slate-500">
            <Layers className="h-3.5 w-3.5" />
            Basemap
          </div>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => setBasemap(key)}
                aria-label={`Use ${BASEMAPS[key].label} basemap`}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  basemap === key
                    ? "border-blue-400 bg-blue-500/20 text-white"
                    : "border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {BASEMAPS[key].label}
              </button>
            ))}
          </div>
        </div>

        <LayerSwitcher labelsVisible={labelsVisible} onLabelsChange={setLabelsVisible} value={layer} onChange={setLayer} />

        <WorldOverview
          activeRegion={activeRegion}
          assets={assets}
          center={center}
          filter={filter}
          onJump={jumpToRegion}
        />

        <div className="absolute bottom-3 right-3 rounded-md bg-slate-950/85 px-2 py-1 text-[11px] font-medium text-slate-400">
          {BASEMAPS[basemap].attribution}
        </div>
      </div>
    </div>
  );
}

function LiveGridPulse() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 w-56 -translate-x-1/2 rounded border border-slate-800/80 bg-black/70 px-2.5 py-1 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500">
        <span>Grid heartbeat</span>
        <span className="font-mono text-green-400">50.000 Hz</span>
      </div>
      <svg viewBox="0 0 260 28" className="mt-0.5 h-5 w-full overflow-visible">
        <path
          d="M0 15 C18 15 18 15 32 15 L40 15 L45 6 L51 22 L57 15 C72 15 72 15 88 15 L98 15 L104 9 L111 20 L118 15 C142 15 142 15 162 15 L173 15 L178 7 L185 21 L191 15 C216 15 224 15 260 15"
          fill="none"
          stroke="#1e293b"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M0 15 C18 15 18 15 32 15 L40 15 L45 6 L51 22 L57 15 C72 15 72 15 88 15 L98 15 L104 9 L111 20 L118 15 C142 15 142 15 162 15 L173 15 L178 7 L185 21 L191 15 C216 15 224 15 260 15"
          fill="none"
          stroke="#4ade80"
          strokeLinecap="round"
          strokeWidth="2"
          strokeDasharray="42 218"
        >
          <animate attributeName="stroke-dashoffset" from="260" to="0" dur="2.8s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}

function GridTimeline({
  onChange,
  value,
}: {
  onChange: (value: TimeHorizon) => void;
  value: TimeHorizon;
}) {
  const horizons: Array<{ id: TimeHorizon; label: string }> = [
    { id: "now", label: "Now" },
    { id: "1da", label: "1DA" },
    { id: "3da", label: "3DA" },
    { id: "ida", label: "IDA" },
  ];

  return (
    <div className="absolute left-1/2 top-[3.1rem] flex -translate-x-1/2 items-center gap-0.5 rounded border border-slate-800/80 bg-black/70 p-0.5 shadow-lg shadow-black/30">
      {horizons.map((horizon) => (
        <button
          key={horizon.id}
          type="button"
          onClick={() => onChange(horizon.id)}
          aria-label={`Use ${horizon.label} timeline`}
          className={`rounded px-2.5 py-1 font-mono text-[11px] font-semibold transition ${
            value === horizon.id
              ? "bg-blue-500/20 text-blue-100"
              : "text-slate-500 hover:text-slate-200"
          }`}
        >
          {horizon.label}
        </button>
      ))}
    </div>
  );
}

function LayerSwitcher({
  labelsVisible,
  onLabelsChange,
  onChange,
  value,
}: {
  labelsVisible: boolean;
  onLabelsChange: (value: boolean) => void;
  onChange: (value: GridLayer) => void;
  value: GridLayer;
}) {
  const layers: Array<{ id: GridLayer; label: string }> = [
    { id: "flows", label: "Flows" },
    { id: "prices", label: "Prices" },
    { id: "balance", label: "Balance" },
    { id: "risk", label: "Risk" },
  ];

  return (
    <div className="absolute right-3 top-28 z-30 rounded-lg border border-slate-700/80 bg-slate-950/90 p-2 shadow-xl shadow-black/30">
      <div className="mb-2 px-1 text-xs uppercase tracking-wide text-slate-500">
        Grid layer
      </div>
      <div className="grid gap-1">
        {layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => onChange(layer.id)}
            aria-label={`Show ${layer.label} grid layer`}
            className={`rounded-md border px-3 py-1.5 text-left text-xs transition ${
              value === layer.id
                ? "border-blue-400 bg-blue-500/20 text-white"
                : "border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            {layer.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onLabelsChange(!labelsVisible)}
          aria-label={`${labelsVisible ? "Hide" : "Show"} map labels`}
          className={`rounded-md border px-3 py-1.5 text-left text-xs transition ${
            labelsVisible
              ? "border-blue-400 bg-blue-500/20 text-white"
              : "border-slate-700 text-slate-400 hover:text-white"
          }`}
        >
          Labels
        </button>
      </div>
    </div>
  );
}

function WorldOverview({
  activeRegion,
  assets,
  center,
  filter,
  onJump,
}: {
  activeRegion: string;
  assets: GisAsset[];
  center: GeoCenter;
  filter: AssetType | "all";
  onJump: (regionId: string) => void;
}) {
  const overviewAssets = assets.filter(
    (asset) => filter === "all" || asset.type === filter
  );
  const centerPoint = overviewPoint(center.lon, center.lat);

  return (
    <div className="absolute bottom-12 right-3 z-30 w-64 rounded-lg border border-slate-700/80 bg-slate-950/90 p-3 shadow-xl shadow-black/30">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
        <span>World overview</span>
        <span>{activeRegion}</span>
      </div>
      <svg viewBox="0 0 240 120" className="h-28 w-full rounded-md bg-slate-900">
        <rect width="240" height="120" fill="#020617" />
        <path
          d="M18 42 C40 22 68 28 86 42 C104 56 122 44 142 35 C166 23 196 30 222 48"
          fill="none"
          stroke="#1e293b"
          strokeLinecap="round"
          strokeWidth="18"
          opacity="0.9"
        />
        <path
          d="M20 80 C42 70 66 74 90 84 C116 94 138 76 162 74 C188 72 204 88 224 84"
          fill="none"
          stroke="#1e293b"
          strokeLinecap="round"
          strokeWidth="14"
          opacity="0.9"
        />
        <path
          d="M58 42 L190 45"
          stroke="#7c3aed"
          strokeDasharray="4 5"
          strokeWidth="1.5"
          opacity="0.55"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="5s" repeatCount="indefinite" />
        </path>
        {overviewAssets
          .filter((asset) => asset.type === "market_zone")
          .map((asset) => {
            const point = overviewPoint(asset.lon, asset.lat);
            return (
              <circle key={asset.id} cx={point.x} cy={point.y} r="4" fill={assetStyles.market_zone.color}>
                <animate attributeName="r" values="3;6;3" dur="2.6s" repeatCount="indefinite" />
              </circle>
            );
          })}
        <circle
          cx={centerPoint.x}
          cy={centerPoint.y}
          r="7"
          fill="none"
          stroke="#f8fafc"
          strokeWidth="1.5"
          opacity="0.9"
        />
      </svg>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {REGIONS.map((region) => (
          <button
            key={region.id}
            type="button"
            onClick={() => onJump(region.id)}
            aria-label={`Jump overview to ${region.label}`}
            className={`rounded border px-1.5 py-1 text-[10px] ${
              activeRegion === region.id
                ? "border-blue-400 text-blue-200"
                : "border-slate-700 text-slate-500 hover:text-slate-200"
            }`}
          >
            {region.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MapControlButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function MapCanvas({
  active,
  activeRegion,
  assets,
  basemap,
  center,
  hoveredAsset,
  layer,
  landRings,
  countryBorderRings,
  countryData,
  labelsVisible,
  links,
  map,
  onCenterChange,
  onJumpRegion,
  onSelect,
  onZoomIndexChange,
  setHoveredAsset,
  timeHorizon,
  visible,
  zoom,
}: {
  active: string | null;
  activeRegion: MapRegionId;
  assets: GisAsset[];
  basemap: BasemapKey;
  center: GeoCenter;
  hoveredAsset: string | null;
  layer: GridLayer;
  landRings: LandRing[];
  countryBorderRings: LandRing[];
  countryData: MapFeatureCollection;
  labelsVisible: boolean;
  links: GisLink[];
  map: ReturnType<typeof getMapFrame>;
  onCenterChange: (center: GeoCenter) => void;
  onJumpRegion: (regionId: string) => void;
  onSelect: (asset: GisAsset) => void;
  onZoomIndexChange: (value: number | ((value: number) => number)) => void;
  setHoveredAsset: (id: string | null) => void;
  timeHorizon: TimeHorizon;
  visible: GisAsset[];
  zoom: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const resolvedLinks = useMemo(
    () =>
      links
        .map((link) => resolveLinkCoordinates(link, assetById))
        .filter(
          (link): link is GisLink & { from: [number, number]; to: [number, number] } =>
            Boolean(link)
        ),
    [assetById, links]
  );
  const landData = useMemo(() => landRingsToFeatures(landRings), [landRings]);
  const countryBorderData = useMemo(
    () => countryBorderRingsToFeatures(countryBorderRings),
    [countryBorderRings]
  );
  const densityData = useMemo(() => densityFieldsToFeatures(), []);
  const horizonMultiplier =
    timeHorizon === "ida" ? 0.92 : timeHorizon === "3da" ? 1.08 : timeHorizon === "1da" ? 1.03 : 1;
  const [projectedAssets, setProjectedAssets] = useState<ProjectedAsset[]>([]);
  const [projectedLinks, setProjectedLinks] = useState<ProjectedLink[]>([]);
  const [projectedLabels, setProjectedLabels] = useState<ProjectedLabel[]>([]);
  const [hoveredCountry, setHoveredCountry] = useState<CountryHover | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: WIDTH, height: HEIGHT });
  const visibleAssetIds = useMemo(() => new Set(visible.map((asset) => asset.id)), [visible]);
  const overlayMap = useMemo(
    () => getMapFrame(center.lon, center.lat, zoom, viewportSize.width, viewportSize.height),
    [center.lat, center.lon, viewportSize.height, viewportSize.width, zoom]
  );
  const fallbackAssets = useMemo(
    () =>
      visible
        .map((asset) => ({
          asset,
          point: projectToFrame(asset.lon, asset.lat, zoom, overlayMap),
        }))
        .filter(({ point }) => isInsideFrame(point, 90, viewportSize.width, viewportSize.height)),
    [overlayMap, visible, viewportSize.height, viewportSize.width, zoom]
  );
  const fallbackLinks = useMemo(
    () =>
      resolvedLinks
        .map((link) => ({
          link,
          from: projectToFrame(link.from[0], link.from[1], zoom, overlayMap),
          to: projectToFrame(link.to[0], link.to[1], zoom, overlayMap),
        }))
        .filter(
          ({ from, to }) =>
            isInsideFrame(from, 120, viewportSize.width, viewportSize.height) ||
            isInsideFrame(to, 120, viewportSize.width, viewportSize.height)
        ),
    [overlayMap, resolvedLinks, viewportSize.height, viewportSize.width, zoom]
  );
  const fallbackLabels = useMemo(
    () =>
      labelsVisible
        ? MAP_LABELS.filter((label) => shouldShowMapLabel(label, activeRegion, zoom))
            .map((label) => ({
              ...label,
              point: projectToFrame(label.lon, label.lat, zoom, overlayMap),
            }))
            .filter(({ point }) => isInsideFrame(point, 40, viewportSize.width, viewportSize.height))
        : [],
    [activeRegion, labelsVisible, overlayMap, viewportSize.height, viewportSize.width, zoom]
  );
  const renderedAssets = (projectedAssets.length > 0 ? projectedAssets : fallbackAssets).filter(({ asset }) =>
    visibleAssetIds.has(asset.id)
  );
  const showDetailedCorridors = zoom >= 5;
  const renderedLinks = showDetailedCorridors
    ? projectedLinks.length > 0
      ? projectedLinks
      : fallbackLinks
    : [];
  const renderedLabels = [
    ...fallbackLabels,
    ...projectedLabels.filter(
      (projectedLabel) => !fallbackLabels.some((fallbackLabel) => fallbackLabel.id === projectedLabel.id)
    ),
  ];

  const setCountryHover = useCallback((name: string, point: ProjectedPoint) => {
    const instance = mapRef.current;
    instance?.setFilter("country-hover-fill", ["==", ["get", "name"], name]);
    instance?.setFilter("country-hover-outline", ["==", ["get", "name"], name]);
    setHoveredCountry({ name, point });
  }, []);

  const clearCountryHover = useCallback(() => {
    const instance = mapRef.current;
    instance?.setFilter("country-hover-fill", ["==", ["get", "name"], ""]);
    instance?.setFilter("country-hover-outline", ["==", ["get", "name"], ""]);
    instance?.getCanvas().style.setProperty("cursor", "");
    setHoveredCountry(null);
  }, []);

  const updateProjectedOverlay = useCallback(
    (instance: MapLibreMap) => {
      const bounds = instance.getBounds();
      const projectedVisibleAssets = visible
        .filter((asset) => bounds.contains([asset.lon, asset.lat]))
        .map((asset) => ({
          asset,
          point: toProjectedPoint(instance.project([asset.lon, asset.lat])),
        }));
      const projectedVisibleLinks = resolvedLinks
        .filter((link) => bounds.contains(link.from) || bounds.contains(link.to))
        .map((link) => ({
          link,
          from: toProjectedPoint(instance.project(link.from)),
          to: toProjectedPoint(instance.project(link.to)),
        }));
      const labels = labelsVisible
        ? MAP_LABELS.filter((label) => shouldShowMapLabel(label, activeRegion, zoom)).map((label) => ({
            ...label,
            point: toProjectedPoint(instance.project([label.lon, label.lat])),
          }))
        : [];

      setProjectedAssets(projectedVisibleAssets);
      setProjectedLinks(projectedVisibleLinks);
      setProjectedLabels(labels);
    },
    [activeRegion, labelsVisible, resolvedLinks, visible, zoom]
  );

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (disposed || !containerRef.current || mapRef.current) return;
      const maplibregl = await import("maplibre-gl");
      if (disposed || !containerRef.current || mapRef.current) return;

      const instance = new maplibregl.Map({
        attributionControl: false,
        bearing: 0,
        center: [center.lon, center.lat],
        container: containerRef.current,
        dragRotate: true,
        pitch: 0,
        pitchWithRotate: true,
        scrollZoom: true,
        style: createInfrastructureStyle(basemap, landData, countryBorderData, countryData, densityData),
        zoom,
      });

      mapRef.current = instance;
      instance.resize();

      const updateFromMap = () => {
        updateProjectedOverlay(instance);
      };

      instance.on("load", () => {
        if (disposed) return;
        instance.resize();
        setMapLoaded(true);
        updateFromMap();
      });
      instance.on("move", updateFromMap);
      instance.on("zoom", updateFromMap);
      // Only sync React state back from camera moves the user actually drove
      // (drag pan, wheel zoom) -- these carry a real DOM originalEvent.
      // Programmatic moves we started ourselves (easeTo from region jumps,
      // zoom buttons, pan buttons) don't, and syncing those back would
      // interrupt the in-flight easeTo with its own intermediate position,
      // restarting it on every tick and never letting it reach its target.
      instance.on("moveend", (e) => {
        if (!e.originalEvent) return;
        const currentCenter = instance.getCenter();
        onCenterChange({ lon: roundCoord(currentCenter.lng), lat: roundCoord(currentCenter.lat) });
      });
      instance.on("zoomend", (e) => {
        if (!e.originalEvent) return;
        onZoomIndexChange(nearestZoomIndex(instance.getZoom()));
      });
      instance.on("mousemove", (e) => {
        const feature = instance.queryRenderedFeatures(e.point, {
          layers: ["country-hover-hit"],
        })[0];
        const name = feature?.properties?.name;
        if (typeof name !== "string") {
          clearCountryHover();
          return;
        }
        instance.getCanvas().style.cursor = "crosshair";
        setCountryHover(name, { x: roundCoord(e.point.x), y: roundCoord(e.point.y) });
      });
      instance.on("mouseout", clearCountryHover);
    }

    initMap();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // MapLibre owns its instance lifecycle; state updates are pushed through
  // the focused effects below rather than recreating the canvas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearCountryHover, setCountryHover]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setViewportSize({
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      });
      mapRef.current?.resize();
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !mapLoaded) return;
    instance.easeTo({
      bearing: 0,
      center: [center.lon, center.lat],
      duration: 360,
      pitch: 0,
      zoom,
    });
    const frame = window.setTimeout(() => updateProjectedOverlay(instance), 390);
    return () => window.clearTimeout(frame);
  }, [center.lat, center.lon, mapLoaded, updateProjectedOverlay, zoom]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !mapLoaded) return;
    instance.setPaintProperty("background", "background-color", basemap === "dark" ? "#0a1018" : "#7fa5b3");
    instance.setPaintProperty("basemap-dark", "raster-opacity", basemap === "dark" ? 0.76 : 0);
    instance.setPaintProperty("basemap-light", "raster-opacity", basemap === "light" ? 0.86 : 0);
    instance.setPaintProperty("land-fill", "fill-color", BASEMAPS[basemap].land);
    instance.setPaintProperty("land-fill", "fill-opacity", basemap === "dark" ? 0.24 : 0.2);
    instance.setPaintProperty("land-outline", "line-color", BASEMAPS[basemap].landStroke);
    instance.setPaintProperty("land-outline", "line-opacity", 0);
    instance.setPaintProperty("coastline-glow", "line-color", BASEMAPS[basemap].coast);
    instance.setPaintProperty("coastline-glow", "line-opacity", 0);
    instance.setPaintProperty("country-borders", "line-color", BASEMAPS[basemap].landStroke);
    instance.setPaintProperty("country-borders", "line-opacity", 0);
    instance.setPaintProperty("country-hover-fill", "fill-color", basemap === "dark" ? "#60a5fa" : "#2563eb");
    instance.setPaintProperty("country-hover-fill", "fill-opacity", basemap === "dark" ? 0.18 : 0.16);
    instance.setPaintProperty("country-hover-outline", "line-color", basemap === "dark" ? "#bfdbfe" : "#1d4ed8");
  }, [basemap, mapLoaded]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !mapLoaded) return;
    const source = instance.getSource("land") as GeoJSONSource | undefined;
    source?.setData(landData);
  }, [landData, mapLoaded]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !mapLoaded) return;
    const source = instance.getSource("country-borders") as GeoJSONSource | undefined;
    source?.setData(countryBorderData);
  }, [countryBorderData, mapLoaded]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !mapLoaded) return;
    const source = instance.getSource("country-hover") as GeoJSONSource | undefined;
    source?.setData(countryData);
  }, [countryData, mapLoaded]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !mapLoaded) return;
    updateProjectedOverlay(instance);
  }, [active, activeRegion, labelsVisible, layer, mapLoaded, resolvedLinks, updateProjectedOverlay, visible, zoom]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className="bg-slate-950"
        style={{ position: "absolute", inset: 0 }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(148,163,184,0.07),transparent_44%),linear-gradient(90deg,rgba(2,6,23,0.48),transparent_16%,transparent_84%,rgba(2,6,23,0.48))]" />
      {hoveredCountry && (
        <div
          className="pointer-events-none absolute z-20 -translate-y-full rounded-md border border-white/15 bg-black/75 px-2 py-1 text-[11px] font-semibold text-white shadow-xl shadow-black/40 backdrop-blur"
          style={{
            left: Math.min(Math.max(hoveredCountry.point.x + 12, 12), viewportSize.width - 140),
            top: Math.min(Math.max(hoveredCountry.point.y - 10, 32), viewportSize.height - 12),
          }}
        >
          <span className="mr-1 text-slate-400">Country:</span>
          {hoveredCountry.name}
        </div>
      )}
      <svg data-testid="grid-flow-overlay" className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <style>
            {`
              .animated-flow-line {
                animation: flow-dash 7s linear infinite;
              }

              @keyframes flow-dash {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: -96; }
              }

              @media (prefers-reduced-motion: reduce) {
                .animated-flow-line {
                  animation: none;
                }
              }
            `}
          </style>
        </defs>

        {renderedLinks.map(({ link, from, to }) => {
        const flowState = getCorridorGridState(link.id);
        const flowUtilization = flowState ? utilization(flowState) : 0.55;
        const flowColor = flowState ? corridorTone(flowState) : assetStyles.interconnector.color;
        const globalScale = zoom <= 3 ? 0.4 : 1;
        const flowWidth = roundCoord((0.8 + flowUtilization * 1.5) * globalScale);
        const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
        return (
          <g key={link.id}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#020617"
              strokeLinecap="round"
              strokeWidth={flowWidth + 1.2 * globalScale}
              opacity={0.4 * globalScale + 0.08}
            />
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={flowColor}
              strokeLinecap="round"
              strokeWidth={(layer === "flows" || layer === "risk" ? flowWidth : 1.1 * globalScale)}
              strokeDasharray={zoom >= 5 && layer === "flows" ? "5 7" : undefined}
              opacity={(layer === "prices" || layer === "balance" ? 0.26 : 0.48) * (0.6 * globalScale + 0.4)}
              className={zoom >= 5 && layer === "flows" ? "animated-flow-line" : undefined}
            >
              <title>{`${link.name} - ${link.detail}`}</title>
            </line>
            {flowState && zoom >= 4 && (
              <g transform={`translate(${roundCoord(mid.x + 8)} ${roundCoord(mid.y + 12)})`}>
                <rect
                  width="78"
                  height="31"
                  rx="5"
                  fill="#020617"
                  opacity={layer === "flows" || layer === "risk" ? "0.86" : "0.58"}
                  stroke={flowColor}
                  strokeOpacity="0.28"
                />
                <text x="6" y="12" className="fill-slate-200 text-[9px] font-semibold">
                  {flowState.flowMw} MW
                </text>
                <text x="6" y="24" className="fill-slate-500 text-[8px]">
                  {Math.round(flowUtilization * 100)}% cap · {flowState.priceSpreadEurMwh}€
                </text>
              </g>
            )}
            {zoom >= 7 && (
              <g transform={`translate(${roundCoord(mid.x + 8)} ${roundCoord(mid.y - 8)})`}>
                <rect
                  width={(link.detail ?? "").length * 6 + 10}
                  height="17"
                  rx="4"
                  fill="#020617"
                  opacity="0.74"
                />
                <text x="5" y="12" className="fill-slate-300 text-[9px] font-medium">
                  {link.detail}
                </text>
              </g>
            )}
          </g>
        );
      })}
      </svg>

      {renderedLabels.map((label) => (
        <div
          key={label.id}
          className={`absolute -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap text-shadow-map ${
            label.kind === "region"
              ? "pointer-events-none text-[13px] font-semibold text-zinc-200/75"
              : label.kind === "country"
              ? "pointer-events-auto cursor-crosshair text-[11px] font-medium text-zinc-300/65"
              : "pointer-events-none text-[10px] font-medium text-zinc-400/60"
          }`}
          style={{ left: label.point.x, top: label.point.y }}
          onMouseMove={() => {
            if (label.kind !== "country") return;
            setCountryHover(label.label, { x: label.point.x, y: label.point.y });
          }}
          onMouseLeave={() => {
            if (label.kind !== "country") return;
            clearCountryHover();
          }}
        >
          {label.label}
        </div>
      ))}

      {renderedAssets.map(({ asset, point }) => {
        const style = getAssetVisual(asset);
        const radius = capacityRadius(asset);
        const gridState = getZoneGridState(asset.id);
        const isActive = asset.id === active;
        const isHovered = asset.id === hoveredAsset;
        const label =
          isActive ||
          isHovered ||
          (asset.type === "market_zone" && zoom >= 5)
            ? asset.name
            : "";

        return (
          <div key={asset.id} className="absolute" style={{ left: point.x, top: point.y }}>
            <button
              type="button"
              onClick={() => onSelect(asset)}
              onMouseEnter={() => setHoveredAsset(asset.id)}
              onMouseLeave={() => setHoveredAsset(null)}
              aria-label={`Select ${asset.name}`}
              className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none"
              style={{ width: radius * 2 + 18, height: radius * 2 + 18 }}
            >
              {(isActive || isHovered) && (
                <span
                  className="absolute inset-1 rounded-full border transition"
                  style={{ borderColor: style.color, opacity: 0.55 }}
                />
              )}
              <span
                className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full border bg-black/80 transition"
                style={{
                  borderColor: isActive || isHovered ? "#f8fafc" : style.color,
                  height: radius * 2,
                  width: radius * 2,
                }}
              >
                <span
                  className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    backgroundColor: style.color,
                    height: Math.max(4, radius * 0.68),
                    width: Math.max(4, radius * 0.68),
                  }}
                />
              </span>
            </button>
            {label && (
              <div className="pointer-events-none absolute left-3 top-[-26px] whitespace-nowrap rounded bg-black/70 px-2 py-1 text-[11px] font-medium text-slate-100 shadow-lg shadow-black/40">
                {label}
              </div>
            )}
            {gridState && asset.type === "market_zone" && zoom >= 7 && (
              <div className="pointer-events-none absolute left-4 top-3 min-w-24 rounded-md border border-slate-700/80 bg-black/80 px-2 py-1 text-[10px] text-slate-200 shadow-xl shadow-black/40">
                {layer === "prices"
                  ? `${Math.round(gridState.priceEurMwh * horizonMultiplier)} €/MWh`
                  : layer === "balance"
                  ? `${gridState.generationMw - gridState.loadMw} MW`
                  : layer === "risk"
                  ? `${gridState.congestionRisk.toUpperCase()} · ${gridState.batteryArbitrageScore}`
                  : `${gridState.zone} · ${gridState.renewableShare ? Math.round(gridState.renewableShare * 100) : 0}% RES`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getAssetVisual(asset: GisAsset) {
  if (asset.type !== "power_plant") {
    return assetStyles[asset.type];
  }
  return {
    color: fuelColor(asset.fuel_type ?? "unknown"),
    label: asset.fuel_type ? `${capitalise(asset.fuel_type)} plant` : assetStyles.power_plant.label,
  };
}

function capacityRadius(asset: GisAsset) {
  if (asset.type !== "power_plant") {
    return asset.type === "risk_marker" ? 5 : asset.type === "market_zone" ? 4 : 3.5;
  }
  const capacity = asset.capacity_mw ?? 250;
  if (capacity >= 5000) return 5.2;
  if (capacity >= 2500) return 4.6;
  if (capacity >= 1000) return 4;
  if (capacity >= 500) return 3.4;
  return 2.8;
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

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveLinkCoordinates(link: GisLink, assets: Map<string, GisAsset>) {
  if (link.from && link.to) {
    return link as GisLink & { from: [number, number]; to: [number, number] };
  }
  const from = link.from_asset_id ? assets.get(link.from_asset_id) : undefined;
  const to = link.to_asset_id ? assets.get(link.to_asset_id) : undefined;
  if (!from || !to) {
    return null;
  }
  return {
    ...link,
    from: [from.lon, from.lat] as [number, number],
    to: [to.lon, to.lat] as [number, number],
    detail: link.detail ?? `${Math.round(link.capacity_mw ?? 0)} MW`,
  };
}

function getRegionClusters(assets: GisAsset[]) {
  return CLUSTER_DEFS.map((cluster) => {
    const clusterAssets = assets.filter((asset) =>
      cluster.countries.includes(asset.country ?? "") || cluster.fallback(asset)
    );
    return {
      id: cluster.id,
      label: cluster.label,
      center: cluster.center,
      assets: clusterAssets,
      capacityMw: clusterAssets.reduce((sum, asset) => sum + (asset.capacity_mw ?? 0), 0),
      riskCount: clusterAssets.filter((asset) => asset.type === "risk_marker").length,
    };
  }).filter((cluster) => cluster.assets.length > 0);
}

function createInfrastructureStyle(
  basemap: BasemapKey,
  landData: MapFeatureCollection,
  countryBorderData: MapFeatureCollection,
  countryData: MapFeatureCollection,
  densityData: MapFeatureCollection
): StyleSpecification {
  const style = BASEMAPS[basemap];
  return {
    version: 8 as const,
    sources: {
      "basemap-dark": {
        type: "raster" as const,
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
      "basemap-light": {
        type: "raster" as const,
        tiles: [
          "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
      land: {
        type: "geojson" as const,
        data: landData,
      },
      "country-borders": {
        type: "geojson" as const,
        data: countryBorderData,
      },
      "country-hover": {
        type: "geojson" as const,
        data: countryData,
      },
      "energy-density": {
        type: "geojson" as const,
        data: densityData,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": style.water,
        },
      },
      {
        id: "land-fill",
        type: "fill",
        source: "land",
        paint: {
          "fill-color": style.land,
          "fill-opacity": basemap === "dark" ? 0.24 : 0.2,
        },
      },
      {
        id: "basemap-dark",
        type: "raster",
        source: "basemap-dark",
        paint: {
          "raster-opacity": basemap === "dark" ? 0.76 : 0,
          "raster-saturation": -0.36,
          "raster-contrast": 0.12,
          "raster-brightness-min": 0.04,
          "raster-brightness-max": 0.82,
        },
      },
      {
        id: "basemap-light",
        type: "raster",
        source: "basemap-light",
        paint: {
          "raster-opacity": basemap === "light" ? 0.86 : 0,
          "raster-saturation": -0.16,
          "raster-contrast": 0.04,
          "raster-brightness-min": 0.06,
          "raster-brightness-max": 1,
        },
      },
      {
        id: "coastline-glow",
        type: "line",
        source: "land",
        paint: {
          "line-color": style.coast,
          "line-opacity": 0,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.3, 7, 1.2],
        },
      },
      {
        id: "land-outline",
        type: "line",
        source: "land",
        paint: {
          "line-color": style.landStroke,
          "line-opacity": 0,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.2, 7, 0.9],
        },
      },
      {
        id: "country-borders",
        type: "line",
        source: "country-borders",
        paint: {
          "line-color": style.landStroke,
          "line-opacity": 0,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.35, 4, 0.6, 8, 1.1],
        },
      },
      {
        id: "country-hover-fill",
        type: "fill",
        source: "country-hover",
        filter: ["==", ["get", "name"], ""],
        paint: {
          "fill-color": basemap === "dark" ? "#60a5fa" : "#2563eb",
          "fill-opacity": basemap === "dark" ? 0.18 : 0.16,
        },
      },
      {
        id: "country-hover-outline",
        type: "line",
        source: "country-hover",
        filter: ["==", ["get", "name"], ""],
        paint: {
          "line-color": basemap === "dark" ? "#bfdbfe" : "#1d4ed8",
          "line-opacity": 0.88,
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1.1, 5, 1.7, 8, 2.4],
        },
      },
      {
        id: "country-hover-hit",
        type: "fill",
        source: "country-hover",
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": 0.01,
        },
      },
      {
        id: "energy-density-glow",
        type: "circle",
        source: "energy-density",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 1.2, 6, 2.4, 9, 4],
          "circle-blur": 0.9,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.2, 5, 0.55, 9, 0.2],
        },
      },
      {
        id: "energy-density-core",
        type: "circle",
        source: "energy-density",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 0.45, 6, 1.1, 9, 2],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.45, 5, 0.72, 9, 0.38],
        },
      },
    ],
  } as StyleSpecification;
}

function landRingsToFeatures(landRings: LandRing[]): MapFeatureCollection {
  return {
    type: "FeatureCollection",
    features: landRings
      .filter((ring) => ring.length >= 4)
      .map((ring, index) => ({
        type: "Feature",
        properties: { id: `land-${index}` },
        geometry: {
          type: "Polygon",
          coordinates: [ensureClosedRing(ring)],
        },
      })),
  };
}

function countryBorderRingsToFeatures(borderRings: LandRing[]): MapFeatureCollection {
  return {
    type: "FeatureCollection",
    features: borderRings
      .filter((ring) => ring.length >= 2)
      .map((ring, index) => ({
        type: "Feature",
        properties: { id: `border-${index}` },
        geometry: {
          type: "LineString",
          coordinates: ring,
        },
      })),
  };
}

function decodeCountryTopologyFeatures(topology: LandTopology): MapFeatureCollection {
  const object = topology.objects.countries;
  if (!object) return { type: "FeatureCollection", features: [] };

  const arcs = topology.arcs.map((arc) => decodeArc(arc, topology.transform));
  const features: MapFeature[] = [];

  object.geometries.forEach((geometry, geometryIndex) => {
    const name = geometry.properties?.name ?? `Country ${geometryIndex + 1}`;
    if (!HOVERABLE_COUNTRY_NAMES.has(name)) return;

    const polygons =
      geometry.type === "Polygon"
        ? [geometry.arcs as number[][]]
        : (geometry.arcs as number[][][]);

    polygons.forEach((polygon, polygonIndex) => {
      const outerRing = polygon[0];
      if (!outerRing) return;

      const ring = outerRing.flatMap((arcIndex, index) => {
        const arc = getArc(arcs, arcIndex);
        return index === 0 ? arc : arc.slice(1);
      });

      if (ring.length < 4) return;

      features.push({
        type: "Feature",
        properties: {
          id: `${name}-${geometryIndex}-${polygonIndex}`,
          name,
        },
        geometry: {
          type: "Polygon",
          coordinates: [ensureClosedRing(simplifyRing(ring))],
        },
      });
    });
  });

  return { type: "FeatureCollection", features };
}

function densityFieldsToFeatures(): MapFeatureCollection {
  const fields = [...ENERGY_DENSITY_FIELDS, ...EUROPE_DENSITY_FIELDS];
  const features: MapFeature[] = [];

  fields.forEach((field, fieldIndex) => {
    const region = (field as DensityField & { region?: string }).region ?? "global";
    const count = Math.min(field.count, 120);
    for (let index = 0; index < count; index += 1) {
      const lonSeed = seededUnit(fieldIndex * 101 + index * 17);
      const latSeed = seededUnit(fieldIndex * 211 + index * 31);
      const laneSeed = seededUnit(fieldIndex * 307 + index * 43);
      const lon =
        field.bounds.lonMin +
        (field.bounds.lonMax - field.bounds.lonMin) *
          (index % 5 === 0 ? lonSeed * 0.45 + laneSeed * 0.55 : lonSeed);
      const lat =
        field.bounds.latMin +
        (field.bounds.latMax - field.bounds.latMin) *
          (index % 4 === 0 ? latSeed * 0.38 + laneSeed * 0.62 : latSeed);

      features.push({
        type: "Feature",
        properties: {
          color: field.color,
          intensity: field.intensity,
          region,
        },
        geometry: {
          type: "Point",
          coordinates: [roundCoord(lon), roundCoord(lat)],
        },
      });
    }
  });

  return { type: "FeatureCollection", features };
}

function ensureClosedRing(ring: LandRing): LandRing {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || (first[0] === last[0] && first[1] === last[1])) return ring;
  return [...ring, first];
}

function nearestZoomIndex(mapZoom: number) {
  let bestIndex = 0;
  let bestDelta = Number.POSITIVE_INFINITY;
  ZOOM_STEPS.forEach((step, index) => {
    const delta = Math.abs(step - mapZoom);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function toProjectedPoint(point: { x: number; y: number }): ProjectedPoint {
  return { x: roundCoord(point.x), y: roundCoord(point.y) };
}

function shouldShowMapLabel(label: MapLabel, activeRegion: MapRegionId, mapZoom: number) {
  if (mapZoom < label.minZoom) return false;
  if (label.kind === "region") return activeRegion === "global" || label.regions?.includes(activeRegion);
  if (!label.regions || label.regions.length === 0) return true;
  if (activeRegion === "global") return label.kind !== "city";
  return label.regions.includes(activeRegion);
}

function filterAssetsForMapRegion(assets: GisAsset[], activeRegion: MapRegionId) {
  if (activeRegion === "global") return assets;
  const countries = REGION_COUNTRIES[activeRegion] ?? [];
  const bounds = REGION_BOUNDS[activeRegion];
  if (countries.length === 0 && !bounds) return assets;
  return assets.filter((asset) => {
    if (asset.country) return countries.includes(asset.country);
    if (!bounds) return false;
    return (
      asset.lon >= bounds.lonMin &&
      asset.lon <= bounds.lonMax &&
      asset.lat >= bounds.latMin &&
      asset.lat <= bounds.latMax
    );
  });
}

function decodeLandTopology(topology: LandTopology, key: "land" | "countries" = "land"): LandRing[] {
  const object = topology.objects[key];
  if (!object) return [];
  const arcs = topology.arcs.map((arc) => decodeArc(arc, topology.transform));
  const rings: LandRing[] = [];

  for (const geometry of object.geometries) {
    const polygons =
      geometry.type === "Polygon"
        ? [geometry.arcs as number[][]]
        : (geometry.arcs as number[][][]);

    for (const polygon of polygons) {
      for (const ringArcs of polygon) {
        const ring = ringArcs.flatMap((arcIndex, index) => {
          const arc = getArc(arcs, arcIndex);
          return index === 0 ? arc : arc.slice(1);
        });
        if (ring.length >= 4) {
          rings.push(simplifyRing(ring));
        }
      }
    }
  }

  return rings;
}

function decodeArc(
  arc: TopologyArc,
  transform: LandTopology["transform"]
): LandRing {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [
      x * transform.scale[0] + transform.translate[0],
      y * transform.scale[1] + transform.translate[1],
    ] as [number, number];
  });
}

function getArc(arcs: LandRing[], index: number) {
  if (index >= 0) return arcs[index];
  return [...arcs[-index - 1]].reverse();
}

function simplifyRing(ring: LandRing) {
  if (ring.length <= 140) return ring;
  const step = Math.ceil(ring.length / 140);
  const simplified = ring.filter((_, index) => index % step === 0);
  const last = ring[ring.length - 1];
  if (last && simplified[simplified.length - 1] !== last) {
    simplified.push(last);
  }
  return simplified;
}

function getMapFrame(lon: number, lat: number, zoom: number, width = WIDTH, height = HEIGHT): MapFrame {
  const center = lonLatToWorld(lon, lat, zoom);
  const topLeft = {
    x: roundCoord(center.x - width / 2),
    y: roundCoord(center.y - height / 2),
  };

  return {
    topLeft,
    width,
    height,
  };
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function projectToFrame(
  lon: number,
  lat: number,
  zoom: number,
  frame: ReturnType<typeof getMapFrame>
) {
  const world = lonLatToWorld(lon, lat, zoom);
  return {
    x: roundCoord(world.x - frame.topLeft.x),
    y: roundCoord(world.y - frame.topLeft.y),
  };
}

function isInsideFrame(point: { x: number; y: number }, margin = 0, width = WIDTH, height = HEIGHT) {
  return (
    point.x >= -margin &&
    point.x <= width + margin &&
    point.y >= -margin &&
    point.y <= height + margin
  );
}

function lonLatToWorld(lon: number, lat: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((clamp(lat, -85.05112878, 85.05112878) * Math.PI) / 180);

  return {
    x: ((lon + 180) / 360) * scale,
    y:
      (0.5 -
        Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
      scale,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundCoord(value: number) {
  return Number(value.toFixed(3));
}

function panCenter(
  center: typeof DEFAULT_CENTER,
  zoom: number,
  direction: "north" | "south" | "east" | "west"
) {
  const step =
    zoom >= 9 ? 0.22 : zoom >= 8 ? 0.36 : zoom >= 7 ? 0.62 : zoom >= 6 ? 1.1 : zoom >= 4 ? 4.5 : 13;
  if (direction === "north") return { ...center, lat: clamp(center.lat + step, -70, 78) };
  if (direction === "south") return { ...center, lat: clamp(center.lat - step, -70, 78) };
  if (direction === "east") return { ...center, lon: wrapLon(center.lon + step) };
  return { ...center, lon: wrapLon(center.lon - step) };
}

function wrapLon(lon: number) {
  if (lon > 180) return lon - 360;
  if (lon < -180) return lon + 360;
  return lon;
}

function overviewPoint(lon: number, lat: number) {
  return {
    x: roundCoord(((lon + 180) / 360) * 240),
    y: roundCoord(((85 - clamp(lat, -70, 85)) / 155) * 120),
  };
}
