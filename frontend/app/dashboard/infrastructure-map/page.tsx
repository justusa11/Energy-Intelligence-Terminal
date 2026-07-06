"use client";

import { useState } from "react";
import {
  assetStyles,
  project,
  sampleAssets,
  sampleLinks,
  type AssetType,
} from "@/lib/sampleGis";

const WIDTH = 800;
const HEIGHT = 560;

export default function InfrastructureMapPage() {
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState<AssetType | "all">("all");

  const visible = sampleAssets.filter(
    (a) => filter === "all" || a.type === filter
  );
  const selected = sampleAssets.find((a) => a.id === active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Infrastructure Map</h1>
        <p className="mt-2 text-sm text-slate-400">
          Market zones, interconnectors, LNG terminals, wind farms, and risk markers
          (sample GIS assets — Northern Europe).
        </p>
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 xl:col-span-2">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full rounded-lg bg-slate-950"
          >
            {sampleLinks.map((link) => {
              const [x1, y1] = project(link.from[0], link.from[1], WIDTH, HEIGHT);
              const [x2, y2] = project(link.to[0], link.to[1], WIDTH, HEIGHT);
              return (
                <line
                  key={link.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={assetStyles.interconnector.color}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  opacity={0.7}
                >
                  <title>{`${link.name} — ${link.detail}`}</title>
                </line>
              );
            })}

            {visible.map((asset) => {
              const [x, y] = project(asset.lon, asset.lat, WIDTH, HEIGHT);
              const style = assetStyles[asset.type];
              const isActive = asset.id === active;
              return (
                <g
                  key={asset.id}
                  onClick={() => setActive(asset.id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? 11 : 7}
                    fill={style.color}
                    fillOpacity={asset.type === "market_zone" ? 0.35 : 0.9}
                    stroke={style.color}
                    strokeWidth={2}
                  />
                  <title>{`${asset.name} — ${asset.detail}`}</title>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Asset Details</h2>
          {selected ? (
            <div className="mt-4 space-y-2">
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
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Click an asset on the map to see details.
            </p>
          )}

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
        </div>
      </section>
    </div>
  );
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
