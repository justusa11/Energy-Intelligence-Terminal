// Sample GIS overlays for the Infrastructure Map MVP. Coordinates are
// approximate lon/lat for Northern Europe and are projected over a live
// basemap in the frontend map component.

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
  country?: string;
  zone?: string | null;
  capacity_mw?: number | null;
  fuel_type?: string | null;
  technology?: string | null;
  operator?: string | null;
  status?: string | null;
  source?: string | null;
  source_year?: number | null;
};

export type GisLink = {
  id: string;
  name: string;
  from?: [number, number];
  to?: [number, number];
  from_asset_id?: string;
  to_asset_id?: string;
  capacity_mw?: number | null;
  detail: string | null;
  source?: string | null;
};

export const sampleAssets: GisAsset[] = [
  { id: "dk1", name: "DK1 — West Denmark", type: "market_zone", lon: 9.0, lat: 56.2, detail: "Bidding zone, Jutland/Funen" },
  { id: "dk2", name: "DK2 — East Denmark", type: "market_zone", lon: 12.0, lat: 55.5, detail: "Bidding zone, Zealand" },
  { id: "de", name: "DE-LU", type: "market_zone", lon: 10.5, lat: 52.5, detail: "Germany-Luxembourg zone (sample)" },
  { id: "ercot", name: "ERCOT — Texas", type: "market_zone", lon: -98.5, lat: 31.2, detail: "Texas ISO sample zone" },
  { id: "jp-tk", name: "JP-TK — Tokyo", type: "market_zone", lon: 139.76, lat: 35.68, detail: "Tokyo JEPX sample zone" },
  { id: "wf1", name: "Horns Rev 3", type: "wind_farm", lon: 7.9, lat: 55.7, detail: "Offshore wind, ~407 MW" },
  { id: "wf2", name: "Kriegers Flak", type: "wind_farm", lon: 12.9, lat: 55.0, detail: "Offshore wind, ~605 MW" },
  { id: "lng1", name: "Gate LNG (Rotterdam)", type: "lng_terminal", lon: 4.05, lat: 51.95, detail: "LNG import terminal" },
  { id: "pp1", name: "Avedøre Power Station", type: "power_plant", lon: 12.45, lat: 55.6, detail: "CHP, biomass/gas" },
  { id: "pp2", name: "Esbjerg Power Station", type: "power_plant", lon: 8.45, lat: 55.47, detail: "Decommissioned coal / grid node" },
  { id: "risk1", name: "Interconnector congestion", type: "risk_marker", lon: 10.9, lat: 54.4, detail: "Historical DE↔DK constraint" },
  { id: "ercot-wind", name: "West Texas Wind", type: "wind_farm", lon: -101.8, lat: 32.3, detail: "High-renewable West Texas sample cluster" },
  { id: "ercot-solar", name: "Permian Solar Hub", type: "power_plant", lon: -102.2, lat: 31.0, detail: "Utility solar and storage sample node" },
  { id: "ercot-risk", name: "Houston load constraint", type: "risk_marker", lon: -95.37, lat: 29.76, detail: "Coastal load and heat-risk marker" },
  { id: "tokyo-lng", name: "Tokyo Bay LNG", type: "lng_terminal", lon: 139.86, lat: 35.52, detail: "LNG import and thermal dispatch hub" },
  { id: "tokyo-plant", name: "Chiba Thermal Node", type: "power_plant", lon: 140.1, lat: 35.55, detail: "Thermal generation sample node" },
  { id: "tokyo-risk", name: "Tokyo peak demand", type: "risk_marker", lon: 139.7, lat: 35.8, detail: "Summer peak-load risk marker" },
];

export const sampleLinks: GisLink[] = [
  { id: "kf", name: "Kontek (DK2↔DE)", from: [12.0, 55.5], to: [11.0, 53.9], detail: "600 MW HVDC" },
  { id: "ct", name: "Kontiskan (DK1↔SE)", from: [9.0, 56.2], to: [11.9, 57.7], detail: "740 MW HVDC" },
  { id: "cobra", name: "COBRAcable (DK1↔NL)", from: [8.1, 56.0], to: [6.6, 53.4], detail: "700 MW HVDC" },
  { id: "ercot-west-houston", name: "West Texas ↔ Houston", from: [-101.8, 32.3], to: [-95.37, 29.76], detail: "345 kV corridor" },
  { id: "ercot-north-south", name: "North ↔ South ERCOT", from: [-98.5, 33.4], to: [-97.2, 29.4], detail: "CREZ transfer path" },
  { id: "tokyo-bay", name: "Tokyo Bay thermal ring", from: [139.86, 35.52], to: [140.1, 35.55], detail: "Bay-area gas supply" },
  { id: "tokyo-load", name: "Tokyo load corridor", from: [139.7, 35.8], to: [139.86, 35.52], detail: "Urban load path" },
];

export const assetStyles: Record<AssetType, { color: string; label: string }> = {
  market_zone: { color: "#3b82f6", label: "Market zone" },
  interconnector: { color: "#a855f7", label: "Interconnector" },
  lng_terminal: { color: "#f59e0b", label: "LNG terminal" },
  wind_farm: { color: "#22c55e", label: "Wind farm" },
  power_plant: { color: "#e2e8f0", label: "Power plant" },
  risk_marker: { color: "#ef4444", label: "Risk marker" },
};
