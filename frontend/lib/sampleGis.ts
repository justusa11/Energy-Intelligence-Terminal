// Sample GIS assets for the Infrastructure Map MVP. Coordinates are
// approximate lon/lat for Northern Europe; the map projects them into an
// SVG viewport. Replace with real GeoJSON feeds when available.

export type AssetType =
  | "market_zone"
  | "interconnector"
  | "lng_terminal"
  | "wind_farm"
  | "power_plant"
  | "risk_marker";

export type GisAsset = {
  id: string;
  name: string;
  type: AssetType;
  lon: number;
  lat: number;
  detail: string;
};

export type GisLink = {
  id: string;
  name: string;
  from: [number, number];
  to: [number, number];
  detail: string;
};

export const sampleAssets: GisAsset[] = [
  { id: "dk1", name: "DK1 — West Denmark", type: "market_zone", lon: 9.0, lat: 56.2, detail: "Bidding zone, Jutland/Funen" },
  { id: "dk2", name: "DK2 — East Denmark", type: "market_zone", lon: 12.0, lat: 55.5, detail: "Bidding zone, Zealand" },
  { id: "de", name: "DE-LU", type: "market_zone", lon: 10.5, lat: 52.5, detail: "Germany-Luxembourg zone (sample)" },
  { id: "wf1", name: "Horns Rev 3", type: "wind_farm", lon: 7.9, lat: 55.7, detail: "Offshore wind, ~407 MW" },
  { id: "wf2", name: "Kriegers Flak", type: "wind_farm", lon: 12.9, lat: 55.0, detail: "Offshore wind, ~605 MW" },
  { id: "lng1", name: "Gate LNG (Rotterdam)", type: "lng_terminal", lon: 4.05, lat: 51.95, detail: "LNG import terminal" },
  { id: "pp1", name: "Avedøre Power Station", type: "power_plant", lon: 12.45, lat: 55.6, detail: "CHP, biomass/gas" },
  { id: "pp2", name: "Esbjerg Power Station", type: "power_plant", lon: 8.45, lat: 55.47, detail: "Decommissioned coal / grid node" },
  { id: "risk1", name: "Interconnector congestion", type: "risk_marker", lon: 10.9, lat: 54.4, detail: "Historical DE↔DK constraint" },
];

export const sampleLinks: GisLink[] = [
  { id: "kf", name: "Kontek (DK2↔DE)", from: [12.0, 55.5], to: [11.0, 53.9], detail: "600 MW HVDC" },
  { id: "ct", name: "Kontiskan (DK1↔SE)", from: [9.0, 56.2], to: [11.9, 57.7], detail: "740 MW HVDC" },
  { id: "cobra", name: "COBRAcable (DK1↔NL)", from: [8.1, 56.0], to: [6.6, 53.4], detail: "700 MW HVDC" },
];

export const assetStyles: Record<AssetType, { color: string; label: string }> = {
  market_zone: { color: "#3b82f6", label: "Market zone" },
  interconnector: { color: "#a855f7", label: "Interconnector" },
  lng_terminal: { color: "#f59e0b", label: "LNG terminal" },
  wind_farm: { color: "#22c55e", label: "Wind farm" },
  power_plant: { color: "#e2e8f0", label: "Power plant" },
  risk_marker: { color: "#ef4444", label: "Risk marker" },
};

export const MAP_BOUNDS = { minLon: 3.5, maxLon: 14.5, minLat: 51.0, maxLat: 58.5 };

export function project(
  lon: number,
  lat: number,
  width: number,
  height: number
): [number, number] {
  const x =
    ((lon - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) * width;
  const y =
    height -
    ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height;
  return [x, y];
}
