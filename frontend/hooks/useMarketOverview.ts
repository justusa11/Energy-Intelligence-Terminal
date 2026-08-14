"use client";

import { useApi } from "@/hooks/useApi";
import type { MarketOverview } from "@/types/market";

export function useMarketOverview(country = "DK", zone = "DK1") {
  return useApi<MarketOverview>(
    `/market/overview?country=${encodeURIComponent(country)}&zone=${encodeURIComponent(zone)}`
  );
}
