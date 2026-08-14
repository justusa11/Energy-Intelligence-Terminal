export type ZoneGridState = {
  zone: string;
  priceEurMwh: number;
  loadMw: number;
  generationMw: number;
  renewableShare: number;
  frequencyHz: number;
  netPositionMw: number;
  congestionRisk: "low" | "medium" | "high";
  batteryArbitrageScore: number;
  dataAgeMinutes: number;
};

export type CorridorGridState = {
  linkId: string;
  flowMw: number;
  capacityMw: number;
  priceSpreadEurMwh: number;
  congestionRentEurH: number;
  direction: "forward" | "reverse";
};

export const zoneGridStates: Record<string, ZoneGridState> = {
  dk1: {
    zone: "DK1",
    priceEurMwh: 84,
    loadMw: 3120,
    generationMw: 3385,
    renewableShare: 0.68,
    frequencyHz: 50.008,
    netPositionMw: 265,
    congestionRisk: "medium",
    batteryArbitrageScore: 74,
    dataAgeMinutes: 2,
  },
  dk2: {
    zone: "DK2",
    priceEurMwh: 91,
    loadMw: 2180,
    generationMw: 1965,
    renewableShare: 0.54,
    frequencyHz: 50.008,
    netPositionMw: -215,
    congestionRisk: "medium",
    batteryArbitrageScore: 69,
    dataAgeMinutes: 2,
  },
  de: {
    zone: "DE-LU",
    priceEurMwh: 96,
    loadMw: 51400,
    generationMw: 50620,
    renewableShare: 0.47,
    frequencyHz: 50.006,
    netPositionMw: -780,
    congestionRisk: "high",
    batteryArbitrageScore: 81,
    dataAgeMinutes: 4,
  },
  ercot: {
    zone: "ERCOT",
    priceEurMwh: 58,
    loadMw: 69200,
    generationMw: 70150,
    renewableShare: 0.39,
    frequencyHz: 60.012,
    netPositionMw: 950,
    congestionRisk: "high",
    batteryArbitrageScore: 88,
    dataAgeMinutes: 3,
  },
  "jp-tk": {
    zone: "JP-TK",
    priceEurMwh: 119,
    loadMw: 43800,
    generationMw: 43150,
    renewableShare: 0.23,
    frequencyHz: 50.004,
    netPositionMw: -650,
    congestionRisk: "medium",
    batteryArbitrageScore: 77,
    dataAgeMinutes: 5,
  },
};

export const corridorGridStates: Record<string, CorridorGridState> = {
  kf: {
    linkId: "kf",
    flowMw: 486,
    capacityMw: 600,
    priceSpreadEurMwh: 5,
    congestionRentEurH: 2430,
    direction: "reverse",
  },
  ct: {
    linkId: "ct",
    flowMw: 512,
    capacityMw: 740,
    priceSpreadEurMwh: 7,
    congestionRentEurH: 3584,
    direction: "forward",
  },
  cobra: {
    linkId: "cobra",
    flowMw: 621,
    capacityMw: 700,
    priceSpreadEurMwh: 11,
    congestionRentEurH: 6831,
    direction: "forward",
  },
  "ercot-west-houston": {
    linkId: "ercot-west-houston",
    flowMw: 2980,
    capacityMw: 3450,
    priceSpreadEurMwh: 26,
    congestionRentEurH: 77480,
    direction: "forward",
  },
  "ercot-north-south": {
    linkId: "ercot-north-south",
    flowMw: 2210,
    capacityMw: 3100,
    priceSpreadEurMwh: 14,
    congestionRentEurH: 30940,
    direction: "reverse",
  },
  "tokyo-bay": {
    linkId: "tokyo-bay",
    flowMw: 1840,
    capacityMw: 2400,
    priceSpreadEurMwh: 18,
    congestionRentEurH: 33120,
    direction: "forward",
  },
  "tokyo-load": {
    linkId: "tokyo-load",
    flowMw: 2120,
    capacityMw: 2600,
    priceSpreadEurMwh: 21,
    congestionRentEurH: 44520,
    direction: "forward",
  },
};

export function getZoneGridState(assetId: string) {
  return zoneGridStates[assetId];
}

export function getCorridorGridState(linkId: string) {
  return corridorGridStates[linkId];
}

export function utilization(state: CorridorGridState) {
  return state.capacityMw === 0 ? 0 : state.flowMw / state.capacityMw;
}

export function corridorTone(state: CorridorGridState) {
  const ratio = utilization(state);
  if (ratio >= 0.85) return "#ef4444";
  if (ratio >= 0.68) return "#f59e0b";
  return "#22c55e";
}
