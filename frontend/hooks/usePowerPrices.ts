"use client";

import { useApi } from "@/hooks/useApi";
import type { DayAheadPrices } from "@/types/prices";

export function usePowerPrices(country = "DK", zone = "DK1") {
  return useApi<DayAheadPrices>(
    `/prices/day-ahead?country=${encodeURIComponent(country)}&zone=${encodeURIComponent(zone)}`
  );
}
