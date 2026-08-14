"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Globe2, Layers, LocateFixed, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  { id: "europe", label: "Europe", center: { lon: 10.8, lat: 55.1 }, zoomIndex: 4 },
  { id: "ercot", label: "ERCOT", center: ZONE_CENTERS.ERCOT, zoomIndex: 5 },
  { id: "tokyo", label: "Tokyo", center: ZONE_CENTERS["JP-TK"], zoomIndex: 5 },
] as const;
const DEFAULT_CENTER: GeoCenter = { lon: 10.8, lat: 55.1 };

const BASEMAPS = {
  dark: {
    label: "Dark",
    attribution: "Offline vector basemap",
    water: "#06111f",
    land: "#10281f",
    landStroke: "#1d4f3e",
    coast: "#38bdf8",
    grid: "#1e293b",
    text: "#94a3b8",
    veil: 0.08,
  },
  light: {
    label: "Light",
    attribution: "Offline vector basemap",
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

const VECTOR_LANDMASSES: Array<{ id: string; label: string; points: Array<[number, number]> }> = [
  {
    id: "north-america",
    label: "North America",
    points: [
      [-168, 72],
      [-136, 70],
      [-110, 62],
      [-86, 54],
      [-62, 48],
      [-58, 30],
      [-82, 18],
      [-104, 16],
      [-122, 28],
      [-145, 46],
      [-168, 58],
    ],
  },
  {
    id: "europe-mainland",
    label: "Europe",
    points: [
      [-11, 36],
      [-8, 44],
      [0, 50],
      [8, 55],
      [18, 56],
      [30, 60],
      [42, 54],
      [39, 45],
      [30, 40],
      [20, 36],
      [8, 40],
      [-2, 43],
    ],
  },
  {
    id: "scandinavia",
    label: "Scandinavia",
    points: [
      [5, 55],
      [9, 60],
      [14, 66],
      [20, 70],
      [28, 70],
      [32, 64],
      [26, 59],
      [18, 56],
      [10, 56],
    ],
  },
  {
    id: "great-britain",
    label: "Great Britain",
    points: [
      [-7, 50],
      [-4, 58],
      [1, 57],
      [2, 52],
      [-2, 50],
    ],
  },
  {
    id: "japan",
    label: "Japan",
    points: [
      [130, 32],
      [134, 35],
      [138, 37],
      [142, 41],
      [145, 44],
      [144, 38],
      [140, 35],
      [136, 33],
      [132, 31],
    ],
  },
  {
    id: "asia",
    label: "Asia",
    points: [
      [42, 56],
      [66, 62],
      [96, 58],
      [126, 50],
      [140, 40],
      [132, 24],
      [102, 18],
      [72, 24],
      [48, 35],
      [38, 46],
    ],
  },
  {
    id: "africa",
    label: "Africa",
    points: [
      [-18, 36],
      [8, 36],
      [32, 30],
      [42, 12],
      [34, -24],
      [18, -35],
      [0, -28],
      [-14, 8],
    ],
  },
];

export function EnergyInfrastructureMap({
  active,
  assets = sampleAssets,
  filter,
  links = sampleLinks,
  onSelect,
}: {
  active: string | null;
  assets?: GisAsset[];
  filter: AssetType | "all";
  links?: GisLink[];
  onSelect: (asset: GisAsset) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(4);
  const [basemap, setBasemap] = useState<BasemapKey>("dark");
  const [layer, setLayer] = useState<GridLayer>("flows");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("now");
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState("europe");
  const { zone } = useMarketScope();
  const previousZone = useRef(zone);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const zoom = ZOOM_STEPS[zoomIndex];
  const visible = assets.filter(
    (asset) => filter === "all" || asset.type === filter
  );
  const map = useMemo(() => getMapFrame(center.lon, center.lat, zoom), [
    center.lat,
    center.lon,
    zoom,
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
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

  useEffect(() => {
    const node = mapViewportRef.current;
    if (!node) return;

    function handleWheelZoom(event: globalThis.WheelEvent) {
      event.preventDefault();
      if (Math.abs(event.deltaY) < 2) return;
      const direction = event.deltaY < 0 ? 1 : -1;
      setZoomIndex((value) =>
        Math.max(0, Math.min(ZOOM_STEPS.length - 1, value + direction))
      );
    }

    node.addEventListener("wheel", handleWheelZoom, { passive: false });
    return () => node.removeEventListener("wheel", handleWheelZoom);
  }, []);

  function jumpToRegion(regionId: string) {
    const region = REGIONS.find((item) => item.id === regionId);
    if (!region) return;
    setCenter(region.center);
    setZoomIndex(region.zoomIndex);
    setActiveRegion(region.id);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Global grid map
          </p>
          <p className="text-sm text-slate-300">
            {visible.length} assets, {links.length} animated corridors, zoom {zoom}
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
            hoveredAsset={hoveredAsset}
            map={map}
            onSelect={onSelect}
            setHoveredAsset={setHoveredAsset}
            visible={visible}
            links={links}
            assets={assets}
            zoom={zoom}
            layer={layer}
            timeHorizon={timeHorizon}
          />
        ) : (
          <div className="absolute inset-0 bg-slate-900">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(30,64,175,0.18),transparent_55%)]" />
          </div>
        )}

        <LiveGridPulse />

        <GridTimeline value={timeHorizon} onChange={setTimeHorizon} />

        <div className="absolute left-3 top-3 flex flex-col gap-2">
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

        <div className="absolute left-3 top-32 rounded-lg border border-slate-700/80 bg-slate-950/90 p-2 shadow-xl shadow-black/30">
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

        <div className="absolute right-3 top-3 rounded-lg border border-slate-700/80 bg-slate-950/90 p-2 shadow-xl shadow-black/30">
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

        <LayerSwitcher value={layer} onChange={setLayer} />

        <WorldOverview
          activeRegion={activeRegion}
          assets={assets}
          center={center}
          filter={filter}
          onJump={jumpToRegion}
        />

        <div className="absolute bottom-3 left-3 rounded-md bg-slate-950/85 px-3 py-2 text-xs text-slate-300 shadow-lg shadow-black/30">
          Animated grid overlay · {visible.length} assets · {links.length} live flow paths
        </div>
        <div className="absolute bottom-3 right-3 rounded-md bg-slate-950/85 px-2 py-1 text-[11px] font-medium text-slate-400">
          {BASEMAPS[basemap].attribution}
        </div>
      </div>
    </div>
  );
}

function LiveGridPulse() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 w-72 -translate-x-1/2 rounded-lg border border-slate-700/80 bg-slate-950/88 px-3 py-2 shadow-xl shadow-black/30">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
        <span>Grid heartbeat</span>
        <span className="text-green-400">50.00 Hz</span>
      </div>
      <svg viewBox="0 0 260 28" className="mt-1 h-7 w-full overflow-visible">
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
    <div className="absolute left-1/2 top-24 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-950/90 p-1 shadow-xl shadow-black/30">
      {horizons.map((horizon) => (
        <button
          key={horizon.id}
          type="button"
          onClick={() => onChange(horizon.id)}
          aria-label={`Use ${horizon.label} timeline`}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
  onChange,
  value,
}: {
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
    <div className="absolute right-3 top-28 rounded-lg border border-slate-700/80 bg-slate-950/90 p-2 shadow-xl shadow-black/30">
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
    <div className="absolute bottom-12 right-3 w-64 rounded-lg border border-slate-700/80 bg-slate-950/90 p-3 shadow-xl shadow-black/30">
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

function OfflineBasemap({
  basemap,
  map,
  zoom,
}: {
  basemap: BasemapKey;
  map: ReturnType<typeof getMapFrame>;
  zoom: number;
}) {
  const style = BASEMAPS[basemap];
  const meridians = [-180, -120, -60, 0, 60, 120, 180];
  const parallels = [-60, -30, 0, 30, 60];
  const visibleLabels = zoom >= 5;

  return (
    <g>
      <rect width={WIDTH} height={HEIGHT} fill={style.water} />
      <radialGradient id="offline-water-depth" cx="50%" cy="38%" r="78%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity={basemap === "dark" ? "0.12" : "0.2"} />
        <stop offset="62%" stopColor="#020617" stopOpacity={basemap === "dark" ? "0.14" : "0.04"} />
        <stop offset="100%" stopColor="#020617" stopOpacity={basemap === "dark" ? "0.38" : "0.12"} />
      </radialGradient>
      <rect width={WIDTH} height={HEIGHT} fill="url(#offline-water-depth)" />

      {meridians.map((lon) => {
        const from = projectToFrame(lon, -72, zoom, map);
        const to = projectToFrame(lon, 72, zoom, map);
        return (
          <line
            key={`lon-${lon}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={style.grid}
            strokeWidth="1"
            opacity="0.34"
          />
        );
      })}
      {parallels.map((lat) => {
        const from = projectToFrame(-180, lat, zoom, map);
        const to = projectToFrame(180, lat, zoom, map);
        return (
          <line
            key={`lat-${lat}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={style.grid}
            strokeWidth="1"
            opacity="0.34"
          />
        );
      })}

      {VECTOR_LANDMASSES.map((land) => {
        const path = polygonPath(land.points, zoom, map);
        const labelPoint = centroid(land.points);
        const screenLabel = projectToFrame(labelPoint[0], labelPoint[1], zoom, map);
        return (
          <g key={land.id}>
            <path d={path} fill="#020617" opacity="0.2" transform="translate(2 2)" />
            <path
              d={path}
              fill={style.land}
              stroke={style.landStroke}
              strokeWidth="1.2"
              opacity={basemap === "dark" ? "0.88" : "0.82"}
            />
            <path d={path} fill="none" stroke={style.coast} strokeWidth="0.7" opacity="0.34" />
            {visibleLabels && (
              <text
                x={screenLabel.x}
                y={screenLabel.y}
                fill={style.text}
                fontSize="10"
                fontWeight="600"
                opacity="0.58"
                textAnchor="middle"
              >
                {land.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function MapCanvas({
  active,
  assets,
  basemap,
  hoveredAsset,
  layer,
  links,
  map,
  onSelect,
  setHoveredAsset,
  timeHorizon,
  visible,
  zoom,
}: {
  active: string | null;
  assets: GisAsset[];
  basemap: BasemapKey;
  hoveredAsset: string | null;
  layer: GridLayer;
  links: GisLink[];
  map: ReturnType<typeof getMapFrame>;
  onSelect: (asset: GisAsset) => void;
  setHoveredAsset: (id: string | null) => void;
  timeHorizon: TimeHorizon;
  visible: GisAsset[];
  zoom: number;
}) {
  const basemapStyle = BASEMAPS[basemap];
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
  const horizonMultiplier =
    timeHorizon === "ida" ? 0.92 : timeHorizon === "3da" ? 1.08 : timeHorizon === "1da" ? 1.03 : 1;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 h-full w-full">
      <defs>
        <style>
          {`
            .animated-flow-line {
              animation: flow-dash 8s linear infinite;
            }

            .asset-node {
              transition: transform 160ms ease, opacity 160ms ease;
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
        <filter id="map-asset-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker
          id="flow-arrow"
          markerHeight="7"
          markerWidth="7"
          orient="auto"
          refX="6"
          refY="3.5"
        >
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#c084fc" opacity="0.82" />
        </marker>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill="#08111f" />
      <OfflineBasemap basemap={basemap} map={map} zoom={zoom} />
      <rect width={WIDTH} height={HEIGHT} fill="#020617" opacity={basemapStyle.veil} />

      {resolvedLinks.map((link) => {
        const flowState = getCorridorGridState(link.id);
        const flowUtilization = flowState ? utilization(flowState) : 0.55;
        const flowColor = flowState ? corridorTone(flowState) : assetStyles.interconnector.color;
        const flowWidth = roundCoord(1.2 + flowUtilization * 2.8);
        const from = projectToFrame(link.from[0], link.from[1], zoom, map);
        const to = projectToFrame(link.to[0], link.to[1], zoom, map);
        const pathFrom = flowState?.direction === "reverse" ? to : from;
        const pathTo = flowState?.direction === "reverse" ? from : to;
        const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
        const pathId = `flow-path-${link.id}`;
        const path = `M ${pathFrom.x} ${pathFrom.y} L ${pathTo.x} ${pathTo.y}`;
        return (
          <g key={link.id}>
            <path id={pathId} d={path} fill="none" stroke="none" />
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#020617"
              strokeLinecap="round"
              strokeWidth={flowWidth + 3}
              opacity={0.62}
            />
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={flowColor}
              strokeLinecap="round"
              strokeWidth={layer === "flows" || layer === "risk" ? flowWidth : 2.2}
              strokeDasharray={layer === "flows" ? "10 8" : "5 9"}
              opacity={layer === "prices" || layer === "balance" ? 0.38 : 0.82}
              markerEnd="url(#flow-arrow)"
              className="animated-flow-line"
            >
              <title>{`${link.name} - ${link.detail}`}</title>
            </line>
            {[0, 1, 2].map((particle) => (
              <circle
                key={`${link.id}-particle-${particle}`}
                r={particle === 0 ? 3.4 + flowUtilization * 1.4 : 2.6}
                fill={particle === 0 ? "#f8fafc" : flowColor}
                opacity="0"
              >
                <animateMotion
                  dur={`${Math.max(2.2, 5.4 - flowUtilization * 2.2) + particle * 0.55}s`}
                  begin={`${particle * 1.15}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                >
                  <mpath href={`#${pathId}`} />
                </animateMotion>
                <animate
                  attributeName="opacity"
                  values="0;0.95;0.95;0"
                  keyTimes="0;0.15;0.78;1"
                  dur={`${Math.max(2.2, 5.4 - flowUtilization * 2.2) + particle * 0.55}s`}
                  begin={`${particle * 1.15}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
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

      {visible.map((asset) => {
        const point = projectToFrame(asset.lon, asset.lat, zoom, map);
        const style = getAssetVisual(asset);
        const radius = capacityRadius(asset);
        const gridState = getZoneGridState(asset.id);
        const isActive = asset.id === active;
        const isHovered = asset.id === hoveredAsset;
        const label =
          isActive ||
          isHovered ||
          (asset.type === "market_zone" && zoom >= 8) ||
          (asset.type === "power_plant" && (asset.capacity_mw ?? 0) >= 3000 && zoom >= 5)
            ? asset.name
            : "";

        return (
          <g key={asset.id} className="asset-node" transform={`translate(${point.x} ${point.y})`}>
            <circle
              r={isActive || isHovered ? radius + 9 : asset.type === "risk_marker" ? 16 : radius + 5}
              fill="none"
              stroke={style.color}
              strokeWidth="1.6"
              opacity={asset.type === "risk_marker" ? 0.42 : 0.28}
            >
              <animate
                attributeName="r"
                values={
                  isActive || isHovered
                    ? `${radius + 5};${radius + 14};${radius + 5}`
                    : asset.type === "risk_marker"
                    ? "12;22;12"
                    : `${radius + 2};${radius + 9};${radius + 2}`
                }
                dur={asset.type === "risk_marker" ? "1.8s" : "2.8s"}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values={asset.type === "risk_marker" ? "0.48;0.08;0.48" : "0.35;0.06;0.35"}
                dur={asset.type === "risk_marker" ? "1.8s" : "2.8s"}
                repeatCount="indefinite"
              />
            </circle>
            <circle
              r={isActive || isHovered ? radius + 5 : radius}
              fill={style.color}
              opacity={isActive || isHovered ? 0.3 : 0.15}
              filter="url(#map-asset-glow)"
            />
            <g
              role="button"
              tabIndex={0}
              onClick={() => onSelect(asset)}
              onMouseEnter={() => setHoveredAsset(asset.id)}
              onMouseLeave={() => setHoveredAsset(null)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(asset);
                }
              }}
              aria-label={`Select ${asset.name}`}
              className="cursor-pointer outline-none"
            >
              <AssetSymbol asset={asset} active={isActive || isHovered} color={style.color} radius={radius} />
            </g>
            {label && (
              <g transform="translate(12 -19)">
                <rect
                  width={label.length * 7.2 + 12}
                  height="19"
                  rx="4"
                  fill="#020617"
                  opacity="0.82"
                />
                <text
                  x="6"
                  y="13"
                  className="select-none fill-slate-100 text-[10px] font-medium"
                >
                  {label}
                </text>
              </g>
            )}
            {gridState && asset.type === "market_zone" && zoom >= 4 && (
              <ZoneGridBadge
                layer={layer}
                state={{
                  ...gridState,
                  priceEurMwh: Math.round(gridState.priceEurMwh * horizonMultiplier),
                  loadMw: Math.round(gridState.loadMw * horizonMultiplier),
                  generationMw: Math.round(gridState.generationMw * (2 - horizonMultiplier)),
                }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ZoneGridBadge({
  layer,
  state,
}: {
  layer: GridLayer;
  state: NonNullable<ReturnType<typeof getZoneGridState>>;
}) {
  const balance = state.generationMw - state.loadMw;
  const balancePositive = balance >= 0;
  const riskColor =
    state.congestionRisk === "high"
      ? "#ef4444"
      : state.congestionRisk === "medium"
      ? "#f59e0b"
      : "#22c55e";
  const label =
    layer === "prices"
      ? `${state.priceEurMwh} €/MWh`
      : layer === "balance"
      ? `${balancePositive ? "+" : ""}${balance} MW`
      : layer === "risk"
      ? `${state.congestionRisk.toUpperCase()} · ${state.batteryArbitrageScore}`
      : `${state.zone} · ${state.renewableShare ? Math.round(state.renewableShare * 100) : 0}% RES`;
  const sublabel =
    layer === "prices"
      ? `${state.zone} · ${state.dataAgeMinutes}m old`
      : layer === "balance"
      ? `${state.generationMw} gen / ${state.loadMw} load`
      : layer === "risk"
      ? `arb score ${state.batteryArbitrageScore} · ${state.frequencyHz.toFixed(3)} Hz`
      : `${state.priceEurMwh}€ · ${balancePositive ? "export" : "import"}`;

  return (
    <g transform="translate(15 12)">
      <rect
        width={Math.max(label.length * 6.2 + 14, 92)}
        height="34"
        rx="6"
        fill="#020617"
        opacity="0.9"
        stroke={layer === "risk" ? riskColor : "#334155"}
        strokeOpacity="0.65"
      />
      <rect
        x="5"
        y="6"
        width="4"
        height="22"
        rx="2"
        fill={layer === "risk" ? riskColor : balancePositive ? "#22c55e" : "#60a5fa"}
      >
        <animate attributeName="opacity" values="0.55;1;0.55" dur="2.4s" repeatCount="indefinite" />
      </rect>
      <text x="14" y="15" className="fill-slate-100 text-[9px] font-semibold">
        {label}
      </text>
      <text x="14" y="27" className="fill-slate-500 text-[8px]">
        {sublabel}
      </text>
    </g>
  );
}

function AssetSymbol({
  active,
  asset,
  color,
  radius,
}: {
  active: boolean;
  asset: GisAsset;
  color: string;
  radius: number;
}) {
  const size = active ? Math.max(8, radius * 0.78) : Math.max(5, radius * 0.62);
  const outer = active ? radius + 4 : radius + 1.5;
  const common = {
    stroke: "#f8fafc",
    strokeOpacity: 0.88,
    strokeWidth: 1.4,
  };

  if (asset.type === "lng_terminal") {
    return (
      <>
        <rect
          x={-size}
          y={-size}
          width={size * 2}
          height={size * 2}
          transform="rotate(45)"
          fill={color}
          {...common}
        />
        <title>{`${asset.name} - ${asset.detail}`}</title>
      </>
    );
  }

  if (asset.type === "risk_marker") {
    return (
      <>
        <path d={`M0 ${-outer} L${outer} ${outer} L${-outer} ${outer} Z`} fill={color} {...common} />
        <title>{`${asset.name} - ${asset.detail}`}</title>
      </>
    );
  }

  if (asset.type === "power_plant") {
    return (
      <>
        <circle r={outer} fill="#020617" stroke={color} strokeWidth="1.8" opacity="0.94" />
        <circle r={Math.max(3, size)} fill={color} {...common} />
        <title>{`${asset.name} - ${asset.detail} · ${asset.capacity_mw ?? "n/a"} MW · ${asset.fuel_type ?? "unknown"}`}</title>
      </>
    );
  }

  if (asset.type === "market_zone") {
    return (
      <>
        <circle r={outer} fill="#020617" stroke={color} strokeWidth="2.2" />
        <circle r={size / 2} fill={color} />
        <title>{`${asset.name} - ${asset.detail}`}</title>
      </>
    );
  }

  return (
    <>
      <circle r={size} fill={color} {...common} />
      <circle r={outer} fill="none" stroke={color} strokeWidth={1.4} opacity={0.65} />
      <title>{`${asset.name} - ${asset.detail}`}</title>
    </>
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
    return asset.type === "risk_marker" ? 9 : 8;
  }
  const capacity = asset.capacity_mw ?? 250;
  if (capacity >= 5000) return 14;
  if (capacity >= 2500) return 12;
  if (capacity >= 1000) return 10;
  if (capacity >= 500) return 8;
  return 6;
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

function getMapFrame(lon: number, lat: number, zoom: number) {
  const center = lonLatToWorld(lon, lat, zoom);
  const topLeft = {
    x: roundCoord(center.x - WIDTH / 2),
    y: roundCoord(center.y - HEIGHT / 2),
  };

  return {
    topLeft,
  };
}

function polygonPath(
  points: Array<[number, number]>,
  zoom: number,
  frame: ReturnType<typeof getMapFrame>
) {
  return points
    .map(([lon, lat], index) => {
      const point = projectToFrame(lon, lat, zoom, frame);
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ")
    .concat(" Z");
}

function centroid(points: Array<[number, number]>) {
  const total = points.reduce(
    (sum, point) => ({ lon: sum.lon + point[0], lat: sum.lat + point[1] }),
    { lon: 0, lat: 0 }
  );
  return [total.lon / points.length, total.lat / points.length] as [number, number];
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
